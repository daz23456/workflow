using System.Text.Json;
using System.Text.Json.Nodes;
using Json.Schema;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

public interface ISchemaParser
{
    Task<JsonSchema?> ParseAsync(SchemaDefinition? schemaDefinition);
}

public class SchemaParser : ISchemaParser
{
    public Task<JsonSchema?> ParseAsync(SchemaDefinition? schemaDefinition)
    {
        if (schemaDefinition == null)
        {
            return Task.FromResult<JsonSchema?>(null);
        }

        try
        {
            // For Stage 1, we're just validating the infrastructure works
            // Serialize to JSON string (ignoring null values) and parse as JsonSchema
            var options = new JsonSerializerOptions
            {
                DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
            };

            var json = JsonSerializer.Serialize(schemaDefinition, options);
            var jsonSchema = JsonSchema.FromText(json);
            return Task.FromResult<JsonSchema?>(jsonSchema);
        }
        catch (Exception ex)
        {
            throw new SchemaParseException($"Failed to parse schema: {ex.Message}", ex);
        }
    }
}

public class SchemaParseException : Exception
{
    public SchemaParseException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
