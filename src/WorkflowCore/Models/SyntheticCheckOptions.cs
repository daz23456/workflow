namespace WorkflowCore.Models;

/// <summary>
/// Configuration options for synthetic health checks.
/// </summary>
public class SyntheticCheckOptions
{
    /// <summary>
    /// Configuration section name in appsettings.json.
    /// </summary>
    public const string SectionName = "SyntheticCheck";

    /// <summary>
    /// Whether synthetic health checks are enabled.
    /// </summary>
    public bool Enabled { get; set; } = true;

    /// <summary>
    /// Interval between health check cycles in minutes.
    /// </summary>
    public int IntervalMinutes { get; set; } = 5;

    /// <summary>
    /// Timeout for individual health check requests in seconds.
    /// </summary>
    public int TimeoutSeconds { get; set; } = 10;

    /// <summary>
    /// Service account token for authentication when replaying requests.
    /// Can be set via environment variable: HEALTH_CHECK_TOKEN
    /// </summary>
    public string? ServiceAccountToken { get; set; }

    /// <summary>
    /// Whether to only check GET requests (safer, no side effects).
    /// </summary>
    public bool OnlyCheckGetRequests { get; set; } = true;

    /// <summary>
    /// Time-to-live for cached health status in seconds.
    /// </summary>
    public int CacheTTLSeconds { get; set; } = 300;
}
