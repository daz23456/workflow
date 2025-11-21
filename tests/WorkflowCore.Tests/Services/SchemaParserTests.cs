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
}
