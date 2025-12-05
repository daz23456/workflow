using System.Text.Json.Serialization;

namespace WorkflowGateway.Models;

/// <summary>
/// Represents detailed execution information for a single task within a workflow execution.
/// </summary>
public class TaskExecutionDetail
{
    /// <summary>
    /// The unique identifier of the task within the workflow.
    /// </summary>
    [JsonPropertyName("taskId")]
    public string? TaskId { get; set; }

    /// <summary>
    /// The reference name of the task (e.g., "fetch-user", "send-email").
    /// </summary>
    [JsonPropertyName("taskRef")]
    public string? TaskRef { get; set; }

    /// <summary>
    /// Indicates whether the task executed successfully.
    /// </summary>
    [JsonPropertyName("success")]
    public bool Success { get; set; }

    /// <summary>
    /// The output data produced by the task, deserialized from JSON.
    /// </summary>
    [JsonPropertyName("output")]
    public Dictionary<string, object>? Output { get; set; }

    /// <summary>
    /// List of error messages encountered during task execution.
    /// </summary>
    [JsonPropertyName("errors")]
    public List<string> Errors { get; set; } = new();

    /// <summary>
    /// Structured error information with full context for debugging and support.
    /// Only present when the task failed.
    /// </summary>
    [JsonPropertyName("errorInfo")]
    public TaskErrorInfoResponse? ErrorInfo { get; set; }

    /// <summary>
    /// Number of times the task was retried before succeeding or failing.
    /// </summary>
    [JsonPropertyName("retryCount")]
    public int RetryCount { get; set; }

    /// <summary>
    /// Total duration of task execution in milliseconds.
    /// </summary>
    [JsonPropertyName("durationMs")]
    public long DurationMs { get; set; }

    /// <summary>
    /// Timestamp when the task execution started (UTC).
    /// </summary>
    [JsonPropertyName("startedAt")]
    public DateTime StartedAt { get; set; }

    /// <summary>
    /// Timestamp when the task execution completed (UTC).
    /// </summary>
    [JsonPropertyName("completedAt")]
    public DateTime CompletedAt { get; set; }
}

/// <summary>
/// Structured error information for API response.
/// </summary>
public class TaskErrorInfoResponse
{
    /// <summary>
    /// The unique identifier of the task within the workflow
    /// </summary>
    [JsonPropertyName("taskId")]
    public string TaskId { get; set; } = string.Empty;

    /// <summary>
    /// Human-readable name of the task
    /// </summary>
    [JsonPropertyName("taskName")]
    public string? TaskName { get; set; }

    /// <summary>
    /// Description of what the task does
    /// </summary>
    [JsonPropertyName("taskDescription")]
    public string? TaskDescription { get; set; }

    /// <summary>
    /// Categorized type of error (Timeout, HttpError, NetworkError, etc.)
    /// </summary>
    [JsonPropertyName("errorType")]
    public string ErrorType { get; set; } = "UnknownError";

    /// <summary>
    /// Primary error message
    /// </summary>
    [JsonPropertyName("errorMessage")]
    public string ErrorMessage { get; set; } = string.Empty;

    /// <summary>
    /// Error code if available (e.g., "ECONNREFUSED")
    /// </summary>
    [JsonPropertyName("errorCode")]
    public string? ErrorCode { get; set; }

    /// <summary>
    /// Name of the external service that was being called
    /// </summary>
    [JsonPropertyName("serviceName")]
    public string? ServiceName { get; set; }

    /// <summary>
    /// Full URL that was being called
    /// </summary>
    [JsonPropertyName("serviceUrl")]
    public string? ServiceUrl { get; set; }

    /// <summary>
    /// HTTP method used
    /// </summary>
    [JsonPropertyName("httpMethod")]
    public string? HttpMethod { get; set; }

    /// <summary>
    /// HTTP status code returned
    /// </summary>
    [JsonPropertyName("httpStatusCode")]
    public int? HttpStatusCode { get; set; }

    /// <summary>
    /// Response body snippet for debugging (truncated if large)
    /// </summary>
    [JsonPropertyName("responseBodyPreview")]
    public string? ResponseBodyPreview { get; set; }

    /// <summary>
    /// Number of retry attempts made before failing
    /// </summary>
    [JsonPropertyName("retryAttempts")]
    public int RetryAttempts { get; set; }

    /// <summary>
    /// Whether this error type is retryable
    /// </summary>
    [JsonPropertyName("isRetryable")]
    public bool IsRetryable { get; set; }

    /// <summary>
    /// When the error occurred (UTC)
    /// </summary>
    [JsonPropertyName("occurredAt")]
    public DateTime OccurredAt { get; set; }

    /// <summary>
    /// How long the task ran before the error occurred
    /// </summary>
    [JsonPropertyName("durationUntilErrorMs")]
    public long DurationUntilErrorMs { get; set; }

    /// <summary>
    /// Suggested action to resolve the issue
    /// </summary>
    [JsonPropertyName("suggestion")]
    public string? Suggestion { get; set; }

    /// <summary>
    /// Instructions for support staff
    /// </summary>
    [JsonPropertyName("supportAction")]
    public string? SupportAction { get; set; }

    /// <summary>
    /// Concise summary for logs and alerts
    /// </summary>
    [JsonPropertyName("summary")]
    public string? Summary { get; set; }

    #region Error Response Compliance (RFC 7807)

    /// <summary>
    /// Compliance level of the error response (Compliant, PartiallyCompliant, NonCompliant, Unknown)
    /// </summary>
    [JsonPropertyName("responseCompliance")]
    public string? ResponseCompliance { get; set; }

    /// <summary>
    /// Compliance score (0-100) for the error response format
    /// </summary>
    [JsonPropertyName("responseComplianceScore")]
    public int? ResponseComplianceScore { get; set; }

    /// <summary>
    /// Issues found with the error response format
    /// </summary>
    [JsonPropertyName("responseComplianceIssues")]
    public List<string>? ResponseComplianceIssues { get; set; }

    /// <summary>
    /// Recommendations for improving the error response format
    /// </summary>
    [JsonPropertyName("responseComplianceRecommendations")]
    public List<string>? ResponseComplianceRecommendations { get; set; }

    /// <summary>
    /// Brief compliance summary for display (e.g., "Compliant (85%) - Follows RFC 7807 ProblemDetails standard")
    /// </summary>
    [JsonPropertyName("responseComplianceSummary")]
    public string? ResponseComplianceSummary { get; set; }

    #endregion
}
