using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

/// <summary>
/// Tests for SwitchEvaluator - multi-branch routing based on value matching.
/// Following TDD: These tests are written FIRST (RED phase).
/// </summary>
public class SwitchEvaluatorTests
{
    private readonly ISwitchEvaluator _evaluator;
    private readonly ITemplateResolver _templateResolver;

    public SwitchEvaluatorTests()
    {
        _templateResolver = new TemplateResolver();
        _evaluator = new SwitchEvaluator(_templateResolver);
    }

    #region Basic Matching

    [Fact]
    public async Task EvaluateAsync_MatchesFirstCase_ShouldReturnTaskRef()
    {
        // Arrange
        var switchSpec = new SwitchSpec
        {
            Value = "{{input.paymentMethod}}",
            Cases = new List<SwitchCase>
            {
                new() { Match = "stripe", TaskRef = "stripe-charge" },
                new() { Match = "paypal", TaskRef = "paypal-charge" },
                new() { Match = "invoice", TaskRef = "create-invoice" }
            }
        };
        var context = CreateContext(new Dictionary<string, object> { ["paymentMethod"] = "stripe" });

        // Act
        var result = await _evaluator.EvaluateAsync(switchSpec, context);

        // Assert
        result.Matched.Should().BeTrue();
        result.TaskRef.Should().Be("stripe-charge");
        result.MatchedValue.Should().Be("stripe");
        result.Error.Should().BeNull();
    }

    [Fact]
    public async Task EvaluateAsync_MatchesMiddleCase_ShouldReturnCorrectTaskRef()
    {
        // Arrange
        var switchSpec = new SwitchSpec
        {
            Value = "{{input.paymentMethod}}",
            Cases = new List<SwitchCase>
            {
                new() { Match = "stripe", TaskRef = "stripe-charge" },
                new() { Match = "paypal", TaskRef = "paypal-charge" },
                new() { Match = "invoice", TaskRef = "create-invoice" }
            }
        };
        var context = CreateContext(new Dictionary<string, object> { ["paymentMethod"] = "paypal" });

        // Act
        var result = await _evaluator.EvaluateAsync(switchSpec, context);

        // Assert
        result.Matched.Should().BeTrue();
        result.TaskRef.Should().Be("paypal-charge");
        result.MatchedValue.Should().Be("paypal");
    }

    [Fact]
    public async Task EvaluateAsync_MatchesLastCase_ShouldReturnCorrectTaskRef()
    {
        // Arrange
        var switchSpec = new SwitchSpec
        {
            Value = "{{input.paymentMethod}}",
            Cases = new List<SwitchCase>
            {
                new() { Match = "stripe", TaskRef = "stripe-charge" },
                new() { Match = "paypal", TaskRef = "paypal-charge" },
                new() { Match = "invoice", TaskRef = "create-invoice" }
            }
        };
        var context = CreateContext(new Dictionary<string, object> { ["paymentMethod"] = "invoice" });

        // Act
        var result = await _evaluator.EvaluateAsync(switchSpec, context);

        // Assert
        result.Matched.Should().BeTrue();
        result.TaskRef.Should().Be("create-invoice");
    }

    #endregion

    #region Default Case

