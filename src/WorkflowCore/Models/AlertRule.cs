namespace WorkflowCore.Models;

/// <summary>
/// Defines routing rules for alert delivery based on anomaly severity and workflow patterns.
/// </summary>
public class AlertRule
{
    /// <summary>
    /// Unique identifier for the rule.
    /// </summary>
    public string Id { get; set; } = Guid.NewGuid().ToString();

    /// <summary>
    /// Human-readable name for the rule.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Glob pattern to match workflow names (e.g., "order-*", "*-critical").
    /// Null means match all workflows.
    /// </summary>
    public string? WorkflowPattern { get; set; }

    /// <summary>
    /// Minimum severity level to trigger this rule.
    /// Only anomalies with this severity or higher will be routed.
    /// </summary>
    public AnomalySeverity MinSeverity { get; set; } = AnomalySeverity.Medium;

    /// <summary>
    /// List of channel types to send alerts to (e.g., ["slack", "pagerduty"]).
    /// </summary>
    public List<string> Channels { get; set; } = new();

    /// <summary>
    /// Optional cooldown period between alerts for the same workflow/rule combination.
    /// Prevents alert storms during sustained anomalies.
    /// </summary>
    public TimeSpan? CooldownPeriod { get; set; }

    /// <summary>
    /// Whether this rule is active.
    /// </summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// Optional description of when/why this rule should trigger.
    /// </summary>
    public string? Description { get; set; }

    /// <summary>
    /// Priority for rule ordering (higher = evaluated first).
    /// </summary>
    public int Priority { get; set; } = 0;
}
