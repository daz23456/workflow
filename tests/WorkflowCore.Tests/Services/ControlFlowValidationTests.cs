using FluentAssertions;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

/// <summary>
/// Tests for control flow validation: conditions, switch/case, and forEach.
/// Stage 19.4: Validation & Integration
/// </summary>
public class ControlFlowValidationTests
{
    private readonly Mock<ITemplateParser> _templateParserMock;
    private readonly Mock<ITypeCompatibilityChecker> _typeCheckerMock;
    private readonly IWorkflowValidator _validator;

    public ControlFlowValidationTests()
    {
        _templateParserMock = new Mock<ITemplateParser>();
        _typeCheckerMock = new Mock<ITypeCompatibilityChecker>();
        _validator = new WorkflowValidator(_templateParserMock.Object, _typeCheckerMock.Object);

        // Default setup for valid templates
        _templateParserMock.Setup(x => x.Parse(It.IsAny<string>()))
            .Returns(new TemplateParseResult { IsValid = true });
    }

    #region Condition Validation Tests

    [Fact]
    public async Task ValidateAsync_WithValidCondition_ShouldReturnSuccess()
    {
        // Arrange
        var workflow = CreateWorkflowWithCondition("{{input.approved}} == true");
        var tasks = CreateStandardTasks();

        _templateParserMock.Setup(x => x.Parse("{{input.approved}} == true"))
            .Returns(new TemplateParseResult { IsValid = true });

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateAsync_WithEmptyConditionIf_ShouldReturnError()
    {
        // Arrange
        var workflow = CreateWorkflowWithCondition("");
        var tasks = CreateStandardTasks();

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e =>
            e.Field == "condition.if" &&
            e.Message.Contains("empty"));
    }

