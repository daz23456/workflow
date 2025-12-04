using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

/// <summary>
/// Tests for ConditionEvaluator - expression evaluation for workflow conditions.
/// Following TDD: These tests are written FIRST (RED phase).
/// </summary>
public class ConditionEvaluatorTests
{
    private readonly IConditionEvaluator _evaluator;
    private readonly ITemplateResolver _templateResolver;

    public ConditionEvaluatorTests()
    {
        _templateResolver = new TemplateResolver();
        _evaluator = new ConditionEvaluator(_templateResolver);
    }

    #region Equality Operators (==, !=)

    [Fact]
    public async Task EvaluateAsync_BoolEqualsTrue_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{{input.approved}} == true";
        var context = CreateContext(new Dictionary<string, object> { ["approved"] = true });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeTrue();
        result.Error.Should().BeNull();
    }

    [Fact]
    public async Task EvaluateAsync_BoolEqualsFalse_ShouldReturnFalse()
    {
        // Arrange
        var expression = "{{input.approved}} == true";
        var context = CreateContext(new Dictionary<string, object> { ["approved"] = false });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeFalse();
    }

    [Fact]
    public async Task EvaluateAsync_StringEqualsString_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{{input.status}} == 'active'";
        var context = CreateContext(new Dictionary<string, object> { ["status"] = "active" });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_StringEqualsString_WithDoubleQuotes_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{{input.status}} == \"active\"";
        var context = CreateContext(new Dictionary<string, object> { ["status"] = "active" });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_NumberEqualsNumber_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{{input.count}} == 5";
        var context = CreateContext(new Dictionary<string, object> { ["count"] = 5 });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_NotEquals_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{{input.status}} != 'error'";
        var context = CreateContext(new Dictionary<string, object> { ["status"] = "success" });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_NotEquals_WhenEqual_ShouldReturnFalse()
    {
        // Arrange
        var expression = "{{input.status}} != 'error'";
        var context = CreateContext(new Dictionary<string, object> { ["status"] = "error" });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeFalse();
    }

    #endregion

    #region Numeric Comparisons (>, <, >=, <=)

    [Fact]
    public async Task EvaluateAsync_GreaterThan_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{{input.amount}} > 100";
        var context = CreateContext(new Dictionary<string, object> { ["amount"] = 150 });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_GreaterThan_WhenEqual_ShouldReturnFalse()
    {
        // Arrange
        var expression = "{{input.amount}} > 100";
        var context = CreateContext(new Dictionary<string, object> { ["amount"] = 100 });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeFalse();
    }

    [Fact]
    public async Task EvaluateAsync_LessThan_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{{input.amount}} < 100";
        var context = CreateContext(new Dictionary<string, object> { ["amount"] = 50 });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_GreaterThanOrEqual_WhenGreater_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{{input.amount}} >= 100";
        var context = CreateContext(new Dictionary<string, object> { ["amount"] = 150 });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_GreaterThanOrEqual_WhenEqual_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{{input.amount}} >= 100";
        var context = CreateContext(new Dictionary<string, object> { ["amount"] = 100 });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_LessThanOrEqual_WhenLess_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{{input.amount}} <= 100";
        var context = CreateContext(new Dictionary<string, object> { ["amount"] = 50 });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_LessThanOrEqual_WhenEqual_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{{input.amount}} <= 100";
        var context = CreateContext(new Dictionary<string, object> { ["amount"] = 100 });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_DecimalComparison_ShouldWork()
    {
        // Arrange
        var expression = "{{input.price}} > 99.99";
        var context = CreateContext(new Dictionary<string, object> { ["price"] = 100.50 });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeTrue();
    }

    #endregion

    #region Logical Operators (&&, ||, !)

    [Fact]
    public async Task EvaluateAsync_LogicalAnd_BothTrue_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{{input.isActive}} == true && {{input.isVerified}} == true";
        var context = CreateContext(new Dictionary<string, object>
        {
            ["isActive"] = true,
            ["isVerified"] = true
        });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_LogicalAnd_OneFalse_ShouldReturnFalse()
    {
        // Arrange
        var expression = "{{input.isActive}} == true && {{input.isVerified}} == true";
        var context = CreateContext(new Dictionary<string, object>
        {
            ["isActive"] = true,
            ["isVerified"] = false
        });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeFalse();
    }

    [Fact]
    public async Task EvaluateAsync_LogicalOr_OneTrue_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{{input.isAdmin}} == true || {{input.isOwner}} == true";
        var context = CreateContext(new Dictionary<string, object>
        {
            ["isAdmin"] = false,
            ["isOwner"] = true
        });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_LogicalOr_BothFalse_ShouldReturnFalse()
    {
        // Arrange
        var expression = "{{input.isAdmin}} == true || {{input.isOwner}} == true";
        var context = CreateContext(new Dictionary<string, object>
        {
            ["isAdmin"] = false,
            ["isOwner"] = false
        });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeFalse();
    }

    [Fact]
    public async Task EvaluateAsync_LogicalNot_ShouldInvert()
    {
        // Arrange
        var expression = "!({{input.isBlocked}} == true)";
        var context = CreateContext(new Dictionary<string, object> { ["isBlocked"] = false });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeTrue();
    }

    #endregion

    #region Null Handling

    [Fact]
    public async Task EvaluateAsync_EqualsNull_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{{input.optionalValue}} == null";
        var context = CreateContext(new Dictionary<string, object> { ["optionalValue"] = null! });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_NotEqualsNull_WhenHasValue_ShouldReturnTrue()
    {
        // Arrange
        var expression = "{{input.optionalValue}} != null";
        var context = CreateContext(new Dictionary<string, object> { ["optionalValue"] = "has-value" });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeTrue();
    }

    #endregion

    #region Task Output References

    [Fact]
    public async Task EvaluateAsync_TaskOutputReference_ShouldWork()
    {
        // Arrange
        var expression = "{{tasks.check-credit.output.approved}} == true";
        var context = CreateContextWithTaskOutput("check-credit", new Dictionary<string, object>
        {
            ["approved"] = true
        });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_TaskOutputNestedProperty_ShouldWork()
    {
        // Arrange
        var expression = "{{tasks.fetch-user.output.profile.level}} == 'premium'";
        var context = CreateContextWithTaskOutput("fetch-user", new Dictionary<string, object>
        {
            ["profile"] = new Dictionary<string, object>
            {
                ["level"] = "premium"
            }
        });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeTrue();
    }

    #endregion

    #region Complex Expressions

    [Fact]
    public async Task EvaluateAsync_ComplexExpression_RangeCheck_ShouldWork()
    {
        // Arrange
        var expression = "{{input.amount}} > 100 && {{input.amount}} < 1000";
        var context = CreateContext(new Dictionary<string, object> { ["amount"] = 500 });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_ComplexExpression_OutOfRange_ShouldReturnFalse()
    {
        // Arrange
        var expression = "{{input.amount}} > 100 && {{input.amount}} < 1000";
        var context = CreateContext(new Dictionary<string, object> { ["amount"] = 50 });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeFalse();
    }

    [Fact]
    public async Task EvaluateAsync_MultipleConditions_ShouldWork()
    {
        // Arrange
        var expression = "{{input.status}} == 'active' && {{input.count}} > 0 && {{input.isVerified}} == true";
        var context = CreateContext(new Dictionary<string, object>
        {
            ["status"] = "active",
            ["count"] = 5,
            ["isVerified"] = true
        });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeTrue();
    }

    #endregion

    #region Error Handling

    [Fact]
    public async Task EvaluateAsync_InvalidExpression_ShouldReturnError()
    {
        // Arrange - expression that can't be parsed (no operator, not a boolean)
        var expression = "some invalid garbage without operators";
        var context = CreateContext(new Dictionary<string, object>());

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeFalse();
        result.Error.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task EvaluateAsync_MissingVariable_ShouldReturnError()
    {
        // Arrange
        var expression = "{{input.nonexistent}} == true";
        var context = CreateContext(new Dictionary<string, object>());

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeFalse();
        result.Error.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task EvaluateAsync_EmptyExpression_ShouldReturnTrue()
    {
        // Arrange - empty/null condition means "always execute"
        var expression = "";
        var context = CreateContext(new Dictionary<string, object>());

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_NullExpression_ShouldReturnTrue()
    {
        // Arrange - null condition means "always execute"
        string? expression = null;
        var context = CreateContext(new Dictionary<string, object>());

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeTrue();
    }

    #endregion

    #region EvaluatedExpression Property

    [Fact]
    public async Task EvaluateAsync_ShouldIncludeEvaluatedExpression()
    {
        // Arrange
        var expression = "{{input.status}} == 'active'";
        var context = CreateContext(new Dictionary<string, object> { ["status"] = "active" });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.EvaluatedExpression.Should().Contain("active");
    }

    #endregion

    #region Helper Methods

    private static TemplateContext CreateContext(Dictionary<string, object> input)
    {
        return new TemplateContext
        {
            Input = input,
            TaskOutputs = new System.Collections.Concurrent.ConcurrentDictionary<string, Dictionary<string, object>>()
        };
    }

    private static TemplateContext CreateContextWithTaskOutput(string taskId, Dictionary<string, object> output)
    {
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>(),
            TaskOutputs = new System.Collections.Concurrent.ConcurrentDictionary<string, Dictionary<string, object>>()
        };
        context.TaskOutputs[taskId] = output;
        return context;
    }

    #endregion
}
