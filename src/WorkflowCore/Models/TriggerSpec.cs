using System.Text.Json.Serialization;
using YamlDotNet.Serialization;

namespace WorkflowCore.Models;

/// <summary>
/// Base specification for workflow triggers.
/// Triggers allow workflows to be executed automatically without manual API calls.
/// </summary>
public class TriggerSpec
{
    /// <summary>
    /// The type of trigger: "schedule", "webhook", or "event".
    /// </summary>
    [JsonPropertyName("type")]
    [YamlMember(Alias = "type")]
    public string Type { get; set; } = string.Empty;

    /// <summary>
    /// Optional unique identifier for the trigger (auto-generated if not provided).
    /// </summary>
    [JsonPropertyName("id")]
    [YamlMember(Alias = "id")]
    public string? Id { get; set; }

    /// <summary>
    /// Whether the trigger is enabled. Disabled triggers are not evaluated.
    /// </summary>
    [JsonPropertyName("enabled")]
    [YamlMember(Alias = "enabled")]
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// Optional description for documentation purposes.
    /// </summary>
    [JsonPropertyName("description")]
    [YamlMember(Alias = "description")]
    public string? Description { get; set; }
}

/// <summary>
/// Schedule-based trigger using cron expressions.
/// Allows workflows to run on a schedule (e.g., hourly, daily, weekly).
/// </summary>
public class ScheduleTriggerSpec : TriggerSpec
{
    /// <summary>
    /// Standard 5-field cron expression (minute hour day month weekday).
    /// Examples:
    ///   "0 * * * *"     - Every hour
    ///   "0 0 * * *"     - Every day at midnight
    ///   "0 9 * * 1-5"   - Weekdays at 9am
    ///   "*/15 * * * *"  - Every 15 minutes
    /// </summary>
    [JsonPropertyName("cron")]
    [YamlMember(Alias = "cron")]
    public string Cron { get; set; } = string.Empty;

    /// <summary>
    /// IANA timezone for schedule evaluation (e.g., "America/New_York").
    /// If not specified, UTC is used.
    /// </summary>
    [JsonPropertyName("timezone")]
    [YamlMember(Alias = "timezone")]
    public string? Timezone { get; set; }

    /// <summary>
    /// Static input values to pass to the workflow when triggered.
    /// These are merged with any default inputs defined on the workflow.
    /// </summary>
    [JsonPropertyName("input")]
    [YamlMember(Alias = "input")]
    public Dictionary<string, object>? Input { get; set; }

    /// <summary>
    /// Whether to catch up on missed executions (e.g., after service restart).
    /// If true, missed executions are run immediately on startup.
    /// Default: false (skip missed executions).
    /// </summary>
    [JsonPropertyName("catchUp")]
    [YamlMember(Alias = "catchUp")]
    public bool CatchUp { get; set; } = false;
}

/// <summary>
/// Webhook-based trigger for HTTP callbacks.
/// Allows workflows to be triggered by external HTTP requests with optional HMAC validation.
/// </summary>
public class WebhookTriggerSpec : TriggerSpec
{
    /// <summary>
    /// The path for the webhook endpoint (e.g., "/hooks/order-created").
    /// Must be unique across all webhooks in the system.
    /// </summary>
    [JsonPropertyName("path")]
    [YamlMember(Alias = "path")]
    public string Path { get; set; } = string.Empty;

    /// <summary>
    /// Reference to a Kubernetes secret containing the HMAC key for signature validation.
    /// If not specified, no signature validation is performed.
    /// </summary>
    [JsonPropertyName("secretRef")]
    [YamlMember(Alias = "secretRef")]
    public string? SecretRef { get; set; }

    /// <summary>
    /// Optional filter expression to evaluate against the webhook payload.
    /// Uses template syntax (e.g., "{{payload.type}} == 'order'").
    /// If the filter evaluates to false, the workflow is not triggered.
    /// </summary>
    [JsonPropertyName("filter")]
    [YamlMember(Alias = "filter")]
    public string? Filter { get; set; }

    /// <summary>
    /// HTTP methods allowed for this webhook (default: ["POST"]).
    /// </summary>
    [JsonPropertyName("allowedMethods")]
    [YamlMember(Alias = "allowedMethods")]
    public List<string>? AllowedMethods { get; set; }

    /// <summary>
    /// Input mapping from webhook payload to workflow input.
    /// Maps payload fields to workflow input parameters.
    /// </summary>
    [JsonPropertyName("inputMapping")]
    [YamlMember(Alias = "inputMapping")]
    public Dictionary<string, string>? InputMapping { get; set; }
}

/// <summary>
/// Result of evaluating a trigger.
/// </summary>
public class TriggerEvaluationResult
{
    /// <summary>
    /// Whether the trigger should fire.
    /// </summary>
    public bool ShouldExecute { get; set; }

    /// <summary>
    /// The trigger ID that matched.
    /// </summary>
    public string? TriggerId { get; set; }

    /// <summary>
    /// Type of trigger that fired.
    /// </summary>
    public string? TriggerType { get; set; }

    /// <summary>
    /// Input values to use for the workflow execution.
    /// </summary>
    public Dictionary<string, object>? Input { get; set; }

    /// <summary>
    /// Error message if evaluation failed.
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// Human-readable reason for the evaluation result.
    /// </summary>
    public string? Reason { get; set; }
}

/// <summary>
/// Record of a trigger execution for history tracking.
/// </summary>
public class TriggerExecutionRecord
{
    /// <summary>
    /// Unique identifier for this trigger execution.
    /// </summary>
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Name of the workflow that was triggered.
    /// </summary>
    public string WorkflowName { get; set; } = string.Empty;

    /// <summary>
    /// Namespace of the workflow.
    /// </summary>
    public string? Namespace { get; set; }

    /// <summary>
    /// ID of the trigger that fired.
    /// </summary>
    public string TriggerId { get; set; } = string.Empty;

    /// <summary>
    /// Type of trigger (schedule, webhook, event).
    /// </summary>
    public string TriggerType { get; set; } = string.Empty;

    /// <summary>
    /// When the trigger fired.
    /// </summary>
    public DateTime TriggeredAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// The resulting execution ID (if workflow was executed).
    /// </summary>
    public Guid? ExecutionId { get; set; }

    /// <summary>
    /// Whether the execution was successful.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Error message if the execution failed.
    /// </summary>
    public string? Error { get; set; }

    /// <summary>
    /// Duration of the workflow execution.
    /// </summary>
    public TimeSpan? Duration { get; set; }
}
