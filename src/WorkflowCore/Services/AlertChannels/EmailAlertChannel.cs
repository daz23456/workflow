using System.Diagnostics;
using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WorkflowCore.Models;

namespace WorkflowCore.Services.AlertChannels;

/// <summary>
/// Configuration for the email alert channel.
/// </summary>
public class EmailAlertChannelOptions
{
    public const string SectionName = "Alerting:Channels:Email";

    /// <summary>
    /// SMTP server hostname.
    /// </summary>
    public string? SmtpHost { get; set; }

    /// <summary>
    /// SMTP server port (default: 587 for TLS).
    /// </summary>
    public int SmtpPort { get; set; } = 587;

    /// <summary>
    /// Enable SSL/TLS.
    /// </summary>
    public bool EnableSsl { get; set; } = true;

    /// <summary>
    /// SMTP username for authentication.
    /// </summary>
    public string? Username { get; set; }

    /// <summary>
    /// SMTP password for authentication.
    /// </summary>
    public string? Password { get; set; }

    /// <summary>
    /// From email address.
    /// </summary>
    public string? FromAddress { get; set; }

    /// <summary>
    /// From display name.
    /// </summary>
    public string FromName { get; set; } = "Workflow Alerts";

    /// <summary>
    /// Default recipient email addresses (comma-separated).
    /// </summary>
    public string? ToAddresses { get; set; }

    /// <summary>
    /// Request timeout in seconds.
    /// </summary>
    public int TimeoutSeconds { get; set; } = 30;
}

/// <summary>
/// Alert channel that sends anomaly events via email using SMTP.
/// </summary>
public class EmailAlertChannel : IAlertChannel
{
    private readonly EmailAlertChannelOptions _options;
    private readonly ILogger<EmailAlertChannel> _logger;

    public string ChannelType => "email";

    public EmailAlertChannel(
        IOptions<EmailAlertChannelOptions> options,
        ILogger<EmailAlertChannel> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public bool IsConfigured()
    {
        return !string.IsNullOrEmpty(_options.SmtpHost)
            && !string.IsNullOrEmpty(_options.FromAddress)
            && !string.IsNullOrEmpty(_options.ToAddresses);
    }

    public async Task<AlertSendResult> SendAlertAsync(
        AnomalyEvent anomaly,
        AlertRule rule,
        CancellationToken cancellationToken = default)
    {
        if (!IsConfigured())
        {
            return AlertSendResult.Failed("Email SMTP settings not configured", 0);
        }

        var sw = Stopwatch.StartNew();

        try
        {
            using var message = CreateMailMessage(anomaly, rule);
            using var client = CreateSmtpClient();

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            cts.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds));

            await client.SendMailAsync(message, cts.Token);
            sw.Stop();

            _logger.LogDebug("Email alert sent successfully for {WorkflowName}", anomaly.WorkflowName);
            return AlertSendResult.Succeeded(sw.ElapsedMilliseconds);
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            sw.Stop();
            return AlertSendResult.Failed("SMTP timeout", sw.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            sw.Stop();
            _logger.LogError(ex, "Failed to send email alert for {WorkflowName}", anomaly.WorkflowName);
            return AlertSendResult.Failed(ex.Message, sw.ElapsedMilliseconds);
        }
    }

