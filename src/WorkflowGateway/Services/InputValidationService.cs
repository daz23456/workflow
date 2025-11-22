using WorkflowCore.Models;
using WorkflowCore.Services;

namespace WorkflowGateway.Services;

public interface IInputValidationService
{
    Task<ValidationResult> ValidateAsync(
        WorkflowResource workflow,
        Dictionary<string, object> input);
}

public class InputValidationService : IInputValidationService
{
    private readonly ISchemaValidator _schemaValidator;

    public InputValidationService(ISchemaValidator schemaValidator)
    {
        _schemaValidator = schemaValidator ?? throw new ArgumentNullException(nameof(schemaValidator));
    }

    public async Task<ValidationResult> ValidateAsync(
        WorkflowResource workflow,
        Dictionary<string, object> input)
    {
        // If workflow has no input schema, allow any input
        if (workflow.Spec.Input == null || !workflow.Spec.Input.Any())
        {
            return new ValidationResult { IsValid = true };
        }

        // Convert workflow input parameters to SchemaDefinition
        var schemaDefinition = ConvertToSchemaDefinition(workflow.Spec.Input);

        // Use SchemaValidator from WorkflowCore to validate
        var result = await _schemaValidator.ValidateAsync(schemaDefinition, input);

        return result;
    }

    private SchemaDefinition ConvertToSchemaDefinition(Dictionary<string, WorkflowInputParameter> inputParameters)
    {
        var schema = new SchemaDefinition
        {
            Type = "object",
            Properties = new Dictionary<string, PropertyDefinition>(),
            Required = new List<string>()
        };

        foreach (var (key, param) in inputParameters)
        {
            schema.Properties[key] = new PropertyDefinition
            {
                Type = param.Type,
                Description = param.Description
            };

            if (param.Required)
            {
                schema.Required.Add(key);
            }
        }

        return schema;
    }
}
