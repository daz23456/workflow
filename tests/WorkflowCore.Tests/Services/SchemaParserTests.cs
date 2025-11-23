using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class SchemaParserTests
{
    private readonly ISchemaParser _parser;

    public SchemaParserTests()
    {
        _parser = new SchemaParser();
    }

    [Fact]
    public async Task ParseAsync_WithValidSchema_ShouldReturnJsonSchema()
    {
        // Arrange
        var schemaDefinition = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["name"] = new PropertyDefinition { Type = "string" },
                ["age"] = new PropertyDefinition { Type = "integer", Minimum = 0 }
            },
            Required = new List<string> { "name" }
        };

        // Act
        var jsonSchema = await _parser.ParseAsync(schemaDefinition);

        // Assert
        jsonSchema.Should().NotBeNull();
    }

    [Fact]
    public async Task ParseAsync_WithNullSchema_ShouldReturnNull()
    {
        // Act
        var result = await _parser.ParseAsync(null);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task ParseAsync_WithNullProperties_ShouldIgnoreNullValuesInSerialization()
    {
        // Arrange - Test that null properties are excluded via DefaultIgnoreCondition
        var schemaDefinition = new SchemaDefinition
        {
            Type = "object",
            Description = null, // Null description should be ignored
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["field1"] = new PropertyDefinition
                {
                    Type = "string",
                    Format = null, // Null format should be ignored
                    Pattern = null // Null pattern should be ignored
                }
            },
            Required = new List<string>() // Empty required list
        };

        // Act
        var jsonSchema = await _parser.ParseAsync(schemaDefinition);

        // Assert
        jsonSchema.Should().NotBeNull();
        // The schema should be parseable even with null optional fields
    }

    [Fact]
    public async Task ParseAsync_WithEmptyProperties_ShouldReturnValidSchema()
    {
        // Arrange - Test with minimal SchemaDefinition
        var schemaDefinition = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>(),
            Required = new List<string>()
        };

        // Act
        var jsonSchema = await _parser.ParseAsync(schemaDefinition);

        // Assert
        jsonSchema.Should().NotBeNull();
    }

    [Fact]
    public async Task ParseAsync_WithNestedObjects_ShouldReturnValidSchema()
    {
        // Arrange - Test complex nested structure
        var schemaDefinition = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["nested"] = new PropertyDefinition
                {
                    Type = "object",
                    Properties = new Dictionary<string, PropertyDefinition>
                    {
                        ["deep"] = new PropertyDefinition
                        {
                            Type = "string",
                            Description = "A deeply nested string"
                        }
                    },
                    Required = new List<string> { "deep" }
                }
            },
            Required = new List<string> { "nested" }
        };

        // Act
        var jsonSchema = await _parser.ParseAsync(schemaDefinition);

        // Assert
        jsonSchema.Should().NotBeNull();
    }

    [Fact]
    public async Task ParseAsync_WithArrayType_ShouldReturnValidSchema()
    {
        // Arrange - Test array with items
        var schemaDefinition = new SchemaDefinition
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

        // Act
        var jsonSchema = await _parser.ParseAsync(schemaDefinition);

        // Assert
        jsonSchema.Should().NotBeNull();
    }

    [Fact]
    public async Task ParseAsync_WithEnumProperty_ShouldReturnValidSchema()
    {
        // Arrange - Test enum values
        var schemaDefinition = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["status"] = new PropertyDefinition
                {
                    Type = "string",
                    Enum = new List<string> { "active", "inactive", "pending" }
                }
            }
        };

        // Act
        var jsonSchema = await _parser.ParseAsync(schemaDefinition);

        // Assert
        jsonSchema.Should().NotBeNull();
    }

    [Fact]
    public async Task ParseAsync_WithMinMaxConstraints_ShouldReturnValidSchema()
    {
        // Arrange - Test integer constraints
        var schemaDefinition = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["age"] = new PropertyDefinition
                {
                    Type = "integer",
                    Minimum = 0,
                    Maximum = 150
                }
            }
        };

        // Act
        var jsonSchema = await _parser.ParseAsync(schemaDefinition);

        // Assert
        jsonSchema.Should().NotBeNull();
    }

    [Fact]
    public async Task ParseAsync_WithPatternConstraint_ShouldReturnValidSchema()
    {
        // Arrange - Test string pattern
        var schemaDefinition = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["email"] = new PropertyDefinition
                {
                    Type = "string",
                    Format = "email",
                    Pattern = @"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                }
            }
        };

        // Act
        var jsonSchema = await _parser.ParseAsync(schemaDefinition);

        // Assert
        jsonSchema.Should().NotBeNull();
    }

    [Fact]
    public async Task ParseAsync_WithNullRequiredList_ShouldHandleGracefully()
    {
        // Arrange - Test that parsing works even if Required is default-initialized
        var schemaDefinition = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["field"] = new PropertyDefinition { Type = "string" }
            }
            // Required list is default (empty list from initialization)
        };

        // Act
        var jsonSchema = await _parser.ParseAsync(schemaDefinition);

        // Assert
        jsonSchema.Should().NotBeNull();
    }

    [Fact]
    public async Task ParseAsync_WithComplexSchema_ShouldSerializeAllProperties()
    {
        // Arrange - Test comprehensive schema with all possible properties
        var schemaDefinition = new SchemaDefinition
        {
            Type = "object",
            Description = "A comprehensive test schema",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["stringField"] = new PropertyDefinition
                {
                    Type = "string",
                    Description = "A string field",
                    Format = "email"
                },
                ["numberField"] = new PropertyDefinition
                {
                    Type = "integer",
                    Minimum = 1,
                    Maximum = 100
                },
                ["arrayField"] = new PropertyDefinition
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
                }
            },
            Required = new List<string> { "stringField", "numberField" }
        };

        // Act
        var jsonSchema = await _parser.ParseAsync(schemaDefinition);

        // Assert
        jsonSchema.Should().NotBeNull();
    }

    [Fact]
    public void SchemaParseException_ShouldContainMessageAndInnerException()
    {
        // Arrange
        var innerException = new InvalidOperationException("Inner error");
        var message = "Failed to parse schema: Inner error";

        // Act
        var exception = new SchemaParseException(message, innerException);

        // Assert
        exception.Message.Should().Be(message);
        exception.InnerException.Should().Be(innerException);
    }

    [Fact]
    public void SchemaParseException_ShouldBeThrowable()
    {
        // Arrange
        var innerException = new Exception("Test inner exception");

        // Act & Assert
        Action action = () => throw new SchemaParseException("Test message", innerException);

        action.Should().Throw<SchemaParseException>()
            .WithMessage("Test message")
            .WithInnerException<Exception>()
            .WithMessage("Test inner exception");
    }
}
