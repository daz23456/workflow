using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class TemplateParserTests
{
    private readonly ITemplateParser _parser;

    public TemplateParserTests()
    {
        _parser = new TemplateParser();
    }

    [Fact]
    public void Parse_WithInputReference_ShouldReturnTemplateExpression()
    {
        // Arrange
        var template = "{{input.userId}}";

        // Act
        var result = _parser.Parse(template);

        // Assert
        result.Should().NotBeNull();
        result.IsValid.Should().BeTrue();
        result.Expressions.Should().ContainSingle();
        result.Expressions[0].Type.Should().Be(TemplateExpressionType.Input);
        result.Expressions[0].Path.Should().Be("userId");
    }

    [Fact]
    public void Parse_WithTaskOutputReference_ShouldReturnTemplateExpression()
    {
        // Arrange
        var template = "{{tasks.fetch-user.output.id}}";

        // Act
        var result = _parser.Parse(template);

        // Assert
        result.Should().NotBeNull();
        result.Expressions[0].Type.Should().Be(TemplateExpressionType.TaskOutput);
        result.Expressions[0].TaskId.Should().Be("fetch-user");
        result.Expressions[0].Path.Should().Be("id");
    }

    [Fact]
    public void Parse_WithInvalidSyntax_ShouldReturnError()
    {
        // Arrange
        var template = "{{input.userId";  // Missing closing braces

        // Act
        var result = _parser.Parse(template);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Should().Contain("Invalid template syntax");
    }

    [Fact]
    public void Parse_WithMultipleExpressions_ShouldReturnAll()
    {
        // Arrange
        var template = "User {{input.userId}} has {{tasks.fetch-orders.output.orderCount}} orders";

        // Act
        var result = _parser.Parse(template);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Expressions.Should().HaveCount(2);
    }

    [Fact]
    public void Parse_WithNestedPath_ShouldParseCorrectly()
    {
        // Arrange
        var template = "{{tasks.fetch-user.output.address.city}}";

        // Act
        var result = _parser.Parse(template);

        // Assert
        result.Expressions[0].Path.Should().Be("address.city");
    }
}
