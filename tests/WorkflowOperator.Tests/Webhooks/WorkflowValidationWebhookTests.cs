using FluentAssertions;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowOperator.Webhooks;
using Xunit;

namespace WorkflowOperator.Tests.Webhooks;

public class WorkflowValidationWebhookTests
{
    private readonly Mock<ITemplateParser> _templateParserMock;
    private readonly Mock<IExecutionGraphBuilder> _graphBuilderMock;
    private readonly WorkflowValidationWebhook _webhook;

    public WorkflowValidationWebhookTests()
    {
        _templateParserMock = new Mock<ITemplateParser>();
        _graphBuilderMock = new Mock<IExecutionGraphBuilder>();
        _webhook = new WorkflowValidationWebhook(
            _templateParserMock.Object,
            _graphBuilderMock.Object);
    }

    [Fact]
    public async Task ValidateAsync_WithValidWorkflow_ShouldReturnAllowed()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "valid-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "task-1",
                        TaskRef = "fetch-user",
                        Input = new Dictionary<string, string>
                        {
                            ["userId"] = "{{input.userId}}"
                        }
                    }
                }
            }
        };

        // Mock template parsing to succeed
        _templateParserMock.Setup(x => x.Parse(It.IsAny<string>()))
            .Returns(new TemplateParseResult { IsValid = true });

        // Mock graph building to succeed
        _graphBuilderMock.Setup(x => x.Build(It.IsAny<WorkflowResource>()))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = new ExecutionGraph()
            });

        var availableTasks = new List<WorkflowTaskResource>
        {
            new WorkflowTaskResource
            {
                Metadata = new ResourceMetadata { Name = "fetch-user" },
                Spec = new WorkflowTaskSpec { Type = "http" }
            }
        };

        // Act
        var result = await _webhook.ValidateAsync(workflow, availableTasks);

        // Assert
        result.Allowed.Should().BeTrue();
        result.Message.Should().BeNull();
    }

    [Fact]
    public async Task ValidateAsync_WithEmptyTasks_ShouldReturnDenied()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "empty-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>() // Empty
            }
        };

        var availableTasks = new List<WorkflowTaskResource>();

        // Act
        var result = await _webhook.ValidateAsync(workflow, availableTasks);

        // Assert
        result.Allowed.Should().BeFalse();
        result.Message.Should().Contain("Workflow must have at least one task");
    }

    [Fact]
    public async Task ValidateAsync_WithMissingTaskRef_ShouldReturnDenied()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "invalid-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "task-1",
                        TaskRef = "nonexistent-task"
                    }
                }
            }
        };

        var availableTasks = new List<WorkflowTaskResource>();

        // Act
        var result = await _webhook.ValidateAsync(workflow, availableTasks);

        // Assert
        result.Allowed.Should().BeFalse();
        result.Message.Should().Contain("Task reference 'nonexistent-task' not found");
    }

    [Fact]
    public async Task ValidateAsync_WithInvalidTemplate_ShouldReturnDenied()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "template-error-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "task-1",
                        TaskRef = "fetch-user",
                        Input = new Dictionary<string, string>
                        {
                            ["userId"] = "{{invalid syntax"
                        }
                    }
                }
            }
        };

        // Mock template parsing to fail
        _templateParserMock.Setup(x => x.Parse("{{invalid syntax"))
            .Returns(new TemplateParseResult
            {
                IsValid = false,
                Errors = new List<string> { "Invalid template syntax" }
            });

        var availableTasks = new List<WorkflowTaskResource>
        {
            new WorkflowTaskResource
            {
                Metadata = new ResourceMetadata { Name = "fetch-user" },
                Spec = new WorkflowTaskSpec { Type = "http" }
            }
        };

        // Act
        var result = await _webhook.ValidateAsync(workflow, availableTasks);

        // Assert
        result.Allowed.Should().BeFalse();
        result.Message.Should().Contain("Invalid template syntax");
    }

    [Fact]
    public async Task ValidateAsync_WithCircularDependency_ShouldReturnDenied()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "circular-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "task-a",
                        TaskRef = "task-a-ref",
                        Input = new Dictionary<string, string>
                        {
                            ["data"] = "{{tasks.task-b.output.result}}"
                        }
                    },
                    new WorkflowTaskStep
                    {
                        Id = "task-b",
                        TaskRef = "task-b-ref",
                        Input = new Dictionary<string, string>
                        {
                            ["data"] = "{{tasks.task-a.output.result}}"
                        }
                    }
                }
            }
        };

        // Mock template parsing to succeed (templates are valid)
        _templateParserMock.Setup(x => x.Parse(It.IsAny<string>()))
            .Returns(new TemplateParseResult { IsValid = true });

        // Mock graph building to detect cycle
        _graphBuilderMock.Setup(x => x.Build(It.IsAny<WorkflowResource>()))
            .Returns(new ExecutionGraphResult
            {
                IsValid = false,
                Errors = new List<ValidationError>
                {
                    new ValidationError
                    {
                        Message = "Circular dependency detected: task-a → task-b → task-a"
                    }
                }
            });

        var availableTasks = new List<WorkflowTaskResource>
        {
            new WorkflowTaskResource
            {
                Metadata = new ResourceMetadata { Name = "task-a-ref" },
                Spec = new WorkflowTaskSpec { Type = "http" }
            },
            new WorkflowTaskResource
            {
                Metadata = new ResourceMetadata { Name = "task-b-ref" },
                Spec = new WorkflowTaskSpec { Type = "http" }
            }
        };

        // Act
        var result = await _webhook.ValidateAsync(workflow, availableTasks);

        // Assert
        result.Allowed.Should().BeFalse();
        result.Message.Should().Contain("Circular dependency detected");
    }

    [Fact]
    public async Task ValidateAsync_WithNullTasks_ShouldReturnDenied()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "null-tasks" },
            Spec = new WorkflowSpec
            {
                Tasks = null! // Null tasks
            }
        };

        var availableTasks = new List<WorkflowTaskResource>();

        // Act
        var result = await _webhook.ValidateAsync(workflow, availableTasks);

        // Assert
        result.Allowed.Should().BeFalse();
        result.Message.Should().Contain("Workflow must have at least one task");
    }

    [Fact]
    public async Task ValidateAsync_WithMultipleTasksValid_ShouldReturnAllowed()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "multi-task-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "t1", TaskRef = "task1", Input = new Dictionary<string, string>() },
                    new WorkflowTaskStep { Id = "t2", TaskRef = "task2", Input = new Dictionary<string, string>() },
                    new WorkflowTaskStep { Id = "t3", TaskRef = "task3", Input = new Dictionary<string, string>() }
                }
            }
        };

        _templateParserMock.Setup(x => x.Parse(It.IsAny<string>()))
            .Returns(new TemplateParseResult { IsValid = true });

        _graphBuilderMock.Setup(x => x.Build(It.IsAny<WorkflowResource>()))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = new ExecutionGraph()
            });

        var availableTasks = new List<WorkflowTaskResource>
        {
            new WorkflowTaskResource { Metadata = new ResourceMetadata { Name = "task1" }, Spec = new WorkflowTaskSpec { Type = "http" } },
            new WorkflowTaskResource { Metadata = new ResourceMetadata { Name = "task2" }, Spec = new WorkflowTaskSpec { Type = "http" } },
            new WorkflowTaskResource { Metadata = new ResourceMetadata { Name = "task3" }, Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        // Act
        var result = await _webhook.ValidateAsync(workflow, availableTasks);

        // Assert
        result.Allowed.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateAsync_WithTaskNoInput_ShouldReturnAllowed()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "no-input-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "simple-task",
                        TaskRef = "simple",
                        Input = new Dictionary<string, string>() // Empty input
                    }
                }
            }
        };

        _graphBuilderMock.Setup(x => x.Build(It.IsAny<WorkflowResource>()))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = new ExecutionGraph() });

        var availableTasks = new List<WorkflowTaskResource>
        {
            new WorkflowTaskResource { Metadata = new ResourceMetadata { Name = "simple" }, Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        // Act
        var result = await _webhook.ValidateAsync(workflow, availableTasks);

        // Assert
        result.Allowed.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateAsync_WithMultipleTemplateErrors_ShouldReturnFirstError()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "multi-error-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "task1",
                        TaskRef = "ref1",
                        Input = new Dictionary<string, string>
                        {
                            ["field1"] = "{{invalid1",
                            ["field2"] = "{{invalid2"
                        }
                    }
                }
            }
        };

        _templateParserMock.Setup(x => x.Parse("{{invalid1"))
            .Returns(new TemplateParseResult { IsValid = false, Errors = new List<string> { "First error" } });

        var availableTasks = new List<WorkflowTaskResource>
        {
            new WorkflowTaskResource { Metadata = new ResourceMetadata { Name = "ref1" }, Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        // Act
        var result = await _webhook.ValidateAsync(workflow, availableTasks);

        // Assert
        result.Allowed.Should().BeFalse();
        result.Message.Should().Contain("First error");
    }

    [Fact]
    public async Task ValidateAsync_WithEmptyAvailableTasks_AndMissingRef_ShouldReturnDenied()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "t1", TaskRef = "missing" }
                }
            }
        };

        var availableTasks = new List<WorkflowTaskResource>(); // Empty

        // Act
        var result = await _webhook.ValidateAsync(workflow, availableTasks);

        // Assert
        result.Allowed.Should().BeFalse();
        result.Message.Should().Contain("Task reference 'missing' not found");
        result.Message.Should().Contain("No tasks are currently registered");
    }

    [Fact]
    public async Task ValidateAsync_WithTypoInTaskRef_ShouldSuggestSimilarTasks()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "typo-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "t1", TaskRef = "fetch-usr" } // Typo: should be fetch-user
                }
            }
        };

        var availableTasks = new List<WorkflowTaskResource>
        {
            new WorkflowTaskResource { Metadata = new ResourceMetadata { Name = "fetch-user" }, Spec = new WorkflowTaskSpec { Type = "http" } },
            new WorkflowTaskResource { Metadata = new ResourceMetadata { Name = "send-email" }, Spec = new WorkflowTaskSpec { Type = "http" } },
            new WorkflowTaskResource { Metadata = new ResourceMetadata { Name = "validate-input" }, Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        // Act
        var result = await _webhook.ValidateAsync(workflow, availableTasks);

        // Assert
        result.Allowed.Should().BeFalse();
        result.Message.Should().Contain("Did you mean");
        result.Message.Should().Contain("fetch-user");
    }

    [Fact]
    public async Task ValidateAsync_WithPrefixMatch_ShouldSuggestMatchingTasks()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "prefix-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "t1", TaskRef = "fetch" } // Partial: should be fetch-user-data
                }
            }
        };

        var availableTasks = new List<WorkflowTaskResource>
        {
            new WorkflowTaskResource { Metadata = new ResourceMetadata { Name = "fetch-user-data" }, Spec = new WorkflowTaskSpec { Type = "http" } },
            new WorkflowTaskResource { Metadata = new ResourceMetadata { Name = "fetch-orders" }, Spec = new WorkflowTaskSpec { Type = "http" } },
            new WorkflowTaskResource { Metadata = new ResourceMetadata { Name = "send-notification" }, Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        // Act
        var result = await _webhook.ValidateAsync(workflow, availableTasks);

        // Assert
        result.Allowed.Should().BeFalse();
        result.Message.Should().Contain("Did you mean");
        result.Message.Should().Contain("fetch-user-data");
        result.Message.Should().Contain("fetch-orders");
    }

    [Fact]
    public async Task ValidateAsync_WithWordOverlap_ShouldSuggestMatchingTasks()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "word-match-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "t1", TaskRef = "user-fetch" } // Words reversed
                }
            }
        };

        var availableTasks = new List<WorkflowTaskResource>
        {
            new WorkflowTaskResource { Metadata = new ResourceMetadata { Name = "fetch-user" }, Spec = new WorkflowTaskSpec { Type = "http" } },
            new WorkflowTaskResource { Metadata = new ResourceMetadata { Name = "delete-user" }, Spec = new WorkflowTaskSpec { Type = "http" } },
            new WorkflowTaskResource { Metadata = new ResourceMetadata { Name = "send-email" }, Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        // Act
        var result = await _webhook.ValidateAsync(workflow, availableTasks);

        // Assert
        result.Allowed.Should().BeFalse();
        result.Message.Should().Contain("Did you mean");
        result.Message.Should().Contain("fetch-user");
    }

    [Fact]
    public async Task ValidateAsync_WithNoSimilarTasks_ShouldShowSampleOfAvailable()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "no-match-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "t1", TaskRef = "xyz-completely-different" }
                }
            }
        };

        var availableTasks = new List<WorkflowTaskResource>
        {
            new WorkflowTaskResource { Metadata = new ResourceMetadata { Name = "fetch-user" }, Spec = new WorkflowTaskSpec { Type = "http" } },
            new WorkflowTaskResource { Metadata = new ResourceMetadata { Name = "send-email" }, Spec = new WorkflowTaskSpec { Type = "http" } },
            new WorkflowTaskResource { Metadata = new ResourceMetadata { Name = "validate-input" }, Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        // Act
        var result = await _webhook.ValidateAsync(workflow, availableTasks);

        // Assert
        result.Allowed.Should().BeFalse();
        result.Message.Should().Contain("Available tasks include");
    }

    [Fact]
    public async Task ValidateAsync_WithManyAvailableTasks_ShouldLimitSuggestions()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "many-tasks-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "t1", TaskRef = "process" }
                }
            }
        };

        // Create 100 tasks, many matching "process"
        var availableTasks = Enumerable.Range(1, 100)
            .Select(i => new WorkflowTaskResource
            {
                Metadata = new ResourceMetadata { Name = $"process-task-{i}" },
                Spec = new WorkflowTaskSpec { Type = "http" }
            })
            .ToList();

        // Act
        var result = await _webhook.ValidateAsync(workflow, availableTasks);

        // Assert
        result.Allowed.Should().BeFalse();
        result.Message.Should().Contain("Did you mean");
        // Should only show max 5 suggestions
        var suggestionCount = result.Message!.Split(',').Length;
        suggestionCount.Should().BeLessThanOrEqualTo(5);
    }

    [Fact]
    public async Task ValidateAsync_WithCaseInsensitiveMatch_ShouldSuggest()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "case-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "t1", TaskRef = "FETCH-USER" } // Wrong case
                }
            }
        };

        var availableTasks = new List<WorkflowTaskResource>
        {
            new WorkflowTaskResource { Metadata = new ResourceMetadata { Name = "fetch-user" }, Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        // Act
        var result = await _webhook.ValidateAsync(workflow, availableTasks);

        // Assert
        result.Allowed.Should().BeFalse();
        result.Message.Should().Contain("Did you mean");
        result.Message.Should().Contain("fetch-user");
    }

    [Fact]
    public async Task ValidateAsync_WithComplexTemplates_ShouldValidateAll()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "complex-template-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "task1",
                        TaskRef = "ref1",
                        Input = new Dictionary<string, string>
                        {
                            ["userId"] = "{{input.userId}}",
                            ["action"] = "{{input.action}}",
                            ["data"] = "{{tasks.previous.output.result}}"
                        }
                    }
                }
            }
        };

        int parseCount = 0;
        _templateParserMock.Setup(x => x.Parse(It.IsAny<string>()))
            .Returns(new TemplateParseResult { IsValid = true })
            .Callback(() => parseCount++);

        _graphBuilderMock.Setup(x => x.Build(It.IsAny<WorkflowResource>()))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = new ExecutionGraph() });

        var availableTasks = new List<WorkflowTaskResource>
        {
            new WorkflowTaskResource { Metadata = new ResourceMetadata { Name = "ref1" }, Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        // Act
        var result = await _webhook.ValidateAsync(workflow, availableTasks);

        // Assert
        result.Allowed.Should().BeTrue();
        parseCount.Should().Be(3); // All 3 templates validated
    }

    [Fact]
    public async Task ValidateAsync_WithGraphBuildingMultipleErrors_ShouldCombineErrors()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "multi-graph-error" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "t1", TaskRef = "ref1", Input = new Dictionary<string, string>() }
                }
            }
        };

        _templateParserMock.Setup(x => x.Parse(It.IsAny<string>()))
            .Returns(new TemplateParseResult { IsValid = true });

        _graphBuilderMock.Setup(x => x.Build(It.IsAny<WorkflowResource>()))
            .Returns(new ExecutionGraphResult
            {
                IsValid = false,
                Errors = new List<ValidationError>
                {
                    new ValidationError { Message = "Error 1" },
                    new ValidationError { Message = "Error 2" }
                }
            });

        var availableTasks = new List<WorkflowTaskResource>
        {
            new WorkflowTaskResource { Metadata = new ResourceMetadata { Name = "ref1" }, Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        // Act
        var result = await _webhook.ValidateAsync(workflow, availableTasks);

        // Assert
        result.Allowed.Should().BeFalse();
        result.Message.Should().Contain("Error 1");
        result.Message.Should().Contain("Error 2");
    }

    [Fact]
    public void Constructor_WithNullTemplateParser_ShouldThrowArgumentNullException()
    {
        // Act
        Action act = () => new WorkflowValidationWebhook(null!, _graphBuilderMock.Object);

        // Assert
        act.Should().Throw<ArgumentNullException>()
            .WithMessage("*templateParser*");
    }

    [Fact]
    public void Constructor_WithNullGraphBuilder_ShouldThrowArgumentNullException()
    {
        // Act
        Action act = () => new WorkflowValidationWebhook(_templateParserMock.Object, null!);

        // Assert
        act.Should().Throw<ArgumentNullException>()
            .WithMessage("*graphBuilder*");
    }

    [Fact]
    public async Task ValidateAsync_WithWorkflowInputSchema_ShouldReturnAllowed()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "workflow-with-input" },
            Spec = new WorkflowSpec
            {
                Input = new Dictionary<string, WorkflowInputParameter>
                {
                    ["userId"] = new WorkflowInputParameter { Type = "string", Required = true },
                    ["action"] = new WorkflowInputParameter { Type = "string", Required = false }
                },
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "task1",
                        TaskRef = "ref1",
                        Input = new Dictionary<string, string>
                        {
                            ["userId"] = "{{input.userId}}"
                        }
                    }
                }
            }
        };

        _templateParserMock.Setup(x => x.Parse(It.IsAny<string>()))
            .Returns(new TemplateParseResult { IsValid = true });

        _graphBuilderMock.Setup(x => x.Build(It.IsAny<WorkflowResource>()))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = new ExecutionGraph() });

        var availableTasks = new List<WorkflowTaskResource>
        {
            new WorkflowTaskResource { Metadata = new ResourceMetadata { Name = "ref1" }, Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        // Act
        var result = await _webhook.ValidateAsync(workflow, availableTasks);

        // Assert
        result.Allowed.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateAsync_WithDuplicateTaskIds_ShouldAllowIfGraphAccepts()
    {
        // Arrange - Note: Graph builder should detect duplicate IDs, but we test webhook behavior
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "duplicate-ids" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task1", TaskRef = "ref1", Input = new Dictionary<string, string>() },
                    new WorkflowTaskStep { Id = "task1", TaskRef = "ref2", Input = new Dictionary<string, string>() }
                }
            }
        };

        _templateParserMock.Setup(x => x.Parse(It.IsAny<string>()))
            .Returns(new TemplateParseResult { IsValid = true });

        _graphBuilderMock.Setup(x => x.Build(It.IsAny<WorkflowResource>()))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = new ExecutionGraph() });

        var availableTasks = new List<WorkflowTaskResource>
        {
            new WorkflowTaskResource { Metadata = new ResourceMetadata { Name = "ref1" }, Spec = new WorkflowTaskSpec { Type = "http" } },
            new WorkflowTaskResource { Metadata = new ResourceMetadata { Name = "ref2" }, Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        // Act
        var result = await _webhook.ValidateAsync(workflow, availableTasks);

        // Assert
        result.Allowed.Should().BeTrue(); // Webhook doesn't check duplicates, graph builder does
    }
}