    [Fact]
    public async Task EvaluateAsync_NoMatch_WithDefault_ShouldReturnDefault()
    {
        // Arrange
        var switchSpec = new SwitchSpec
        {
            Value = "{{input.paymentMethod}}",
            Cases = new List<SwitchCase>
            {
                new() { Match = "stripe", TaskRef = "stripe-charge" },
                new() { Match = "paypal", TaskRef = "paypal-charge" }
            },
            Default = new SwitchDefault { TaskRef = "unknown-payment-error" }
        };
        var context = CreateContext(new Dictionary<string, object> { ["paymentMethod"] = "bitcoin" });

        // Act
        var result = await _evaluator.EvaluateAsync(switchSpec, context);

        // Assert
        result.Matched.Should().BeTrue();
        result.TaskRef.Should().Be("unknown-payment-error");
        result.IsDefault.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_NoMatch_NoDefault_ShouldReturnError()
    {
        // Arrange
        var switchSpec = new SwitchSpec
        {
            Value = "{{input.paymentMethod}}",
            Cases = new List<SwitchCase>
            {
                new() { Match = "stripe", TaskRef = "stripe-charge" },
                new() { Match = "paypal", TaskRef = "paypal-charge" }
            }
        };
        var context = CreateContext(new Dictionary<string, object> { ["paymentMethod"] = "bitcoin" });

        // Act
        var result = await _evaluator.EvaluateAsync(switchSpec, context);

        // Assert
        result.Matched.Should().BeFalse();
        result.TaskRef.Should().BeNull();
        result.Error.Should().NotBeNullOrEmpty();
        result.Error.Should().Contain("bitcoin"); // Should mention the value that didn't match
    }

    #endregion

    #region Type Matching

    [Fact]
    public async Task EvaluateAsync_NumberMatch_ShouldWork()
    {
        // Arrange
        var switchSpec = new SwitchSpec
        {
            Value = "{{input.priority}}",
            Cases = new List<SwitchCase>
            {
                new() { Match = "1", TaskRef = "urgent-handler" },
                new() { Match = "2", TaskRef = "normal-handler" },
                new() { Match = "3", TaskRef = "low-handler" }
            }
        };
        var context = CreateContext(new Dictionary<string, object> { ["priority"] = 2 });

        // Act
        var result = await _evaluator.EvaluateAsync(switchSpec, context);

        // Assert
        result.Matched.Should().BeTrue();
        result.TaskRef.Should().Be("normal-handler");
    }

    [Fact]
    public async Task EvaluateAsync_BooleanMatch_ShouldWork()
    {
        // Arrange
        var switchSpec = new SwitchSpec
        {
            Value = "{{input.isVip}}",
            Cases = new List<SwitchCase>
            {
                new() { Match = "true", TaskRef = "vip-handler" },
                new() { Match = "false", TaskRef = "standard-handler" }
            }
        };
        var context = CreateContext(new Dictionary<string, object> { ["isVip"] = true });

        // Act
        var result = await _evaluator.EvaluateAsync(switchSpec, context);

        // Assert
        result.Matched.Should().BeTrue();
        result.TaskRef.Should().Be("vip-handler");
    }

    #endregion

    #region Case Sensitivity

    [Fact]
    public async Task EvaluateAsync_CaseInsensitiveMatch_ShouldMatch()
    {
        // Arrange
        var switchSpec = new SwitchSpec
        {
            Value = "{{input.status}}",
            Cases = new List<SwitchCase>
            {
                new() { Match = "active", TaskRef = "active-handler" },
                new() { Match = "inactive", TaskRef = "inactive-handler" }
            }
        };
        var context = CreateContext(new Dictionary<string, object> { ["status"] = "ACTIVE" });

        // Act
        var result = await _evaluator.EvaluateAsync(switchSpec, context);

        // Assert - Case insensitive matching for strings
        result.Matched.Should().BeTrue();
        result.TaskRef.Should().Be("active-handler");
    }

    #endregion

    #region Task Output References

    [Fact]
    public async Task EvaluateAsync_TaskOutputReference_ShouldWork()
    {
        // Arrange
        var switchSpec = new SwitchSpec
        {
            Value = "{{tasks.validate.output.result}}",
            Cases = new List<SwitchCase>
            {
                new() { Match = "approved", TaskRef = "process-approved" },
                new() { Match = "rejected", TaskRef = "process-rejected" },
                new() { Match = "pending", TaskRef = "process-pending" }
            }
        };
        var context = CreateContextWithTaskOutput("validate", new Dictionary<string, object>
        {
            ["result"] = "approved"
        });

        // Act
        var result = await _evaluator.EvaluateAsync(switchSpec, context);

        // Assert
        result.Matched.Should().BeTrue();
        result.TaskRef.Should().Be("process-approved");
    }

    #endregion

    #region First Match Wins

    [Fact]
    public async Task EvaluateAsync_DuplicateCases_FirstMatchWins()
    {
        // Arrange - Two cases with same match value
        var switchSpec = new SwitchSpec
        {
            Value = "{{input.type}}",
            Cases = new List<SwitchCase>
            {
                new() { Match = "special", TaskRef = "first-handler" },
                new() { Match = "special", TaskRef = "second-handler" }, // Duplicate
                new() { Match = "normal", TaskRef = "normal-handler" }
            }
        };
        var context = CreateContext(new Dictionary<string, object> { ["type"] = "special" });

        // Act
        var result = await _evaluator.EvaluateAsync(switchSpec, context);

        // Assert - First match wins
        result.Matched.Should().BeTrue();
        result.TaskRef.Should().Be("first-handler");
    }

    #endregion

    #region Error Handling

    [Fact]
    public async Task EvaluateAsync_MissingVariable_ShouldReturnError()
    {
        // Arrange
        var switchSpec = new SwitchSpec
        {
            Value = "{{input.nonexistent}}",
            Cases = new List<SwitchCase>
            {
                new() { Match = "value", TaskRef = "handler" }
            }
        };
        var context = CreateContext(new Dictionary<string, object>());

        // Act
        var result = await _evaluator.EvaluateAsync(switchSpec, context);

        // Assert
        result.Matched.Should().BeFalse();
        result.Error.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task EvaluateAsync_EmptyCases_ShouldReturnError()
    {
        // Arrange
        var switchSpec = new SwitchSpec
        {
            Value = "{{input.type}}",
            Cases = new List<SwitchCase>()
        };
        var context = CreateContext(new Dictionary<string, object> { ["type"] = "value" });

        // Act
        var result = await _evaluator.EvaluateAsync(switchSpec, context);

        // Assert
        result.Matched.Should().BeFalse();
        result.Error.Should().NotBeNullOrEmpty();
        result.Error.Should().Contain("cases"); // Should mention no cases defined
    }

    [Fact]
    public async Task EvaluateAsync_NullSwitchSpec_ShouldReturnError()
    {
        // Arrange
        SwitchSpec? switchSpec = null;
        var context = CreateContext(new Dictionary<string, object>());

        // Act
        var result = await _evaluator.EvaluateAsync(switchSpec, context);

        // Assert
        result.Matched.Should().BeFalse();
        result.Error.Should().NotBeNullOrEmpty();
    }

    #endregion

    #region EvaluatedValue Property

    [Fact]
    public async Task EvaluateAsync_ShouldIncludeEvaluatedValue()
    {
        // Arrange
        var switchSpec = new SwitchSpec
        {
            Value = "{{input.status}}",
            Cases = new List<SwitchCase>
            {
                new() { Match = "active", TaskRef = "active-handler" }
            }
        };
        var context = CreateContext(new Dictionary<string, object> { ["status"] = "active" });

        // Act
        var result = await _evaluator.EvaluateAsync(switchSpec, context);

        // Assert
        result.EvaluatedValue.Should().Be("active");
    }

    #endregion

    #region Null Value Matching

    [Fact]
    public async Task EvaluateAsync_NullValue_WithNullCase_ShouldMatch()
    {
        // Arrange
        var switchSpec = new SwitchSpec
        {
            Value = "{{input.optionalField}}",
            Cases = new List<SwitchCase>
            {
                new() { Match = "null", TaskRef = "null-handler" },
                new() { Match = "value", TaskRef = "value-handler" }
            }
        };
        var context = CreateContext(new Dictionary<string, object> { ["optionalField"] = null! });

        // Act
        var result = await _evaluator.EvaluateAsync(switchSpec, context);

        // Assert
        result.Matched.Should().BeTrue();
        result.TaskRef.Should().Be("null-handler");
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