    private MailMessage CreateMailMessage(AnomalyEvent anomaly, AlertRule rule)
    {
        var severityLabel = anomaly.Severity switch
        {
            AnomalySeverity.Critical => "[CRITICAL]",
            AnomalySeverity.High => "[HIGH]",
            AnomalySeverity.Medium => "[MEDIUM]",
            _ => "[LOW]"
        };

        var subject = $"{severityLabel} Workflow Anomaly: {anomaly.WorkflowName}";

        var body = $@"
<html>
<body style='font-family: Arial, sans-serif; line-height: 1.6;'>
<h2 style='color: {GetSeverityColor(anomaly.Severity)};'>{severityLabel} Workflow Anomaly Detected</h2>

<table style='border-collapse: collapse; width: 100%; max-width: 600px;'>
    <tr>
        <td style='padding: 8px; border: 1px solid #ddd; background: #f5f5f5;'><strong>Workflow</strong></td>
        <td style='padding: 8px; border: 1px solid #ddd;'>{anomaly.WorkflowName}</td>
    </tr>
    <tr>
        <td style='padding: 8px; border: 1px solid #ddd; background: #f5f5f5;'><strong>Task</strong></td>
        <td style='padding: 8px; border: 1px solid #ddd;'>{anomaly.TaskId ?? "N/A"}</td>
    </tr>
    <tr>
        <td style='padding: 8px; border: 1px solid #ddd; background: #f5f5f5;'><strong>Severity</strong></td>
        <td style='padding: 8px; border: 1px solid #ddd;'>{anomaly.Severity}</td>
    </tr>
    <tr>
        <td style='padding: 8px; border: 1px solid #ddd; background: #f5f5f5;'><strong>Metric Type</strong></td>
        <td style='padding: 8px; border: 1px solid #ddd;'>{anomaly.MetricType}</td>
    </tr>
    <tr>
        <td style='padding: 8px; border: 1px solid #ddd; background: #f5f5f5;'><strong>Expected Value</strong></td>
        <td style='padding: 8px; border: 1px solid #ddd;'>{anomaly.ExpectedValue:F2} ms</td>
    </tr>
    <tr>
        <td style='padding: 8px; border: 1px solid #ddd; background: #f5f5f5;'><strong>Actual Value</strong></td>
        <td style='padding: 8px; border: 1px solid #ddd;'>{anomaly.ActualValue:F2} ms</td>
    </tr>
    <tr>
        <td style='padding: 8px; border: 1px solid #ddd; background: #f5f5f5;'><strong>Deviation</strong></td>
        <td style='padding: 8px; border: 1px solid #ddd;'>{anomaly.DeviationPercent:F1}%</td>
    </tr>
    <tr>
        <td style='padding: 8px; border: 1px solid #ddd; background: #f5f5f5;'><strong>Z-Score</strong></td>
        <td style='padding: 8px; border: 1px solid #ddd;'>{anomaly.ZScore:F2}</td>
    </tr>
    <tr>
        <td style='padding: 8px; border: 1px solid #ddd; background: #f5f5f5;'><strong>Detected At</strong></td>
        <td style='padding: 8px; border: 1px solid #ddd;'>{anomaly.DetectedAt:O}</td>
    </tr>
    <tr>
        <td style='padding: 8px; border: 1px solid #ddd; background: #f5f5f5;'><strong>Execution ID</strong></td>
        <td style='padding: 8px; border: 1px solid #ddd;'>{anomaly.ExecutionId}</td>
    </tr>
</table>

<p><strong>Description:</strong> {anomaly.Description}</p>

<hr style='border: none; border-top: 1px solid #ddd; margin: 20px 0;'>
<p style='color: #666; font-size: 12px;'>
    Alert Rule: {rule.Name}<br>
    This is an automated message from Workflow Operator.
</p>
</body>
</html>";

        var message = new MailMessage
        {
            From = new MailAddress(_options.FromAddress!, _options.FromName),
            Subject = subject,
            Body = body,
            IsBodyHtml = true
        };

        foreach (var address in _options.ToAddresses!.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
        {
            message.To.Add(address);
        }

        return message;
    }

    private SmtpClient CreateSmtpClient()
    {
        var client = new SmtpClient(_options.SmtpHost, _options.SmtpPort)
        {
            EnableSsl = _options.EnableSsl
        };

        if (!string.IsNullOrEmpty(_options.Username) && !string.IsNullOrEmpty(_options.Password))
        {
            client.Credentials = new NetworkCredential(_options.Username, _options.Password);
        }

        return client;
    }

    private static string GetSeverityColor(AnomalySeverity severity)
    {
        return severity switch
        {
            AnomalySeverity.Critical => "#FF0000",
            AnomalySeverity.High => "#FF8C00",
            AnomalySeverity.Medium => "#FFD700",
            _ => "#90EE90"
        };
    }
}
