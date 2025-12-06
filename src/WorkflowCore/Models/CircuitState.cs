namespace WorkflowCore.Models;

/// <summary>
/// Represents the possible states of a circuit breaker.
/// </summary>
public enum CircuitState
{
    /// <summary>
    /// Circuit is closed - requests flow through normally.
    /// Failures are tracked and counted.
    /// </summary>
    Closed,

    /// <summary>
    /// Circuit is open - requests are blocked immediately.
    /// No calls are made to the protected service.
    /// </summary>
    Open,

    /// <summary>
    /// Circuit is half-open - limited test requests are allowed.
    /// Successful requests transition to Closed, failures transition to Open.
    /// </summary>
    HalfOpen
}

/// <summary>
/// Detailed state information for a circuit breaker instance.
/// </summary>
public class CircuitStateInfo
{
    /// <summary>
    /// Current state of the circuit breaker.
    /// </summary>
    public CircuitState State { get; set; } = CircuitState.Closed;

    /// <summary>
    /// Number of consecutive failures recorded.
    /// </summary>
    public int FailureCount { get; set; }

    /// <summary>
    /// Number of successful requests in half-open state.
    /// </summary>
    public int HalfOpenSuccessCount { get; set; }

    /// <summary>
    /// Timestamp of the most recent failure.
    /// </summary>
    public DateTime? LastFailureTime { get; set; }

    /// <summary>
    /// Timestamp when the circuit transitioned to open state.
    /// </summary>
    public DateTime? CircuitOpenedAt { get; set; }

    /// <summary>
    /// Timestamp of the last state transition.
    /// </summary>
    public DateTime? LastStateTransitionAt { get; set; }
}
