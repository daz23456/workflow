using System.Text.Json.Serialization;

namespace WorkflowGateway.Models;

/// <summary>
/// Request model for input validation endpoint.
/// </summary>
public class ValidateInputRequest
{
    [JsonPropertyName("input")]
    public Dictionary<string, object>? Input { get; set; }
}

/// <summary>
/// Response model for input validation endpoint.
/// Stage 15: MCP Server for External Workflow Consumption
/// </summary>
public class InputValidationResult
{
    /// <summary>
    /// Whether the input is valid.
    /// </summary>
    [JsonPropertyName("valid")]
    public bool Valid { get; set; }

    /// <summary>
    /// List of required input fields that are missing.
    /// </summary>
    [JsonPropertyName("missingInputs")]
    public List<MissingInputInfo> MissingInputs { get; set; } = new();

    /// <summary>
    /// List of input fields with invalid values.
    /// </summary>
    [JsonPropertyName("invalidInputs")]
    public List<InvalidInputInfo> InvalidInputs { get; set; } = new();

    /// <summary>
    /// Suggested prompt to help user provide missing/invalid inputs.
    /// </summary>
    [JsonPropertyName("suggestedPrompt")]
    public string? SuggestedPrompt { get; set; }
}

/// <summary>
/// Information about a missing required input field.
/// </summary>
public class MissingInputInfo
{
    /// <summary>
    /// Name of the missing field.
    /// </summary>
    [JsonPropertyName("field")]
    public string Field { get; set; } = string.Empty;

    /// <summary>
    /// Expected type of the field (e.g., "string", "integer", "boolean").
    /// </summary>
    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// Description of what the field is for.
    /// </summary>
    [JsonPropertyName("description")]
    public string? Description { get; set; }
}

/// <summary>
/// Information about an invalid input field.
/// </summary>
public class InvalidInputInfo
{
    /// <summary>
    /// Name of the invalid field.
    /// </summary>
    [JsonPropertyName("field")]
    public string Field { get; set; } = string.Empty;

    /// <summary>
    /// Error message describing why the value is invalid.
    /// </summary>
    [JsonPropertyName("error")]
    public string Error { get; set; } = string.Empty;

    /// <summary>
    /// The value that was received (for debugging).
    /// </summary>
    [JsonPropertyName("received")]
    public object? Received { get; set; }
}
