using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WorkflowCore.Models;

namespace WorkflowCore.Services.AlertChannels;

/// <summary>
/// Configuration for the Slack alert channel.
/// </summary>
public class SlackAlertChannelOptions
{
    public const string SectionName = "Alerting:Channels:Slack";

    /// <summary>
    /// Slack webhook URL (from Slack app configuration).
    /// </summary>
    public string? WebhookUrl { get; set; }

    /// <summary>
    /// Optional channel to post to (overrides webhook default).
    /// </summary>
    public string? Channel { get; set; }

    /// <summary>
    /// Optional username for the bot.
    /// </summary>
    public string Username { get; set; } = "Workflow Alerts";

    /// <summary>
    /// Optional emoji icon (e.g., ":warning:").
    /// </summary>
    public string IconEmoji { get; set; } = ":rotating_light:";

    /// <summary>
    /// Request timeout in seconds.
    /// </summary>
    public int TimeoutSeconds { get; set; } = 30;
}

/// <summary>
/// Alert channel that sends anomaly events to Slack via incoming webhooks.
/// </summary>
public class SlackAlertChannel : IAlertChannel
{
    private readonly HttpClient _httpClient;
    private readonly SlackAlertChannelOptions _options;
    private readonly ILogger<SlackAlertChannel> _logger;

    public string ChannelType => "slack";

    public SlackAlertChannel(
        HttpClient httpClient,
        IOptions<SlackAlertChannelOptions> options,
        ILogger<SlackAlertChannel> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public bool IsConfigured()
    {
        return !string.IsNullOrEmpty(_options.WebhookUrl);
    }

    public async Task<AlertSendResult> SendAlertAsync(
        AnomalyEvent anomaly,
        AlertRule rule,
        CancellationToken cancellationToken = default)
    {
        if (!IsConfigured())
        {
            return AlertSendResult.Failed("Slack webhook URL not configured", 0);
        }

        var sw = Stopwatch.StartNew();

        try
        {
            var payload = CreateSlackPayload(anomaly, rule);

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds));

            var response = await _httpClient.PostAsJsonAsync(
                _options.WebhookUrl,
                payload,
                new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower },
                cts.Token);

            sw.Stop();

            if (response.IsSuccessStatusCode)
            {
                _logger.LogDebug("Slack alert sent successfully for {WorkflowName}", anomaly.WorkflowName);
                return AlertSendResult.Succeeded(sw.ElapsedMilliseconds, (int)response.StatusCode);
            }

            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogWarning(
                "Slack alert failed with status {StatusCode}: {Error}",
                response.StatusCode, errorBody);
            return AlertSendResult.Failed(
                $"HTTP {(int)response.StatusCode}: {errorBody}",
                sw.ElapsedMilliseconds,
                (int)response.StatusCode);
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            sw.Stop();
            return AlertSendResult.Failed("Request timeout", sw.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogError(ex, "Failed to send Slack alert for {WorkflowName}", anomaly.WorkflowName);
            return AlertSendResult.Failed(ex.Message, sw.ElapsedMilliseconds);
        }
    }

    private object CreateSlackPayload(AnomalyEvent anomaly, AlertRule rule)
    {
        var severityEmoji = anomaly.Severity switch
        {
            AnomalySeverity.Critical => ":red_circle:",
            AnomalySeverity.High => ":orange_circle:",
            AnomalySeverity.Medium => ":yellow_circle:",
            _ => ":white_circle:"
        };

        var severityColor = anomaly.Severity switch
        {
            AnomalySeverity.Critical => "#FF0000",
            AnomalySeverity.High => "#FF8C00",
            AnomalySeverity.Medium => "#FFD700",
            _ => "#90EE90"
        };

        var attachment = new
        {
            color = severityColor,
            fallback = $"[{anomaly.Severity}] Anomaly detected in workflow '{anomaly.WorkflowName}'",
            title = $"{severityEmoji} Workflow Anomaly Detected",
            text = anomaly.Description,
            fields = new[]
            {
                new { title = "Workflow", value = anomaly.WorkflowName, @short = true },
                new { title = "Severity", value = anomaly.Severity.ToString(), @short = true },
                new { title = "Task", value = anomaly.TaskId ?? "N/A", @short = true },
                new { title = "Metric", value = anomaly.MetricType, @short = true },
                new { title = "Expected", value = $"{anomaly.ExpectedValue:F2}ms", @short = true },
                new { title = "Actual", value = $"{anomaly.ActualValue:F2}ms", @short = true },
                new { title = "Deviation", value = $"{anomaly.DeviationPercent:F1}%", @short = true },
                new { title = "Z-Score", value = $"{anomaly.ZScore:F2}", @short = true }
            },
            footer = $"Rule: {rule.Name}",
            ts = new DateTimeOffset(anomaly.DetectedAt).ToUnixTimeSeconds()
        };

        var payload = new Dictionary<string, object>
        {
            ["username"] = _options.Username,
            ["icon_emoji"] = _options.IconEmoji,
            ["attachments"] = new[] { attachment }
        };

        if (!string.IsNullOrEmpty(_options.Channel))
        {
            payload["channel"] = _options.Channel;
        }

        return payload;
    }
}
