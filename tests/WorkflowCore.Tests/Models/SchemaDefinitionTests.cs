using System.Text.Json;
using FluentAssertions;
using WorkflowCore.Models;
using Xunit;

namespace WorkflowCore.Tests.Models;

public class SchemaDefinitionTests
{
    [Fact]
    public void SchemaDefinition_ShouldSerializeToJson()
    {
        // Arrange
        var schema = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>
            {
                ["userId"] = new PropertyDefinition
                {
                    Type = "string",
                    Description = "User identifier"
                }
            },
            Required = new List<string> { "userId" }
        };

        // Act
        var json = JsonSerializer.Serialize(schema);
        var deserialized = JsonSerializer.Deserialize<SchemaDefinition>(json);

        // Assert
        deserialized.Should().NotBeNull();
        deserialized!.Type.Should().Be("object");
        deserialized.Properties.Should().ContainKey("userId");
        deserialized.Required.Should().Contain("userId");
    }

    [Fact]
    public void SchemaDefinition_ShouldValidateRequiredProperties()
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

        // Act & Assert
        schema.IsPropertyRequired("name").Should().BeTrue();
        schema.IsPropertyRequired("age").Should().BeFalse();
    }

    [Fact]
    public void PropertyDefinition_ShouldSupportNestedObjects()
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
                        ["id"] = new PropertyDefinition { Type = "string" },
                        ["email"] = new PropertyDefinition { Type = "string", Format = "email" }
                    }
                }
            }
        };

        // Act
        var userProperty = schema.Properties["user"];

        // Assert
        userProperty.Type.Should().Be("object");
        userProperty.Properties.Should().NotBeNull();
        userProperty.Properties.Should().ContainKey("id");
        userProperty.Properties!["email"].Format.Should().Be("email");
    }
}
