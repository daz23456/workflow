namespace WorkflowCore.Models;

/// <summary>
/// Parsed and resolved circuit breaker options.
/// Used internally by the circuit breaker implementation.
/// </summary>
public class CircuitBreakerOptions
{
    /// <summary>
    /// Number of failures within the sampling duration before opening the circuit.
    /// Default: 5
    /// </summary>
    public int FailureThreshold { get; set; } = 5;

    /// <summary>
    /// Time window for counting failures.
    /// Failures outside this window are not counted.
    /// Default: 60 seconds
    /// </summary>
    public TimeSpan SamplingDuration { get; set; } = TimeSpan.FromSeconds(60);

    /// <summary>
    /// Duration to keep circuit open before transitioning to half-open.
    /// Default: 30 seconds
    /// </summary>
    public TimeSpan BreakDuration { get; set; } = TimeSpan.FromSeconds(30);

    /// <summary>
    /// Number of successful requests in half-open state required to close the circuit.
    /// Default: 3
    /// </summary>
    public int HalfOpenRequests { get; set; } = 3;
}
