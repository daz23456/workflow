using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Result of routing an anomaly through the alert system.
/// </summary>
public class AlertRoutingResult
{
    /// <summary>
    /// The anomaly event that was routed.
    /// </summary>
    public string AnomalyEventId { get; set; } = string.Empty;

    /// <summary>
    /// Number of rules that matched this anomaly.
    /// </summary>
    public int MatchedRuleCount { get; set; }

    /// <summary>
    /// Number of rules that were skipped due to cooldown.
    /// </summary>
    public int SkippedDueToCooldown { get; set; }

    /// <summary>
    /// Number of alerts successfully sent.
    /// </summary>
    public int SuccessfulAlerts { get; set; }

    /// <summary>
    /// Number of alerts that failed to send.
    /// </summary>
    public int FailedAlerts { get; set; }

    /// <summary>
    /// Details of each alert delivery attempt.
    /// </summary>
    public List<AlertHistory> AlertHistory { get; set; } = new();
}

/// <summary>
/// Routes anomaly events to appropriate alert channels based on configured rules.
/// </summary>
public interface IAlertRouter
{
    /// <summary>
    /// Routes an anomaly event to matching channels based on configured rules.
    /// </summary>
    /// <param name="anomaly">The anomaly event to route.</param>
    /// <param name="cancellationToken">Cancellation token.</param>
    /// <returns>Result containing delivery status for all matched channels.</returns>
    Task<AlertRoutingResult> RouteAnomalyAsync(
        AnomalyEvent anomaly,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets all configured alert rules.
    /// </summary>
    /// <returns>List of alert rules.</returns>
    IReadOnlyList<AlertRule> GetRules();

    /// <summary>
    /// Adds a new alert rule.
    /// </summary>
    /// <param name="rule">The rule to add.</param>
    void AddRule(AlertRule rule);

    /// <summary>
    /// Removes an alert rule by ID.
    /// </summary>
    /// <param name="ruleId">The ID of the rule to remove.</param>
    /// <returns>True if the rule was found and removed.</returns>
    bool RemoveRule(string ruleId);

    /// <summary>
    /// Gets all registered alert channels.
    /// </summary>
    /// <returns>List of channel types that are available.</returns>
    IReadOnlyList<string> GetAvailableChannels();

    /// <summary>
    /// Checks if an anomaly would be blocked by cooldown for a specific rule.
    /// </summary>
    /// <param name="anomaly">The anomaly to check.</param>
    /// <param name="rule">The rule to check against.</param>
    /// <returns>True if the anomaly is in cooldown.</returns>
    bool IsInCooldown(AnomalyEvent anomaly, AlertRule rule);
}
