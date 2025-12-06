using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WorkflowCore.Models;

namespace WorkflowCore.Services.AlertChannels;

/// <summary>
/// Configuration for the webhook alert channel.
/// </summary>
public class WebhookAlertChannelOptions
{
    public const string SectionName = "Alerting:Channels:Webhook";

    /// <summary>
    /// URL to POST alerts to.
    /// </summary>
    public string? Url { get; set; }

    /// <summary>
    /// Optional timeout in seconds (default: 30).
    /// </summary>
    public int TimeoutSeconds { get; set; } = 30;

    /// <summary>
    /// Optional custom headers to include.
    /// </summary>
    public Dictionary<string, string> Headers { get; set; } = new();
}

/// <summary>
/// Alert channel that sends anomaly events to a generic webhook endpoint.
/// </summary>
public class WebhookAlertChannel : IAlertChannel
{
    private readonly HttpClient _httpClient;
    private readonly WebhookAlertChannelOptions _options;
    private readonly ILogger<WebhookAlertChannel> _logger;

    public string ChannelType => "webhook";

    public WebhookAlertChannel(
        HttpClient httpClient,
        IOptions<WebhookAlertChannelOptions> options,
        ILogger<WebhookAlertChannel> logger)
    {
        _httpClient = httpClient;
        _options = options.Value;
        _logger = logger;
    }

    public bool IsConfigured()
    {
        return !string.IsNullOrEmpty(_options.Url);
    }

    public async Task<AlertSendResult> SendAlertAsync(
        AnomalyEvent anomaly,
        AlertRule rule,
        CancellationToken cancellationToken = default)
    {
        if (!IsConfigured())
        {
            return AlertSendResult.Failed("Webhook URL not configured", 0);
        }

        var sw = Stopwatch.StartNew();

        try
        {
            var payload = CreatePayload(anomaly, rule);

            using var request = new HttpRequestMessage(HttpMethod.Post, _options.Url);
            request.Content = JsonContent.Create(payload, options: new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            // Add custom headers
            foreach (var (key, value) in _options.Headers)
            {
                request.Headers.TryAddWithoutValidation(key, value);
            }

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds));

            var response = await _httpClient.SendAsync(request, cts.Token);
            sw.Stop();

            if (response.IsSuccessStatusCode)
            {
                _logger.LogDebug("Webhook alert sent successfully for {WorkflowName}", anomaly.WorkflowName);
                return AlertSendResult.Succeeded(sw.ElapsedMilliseconds, (int)response.StatusCode);
            }

            var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
            _logger.LogWarning(
                "Webhook alert failed with status {StatusCode}: {Error}",
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
            _logger.LogError(ex, "Failed to send webhook alert for {WorkflowName}", anomaly.WorkflowName);
            return AlertSendResult.Failed(ex.Message, sw.ElapsedMilliseconds);
        }
    }

    protected virtual object CreatePayload(AnomalyEvent anomaly, AlertRule rule)
    {
        return new
        {
            EventType = "workflow_anomaly",
            anomaly.Id,
            anomaly.WorkflowName,
            anomaly.TaskId,
            anomaly.ExecutionId,
            Severity = anomaly.Severity.ToString(),
            anomaly.MetricType,
            anomaly.ActualValue,
            anomaly.ExpectedValue,
            anomaly.ZScore,
            anomaly.DeviationPercent,
            anomaly.DetectedAt,
            anomaly.Description,
            Rule = new
            {
                rule.Id,
                rule.Name
            }
        };
    }
}
