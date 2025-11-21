using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class TypeCompatibilityCheckerTests
{
    private readonly ITypeCompatibilityChecker _checker;

    public TypeCompatibilityCheckerTests()
    {
        _checker = new TypeCompatibilityChecker();
    }

    [Fact]
    public void CheckCompatibility_WithMatchingTypes_ShouldReturnSuccess()
    {
        // Arrange
        var sourceProperty = new PropertyDefinition { Type = "string" };
        var targetProperty = new PropertyDefinition { Type = "string" };

        // Act
        var result = _checker.CheckCompatibility(sourceProperty, targetProperty);

        // Assert
        result.IsCompatible.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }

    [Fact]
    public void CheckCompatibility_WithIncompatibleTypes_ShouldReturnError()
    {
        // Arrange
        var sourceProperty = new PropertyDefinition { Type = "integer" };
        var targetProperty = new PropertyDefinition { Type = "string" };

        // Act
        var result = _checker.CheckCompatibility(sourceProperty, targetProperty);

        // Assert
        result.IsCompatible.Should().BeFalse();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Message.Should().Contain("Type mismatch");
    }

    [Fact]
    public void CheckCompatibility_WithNestedObjects_ShouldValidateRecursively()
    {
        // Arrange
        var sourceProperty = new PropertyDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["id"] = new PropertyDefinition { Type = "integer" },
                ["age"] = new PropertyDefinition { Type = "integer" }
            }
        };

        var targetProperty = new PropertyDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["id"] = new PropertyDefinition { Type = "string" },
                ["age"] = new PropertyDefinition { Type = "integer" }
            }
        };

        // Act
        var result = _checker.CheckCompatibility(sourceProperty, targetProperty);

        // Assert
        result.IsCompatible.Should().BeFalse();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Field.Should().Be("id");
    }

    [Fact]
    public void CheckCompatibility_WithArrays_ShouldValidateItemTypes()
    {
        // Arrange
        var sourceProperty = new PropertyDefinition
        {
            Type = "array",
            Items = new PropertyDefinition { Type = "string" }
        };

        var targetProperty = new PropertyDefinition
        {
            Type = "array",
            Items = new PropertyDefinition { Type = "integer" }
        };

        // Act
        var result = _checker.CheckCompatibility(sourceProperty, targetProperty);

        // Assert
        result.IsCompatible.Should().BeFalse();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Field.Should().Contain("items");
    }

    [Fact]
    public void CheckCompatibility_WithMissingProperty_ShouldReturnError()
    {
        // Arrange
        var sourceProperty = new PropertyDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["name"] = new PropertyDefinition { Type = "string" }
            }
        };

        var targetProperty = new PropertyDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["name"] = new PropertyDefinition { Type = "string" },
                ["age"] = new PropertyDefinition { Type = "integer" }
            }
        };

        // Act
        var result = _checker.CheckCompatibility(sourceProperty, targetProperty);

        // Assert
        result.IsCompatible.Should().BeFalse();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Field.Should().Be("age");
        result.Errors[0].Message.Should().Contain("Missing required property");
    }
}
