using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class SchemaValidatorTests
{
    private readonly ISchemaValidator _validator;

    public SchemaValidatorTests()
    {
        var parser = new SchemaParser();
        _validator = new SchemaValidator(parser);
    }

    [Fact]
    public async Task ValidateAsync_WithValidData_ShouldReturnSuccess()
    {
        // Arrange
        var schema = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["name"] = new PropertyDefinition { Type = "string" },
                ["age"] = new PropertyDefinition { Type = "integer" }
            },
            Required = new List<string> { "name" }
        };

        var data = new Dictionary<string, object>
        {
            ["name"] = "John",
            ["age"] = 30
        };

        // Act
        var result = await _validator.ValidateAsync(schema, data);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }

    [Fact]
    public async Task ValidateAsync_WithMissingRequiredField_ShouldReturnError()
    {
        // Arrange
        var schema = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["name"] = new PropertyDefinition { Type = "string" }
            },
            Required = new List<string> { "name" }
        };

        var data = new Dictionary<string, object>(); // missing name

        // Act
        var result = await _validator.ValidateAsync(schema, data);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().NotBeEmpty();
    }

    [Fact]
    public async Task ValidateAsync_WithTypeMismatch_ShouldReturnError()
    {
        // Arrange
        var schema = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["age"] = new PropertyDefinition { Type = "integer" }
            }
        };

        var data = new Dictionary<string, object>
        {
            ["age"] = "not a number" // string instead of integer
        };

        // Act
        var result = await _validator.ValidateAsync(schema, data);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().NotBeEmpty();
    }

    [Fact]
    public async Task ValidateAsync_WithNestedObjects_ShouldValidateRecursively()
    {
        // Arrange
        var schema = new SchemaDefinition
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
                        ["email"] = new PropertyDefinition { Type = "string", Format = "email" }
                    },
                    Required = new List<string> { "name" }
                }
            }
        };

        var validData = new Dictionary<string, object>
        {
            ["user"] = new Dictionary<string, object>
            {
                ["name"] = "John"
            }
        };

        // Act
        var result = await _validator.ValidateAsync(schema, validData);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateAsync_WithNullSchema_ShouldReturnSuccess()
    {
        // Arrange
        var data = new Dictionary<string, object> { ["key"] = "value" };

        // Act
        var result = await _validator.ValidateAsync(null, data);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateAsync_WithArrayType_ShouldValidateElements()
    {
        // Arrange
        var schema = new SchemaDefinition
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

        var validData = new Dictionary<string, object>
        {
            ["tags"] = new[] { "tag1", "tag2", "tag3" }
        };

        // Act
        var result = await _validator.ValidateAsync(schema, validData);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateAsync_WithInvalidArrayElementType_ShouldReturnError()
    {
        // Arrange
        var schema = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["scores"] = new PropertyDefinition
                {
                    Type = "array",
                    Items = new PropertyDefinition { Type = "integer" }
                }
            }
        };

        var invalidData = new Dictionary<string, object>
        {
            ["scores"] = new[] { "not", "numbers" } // strings instead of integers
        };

        // Act
        var result = await _validator.ValidateAsync(schema, invalidData);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().NotBeEmpty();
    }

    [Fact]
    public async Task ValidateAsync_WithMinimumConstraint_ShouldValidate()
    {
        // Arrange
        var schema = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["age"] = new PropertyDefinition
                {
                    Type = "integer",
                    Minimum = 0
                }
            }
        };

        var invalidData = new Dictionary<string, object>
        {
            ["age"] = -5 // below minimum
        };

        // Act
        var result = await _validator.ValidateAsync(schema, invalidData);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().NotBeEmpty();
    }
}
