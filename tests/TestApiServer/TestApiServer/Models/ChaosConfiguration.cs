namespace TestApiServer.Models;

/// <summary>
/// Configuration for chaos engineering modes
/// </summary>
public class ChaosConfiguration
{
    public ChaosMode Mode { get; set; } = ChaosMode.Normal;

    /// <summary>Probability of failure (0.0 to 1.0) for RandomFailure mode</summary>
    public double FailureProbability { get; set; } = 0.3;

    /// <summary>HTTP status codes to return on failure</summary>
    public int[] FailureStatusCodes { get; set; } = [500, 502, 503, 504];

    /// <summary>Number of times to fail before succeeding (Intermittent mode)</summary>
    public int FailCountBeforeSuccess { get; set; } = 3;

    /// <summary>Minimum delay in milliseconds (RandomDelay mode)</summary>
    public int MinDelayMs { get; set; } = 0;

    /// <summary>Maximum delay in milliseconds (RandomDelay mode)</summary>
    public int MaxDelayMs { get; set; } = 5000;

    /// <summary>Regex pattern to target specific endpoints</summary>
    public string? PathPattern { get; set; }

    /// <summary>Specific endpoints to affect</summary>
    public string[]? TargetEndpoints { get; set; }

    /// <summary>Probability of delay in TotalChaos mode</summary>
    public double DelayProbability { get; set; } = 0.5;
}

/// <summary>
/// Chaos engineering modes
/// </summary>
public enum ChaosMode
{
    /// <summary>No chaos - all requests succeed normally</summary>
    Normal,

    /// <summary>Random failures at configured rate</summary>
    RandomFailure,

    /// <summary>Random delays on all requests</summary>
    RandomDelay,

    /// <summary>All requests fail</summary>
    AbsoluteFailure,

    /// <summary>Fail N times then succeed (per endpoint)</summary>
    Intermittent,

    /// <summary>Random mix of failures and delays</summary>
    TotalChaos
}
