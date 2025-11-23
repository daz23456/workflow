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

    [Fact]
    public void CheckCompatibility_ObjectVsPrimitive_ShouldReturnError()
    {
        // Arrange
        var sourceProperty = new PropertyDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>()
        };

        var targetProperty = new PropertyDefinition { Type = "string" };

        // Act
        var result = _checker.CheckCompatibility(sourceProperty, targetProperty);

        // Assert
        result.IsCompatible.Should().BeFalse();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Message.Should().Contain("Type mismatch");
        result.Errors[0].Message.Should().Contain("expected 'string'");
        result.Errors[0].Message.Should().Contain("got 'object'");
    }

    [Fact]
    public void CheckCompatibility_PrimitiveVsObject_ShouldReturnError()
    {
        // Arrange
        var sourceProperty = new PropertyDefinition { Type = "string" };

        var targetProperty = new PropertyDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>()
        };

        // Act
        var result = _checker.CheckCompatibility(sourceProperty, targetProperty);

        // Assert
        result.IsCompatible.Should().BeFalse();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Message.Should().Contain("Type mismatch");
    }

    [Fact]
    public void CheckCompatibility_ArrayVsObject_ShouldReturnError()
    {
        // Arrange
        var sourceProperty = new PropertyDefinition
        {
            Type = "array",
            Items = new PropertyDefinition { Type = "string" }
        };

        var targetProperty = new PropertyDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>()
        };

        // Act
        var result = _checker.CheckCompatibility(sourceProperty, targetProperty);

        // Assert
        result.IsCompatible.Should().BeFalse();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Message.Should().Contain("Type mismatch");
    }

    [Fact]
    public void CheckCompatibility_ArrayWithNullSourceItems_ShouldReturnError()
    {
        // Arrange
        var sourceProperty = new PropertyDefinition
        {
            Type = "array",
            Items = null
        };

        var targetProperty = new PropertyDefinition
        {
            Type = "array",
            Items = new PropertyDefinition { Type = "string" }
        };

        // Act
        var result = _checker.CheckCompatibility(sourceProperty, targetProperty);

        // Assert
        result.IsCompatible.Should().BeFalse();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Field.Should().Contain("items");
        result.Errors[0].Message.Should().Contain("Array items type not defined");
    }

    [Fact]
    public void CheckCompatibility_ArrayWithNullTargetItems_ShouldReturnError()
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
            Items = null
        };

        // Act
        var result = _checker.CheckCompatibility(sourceProperty, targetProperty);

        // Assert
        result.IsCompatible.Should().BeFalse();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Message.Should().Contain("Array items type not defined");
    }

    [Fact]
    public void CheckCompatibility_ArrayWithBothNullItems_ShouldReturnError()
    {
        // Arrange
        var sourceProperty = new PropertyDefinition
        {
            Type = "array",
            Items = null
        };

        var targetProperty = new PropertyDefinition
        {
            Type = "array",
            Items = null
        };

        // Act
        var result = _checker.CheckCompatibility(sourceProperty, targetProperty);

        // Assert
        result.IsCompatible.Should().BeFalse();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Message.Should().Contain("Array items type not defined");
    }

    [Fact]
    public void CheckCompatibility_ObjectWithNullSourceProperties_ShouldSucceed()
    {
        // Arrange
        var sourceProperty = new PropertyDefinition
        {
            Type = "object",
            Properties = null
        };

        var targetProperty = new PropertyDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>()
        };

        // Act
        var result = _checker.CheckCompatibility(sourceProperty, targetProperty);

        // Assert
        result.IsCompatible.Should().BeTrue();
    }

    [Fact]
    public void CheckCompatibility_ObjectWithNullTargetProperties_ShouldSucceed()
    {
        // Arrange
        var sourceProperty = new PropertyDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["extra"] = new PropertyDefinition { Type = "string" }
            }
        };

        var targetProperty = new PropertyDefinition
        {
            Type = "object",
            Properties = null
        };

        // Act
        var result = _checker.CheckCompatibility(sourceProperty, targetProperty);

        // Assert
        result.IsCompatible.Should().BeTrue();
    }

    [Fact]
    public void CheckCompatibility_DeepNestedObjects_ShouldValidateAllLevels()
    {
        // Arrange
        var sourceProperty = new PropertyDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["level1"] = new PropertyDefinition
                {
                    Type = "object",
                    Properties = new Dictionary<string, PropertyDefinition>
                    {
                        ["level2"] = new PropertyDefinition
                        {
                            Type = "object",
                            Properties = new Dictionary<string, PropertyDefinition>
                            {
                                ["level3"] = new PropertyDefinition { Type = "integer" }
                            }
                        }
                    }
                }
            }
        };

        var targetProperty = new PropertyDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["level1"] = new PropertyDefinition
                {
                    Type = "object",
                    Properties = new Dictionary<string, PropertyDefinition>
                    {
                        ["level2"] = new PropertyDefinition
                        {
                            Type = "object",
                            Properties = new Dictionary<string, PropertyDefinition>
                            {
                                ["level3"] = new PropertyDefinition { Type = "string" }
                            }
                        }
                    }
                }
            }
        };

        // Act
        var result = _checker.CheckCompatibility(sourceProperty, targetProperty);

        // Assert
        result.IsCompatible.Should().BeFalse();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Field.Should().Be("level1.level2.level3");
        result.Errors[0].Message.Should().Contain("Type mismatch");
    }

    [Fact]
    public void CheckCompatibility_MultipleErrors_ShouldReturnAll()
    {
        // Arrange
        var sourceProperty = new PropertyDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["name"] = new PropertyDefinition { Type = "integer" },
                ["email"] = new PropertyDefinition { Type = "integer" }
            }
        };

        var targetProperty = new PropertyDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["name"] = new PropertyDefinition { Type = "string" },
                ["email"] = new PropertyDefinition { Type = "string" },
                ["age"] = new PropertyDefinition { Type = "integer" }
            }
        };

        // Act
        var result = _checker.CheckCompatibility(sourceProperty, targetProperty);

        // Assert
        result.IsCompatible.Should().BeFalse();
        result.Errors.Should().HaveCount(3);
        result.Errors.Should().Contain(e => e.Field == "name");
        result.Errors.Should().Contain(e => e.Field == "email");
        result.Errors.Should().Contain(e => e.Field == "age");
    }

    [Fact]
    public void CheckCompatibility_ArrayOfObjects_ShouldValidateRecursively()
    {
        // Arrange
        var sourceProperty = new PropertyDefinition
        {
            Type = "array",
            Items = new PropertyDefinition
            {
                Type = "object",
                Properties = new Dictionary<string, PropertyDefinition>
                {
                    ["id"] = new PropertyDefinition { Type = "string" }
                }
            }
        };

        var targetProperty = new PropertyDefinition
        {
            Type = "array",
            Items = new PropertyDefinition
            {
                Type = "object",
                Properties = new Dictionary<string, PropertyDefinition>
                {
                    ["id"] = new PropertyDefinition { Type = "integer" }
                }
            }
        };

        // Act
        var result = _checker.CheckCompatibility(sourceProperty, targetProperty);

        // Assert
        result.IsCompatible.Should().BeFalse();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Field.Should().Contain("items");
        result.Errors[0].Field.Should().Contain("id");
    }

    [Fact]
    public void CheckCompatibility_NestedMissingProperty_ShouldIncludeFullPath()
    {
        // Arrange
        var sourceProperty = new PropertyDefinition
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
        };

        var targetProperty = new PropertyDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["user"] = new PropertyDefinition
                {
                    Type = "object",
                    Properties = new Dictionary<string, PropertyDefinition>
                    {
                        ["name"] = new PropertyDefinition { Type = "string" },
                        ["email"] = new PropertyDefinition { Type = "string" }
                    }
                }
            }
        };

        // Act
        var result = _checker.CheckCompatibility(sourceProperty, targetProperty);

        // Assert
        result.IsCompatible.Should().BeFalse();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Field.Should().Be("user.email");
        result.Errors[0].Message.Should().Contain("Missing required property");
    }

    [Fact]
    public void CheckCompatibility_SourceHasExtraProperties_ShouldSucceed()
    {
        // Arrange - Source can have additional properties not in target
        var sourceProperty = new PropertyDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["name"] = new PropertyDefinition { Type = "string" },
                ["age"] = new PropertyDefinition { Type = "integer" },
                ["extraField"] = new PropertyDefinition { Type = "string" }
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
        result.IsCompatible.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }

    [Fact]
    public void CheckCompatibility_ComplexNestedArrays_ShouldValidate()
    {
        // Arrange
        var sourceProperty = new PropertyDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["users"] = new PropertyDefinition
                {
                    Type = "array",
                    Items = new PropertyDefinition
                    {
                        Type = "object",
                        Properties = new Dictionary<string, PropertyDefinition>
                        {
                            ["roles"] = new PropertyDefinition
                            {
                                Type = "array",
                                Items = new PropertyDefinition { Type = "string" }
                            }
                        }
                    }
                }
            }
        };

        var targetProperty = new PropertyDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["users"] = new PropertyDefinition
                {
                    Type = "array",
                    Items = new PropertyDefinition
                    {
                        Type = "object",
                        Properties = new Dictionary<string, PropertyDefinition>
                        {
                            ["roles"] = new PropertyDefinition
                            {
                                Type = "array",
                                Items = new PropertyDefinition { Type = "string" }
                            }
                        }
                    }
                }
            }
        };

        // Act
        var result = _checker.CheckCompatibility(sourceProperty, targetProperty);

        // Assert
        result.IsCompatible.Should().BeTrue();
    }

    [Theory]
    [InlineData("string", "integer")]
    [InlineData("integer", "boolean")]
    [InlineData("boolean", "string")]
    [InlineData("number", "string")]
    [InlineData("array", "string")]
    [InlineData("object", "array")]
    public void CheckCompatibility_AllTypeMismatches_ShouldReturnError(string sourceType, string targetType)
    {
        // Arrange
        var sourceProperty = new PropertyDefinition { Type = sourceType };
        var targetProperty = new PropertyDefinition { Type = targetType };

        // Act
        var result = _checker.CheckCompatibility(sourceProperty, targetProperty);

        // Assert
        result.IsCompatible.Should().BeFalse();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Message.Should().Contain($"expected '{targetType}'");
        result.Errors[0].Message.Should().Contain($"got '{sourceType}'");
    }

    [Fact]
    public void CheckCompatibility_EmptyObjectsMatching_ShouldSucceed()
    {
        // Arrange
        var sourceProperty = new PropertyDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>()
        };

        var targetProperty = new PropertyDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>()
        };

        // Act
        var result = _checker.CheckCompatibility(sourceProperty, targetProperty);

        // Assert
        result.IsCompatible.Should().BeTrue();
    }

    [Fact]
    public void CheckCompatibility_ArraysWithMatchingItems_ShouldSucceed()
    {
        // Arrange
        var sourceProperty = new PropertyDefinition
        {
            Type = "array",
            Items = new PropertyDefinition { Type = "boolean" }
        };

        var targetProperty = new PropertyDefinition
        {
            Type = "array",
            Items = new PropertyDefinition { Type = "boolean" }
        };

        // Act
        var result = _checker.CheckCompatibility(sourceProperty, targetProperty);

        // Assert
        result.IsCompatible.Should().BeTrue();
    }
}
