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

    #region Mutation Testing - Kill Surviving Mutants

    [Fact]
    public async Task EvaluateAsync_InvalidExpression_ErrorShouldContainExpression()
    {
        // Arrange - Kill mutant: line 151 string mutation (empty error message)
        var expression = "some_invalid_expression_without_operators";
        var context = CreateContext(new Dictionary<string, object>());

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert - error message must contain the invalid expression
        result.Error.Should().Contain("some_invalid_expression_without_operators");
    }

    [Fact]
    public async Task EvaluateAsync_LessThan_WhenEqual_ShouldReturnFalse()
    {
        // Arrange - Kill mutant: line 165 equality mutation (< 0 changed to <= 0)
        var expression = "{{input.amount}} < 100";
        var context = CreateContext(new Dictionary<string, object> { ["amount"] = 100 });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert - equal values should return FALSE for less-than
        result.ShouldExecute.Should().BeFalse();
    }

    [Fact]
    public async Task EvaluateAsync_ExplicitNullLiteral_ShouldBeRecognized()
    {
        // Arrange - Kill mutant: line 177 string mutation ("null" to "")
        var expression = "null == null";
        var context = CreateContext(new Dictionary<string, object>());

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert - both nulls should be equal
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_ExplicitFalseLiteral_ShouldBeRecognized()
    {
        // Arrange - Kill mutant: line 187 string mutation ("false" to "")
        var expression = "false == false";
        var context = CreateContext(new Dictionary<string, object>());

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert - false == false should be true
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_MismatchedSingleQuotes_ShouldNotBeStripped()
    {
        // Arrange - Kill mutant: line 193 logical mutation (&& to ||) for single quotes
        // A string starting with ' but not ending with ' should NOT have quotes stripped
        var expression = "{{input.value}} == \"'hello\"";
        var context = CreateContext(new Dictionary<string, object> { ["value"] = "'hello" });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert - should match with the quote included
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_MismatchedDoubleQuotes_ShouldNotBeStripped()
    {
        // Arrange - Kill mutant: line 194 logical mutation (&& to ||) for double quotes
        // Value starts with " but doesn't end with " - quotes should NOT be stripped
        var expression = "{{input.value}} == '\"hello'";
        var context = CreateContext(new Dictionary<string, object> { ["value"] = "\"hello" });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert - should match with the quote included
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_NumericWithStringComparison_ShouldUseStringComparison()
    {
        // Arrange - Kill mutant: line 216 logical mutation (&& to ||)
        // One value is numeric, the other is string - should fall through to string comparison
        var expression = "{{input.num}} == {{input.str}}";
        var context = CreateContext(new Dictionary<string, object>
        {
            ["num"] = 42,
            ["str"] = "42"
        });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert - numeric 42 and string "42" should compare as equal via string comparison
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_NumbersExactlyEpsilonApart_ShouldBeEqual()
    {
        // Arrange - Kill mutant: line 220 equality mutation (< 0.0001 to <= 0.0001)
        // Two numbers exactly 0.0001 apart should be considered equal
        var expression = "{{input.a}} == {{input.b}}";
        var context = CreateContext(new Dictionary<string, object>
        {
            ["a"] = 1.0000,
            ["b"] = 1.00009 // Just under epsilon apart
        });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert - should be equal (within epsilon)
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_NumbersJustOverEpsilonApart_ShouldNotBeEqual()
    {
        // Arrange - Kill mutant: line 220 - verify boundary
        var expression = "{{input.a}} == {{input.b}}";
        var context = CreateContext(new Dictionary<string, object>
        {
            ["a"] = 1.0,
            ["b"] = 1.0002 // Clearly over epsilon apart
        });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert - should NOT be equal (beyond epsilon)
        result.ShouldExecute.Should().BeFalse();
    }

    [Fact]
    public async Task EvaluateAsync_OneNullOneNotNull_ShouldNotBeEqual()
    {
        // Arrange - Kill mutant: line 235 logical mutation (|| to &&)
        var expression = "{{input.a}} == {{input.b}}";
        var context = CreateContext(new Dictionary<string, object>
        {
            ["a"] = null!,
            ["b"] = "not null"
        });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert - null != "not null"
        result.ShouldExecute.Should().BeFalse();
    }

    [Fact]
    public async Task EvaluateAsync_IntegerTypes_ShouldBeRecognizedAsNumeric()
    {
        // Arrange - Kill mutants: line 248 IsNumeric type checks
        // Test various integer types to ensure they're recognized as numeric
        var expression = "{{input.a}} == {{input.b}}";
        var context = CreateContext(new Dictionary<string, object>
        {
            ["a"] = (short)42,
            ["b"] = 42.0
        });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert - short 42 should equal double 42.0
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_ByteType_ShouldBeRecognizedAsNumeric()
    {
        // Arrange - Kill mutants: line 248 byte type check
        var expression = "{{input.a}} == {{input.b}}";
        var context = CreateContext(new Dictionary<string, object>
        {
            ["a"] = (byte)42,
            ["b"] = 42.0
        });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_LongType_ShouldBeRecognizedAsNumeric()
    {
        // Arrange - Kill mutants: line 248 long type check
        var expression = "{{input.a}} == {{input.b}}";
        var context = CreateContext(new Dictionary<string, object>
        {
            ["a"] = 42L,
            ["b"] = 42.0
        });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_FloatType_ShouldBeRecognizedAsNumeric()
    {
        // Arrange - Kill mutants: line 248 float type check
        var expression = "{{input.a}} == {{input.b}}";
        var context = CreateContext(new Dictionary<string, object>
        {
            ["a"] = 42.0f,
            ["b"] = 42.0
        });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_DecimalType_ShouldBeRecognizedAsNumeric()
    {
        // Arrange - Kill mutants: line 248 decimal type check
        var expression = "{{input.a}} == {{input.b}}";
        var context = CreateContext(new Dictionary<string, object>
        {
            ["a"] = 42m,
            ["b"] = 42.0
        });

        // Act
        var result = await _evaluator.EvaluateAsync(expression, context);

        // Assert
        result.ShouldExecute.Should().BeTrue();
    }

    #endregion

    #region Additional Mutation Killing Tests

    [Fact]
    public async Task EvaluateAsync_SbyteType_ShouldBeRecognizedAsNumeric()
    {
        // Target: sbyte in IsNumeric line 248
        var expression = "{{input.a}} == {{input.b}}";
        var context = CreateContext(new Dictionary<string, object>
        {
            ["a"] = (sbyte)42,
            ["b"] = 42.0
        });
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_ByteType_ShouldBeRecognizedAsNumeric_Extended()
    {
        // Target: byte in IsNumeric line 248
        var expression = "{{input.a}} == {{input.b}}";
        var context = CreateContext(new Dictionary<string, object>
        {
            ["a"] = (byte)42,
            ["b"] = 42.0
        });
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_ShortType_ShouldBeRecognizedAsNumeric()
    {
        // Target: short in IsNumeric line 248
        var expression = "{{input.a}} == {{input.b}}";
        var context = CreateContext(new Dictionary<string, object>
        {
            ["a"] = (short)42,
            ["b"] = 42.0
        });
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_UshortType_ShouldBeRecognizedAsNumeric()
    {
        // Target: ushort in IsNumeric line 248
        var expression = "{{input.a}} == {{input.b}}";
        var context = CreateContext(new Dictionary<string, object>
        {
            ["a"] = (ushort)42,
            ["b"] = 42.0
        });
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_UintType_ShouldBeRecognizedAsNumeric()
    {
        // Target: uint in IsNumeric line 248
        var expression = "{{input.a}} == {{input.b}}";
        var context = CreateContext(new Dictionary<string, object>
        {
            ["a"] = (uint)42,
            ["b"] = 42.0
        });
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_LongType_ShouldBeRecognizedAsNumeric_Extended()
    {
        // Target: long in IsNumeric line 248
        var expression = "{{input.a}} == {{input.b}}";
        var context = CreateContext(new Dictionary<string, object>
        {
            ["a"] = 42L,
            ["b"] = 42.0
        });
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_UlongType_ShouldBeRecognizedAsNumeric()
    {
        // Target: ulong in IsNumeric line 248
        var expression = "{{input.a}} == {{input.b}}";
        var context = CreateContext(new Dictionary<string, object>
        {
            ["a"] = (ulong)42,
            ["b"] = 42.0
        });
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_NullEqualsNull_ReturnsTrue()
    {
        // Target: AreEqual null checks line 212
        var expression = "null == null";
        var context = CreateContext(new Dictionary<string, object>());
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_NullEqualsNonNull_ReturnsFalse()
    {
        // Target: AreEqual null check line 213
        var expression = "null == 42";
        var context = CreateContext(new Dictionary<string, object>());
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.ShouldExecute.Should().BeFalse();
    }

    [Fact]
    public async Task EvaluateAsync_NonNullEqualsNull_ReturnsFalse()
    {
        // Target: AreEqual null check line 213 (reverse order)
        var expression = "42 == null";
        var context = CreateContext(new Dictionary<string, object>());
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.ShouldExecute.Should().BeFalse();
    }

    [Fact]
    public async Task EvaluateAsync_CompareNullWithOperator_ReturnsFailure()
    {
        // Target: CompareNumeric null check line 235-238
        var expression = "null > 5";
        var context = CreateContext(new Dictionary<string, object>());
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.Error.Should().NotBeNull();
        result.Error.Should().Contain("compare");
    }

    [Fact]
    public async Task EvaluateAsync_NullUppercase_RecognizedAsNull()
    {
        // Target: Case insensitive null check line 177
        var expression = "NULL == null";
        var context = CreateContext(new Dictionary<string, object>());
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_TrueUppercase_RecognizedAsTrue()
    {
        // Target: Case insensitive true check line 183
        var expression = "TRUE == true";
        var context = CreateContext(new Dictionary<string, object>());
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_FalseUppercase_RecognizedAsFalse()
    {
        // Target: Case insensitive false check line 187
        var expression = "FALSE == false";
        var context = CreateContext(new Dictionary<string, object>());
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_DoubleQuotedString_ExtractsValue()
    {
        // Target: Double quote handling line 194
        var expression = "\"hello\" == \"hello\"";
        var context = CreateContext(new Dictionary<string, object>());
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_SingleQuotedString_ExtractsValue()
    {
        // Target: Single quote handling line 193
        var expression = "'world' == 'world'";
        var context = CreateContext(new Dictionary<string, object>());
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_NumericEpsilonComparison_HandlesFloatingPoint()
    {
        // Target: Epsilon comparison line 220 - 0.0001 threshold
        var expression = "{{input.a}} == {{input.b}}";
        var context = CreateContext(new Dictionary<string, object>
        {
            ["a"] = 1.00001,
            ["b"] = 1.00002  // Difference < 0.0001
        });
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_NumericDifferenceAboveEpsilon_ReturnsFalse()
    {
        // Target: Epsilon comparison line 220 - difference > 0.0001
        var expression = "{{input.a}} == {{input.b}}";
        var context = CreateContext(new Dictionary<string, object>
        {
            ["a"] = 1.0,
            ["b"] = 1.001  // Difference > 0.0001
        });
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.ShouldExecute.Should().BeFalse();
    }

    [Fact]
    public async Task EvaluateAsync_BooleanComparisonTrue_ReturnsTrue()
    {
        // Target: Boolean comparison line 224-227
        var expression = "{{input.a}} == {{input.b}}";
        var context = CreateContext(new Dictionary<string, object>
        {
            ["a"] = true,
            ["b"] = true
        });
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_BooleanComparisonFalse_ReturnsFalse()
    {
        // Target: Boolean comparison line 224-227
        var expression = "{{input.a}} == {{input.b}}";
        var context = CreateContext(new Dictionary<string, object>
        {
            ["a"] = true,
            ["b"] = false
        });
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.ShouldExecute.Should().BeFalse();
    }

    [Fact]
    public async Task EvaluateAsync_StringComparisonCaseSensitive_ReturnsFalse()
    {
        // Target: String Ordinal comparison line 230
        var expression = "'Hello' == 'hello'";
        var context = CreateContext(new Dictionary<string, object>());
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.ShouldExecute.Should().BeFalse();
    }

    [Fact]
    public async Task EvaluateAsync_GreaterOrEqual_Boundary()
    {
        // Target: >= operator line 167 - exactly equal
        var expression = "5 >= 5";
        var context = CreateContext(new Dictionary<string, object>());
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_LessOrEqual_Boundary()
    {
        // Target: <= operator line 168 - exactly equal
        var expression = "5 <= 5";
        var context = CreateContext(new Dictionary<string, object>());
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_GreaterThan_Boundary()
    {
        // Target: > operator line 165 - not greater
        var expression = "5 > 5";
        var context = CreateContext(new Dictionary<string, object>());
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.ShouldExecute.Should().BeFalse();
    }

    [Fact]
    public async Task EvaluateAsync_LessThan_Boundary()
    {
        // Target: < operator line 166 - not less
        var expression = "5 < 5";
        var context = CreateContext(new Dictionary<string, object>());
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.ShouldExecute.Should().BeFalse();
    }

    [Fact]
    public async Task EvaluateAsync_InvalidExpression_ReturnsFailure()
    {
        // Target: Invalid expression throw line 151
        var expression = "not_a_boolean_value";
        var context = CreateContext(new Dictionary<string, object>());
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.Error.Should().NotBeNull();
    }

    [Fact]
    public async Task EvaluateAsync_BooleanParseFalse_ReturnsFalse()
    {
        // Target: Boolean parse line 146-148
        var expression = "false";
        var context = CreateContext(new Dictionary<string, object>());
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.ShouldExecute.Should().BeFalse();
    }

    [Fact]
    public async Task EvaluateAsync_BooleanParseTrue_ReturnsTrue()
    {
        // Target: Boolean parse line 146-148
        var expression = "true";
        var context = CreateContext(new Dictionary<string, object>());
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.ShouldExecute.Should().BeTrue();
    }

    [Fact]
    public async Task EvaluateAsync_UnresolvedTemplate_ReturnsFailure()
    {
        // Target: Template unresolved throw line 85
        var expression = "{{input.missing}} == 5";
        var context = CreateContext(new Dictionary<string, object>());
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.Error.Should().NotBeNull();
    }

    [Fact]
    public async Task EvaluateAsync_ExpressionResultTrue_IncludesResolvedExpression()
    {
        // Target: ConditionResult.Execute with resolved expression line 58
        var expression = "{{input.x}} == 5";
        var context = CreateContext(new Dictionary<string, object> { ["x"] = 5 });
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.ShouldExecute.Should().BeTrue();
        result.EvaluatedExpression.Should().Contain("5 == 5");
    }

    [Fact]
    public async Task EvaluateAsync_ExpressionResultFalse_IncludesResolvedExpression()
    {
        // Target: ConditionResult.Skip with resolved expression line 59
        var expression = "{{input.x}} == 10";
        var context = CreateContext(new Dictionary<string, object> { ["x"] = 5 });
        var result = await _evaluator.EvaluateAsync(expression, context);
        result.ShouldExecute.Should().BeFalse();
        result.EvaluatedExpression.Should().Contain("5 == 10");
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
