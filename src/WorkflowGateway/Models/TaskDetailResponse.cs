using System.Text.Json.Serialization;
using WorkflowCore.Models;

namespace WorkflowGateway.Models;

/// <summary>
/// Detailed information about a workflow task including schemas, HTTP configuration, and statistics.
/// </summary>
public class TaskDetailResponse
{
    /// <summary>
    /// Task name.
    /// </summary>
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Namespace the task belongs to.
    /// </summary>
    [JsonPropertyName("namespace")]
    public string Namespace { get; set; } = string.Empty;

    /// <summary>
    /// Optional task description.
    /// </summary>
    [JsonPropertyName("description")]
    public string? Description { get; set; }

    /// <summary>
    /// Input schema for validation.
    /// </summary>
    [JsonPropertyName("inputSchema")]
    public SchemaDefinition? InputSchema { get; set; }

    /// <summary>
    /// Output schema for validation.
    /// </summary>
    [JsonPropertyName("outputSchema")]
    public SchemaDefinition? OutputSchema { get; set; }

    /// <summary>
    /// HTTP request configuration.
    /// </summary>
    [JsonPropertyName("httpRequest")]
    public HttpRequestConfig? HttpRequest { get; set; }

    /// <summary>
    /// Retry policy configuration.
    /// </summary>
    [JsonPropertyName("retryPolicy")]
    public RetryPolicyConfig? RetryPolicy { get; set; }

    /// <summary>
    /// Execution timeout (e.g., "30s", "5m").
    /// </summary>
    [JsonPropertyName("timeout")]
    public string? Timeout { get; set; }

    /// <summary>
    /// Task execution statistics.
    /// </summary>
    [JsonPropertyName("stats")]
    public TaskStats? Stats { get; set; }
}

/// <summary>
/// HTTP request configuration for a task.
/// </summary>
public class HttpRequestConfig
{
    [JsonPropertyName("method")]
    public string Method { get; set; } = string.Empty;

    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;

    [JsonPropertyName("headers")]
    public Dictionary<string, string> Headers { get; set; } = new();

    [JsonPropertyName("bodyTemplate")]
    public string? BodyTemplate { get; set; }
}

/// <summary>
/// Retry policy configuration for a task.
/// </summary>
public class RetryPolicyConfig
{
    [JsonPropertyName("maxRetries")]
    public int MaxRetries { get; set; }

    [JsonPropertyName("backoffMs")]
    public int BackoffMs { get; set; }
}
