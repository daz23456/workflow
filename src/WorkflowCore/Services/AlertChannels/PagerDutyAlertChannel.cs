using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WorkflowCore.Models;

namespace WorkflowCore.Services.AlertChannels;

/// <summary>
/// Configuration for the PagerDuty alert channel.
/// </summary>
public class PagerDutyAlertChannelOptions
{
    public const string SectionName = "Alerting:Channels:PagerDuty";

    /// <summary>
    /// PagerDuty integration key (routing key).
    /// </summary>
    public string? RoutingKey { get; set; }

    /// <summary>
    /// PagerDuty Events API v2 endpoint.
    /// </summary>
    public string ApiUrl { get; set; } = "https://events.pagerduty.com/v2/enqueue";

    /// <summary>
    /// Request timeout in seconds.
    /// </summary>
    public int TimeoutSeconds { get; set; } = 30;

    /// <summary>
    /// Source identifier for events.
    /// </summary>
    public string Source { get; set; } = "workflow-operator";
}

/// <summary>
/// Alert channel that sends anomaly events to PagerDuty via Events API v2.
/// </summary>
public class PagerDutyAlertChannel : IAlertChannel
{
    private readonly HttpClient _httpClient;
    private readonly PagerDutyAlertChannelOptions _options;
    private readonly ILogger<PagerDutyAlertChannel> _logger;

    public string ChannelType => "pagerduty";

    public PagerDutyAlertChannel(
        HttpClient httpClient,
        IOptions<PagerDutyAlertChannelOptions> options,
        ILogger<PagerDutyAlertChannel> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public bool IsConfigured()
    {
        return !string.IsNullOrEmpty(_options.RoutingKey);
    }

    public async Task<AlertSendResult> SendAlertAsync(
        AnomalyEvent anomaly,
        AlertRule rule,
        CancellationToken cancellationToken = default)
    {
        if (!IsConfigured())
        {
            return AlertSendResult.Failed("PagerDuty routing key not configured", 0);
        }

        var sw = Stopwatch.StartNew();

        try
        {
            var payload = CreatePagerDutyPayload(anomaly, rule);

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds));

            var response = await _httpClient.PostAsJsonAsync(
                _options.ApiUrl,
                payload,
                new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower },
                cts.Token);

            sw.Stop();

            if (response.IsSuccessStatusCode)
            {
                _logger.LogDebug("PagerDuty alert sent successfully for {WorkflowName}", anomaly.WorkflowName);
                return AlertSendResult.Succeeded(sw.ElapsedMilliseconds, (int)response.StatusCode);
            }

            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogWarning(
                "PagerDuty alert failed with status {StatusCode}: {Error}",
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
            _logger.LogError(ex, "Failed to send PagerDuty alert for {WorkflowName}", anomaly.WorkflowName);
            return AlertSendResult.Failed(ex.Message, sw.ElapsedMilliseconds);
        }
    }

    private object CreatePagerDutyPayload(AnomalyEvent anomaly, AlertRule rule)
    {
        var severity = anomaly.Severity switch
        {
            AnomalySeverity.Critical => "critical",
            AnomalySeverity.High => "error",
            AnomalySeverity.Medium => "warning",
            _ => "info"
        };

        return new
        {
            routing_key = _options.RoutingKey,
            event_action = "trigger",
            dedup_key = $"workflow-anomaly-{anomaly.WorkflowName}-{anomaly.TaskId ?? "workflow"}",
            payload = new
            {
                summary = $"[{anomaly.Severity}] Workflow '{anomaly.WorkflowName}' performance anomaly detected",
                source = _options.Source,
                severity = severity,
                timestamp = anomaly.DetectedAt.ToString("O"),
                component = anomaly.TaskId ?? anomaly.WorkflowName,
                group = anomaly.WorkflowName,
                @class = "performance_anomaly",
                custom_details = new
                {
                    workflow_name = anomaly.WorkflowName,
                    task_id = anomaly.TaskId,
                    execution_id = anomaly.ExecutionId,
                    metric_type = anomaly.MetricType,
                    actual_value = anomaly.ActualValue,
                    expected_value = anomaly.ExpectedValue,
                    z_score = anomaly.ZScore,
                    deviation_percent = anomaly.DeviationPercent,
                    rule_name = rule.Name,
                    description = anomaly.Description
                }
            }
        };
    }
}
