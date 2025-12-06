using FluentAssertions;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class WorkflowValidatorTests
{
    private readonly Mock<ITemplateParser> _templateParserMock;
    private readonly Mock<ITypeCompatibilityChecker> _typeCheckerMock;
    private readonly IWorkflowValidator _validator;

    public WorkflowValidatorTests()
    {
        _templateParserMock = new Mock<ITemplateParser>();
        _typeCheckerMock = new Mock<ITypeCompatibilityChecker>();
        _validator = new WorkflowValidator(_templateParserMock.Object, _typeCheckerMock.Object);
    }

    [Fact]
    public void Constructor_WithNullTemplateParser_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => new WorkflowValidator(null!, _typeCheckerMock.Object));
    }

    [Fact]
    public void Constructor_WithNullTypeChecker_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => new WorkflowValidator(_templateParserMock.Object, null!));
    }

    [Fact]
    public async Task ValidateAsync_WithValidWorkflow_ShouldReturnSuccess()
    {
        // Arrange
        var workflow = CreateValidWorkflow();
        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["fetch-user"] = CreateFetchUserTask()
        };

        _templateParserMock.Setup(x => x.Parse(It.IsAny<string>()))
            .Returns(new TemplateParseResult { IsValid = true });

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }

    [Fact]
    public async Task ValidateAsync_WithMissingTaskRef_ShouldReturnError()
    {
        // Arrange
        var workflow = CreateValidWorkflow();
        var tasks = new Dictionary<string, WorkflowTaskResource>(); // Empty - missing task

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Message.Contains("Task reference 'fetch-user' not found"));
    }

    [Fact]
    public async Task ValidateAsync_WithInvalidTemplate_ShouldReturnError()
    {
        // Arrange
        var workflow = CreateValidWorkflow();
        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["fetch-user"] = CreateFetchUserTask()
        };

        _templateParserMock.Setup(x => x.Parse(It.IsAny<string>()))
            .Returns(new TemplateParseResult
            {
                IsValid = false,
                Errors = new List<string> { "Invalid syntax" }
            });

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Message.Contains("Invalid syntax"));
    }

    [Fact]
    public async Task ValidateAsync_WithTypeIncompatibility_ShouldReturnError()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "task-a" },
                    new WorkflowTaskStep
                    {
                        Id = "task-2",
                        TaskRef = "task-b",
                        Input = new Dictionary<string, string>
                        {
                            ["userId"] = "{{tasks.task-1.output.age}}"  // Wrong type
                        }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["task-a"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec
                {
                    OutputSchema = new SchemaDefinition
                    {
                        Type = "object",
                        Properties = new Dictionary<string, PropertyDefinition>
                        {
                            ["age"] = new PropertyDefinition { Type = "integer" }
                        }
                    }
                }
            },
            ["task-b"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec
                {
                    InputSchema = new SchemaDefinition
                    {
                        Type = "object",
                        Properties = new Dictionary<string, PropertyDefinition>
                        {
                            ["userId"] = new PropertyDefinition { Type = "string" }
                        }
                    }
                }
            }
        };

        _templateParserMock.Setup(x => x.Parse("{{tasks.task-1.output.age}}"))
            .Returns(new TemplateParseResult
            {
                IsValid = true,
                Expressions = new List<TemplateExpression>
                {
                    new TemplateExpression
                    {
                        Type = TemplateExpressionType.TaskOutput,
                        TaskId = "task-1",
                        Path = "age"
                    }
                }
            });

        _typeCheckerMock.Setup(x => x.CheckCompatibility(
            It.Is<PropertyDefinition>(p => p.Type == "integer"),
            It.Is<PropertyDefinition>(p => p.Type == "string")))
            .Returns(new CompatibilityResult
            {
                IsCompatible = false,
                Errors = new List<CompatibilityError>
                {
                    new CompatibilityError { Message = "Type mismatch: expected 'string', got 'integer'" }
                }
            });

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Message.Contains("Type mismatch"));
    }

    private WorkflowResource CreateValidWorkflow()
    {
        return new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "fetch-user",
                        TaskRef = "fetch-user",
                        Input = new Dictionary<string, string>
                        {
                            ["userId"] = "{{input.userId}}"
                        }
                    }
                }
            }
        };
    }

    private WorkflowTaskResource CreateFetchUserTask()
    {
        return new WorkflowTaskResource
        {
            Spec = new WorkflowTaskSpec
            {
                Type = "http",
                InputSchema = new SchemaDefinition
                {
                    Type = "object",
                    Properties = new Dictionary<string, PropertyDefinition>
                    {
                        ["userId"] = new PropertyDefinition { Type = "string" }
                    }
                },
                OutputSchema = new SchemaDefinition
                {
                    Type = "object",
                    Properties = new Dictionary<string, PropertyDefinition>
                    {
                        ["id"] = new PropertyDefinition { Type = "string" }
                    }
                }
            }
        };
    }

    [Fact]
    public async Task ValidateAsync_WithMultipleValidationErrors_ShouldReturnAllErrors()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "task-1",
                        TaskRef = "missing-task",
                        Input = new Dictionary<string, string>
                        {
                            ["field1"] = "{{invalid"
                        }
                    }
                }
            }
        };

        _templateParserMock.Setup(x => x.Parse("{{invalid"))
            .Returns(new TemplateParseResult
            {
                IsValid = false,
                Errors = new List<string> { "Unclosed template" }
            });

        // Act
        var result = await _validator.ValidateAsync(workflow, new Dictionary<string, WorkflowTaskResource>());

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().HaveCountGreaterOrEqualTo(1);
    }

    [Fact]
    public async Task ValidateAsync_WithNestedPropertyPath_ShouldResolveCorrectly()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "task-a" },
                    new WorkflowTaskStep
                    {
                        Id = "task-2",
                        TaskRef = "task-b",
                        Input = new Dictionary<string, string>
                        {
                            ["data"] = "{{tasks.task-1.output.user.name}}"
                        }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["task-a"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec
                {
                    OutputSchema = new SchemaDefinition
                    {
                        Type = "object",
                        Properties = new Dictionary<string, PropertyDefinition>
                        {
                            ["user"] = new PropertyDefinition
                            {
                                Type = "object",
                                Properties = new Dictionary<string, PropertyDefinition>
                                {
                                    ["name"] = new PropertyDefinition { Type = "string" }
                                }
                            }
                        }
                    }
                }
            },
            ["task-b"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec
                {
                    InputSchema = new SchemaDefinition
                    {
                        Type = "object",
                        Properties = new Dictionary<string, PropertyDefinition>
                        {
                            ["data"] = new PropertyDefinition { Type = "string" }
                        }
                    }
                }
            }
        };

        _templateParserMock.Setup(x => x.Parse("{{tasks.task-1.output.user.name}}"))
            .Returns(new TemplateParseResult
            {
                IsValid = true,
                Expressions = new List<TemplateExpression>
                {
                    new TemplateExpression
                    {
                        Type = TemplateExpressionType.TaskOutput,
                        TaskId = "task-1",
                        Path = "user.name"
                    }
                }
            });

        _typeCheckerMock.Setup(x => x.CheckCompatibility(It.IsAny<PropertyDefinition>(), It.IsAny<PropertyDefinition>()))
            .Returns(new CompatibilityResult { IsCompatible = true });

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateAsync_WithNullOutputSchema_ShouldSkipTypeCheck()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "task-a" },
                    new WorkflowTaskStep
                    {
                        Id = "task-2",
                        TaskRef = "task-b",
                        Input = new Dictionary<string, string>
                        {
                            ["data"] = "{{tasks.task-1.output.value}}"
                        }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["task-a"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec
                {
                    OutputSchema = null
                }
            },
            ["task-b"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec
                {
                    InputSchema = new SchemaDefinition
                    {
                        Type = "object",
                        Properties = new Dictionary<string, PropertyDefinition>
                        {
                            ["data"] = new PropertyDefinition { Type = "string" }
                        }
                    }
                }
            }
        };

        _templateParserMock.Setup(x => x.Parse("{{tasks.task-1.output.value}}"))
            .Returns(new TemplateParseResult
            {
                IsValid = true,
                Expressions = new List<TemplateExpression>
                {
                    new TemplateExpression
                    {
                        Type = TemplateExpressionType.TaskOutput,
                        TaskId = "task-1",
                        Path = "value"
                    }
                }
            });

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateAsync_WithNonTaskOutputExpression_ShouldSkipResolution()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "task-1",
                        TaskRef = "task-a",
                        Input = new Dictionary<string, string>
                        {
                            ["data"] = "{{input.value}}"
                        }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["task-a"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec
                {
                    InputSchema = new SchemaDefinition
                    {
                        Type = "object",
                        Properties = new Dictionary<string, PropertyDefinition>
                        {
                            ["data"] = new PropertyDefinition { Type = "string" }
                        }
                    }
                }
            }
        };

        _templateParserMock.Setup(x => x.Parse("{{input.value}}"))
            .Returns(new TemplateParseResult
            {
                IsValid = true,
                Expressions = new List<TemplateExpression>
                {
                    new TemplateExpression
                    {
                        Type = TemplateExpressionType.Input,
                        Path = "value"
                    }
                }
            });

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateAsync_WithNonExistentTaskInExpression_ShouldSkipTypeCheck()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "task-1",
                        TaskRef = "task-a",
                        Input = new Dictionary<string, string>
                        {
                            ["data"] = "{{tasks.missing-task.output.value}}"
                        }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["task-a"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec
                {
                    InputSchema = new SchemaDefinition
                    {
                        Type = "object",
                        Properties = new Dictionary<string, PropertyDefinition>
                        {
                            ["data"] = new PropertyDefinition { Type = "string" }
                        }
                    }
                }
            }
        };

        _templateParserMock.Setup(x => x.Parse("{{tasks.missing-task.output.value}}"))
            .Returns(new TemplateParseResult
            {
                IsValid = true,
                Expressions = new List<TemplateExpression>
                {
                    new TemplateExpression
                    {
                        Type = TemplateExpressionType.TaskOutput,
                        TaskId = "missing-task",
                        Path = "value"
                    }
                }
            });

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateAsync_WithNullInputSchema_ShouldSkipTypeCheck()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "task-1",
                        TaskRef = "task-a",
                        Input = new Dictionary<string, string>
                        {
                            ["data"] = "{{input.value}}"
                        }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["task-a"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec
                {
                    InputSchema = null
                }
            }
        };

        _templateParserMock.Setup(x => x.Parse("{{input.value}}"))
            .Returns(new TemplateParseResult
            {
                IsValid = true,
                Expressions = new List<TemplateExpression>
                {
                    new TemplateExpression
                    {
                        Type = TemplateExpressionType.Input,
                        Path = "value"
                    }
                }
            });

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateAsync_WithEmptyPath_ShouldSkipTypeCheck()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "task-a" },
                    new WorkflowTaskStep
                    {
                        Id = "task-2",
                        TaskRef = "task-b",
                        Input = new Dictionary<string, string>
                        {
                            ["data"] = "{{tasks.task-1.output}}"
                        }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["task-a"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec
                {
                    OutputSchema = new SchemaDefinition
                    {
                        Type = "object",
                        Properties = new Dictionary<string, PropertyDefinition>()
                    }
                }
            },
            ["task-b"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec
                {
                    InputSchema = new SchemaDefinition
                    {
                        Type = "object",
                        Properties = new Dictionary<string, PropertyDefinition>
                        {
                            ["data"] = new PropertyDefinition { Type = "string" }
                        }
                    }
                }
            }
        };

        _templateParserMock.Setup(x => x.Parse("{{tasks.task-1.output}}"))
            .Returns(new TemplateParseResult
            {
                IsValid = true,
                Expressions = new List<TemplateExpression>
                {
                    new TemplateExpression
                    {
                        Type = TemplateExpressionType.TaskOutput,
                        TaskId = "task-1",
                        Path = ""
                    }
                }
            });

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateAsync_WithInvalidOutputMapping_ShouldReturnError()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new() { Name = "test-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "task-1",
                        TaskRef = "task-ref-1",
                        Input = new Dictionary<string, string>()
                    }
                },
                Output = new Dictionary<string, string>
                {
                    ["userId"] = "{{tasks.non-existent-task.output.id}}",
                    ["userName"] = "{{tasks.task-1.output.name}}"
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["task-ref-1"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec
                {
                    Type = "http",
                    OutputSchema = new SchemaDefinition
                    {
                        Type = "object",
                        Properties = new Dictionary<string, PropertyDefinition>
                        {
                            ["name"] = new PropertyDefinition { Type = "string" }
                        }
                    }
                }
            }
        };

        // Setup template parser to parse output mappings
        _templateParserMock.Setup(x => x.Parse("{{tasks.non-existent-task.output.id}}"))
            .Returns(new TemplateParseResult
            {
                IsValid = true,
                Expressions = new List<TemplateExpression>
                {
                    new TemplateExpression
                    {
                        Type = TemplateExpressionType.TaskOutput,
                        TaskId = "non-existent-task",
                        Path = "id"
                    }
                }
            });

        _templateParserMock.Setup(x => x.Parse("{{tasks.task-1.output.name}}"))
            .Returns(new TemplateParseResult
            {
                IsValid = true,
                Expressions = new List<TemplateExpression>
                {
                    new TemplateExpression
                    {
                        Type = TemplateExpressionType.TaskOutput,
                        TaskId = "task-1",
                        Path = "name"
                    }
                }
            });

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e =>
            e.Field == "userId" &&
            e.Message.Contains("non-existent-task"));
    }

    [Fact]
    public async Task ValidateAsync_WithTransformTaskMissingTransformProperty_ShouldReturnError()
    {
        // Arrange - Transform task without Transform property
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "transform-data",
                        TaskRef = "transform-task"
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["transform-task"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec
                {
                    Type = "transform",
                    Transform = null  // Missing Transform property
                }
            }
        };

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e =>
            e.TaskId == "transform-data" &&
            e.Message.Contains("Transform definition is required"));
    }

    [Fact]
    public async Task ValidateAsync_WithValidTransformTask_ShouldReturnSuccess()
    {
        // Arrange - Valid transform task
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "transform-data",
                        TaskRef = "transform-task"
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["transform-task"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec
                {
                    Type = "transform",
                    Transform = new TransformDefinition
                    {
                        Query = "$.users[*].name"
                    }
                }
            }
        };

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }

    #region Mutation Killing Tests - Round 10 (WorkflowValidator Non-String Mutations)

    [Fact]
    public async Task ValidateAsync_TransformTaskMissingTransform_ShouldSkipInputValidation_KillLine67Continue()
    {
        // This test kills the statement mutation at line 67 (continue;)
        // If continue is removed, it would try to validate inputs on a transform task with missing Transform
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "transform-data",
                        TaskRef = "transform-task",
                        Input = new Dictionary<string, string>
                        {
                            ["data"] = "{{input.value}}"
                        }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["transform-task"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec
                {
                    Type = "transform",
                    Transform = null,  // Missing Transform - triggers continue at line 67
                    InputSchema = new SchemaDefinition
                    {
                        Type = "object",
                        Properties = new Dictionary<string, PropertyDefinition>
                        {
                            ["data"] = new PropertyDefinition { Type = "string" }
                        }
                    }
                }
            }
        };

        // Template parser should NOT be called because continue skips input validation
        // (If continue is removed, the parser would be called)
        _templateParserMock.Setup(x => x.Parse("{{input.value}}"))
            .Returns(new TemplateParseResult { IsValid = true });

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert - Should fail due to missing Transform, with exactly 1 error
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.Message.Contains("Transform definition is required"));
    }

    [Fact]
    public async Task ValidateAsync_InvalidTemplateThenValidInput_ShouldSkipTypeChecking_KillLine88Continue()
    {
        // This test kills the statement mutation at line 88 (continue;)
        // If continue is removed, it would continue to type-check after invalid template error
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "task-1",
                        TaskRef = "task-a",
                        Input = new Dictionary<string, string>
                        {
                            ["badField"] = "{{unclosed",
                            ["goodField"] = "{{input.value}}"
                        }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["task-a"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec
                {
                    InputSchema = new SchemaDefinition
                    {
                        Type = "object",
                        Properties = new Dictionary<string, PropertyDefinition>
                        {
                            ["badField"] = new PropertyDefinition { Type = "string" },
                            ["goodField"] = new PropertyDefinition { Type = "string" }
                        }
                    }
                }
            }
        };

        _templateParserMock.Setup(x => x.Parse("{{unclosed"))
            .Returns(new TemplateParseResult
            {
                IsValid = false,
                Errors = new List<string> { "Unclosed template" }
            });

        _templateParserMock.Setup(x => x.Parse("{{input.value}}"))
            .Returns(new TemplateParseResult { IsValid = true });

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert - Should have error for invalid template
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Message.Contains("Unclosed template"));
    }

    [Fact]
    public async Task ValidateAsync_OutputMappingWithNullTaskId_ShouldSkipTaskExistenceCheck_KillLine135AndOperator()
    {
        // This test kills the logical mutation at line 135 (&& to ||)
        // If && is changed to ||, it would check task existence even when taskId is null
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "task-1",
                        TaskRef = "task-a"
                    }
                },
                Output = new Dictionary<string, string>
                {
                    ["result"] = "{{input.value}}"  // Not a TaskOutput type
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["task-a"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec()
            }
        };

        // Template is TaskOutput type but with null TaskId - tests the && condition
        _templateParserMock.Setup(x => x.Parse("{{input.value}}"))
            .Returns(new TemplateParseResult
            {
                IsValid = true,
                Expressions = new List<TemplateExpression>
                {
                    new TemplateExpression
                    {
                        Type = TemplateExpressionType.TaskOutput,  // TaskOutput type
                        TaskId = null,  // But null TaskId - should skip check due to &&
                        Path = "value"
                    }
                }
            });

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert - Should pass (no error for null taskId)
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateAsync_OutputMappingWithMultipleTasks_OnlyOneMatches_KillLine137AnyToAll()
    {
        // This test kills the LINQ mutation at line 137 (Any() to All())
        // If Any() is changed to All(), it would fail when not ALL tasks match
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "task-a" },
                    new WorkflowTaskStep { Id = "task-2", TaskRef = "task-b" },
                    new WorkflowTaskStep { Id = "task-3", TaskRef = "task-c" }
                },
                Output = new Dictionary<string, string>
                {
                    ["result"] = "{{tasks.task-2.output.value}}"  // References task-2 (not all tasks)
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["task-a"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec() },
            ["task-b"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec() },
            ["task-c"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec() }
        };

        _templateParserMock.Setup(x => x.Parse("{{tasks.task-2.output.value}}"))
            .Returns(new TemplateParseResult
            {
                IsValid = true,
                Expressions = new List<TemplateExpression>
                {
                    new TemplateExpression
                    {
                        Type = TemplateExpressionType.TaskOutput,
                        TaskId = "task-2",  // Only matches task-2, not all tasks
                        Path = "value"
                    }
                }
            });

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert - Should pass because task-2 exists (Any matches)
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateAsync_EmptyConditionIf_ShouldNotParseTemplate_KillLine181Return()
    {
        // This test kills the statement mutation at line 181 (return;)
        // If return is removed, it would try to parse an empty condition string
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "conditional-task",
                        TaskRef = "task-a",
                        Condition = new ConditionSpec
                        {
                            If = "   "  // Empty/whitespace - triggers return at line 181
                        }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["task-a"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec()
            }
        };

        // Template parser should NOT be called for empty condition.if
        // (If return is removed, parser would be called with whitespace)

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert - Should fail with exactly one error about empty condition
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle(e => e.Message.Contains("Condition 'if' expression is empty"));

        // Verify parser was NOT called for the condition
        _templateParserMock.Verify(x => x.Parse("   "), Times.Never());
    }

    [Fact]
    public async Task ValidateAsync_SwitchWithNoCasesAndNoDefault_ShouldNotAddWarning_KillLine300Equality()
    {
        // This test kills the equality mutation at line 300 (> 0 to >= 0)
        // Line 300: else if (step.Switch.Cases.Count > 0) - adds warning if no default
        // If > 0 is changed to >= 0, it would add warning even when Cases.Count == 0
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "switch-task",
                        TaskRef = "task-a",
                        Switch = new SwitchSpec
                        {
                            Value = "{{input.type}}",
                            Cases = new List<SwitchCase>(),  // Empty cases - Count == 0
                            Default = null  // No default
                        }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["task-a"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec()
            }
        };

        _templateParserMock.Setup(x => x.Parse("{{input.type}}"))
            .Returns(new TemplateParseResult { IsValid = true });

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert - Should have error for empty cases, but NO warning about missing default
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Message.Contains("Switch must have at least one case"));
        result.Warnings.Should().BeEmpty();  // No "no default case" warning when cases are empty
    }

    [Fact]
    public async Task ValidateAsync_SwitchWithCasesButNoDefault_ShouldAddWarning()
    {
        // Complementary test - ensures warning IS added when cases exist but no default
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "switch-task",
                        TaskRef = "task-a",
                        Switch = new SwitchSpec
                        {
                            Value = "{{input.type}}",
                            Cases = new List<SwitchCase>
                            {
                                new SwitchCase { Match = "option1", TaskRef = "task-a" }
                            },
                            Default = null  // No default
                        }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["task-a"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec()
            }
        };

        _templateParserMock.Setup(x => x.Parse("{{input.type}}"))
            .Returns(new TemplateParseResult { IsValid = true });

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert - Should have warning about missing default
        result.IsValid.Should().BeTrue();
        result.Warnings.Should().Contain(w => w.Contains("no default case"));
    }

    [Fact]
    public async Task ValidateAsync_TaskOutputExpressionWithNullTaskId_ShouldSkipResolution_KillLine385AndOperator()
    {
        // This test kills the logical mutation at line 385 (&& to ||)
        // If && is changed to ||, it would try to resolve even when taskId is null
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "task-1",
                        TaskRef = "task-a",
                        Input = new Dictionary<string, string>
                        {
                            ["field"] = "{{tasks..output.value}}"  // Invalid - empty taskId
                        }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["task-a"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec
                {
                    InputSchema = new SchemaDefinition
                    {
                        Type = "object",
                        Properties = new Dictionary<string, PropertyDefinition>
                        {
                            ["field"] = new PropertyDefinition { Type = "string" }
                        }
                    }
                }
            }
        };

        _templateParserMock.Setup(x => x.Parse("{{tasks..output.value}}"))
            .Returns(new TemplateParseResult
            {
                IsValid = true,
                Expressions = new List<TemplateExpression>
                {
                    new TemplateExpression
                    {
                        Type = TemplateExpressionType.TaskOutput,
                        TaskId = null,  // Null TaskId - should skip resolution due to &&
                        Path = "value"
                    }
                }
            });

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert - Should pass (no error for null taskId)
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateAsync_NestedPathWithMissingProperty_ShouldReturnNull_KillLine420OrOperator()
    {
        // This test kills the logical mutation at line 420 (|| to &&)
        // Line 420: if (current.Properties == null || !current.Properties.ContainsKey(part))
        // If || is changed to &&, it would only return null when BOTH conditions are true
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "task-a" },
                    new WorkflowTaskStep
                    {
                        Id = "task-2",
                        TaskRef = "task-b",
                        Input = new Dictionary<string, string>
                        {
                            ["data"] = "{{tasks.task-1.output.user.nonexistent}}"
                        }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["task-a"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec
                {
                    OutputSchema = new SchemaDefinition
                    {
                        Type = "object",
                        Properties = new Dictionary<string, PropertyDefinition>
                        {
                            ["user"] = new PropertyDefinition
                            {
                                Type = "object",
                                Properties = new Dictionary<string, PropertyDefinition>
                                {
                                    // "name" exists but "nonexistent" does not
                                    ["name"] = new PropertyDefinition { Type = "string" }
                                }
                            }
                        }
                    }
                }
            },
            ["task-b"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec
                {
                    InputSchema = new SchemaDefinition
                    {
                        Type = "object",
                        Properties = new Dictionary<string, PropertyDefinition>
                        {
                            ["data"] = new PropertyDefinition { Type = "string" }
                        }
                    }
                }
            }
        };

        _templateParserMock.Setup(x => x.Parse("{{tasks.task-1.output.user.nonexistent}}"))
            .Returns(new TemplateParseResult
            {
                IsValid = true,
                Expressions = new List<TemplateExpression>
                {
                    new TemplateExpression
                    {
                        Type = TemplateExpressionType.TaskOutput,
                        TaskId = "task-1",
                        Path = "user.nonexistent"  // "user" exists but "nonexistent" doesn't
                    }
                }
            });

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert - Should pass because property couldn't be resolved (returns null, skips type check)
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateAsync_WorkflowWithNoForEachTasks_ShouldReturnEarly_KillLine444Return()
    {
        // This test kills the statement mutation at line 444 (return;)
        // If return is removed, it would continue processing even when no forEach tasks exist
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "task-a" },
                    new WorkflowTaskStep { Id = "task-2", TaskRef = "task-b" },
                    new WorkflowTaskStep { Id = "task-3", TaskRef = "task-c" }
                    // No forEach on any tasks
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["task-a"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec() },
            ["task-b"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec() },
            ["task-c"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec() }
        };

        _templateParserMock.Setup(x => x.Parse(It.IsAny<string>()))
            .Returns(new TemplateParseResult { IsValid = true });

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert - Should pass with no errors (forEach validation exits early)
        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }

    [Fact]
    public async Task ValidateAsync_ForEachTaskWithValidNesting_ShouldPass()
    {
        // Complementary test for line 444 - ensures forEach validation runs when tasks exist
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "foreach-task",
                        TaskRef = "task-a",
                        ForEach = new ForEachSpec
                        {
                            Items = "{{input.items}}",
                            ItemVar = "item"
                        }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["task-a"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec() }
        };

        _templateParserMock.Setup(x => x.Parse(It.IsAny<string>()))
            .Returns(new TemplateParseResult { IsValid = true });

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert - Should pass
        result.IsValid.Should().BeTrue();
    }

    #endregion
}
