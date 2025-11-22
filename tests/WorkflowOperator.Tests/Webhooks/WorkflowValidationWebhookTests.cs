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
}