    [Fact]
    public async Task ValidateAsync_WithWhitespaceConditionIf_ShouldReturnError()
    {
        // Arrange
        var workflow = CreateWorkflowWithCondition("   ");
        var tasks = CreateStandardTasks();

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e =>
            e.Field == "condition.if" &&
            e.Message.Contains("empty"));
    }

    [Fact]
    public async Task ValidateAsync_WithInvalidConditionTemplate_ShouldReturnError()
    {
        // Arrange
        var workflow = CreateWorkflowWithCondition("{{invalid");
        var tasks = CreateStandardTasks();

        _templateParserMock.Setup(x => x.Parse("{{invalid"))
            .Returns(new TemplateParseResult
            {
                IsValid = false,
                Errors = new List<string> { "Unclosed template expression" }
            });

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e =>
            e.Message.Contains("Unclosed template"));
    }

    #endregion

    #region Switch Validation Tests

    [Fact]
    public async Task ValidateAsync_WithValidSwitch_ShouldReturnSuccess()
    {
        // Arrange
        var workflow = CreateWorkflowWithSwitch(
            "{{input.paymentMethod}}",
            new[] { ("stripe", "stripe-task"), ("paypal", "paypal-task") },
            defaultTaskRef: "fallback-task");
        var tasks = CreateSwitchTasks();

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateAsync_WithEmptySwitchValue_ShouldReturnError()
    {
        // Arrange
        var workflow = CreateWorkflowWithSwitch(
            "",
            new[] { ("stripe", "stripe-task") },
            defaultTaskRef: null);
        var tasks = CreateSwitchTasks();

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e =>
            e.Field == "switch.value" &&
            e.Message.Contains("empty"));
    }

    [Fact]
    public async Task ValidateAsync_WithSwitchNoCases_ShouldReturnError()
    {
        // Arrange
        var workflow = CreateWorkflowWithSwitch(
            "{{input.paymentMethod}}",
            Array.Empty<(string, string)>(),
            defaultTaskRef: null);
        var tasks = CreateSwitchTasks();

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e =>
            e.Field == "switch.cases" &&
            e.Message.Contains("at least one case"));
    }

    [Fact]
    public async Task ValidateAsync_WithDuplicateSwitchMatchValues_ShouldReturnError()
    {
        // Arrange
        var workflow = CreateWorkflowWithSwitch(
            "{{input.paymentMethod}}",
            new[] { ("stripe", "stripe-task"), ("stripe", "another-task") },
            defaultTaskRef: null);
        var tasks = CreateSwitchTasks();

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e =>
            e.Field == "switch.cases" &&
            e.Message.Contains("Duplicate", StringComparison.OrdinalIgnoreCase) &&
            e.Message.Contains("stripe"));
    }

    [Fact]
    public async Task ValidateAsync_WithSwitchCaseReferencingMissingTask_ShouldReturnError()
    {
        // Arrange
        var workflow = CreateWorkflowWithSwitch(
            "{{input.paymentMethod}}",
            new[] { ("stripe", "non-existent-task") },
            defaultTaskRef: null);
        var tasks = CreateSwitchTasks();

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e =>
            e.Field == "switch.cases[0].taskRef" &&
            e.Message.Contains("non-existent-task") &&
            e.Message.Contains("not found"));
    }

    [Fact]
    public async Task ValidateAsync_WithSwitchDefaultReferencingMissingTask_ShouldReturnError()
    {
        // Arrange
        var workflow = CreateWorkflowWithSwitch(
            "{{input.paymentMethod}}",
            new[] { ("stripe", "stripe-task") },
            defaultTaskRef: "missing-default-task");
        var tasks = CreateSwitchTasks();

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e =>
            e.Field == "switch.default.taskRef" &&
            e.Message.Contains("missing-default-task") &&
            e.Message.Contains("not found"));
    }

    [Fact]
    public async Task ValidateAsync_WithSwitchNoDefault_ShouldReturnWarning()
    {
        // Arrange
        var workflow = CreateWorkflowWithSwitch(
            "{{input.paymentMethod}}",
            new[] { ("stripe", "stripe-task") },
            defaultTaskRef: null);
        var tasks = CreateSwitchTasks();

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert - should be valid but with warning
        result.IsValid.Should().BeTrue();
        result.Warnings.Should().Contain(w =>
            w.Contains("no default") &&
            w.Contains("switch"));
    }

    [Fact]
    public async Task ValidateAsync_WithInvalidSwitchValueTemplate_ShouldReturnError()
    {
        // Arrange
        var workflow = CreateWorkflowWithSwitch(
            "{{invalid.template",
            new[] { ("stripe", "stripe-task") },
            defaultTaskRef: null);
        var tasks = CreateSwitchTasks();

        _templateParserMock.Setup(x => x.Parse("{{invalid.template"))
            .Returns(new TemplateParseResult
            {
                IsValid = false,
                Errors = new List<string> { "Unclosed template expression" }
            });

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e =>
            e.Field == "switch.value" &&
            e.Message.Contains("Unclosed template"));
    }

    #endregion

    #region ForEach Validation Tests

    [Fact]
    public async Task ValidateAsync_WithValidForEach_ShouldReturnSuccess()
    {
        // Arrange
        var workflow = CreateWorkflowWithForEach("{{input.orderIds}}", "orderId", 5);
        var tasks = CreateStandardTasks();

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateAsync_WithEmptyForEachItems_ShouldReturnError()
    {
        // Arrange
        var workflow = CreateWorkflowWithForEach("", "orderId", 0);
        var tasks = CreateStandardTasks();

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e =>
            e.Field == "forEach.items" &&
            e.Message.Contains("empty"));
    }

    [Fact]
    public async Task ValidateAsync_WithEmptyForEachItemVar_ShouldReturnError()
    {
        // Arrange
        var workflow = CreateWorkflowWithForEach("{{input.orderIds}}", "", 0);
        var tasks = CreateStandardTasks();

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e =>
            e.Field == "forEach.itemVar" &&
            e.Message.Contains("empty"));
    }

    [Fact]
    public async Task ValidateAsync_WithInvalidForEachItemVarIdentifier_ShouldReturnError()
    {
        // Arrange - itemVar starting with number is invalid
        var workflow = CreateWorkflowWithForEach("{{input.orderIds}}", "123invalid", 0);
        var tasks = CreateStandardTasks();

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e =>
            e.Field == "forEach.itemVar" &&
            e.Message.Contains("valid identifier"));
    }

    [Fact]
    public async Task ValidateAsync_WithItemVarContainingSpaces_ShouldReturnError()
    {
        // Arrange
        var workflow = CreateWorkflowWithForEach("{{input.orderIds}}", "order id", 0);
        var tasks = CreateStandardTasks();

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e =>
            e.Field == "forEach.itemVar" &&
            e.Message.Contains("valid identifier"));
    }

    [Fact]
    public async Task ValidateAsync_WithItemVarContainingSpecialChars_ShouldReturnError()
    {
        // Arrange
        var workflow = CreateWorkflowWithForEach("{{input.orderIds}}", "order-id", 0);
        var tasks = CreateStandardTasks();

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e =>
            e.Field == "forEach.itemVar" &&
            e.Message.Contains("valid identifier"));
    }

    [Fact]
    public async Task ValidateAsync_WithItemVarStartingWithUnderscore_ShouldReturnSuccess()
    {
        // Arrange - underscore is valid as first character
        var workflow = CreateWorkflowWithForEach("{{input.orderIds}}", "_orderId", 0);
        var tasks = CreateStandardTasks();

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateAsync_WithNegativeMaxParallel_ShouldReturnError()
    {
        // Arrange
        var workflow = CreateWorkflowWithForEach("{{input.orderIds}}", "orderId", -1);
        var tasks = CreateStandardTasks();

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e =>
            e.Field == "forEach.maxParallel" &&
            e.Message.Contains("positive") || e.Message.Contains("greater than"));
    }

    [Fact]
    public async Task ValidateAsync_WithZeroMaxParallel_ShouldReturnSuccess()
    {
        // Arrange - 0 means unlimited parallelism, which is valid
        var workflow = CreateWorkflowWithForEach("{{input.orderIds}}", "orderId", 0);
        var tasks = CreateStandardTasks();

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateAsync_WithInvalidForEachItemsTemplate_ShouldReturnError()
    {
        // Arrange
        var workflow = CreateWorkflowWithForEach("{{invalid", "orderId", 0);
        var tasks = CreateStandardTasks();

        _templateParserMock.Setup(x => x.Parse("{{invalid"))
            .Returns(new TemplateParseResult
            {
                IsValid = false,
                Errors = new List<string> { "Unclosed template expression" }
            });

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e =>
            e.Field == "forEach.items" &&
            e.Message.Contains("Unclosed template"));
    }

    #endregion

    #region Combined Control Flow Tests

    [Fact]
    public async Task ValidateAsync_WithConditionAndForEach_ShouldValidateBoth()
    {
        // Arrange - Task with both condition and forEach
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "process-orders",
                        TaskRef = "process-task",
                        Condition = new ConditionSpec { If = "{{input.enabled}} == true" },
                        ForEach = new ForEachSpec
                        {
                            Items = "{{input.orders}}",
                            ItemVar = "order",
                            MaxParallel = 5
                        }
                    }
                }
            }
        };
        var tasks = CreateStandardTasks();

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateAsync_WithMultipleControlFlowErrors_ShouldReturnAllErrors()
    {
        // Arrange - Multiple validation issues
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "bad-task",
                        TaskRef = "process-task",
                        Condition = new ConditionSpec { If = "" }, // Empty
                        ForEach = new ForEachSpec
                        {
                            Items = "", // Empty
                            ItemVar = "123bad", // Invalid
                            MaxParallel = -1 // Negative
                        },
                        Switch = new SwitchSpec
                        {
                            Value = "", // Empty
                            Cases = new List<SwitchCase>() // Empty
                        }
                    }
                }
            }
        };
        var tasks = CreateStandardTasks();

        // Act
        var result = await _validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().HaveCountGreaterOrEqualTo(4); // At least 4 errors expected
    }

    #endregion

    #region Helper Methods

    private WorkflowResource CreateWorkflowWithCondition(string ifExpression)
    {
        return new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "conditional-task",
                        TaskRef = "process-task",
                        Condition = new ConditionSpec { If = ifExpression }
                    }
                }
            }
        };
    }

    private WorkflowResource CreateWorkflowWithSwitch(
        string value,
        (string match, string taskRef)[] cases,
        string? defaultTaskRef)
    {
        var switchSpec = new SwitchSpec
        {
            Value = value,
            Cases = cases.Select(c => new SwitchCase
            {
                Match = c.match,
                TaskRef = c.taskRef
            }).ToList()
        };

        if (defaultTaskRef != null)
        {
            switchSpec.Default = new SwitchDefault { TaskRef = defaultTaskRef };
        }

        return new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "switch-task",
                        TaskRef = "base-task",
                        Switch = switchSpec
                    }
                }
            }
        };
    }

    private WorkflowResource CreateWorkflowWithForEach(string items, string itemVar, int maxParallel)
    {
        return new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "foreach-task",
                        TaskRef = "process-task",
                        ForEach = new ForEachSpec
                        {
                            Items = items,
                            ItemVar = itemVar,
                            MaxParallel = maxParallel
                        }
                    }
                }
            }
        };
    }

    private Dictionary<string, WorkflowTaskResource> CreateStandardTasks()
    {
        return new Dictionary<string, WorkflowTaskResource>
        {
            ["process-task"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec { Type = "http" }
            },
            ["base-task"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec { Type = "http" }
            }
        };
    }

    private Dictionary<string, WorkflowTaskResource> CreateSwitchTasks()
    {
        return new Dictionary<string, WorkflowTaskResource>
        {
            ["base-task"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec { Type = "http" }
            },
            ["stripe-task"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec { Type = "http" }
            },
            ["paypal-task"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec { Type = "http" }
            },
            ["fallback-task"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec { Type = "http" }
            }
        };
    }

    #endregion
}
