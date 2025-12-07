using System.Text.Json;
using WorkflowCore.Models;
using WorkflowGateway.Models;

namespace WorkflowGateway.Services;

/// <summary>
/// Service for validating workflow input against its schema.
/// Stage 15: MCP Server for External Workflow Consumption
/// </summary>
public class WorkflowInputValidator : IWorkflowInputValidator
{
    /// <inheritdoc/>
    public InputValidationResult ValidateInput(WorkflowResource workflow, Dictionary<string, object>? input)
    {
        var result = new InputValidationResult
        {
            Valid = true,
            MissingInputs = new List<MissingInputInfo>(),
            InvalidInputs = new List<InvalidInputInfo>()
        };

        var inputSpec = workflow.Spec.Input ?? new Dictionary<string, WorkflowInputParameter>();
        var providedInput = input ?? new Dictionary<string, object>();

        // Check for missing required inputs
        foreach (var (fieldName, fieldSpec) in inputSpec)
        {
            if (fieldSpec.Required)
            {
                if (!providedInput.ContainsKey(fieldName))
                {
                    result.Valid = false;
                    result.MissingInputs.Add(new MissingInputInfo
                    {
                        Field = fieldName,
                        Type = fieldSpec.Type,
                        Description = fieldSpec.Description
                    });
                }
            }
        }

        // Validate types of provided inputs
        foreach (var (fieldName, fieldValue) in providedInput)
        {
            if (inputSpec.TryGetValue(fieldName, out var fieldSpec))
            {
                var typeError = ValidateType(fieldValue, fieldSpec.Type, fieldName);
                if (typeError != null)
                {
                    result.Valid = false;
                    result.InvalidInputs.Add(typeError);
                }
            }
            // Extra fields are allowed (not validated)
        }

        // Generate suggested prompt if there are issues
        if (!result.Valid)
        {
            result.SuggestedPrompt = GenerateSuggestedPrompt(result.MissingInputs, result.InvalidInputs);
        }

        return result;
    }

    private InvalidInputInfo? ValidateType(object value, string expectedType, string fieldName)
    {
        // Handle JsonElement (from deserialized JSON)
        if (value is JsonElement jsonElement)
        {
            return ValidateJsonElementType(jsonElement, expectedType, fieldName);
        }

        // Handle native types
        var actualType = GetTypeName(value);
        var isValid = IsTypeCompatible(actualType, expectedType);

        if (!isValid)
        {
            return new InvalidInputInfo
            {
                Field = fieldName,
                Error = $"Expected type '{expectedType}', but received '{actualType}'",
                Received = value
            };
        }

        return null;
    }

    private InvalidInputInfo? ValidateJsonElementType(JsonElement element, string expectedType, string fieldName)
    {
        var isValid = expectedType.ToLowerInvariant() switch
        {
            "string" => element.ValueKind == JsonValueKind.String,
            "integer" => element.ValueKind == JsonValueKind.Number && IsInteger(element),
            "number" => element.ValueKind == JsonValueKind.Number,
            "boolean" => element.ValueKind == JsonValueKind.True || element.ValueKind == JsonValueKind.False,
            "object" => element.ValueKind == JsonValueKind.Object,
            "array" => element.ValueKind == JsonValueKind.Array,
            _ => true // Unknown types are considered valid
        };

        if (!isValid)
        {
            return new InvalidInputInfo
            {
                Field = fieldName,
                Error = $"Expected type '{expectedType}', but received '{GetJsonElementTypeName(element)}'",
                Received = element.ToString()
            };
        }

        return null;
    }

    private static bool IsInteger(JsonElement element)
    {
        if (element.TryGetInt64(out _))
            return true;
        return false;
    }

    private static string GetJsonElementTypeName(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.String => "string",
            JsonValueKind.Number => "number",
            JsonValueKind.True or JsonValueKind.False => "boolean",
            JsonValueKind.Object => "object",
            JsonValueKind.Array => "array",
            JsonValueKind.Null => "null",
            _ => "unknown"
        };
    }

    private static string GetTypeName(object value)
    {
        return value switch
        {
            string => "string",
            int or long or short or byte => "integer",
            float or double or decimal => "number",
            bool => "boolean",
            IDictionary<string, object> => "object",
            IEnumerable<object> => "array",
            _ => value.GetType().Name.ToLowerInvariant()
        };
    }

    private static bool IsTypeCompatible(string actualType, string expectedType)
    {
        if (actualType == expectedType)
            return true;

        // Allow integer to match number
        if (expectedType == "number" && actualType == "integer")
            return true;

        return false;
    }

    private static string GenerateSuggestedPrompt(List<MissingInputInfo> missingInputs, List<InvalidInputInfo> invalidInputs)
    {
        var parts = new List<string>();

        if (missingInputs.Count > 0)
        {
            var fieldDescriptions = missingInputs.Select(m =>
            {
                var desc = string.IsNullOrEmpty(m.Description) ? "" : $" - {m.Description}";
                return $"{m.Field} ({m.Type}){desc}";
            });
            parts.Add($"Please provide the following required fields: {string.Join(", ", fieldDescriptions)}");
        }

        if (invalidInputs.Count > 0)
        {
            var fieldCorrections = invalidInputs.Select(i => $"{i.Field}: {i.Error}");
            parts.Add($"Please correct the following fields: {string.Join(", ", fieldCorrections)}");
        }

        return string.Join(". ", parts);
    }
}
