using FluentAssertions;
using WorkflowCore.Models;
using Xunit;

namespace WorkflowCore.Tests.Models;

public class TemplateParseResultTests
{
    [Fact]
    public void TemplateParseResult_ShouldInitializeWithDefaultValues()
    {
        // Act
        var result = new TemplateParseResult();

        // Assert
        result.IsValid.Should().BeFalse();
        result.Expressions.Should().NotBeNull();
        result.Expressions.Should().BeEmpty();
        result.Errors.Should().NotBeNull();
        result.Errors.Should().BeEmpty();
    }

    [Fact]
    public void TemplateParseResult_ShouldAllowSettingProperties()
    {
        // Arrange
        var expression = new TemplateExpression
        {
            Type = TemplateExpressionType.Input,
            Path = "userId"
        };

        // Act
        var result = new TemplateParseResult
        {
            IsValid = true,
            Expressions = new List<TemplateExpression> { expression },
            Errors = new List<string>()
        };

        // Assert
        result.IsValid.Should().BeTrue();
        result.Expressions.Should().HaveCount(1);
        result.Expressions[0].Type.Should().Be(TemplateExpressionType.Input);
        result.Expressions[0].Path.Should().Be("userId");
        result.Errors.Should().BeEmpty();
    }

    [Fact]
    public void TemplateExpression_ShouldInitializeWithDefaultValues()
    {
        // Act
        var expression = new TemplateExpression();

        // Assert
        expression.Type.Should().Be(TemplateExpressionType.Input);
        expression.TaskId.Should().BeNull();
        expression.Path.Should().Be(string.Empty);
    }

    [Fact]
    public void TemplateExpression_WithTaskOutput_ShouldHaveTaskId()
    {
        // Act
        var expression = new TemplateExpression
        {
            Type = TemplateExpressionType.TaskOutput,
            TaskId = "fetch-user",
            Path = "email"
        };

        // Assert
        expression.Type.Should().Be(TemplateExpressionType.TaskOutput);
        expression.TaskId.Should().Be("fetch-user");
        expression.Path.Should().Be("email");
    }

    [Fact]
    public void TemplateParseResult_WithErrors_ShouldBeInvalid()
    {
        // Act
        var result = new TemplateParseResult
        {
            IsValid = false,
            Expressions = new List<TemplateExpression>(),
            Errors = new List<string> { "Invalid template syntax", "Missing closing brace" }
        };

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().HaveCount(2);
        result.Errors[0].Should().Be("Invalid template syntax");
        result.Errors[1].Should().Be("Missing closing brace");
    }

    [Fact]
    public void TemplateExpressionType_ShouldHaveInputAndTaskOutputValues()
    {
        // Act & Assert
        TemplateExpressionType.Input.Should().Be(TemplateExpressionType.Input);
        TemplateExpressionType.TaskOutput.Should().Be(TemplateExpressionType.TaskOutput);
    }
}
