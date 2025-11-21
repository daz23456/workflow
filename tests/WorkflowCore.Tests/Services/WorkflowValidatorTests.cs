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
}
