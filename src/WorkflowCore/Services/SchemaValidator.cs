using System.Text.Json;
using System.Text.Json.Nodes;
using Json.Schema;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

public interface ISchemaValidator
{
    Task<ValidationResult> ValidateAsync(SchemaDefinition? schemaDefinition, object data);
}

public class SchemaValidator : ISchemaValidator
{
    private readonly ISchemaParser _parser;

    public SchemaValidator(ISchemaParser parser)
    {
        _parser = parser ?? throw new ArgumentNullException(nameof(parser));
    }

    public async Task<ValidationResult> ValidateAsync(SchemaDefinition? schemaDefinition, object data)
    {
        if (schemaDefinition == null)
        {
            return new ValidationResult { IsValid = true };
        }

        var jsonSchema = await _parser.ParseAsync(schemaDefinition);
        if (jsonSchema == null)
        {
            return new ValidationResult { IsValid = true };
        }

        var dataJson = JsonSerializer.Serialize(data);
        var dataNode = JsonNode.Parse(dataJson);

        var evaluationResult = jsonSchema.Evaluate(dataNode, new EvaluationOptions
        {
            OutputFormat = OutputFormat.List
        });

        if (evaluationResult.IsValid)
        {
            return new ValidationResult { IsValid = true };
        }

        var errors = new List<ValidationError>();
        if (evaluationResult.Details != null)
        {
            foreach (var detail in evaluationResult.Details)
            {
                if (!detail.IsValid && detail.Errors != null)
                {
                    foreach (var (errorKey, errorMessage) in detail.Errors)
                    {
                        errors.Add(new ValidationError
                        {
                            Field = detail.InstanceLocation?.ToString(),
                            Message = errorMessage
                        });
                    }
                }
            }
        }

        return new ValidationResult
        {
            IsValid = false,
            Errors = errors
        };
    }
}
