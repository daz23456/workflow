namespace WorkflowCore.Models;

/// <summary>
/// Records the delivery status of an alert sent through a channel.
/// Used for audit trails and preventing duplicate alerts.
/// </summary>
public class AlertHistory
{
    /// <summary>
    /// Unique identifier for this alert delivery record.
    /// </summary>
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// Reference to the anomaly event that triggered this alert.
    /// </summary>
    public string AnomalyEventId { get; set; } = string.Empty;

    /// <summary>
    /// The alert rule that matched and caused this delivery.
    /// </summary>
    public string RuleId { get; set; } = string.Empty;

    /// <summary>
    /// The channel type used for delivery (e.g., "slack", "pagerduty").
    /// </summary>
    public string Channel { get; set; } = string.Empty;

    /// <summary>
    /// Whether the alert was successfully delivered.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// Error message if delivery failed.
    /// </summary>
    public string? ErrorMessage { get; set; }

    /// <summary>
    /// HTTP status code returned by the channel (if applicable).
    /// </summary>
    public int? StatusCode { get; set; }

    /// <summary>
    /// Timestamp when the alert was sent.
    /// </summary>
    public DateTime SentAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Duration of the send operation in milliseconds.
    /// </summary>
    public long DurationMs { get; set; }

    /// <summary>
    /// Workflow name from the anomaly event.
    /// </summary>
    public string WorkflowName { get; set; } = string.Empty;

    /// <summary>
    /// Severity level of the anomaly.
    /// </summary>
    public AnomalySeverity Severity { get; set; }
}
