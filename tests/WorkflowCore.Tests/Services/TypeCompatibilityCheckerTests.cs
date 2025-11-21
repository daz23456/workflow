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
        var sourceSchema = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["userId"] = new PropertyDefinition { Type = "string" }
            }
        };

        var targetSchema = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["userId"] = new PropertyDefinition { Type = "string" }
            }
        };

        // Act
        var result = _checker.CheckCompatibility(sourceSchema, targetSchema);

        // Assert
        result.IsCompatible.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }

    [Fact]
    public void CheckCompatibility_WithIncompatibleTypes_ShouldReturnError()
    {
        // Arrange
        var sourceSchema = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["userId"] = new PropertyDefinition { Type = "string" }
            }
        };

        var targetSchema = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["userId"] = new PropertyDefinition { Type = "integer" }
            }
        };

        // Act
        var result = _checker.CheckCompatibility(sourceSchema, targetSchema);

        // Assert
        result.IsCompatible.Should().BeFalse();
        result.Errors.Should().NotBeEmpty();
        result.Errors.Should().Contain(e => e.Contains("userId") && e.Contains("type mismatch"));
    }

    [Fact]
    public void CheckCompatibility_WithNestedObjects_ShouldValidateRecursively()
    {
        // Arrange
        var sourceSchema = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["user"] = new PropertyDefinition
                {
                    Type = "object",
                    Properties = new Dictionary<string, PropertyDefinition>
                    {
                        ["id"] = new PropertyDefinition { Type = "string" },
                        ["name"] = new PropertyDefinition { Type = "string" }
                    }
                }
            }
        };

        var targetSchema = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["user"] = new PropertyDefinition
                {
                    Type = "object",
                    Properties = new Dictionary<string, PropertyDefinition>
                    {
                        ["id"] = new PropertyDefinition { Type = "integer" }, // Type mismatch in nested object
                        ["name"] = new PropertyDefinition { Type = "string" }
                    }
                }
            }
        };

        // Act
        var result = _checker.CheckCompatibility(sourceSchema, targetSchema);

        // Assert
        result.IsCompatible.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("user.id"));
    }

    [Fact]
    public void CheckCompatibility_WithArrays_ShouldValidateItemTypes()
    {
        // Arrange
        var sourceSchema = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["tags"] = new PropertyDefinition
                {
                    Type = "array",
                    Items = new PropertyDefinition { Type = "string" }
                }
            }
        };

        var targetSchema = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["tags"] = new PropertyDefinition
                {
                    Type = "array",
                    Items = new PropertyDefinition { Type = "integer" } // Item type mismatch
                }
            }
        };

        // Act
        var result = _checker.CheckCompatibility(sourceSchema, targetSchema);

        // Assert
        result.IsCompatible.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("tags") && e.Contains("array item"));
    }

    [Fact]
    public void CheckCompatibility_WithNullSchemas_ShouldReturnCompatible()
    {
        // Act & Assert
        _checker.CheckCompatibility(null, null).IsCompatible.Should().BeTrue();
        _checker.CheckCompatibility(null, new SchemaDefinition()).IsCompatible.Should().BeTrue();
        _checker.CheckCompatibility(new SchemaDefinition(), null).IsCompatible.Should().BeTrue();
    }

    [Fact]
    public void CheckCompatibility_WithMissingProperty_ShouldReturnError()
    {
        // Arrange
        var sourceSchema = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["name"] = new PropertyDefinition { Type = "string" }
            }
        };

        var targetSchema = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["name"] = new PropertyDefinition { Type = "string" },
                ["age"] = new PropertyDefinition { Type = "integer" } // Missing in source
            }
        };

        // Act
        var result = _checker.CheckCompatibility(sourceSchema, targetSchema);

        // Assert
        result.IsCompatible.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("age") && e.Contains("Missing property"));
    }
}
