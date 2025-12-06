using System.Diagnostics;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Routes anomaly events to appropriate alert channels based on configured rules.
/// Supports workflow pattern matching, severity filtering, and cooldown periods.
/// </summary>
public class AlertRouter : IAlertRouter
{
    private readonly IReadOnlyDictionary<string, IAlertChannel> _channels;
    private readonly IMemoryCache _cooldownCache;
    private readonly ILogger<AlertRouter> _logger;
    private readonly List<AlertRule> _rules = new();
    private readonly object _rulesLock = new();

    public AlertRouter(
        IEnumerable<IAlertChannel> channels,
        IMemoryCache cooldownCache,
        ILogger<AlertRouter> logger)
    {
        _channels = channels.ToDictionary(c => c.ChannelType, c => c, StringComparer.OrdinalIgnoreCase);
        _cooldownCache = cooldownCache;
        _logger = logger;
    }

    public async Task<AlertRoutingResult> RouteAnomalyAsync(
        AnomalyEvent anomaly,
        CancellationToken cancellationToken = default)
    {
        var result = new AlertRoutingResult
        {
            AnomalyEventId = anomaly.Id
        };

        var matchingRules = GetMatchingRules(anomaly);
        result.MatchedRuleCount = matchingRules.Count;

        foreach (var rule in matchingRules)
        {
            if (IsInCooldown(anomaly, rule))
            {
                result.SkippedDueToCooldown++;
                _logger.LogDebug(
                    "Skipping alert for workflow {WorkflowName} rule {RuleId} due to cooldown",
                    anomaly.WorkflowName, rule.Id);
                continue;
            }

            foreach (var channelType in rule.Channels)
            {
                var history = await SendToChannelAsync(anomaly, rule, channelType, cancellationToken);
                if (history != null)
                {
                    result.AlertHistory.Add(history);
                    if (history.Success)
                    {
                        result.SuccessfulAlerts++;
                    }
                    else
                    {
                        result.FailedAlerts++;
                    }
                }
            }

            // Set cooldown after successful routing (even if some channels failed)
            if (rule.CooldownPeriod.HasValue)
            {
                SetCooldown(anomaly, rule);
            }
        }

        return result;
    }

    public IReadOnlyList<AlertRule> GetRules()
    {
        lock (_rulesLock)
        {
            return _rules.ToList().AsReadOnly();
        }
    }

    public void AddRule(AlertRule rule)
    {
        lock (_rulesLock)
        {
            _rules.Add(rule);
        }
        _logger.LogInformation("Added alert rule: {RuleName} (ID: {RuleId})", rule.Name, rule.Id);
    }

    public bool RemoveRule(string ruleId)
    {
        lock (_rulesLock)
        {
            var index = _rules.FindIndex(r => r.Id == ruleId);
            if (index >= 0)
            {
                var rule = _rules[index];
                _rules.RemoveAt(index);
                _logger.LogInformation("Removed alert rule: {RuleName} (ID: {RuleId})", rule.Name, ruleId);
                return true;
            }
        }
        return false;
    }

    public IReadOnlyList<string> GetAvailableChannels()
    {
        return _channels.Keys.ToList().AsReadOnly();
    }

    public bool IsInCooldown(AnomalyEvent anomaly, AlertRule rule)
    {
        if (!rule.CooldownPeriod.HasValue)
        {
            return false;
        }

        var cacheKey = GetCooldownKey(anomaly.WorkflowName, rule.Id);
        return _cooldownCache.TryGetValue(cacheKey, out _);
    }

    private List<AlertRule> GetMatchingRules(AnomalyEvent anomaly)
    {
        List<AlertRule> rules;
        lock (_rulesLock)
        {
            rules = _rules.ToList();
        }

        return rules
            .Where(r => r.Enabled)
            .Where(r => MatchesWorkflowPattern(anomaly.WorkflowName, r.WorkflowPattern))
            .Where(r => anomaly.Severity >= r.MinSeverity)
            .OrderByDescending(r => r.Priority)
            .ToList();
    }

    private static bool MatchesWorkflowPattern(string workflowName, string? pattern)
    {
        if (string.IsNullOrEmpty(pattern))
        {
            return true; // null or empty pattern matches all
        }

        // Convert glob pattern to regex
        var regexPattern = "^" + Regex.Escape(pattern).Replace("\\*", ".*") + "$";
        return Regex.IsMatch(workflowName, regexPattern, RegexOptions.IgnoreCase);
    }

    private async Task<AlertHistory?> SendToChannelAsync(
        AnomalyEvent anomaly,
        AlertRule rule,
        string channelType,
        CancellationToken cancellationToken)
    {
        if (!_channels.TryGetValue(channelType, out var channel))
        {
            _logger.LogWarning("Unknown alert channel type: {ChannelType}", channelType);
            return null;
        }

        if (!channel.IsConfigured())
        {
            _logger.LogWarning("Alert channel {ChannelType} is not configured", channelType);
            return null;
        }

        var sw = Stopwatch.StartNew();
        var history = new AlertHistory
        {
            AnomalyEventId = anomaly.Id,
            RuleId = rule.Id,
            Channel = channelType,
            WorkflowName = anomaly.WorkflowName,
            Severity = anomaly.Severity,
            SentAt = DateTime.UtcNow
        };

        try
        {
            var result = await channel.SendAlertAsync(anomaly, rule, cancellationToken);
            sw.Stop();

            history.Success = result.Success;
            history.ErrorMessage = result.ErrorMessage;
            history.StatusCode = result.StatusCode;
            history.DurationMs = result.DurationMs > 0 ? result.DurationMs : sw.ElapsedMilliseconds;

            if (result.Success)
            {
                _logger.LogInformation(
                    "Alert sent successfully via {Channel} for workflow {WorkflowName} (rule: {RuleName})",
                    channelType, anomaly.WorkflowName, rule.Name);
            }
            else
            {
                _logger.LogWarning(
                    "Alert failed via {Channel} for workflow {WorkflowName}: {Error}",
                    channelType, anomaly.WorkflowName, result.ErrorMessage);
            }
        }
        catch (Exception ex)
        {
            sw.Stop();
            history.Success = false;
            history.ErrorMessage = ex.Message;
            history.DurationMs = sw.ElapsedMilliseconds;

            _logger.LogError(ex,
                "Exception sending alert via {Channel} for workflow {WorkflowName}",
                channelType, anomaly.WorkflowName);
        }

        return history;
    }

    private void SetCooldown(AnomalyEvent anomaly, AlertRule rule)
    {
        if (!rule.CooldownPeriod.HasValue)
        {
            return;
        }

        var cacheKey = GetCooldownKey(anomaly.WorkflowName, rule.Id);
        var options = new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = rule.CooldownPeriod.Value
        };
        _cooldownCache.Set(cacheKey, DateTime.UtcNow, options);

        _logger.LogDebug(
            "Set cooldown for workflow {WorkflowName} rule {RuleId} for {CooldownMinutes} minutes",
            anomaly.WorkflowName, rule.Id, rule.CooldownPeriod.Value.TotalMinutes);
    }

    private static string GetCooldownKey(string workflowName, string ruleId)
    {
        return $"alert-cooldown:{workflowName}:{ruleId}";
    }
}
