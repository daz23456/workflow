using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Result of attempting to send an alert through a channel.
/// </summary>
public class AlertSendResult
{
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
    /// Duration of the send operation in milliseconds.
    /// </summary>
    public long DurationMs { get; set; }

    public static AlertSendResult Succeeded(long durationMs, int? statusCode = null) => new()
    {
        Success = true,
        DurationMs = durationMs,
        StatusCode = statusCode
    };

    public static AlertSendResult Failed(string errorMessage, long durationMs, int? statusCode = null) => new()
    {
        Success = false,
        ErrorMessage = errorMessage,
        DurationMs = durationMs,
        StatusCode = statusCode
    };
}

/// <summary>
/// Interface for alert delivery channels (Slack, PagerDuty, webhook, email, etc.).
/// </summary>
public interface IAlertChannel
{
    /// <summary>
    /// Unique identifier for this channel type (e.g., "slack", "pagerduty", "webhook", "email").
    /// </summary>
    string ChannelType { get; }

    /// <summary>
    /// Sends an alert through this channel.
    /// </summary>
    /// <param name="anomaly">The anomaly event to alert on.</param>
    /// <param name="rule">The alert rule that triggered this delivery.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result indicating success or failure with details.</returns>
    Task<AlertSendResult> SendAlertAsync(
        AnomalyEvent anomaly,
        AlertRule rule,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Checks if this channel is properly configured and available.
    /// </summary>
    /// <returns>True if the channel can send alerts.</returns>
    bool IsConfigured();
}
