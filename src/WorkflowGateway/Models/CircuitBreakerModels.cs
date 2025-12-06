using WorkflowCore.Models;

namespace WorkflowGateway.Models;

/// <summary>
/// Response model for circuit breaker list endpoint.
/// </summary>
public class CircuitListResponse
{
    /// <summary>
    /// List of all circuit breaker states.
    /// </summary>
    public List<CircuitStateResponse> Circuits { get; set; } = new();
}

/// <summary>
/// Response model for individual circuit state.
/// </summary>
public class CircuitStateResponse
{
    /// <summary>
    /// Name of the service this circuit protects.
    /// </summary>
    public string ServiceName { get; set; } = string.Empty;

    /// <summary>
    /// Current state: Closed, Open, or HalfOpen.
    /// </summary>
    public string State { get; set; } = "Closed";

    /// <summary>
    /// Number of failures recorded in current window.
    /// </summary>
    public int FailureCount { get; set; }

    /// <summary>
    /// Number of successful requests in half-open state.
    /// </summary>
    public int HalfOpenSuccessCount { get; set; }

    /// <summary>
    /// Timestamp of last failure.
    /// </summary>
    public DateTime? LastFailureTime { get; set; }

    /// <summary>
    /// Timestamp when circuit opened.
    /// </summary>
    public DateTime? CircuitOpenedAt { get; set; }

    /// <summary>
    /// Timestamp of last state transition.
    /// </summary>
    public DateTime? LastStateTransitionAt { get; set; }

    /// <summary>
    /// Creates a CircuitStateResponse from a CircuitStateInfo.
    /// </summary>
    public static CircuitStateResponse FromState(string serviceName, CircuitStateInfo state)
    {
        return new CircuitStateResponse
        {
            ServiceName = serviceName,
            State = state.State.ToString(),
            FailureCount = state.FailureCount,
            HalfOpenSuccessCount = state.HalfOpenSuccessCount,
            LastFailureTime = state.LastFailureTime,
            CircuitOpenedAt = state.CircuitOpenedAt,
            LastStateTransitionAt = state.LastStateTransitionAt
        };
    }
}

/// <summary>
/// Response model for circuit breaker health endpoint.
/// </summary>
public class CircuitBreakerHealthResponse
{
    /// <summary>
    /// Health status: healthy or unhealthy.
    /// </summary>
    public string Status { get; set; } = "healthy";

    /// <summary>
    /// Error message if unhealthy.
    /// </summary>
    public string? Error { get; set; }
}

/// <summary>
/// Response model for circuit operations (open, close, reset).
/// </summary>
public class CircuitOperationResponse
{
    /// <summary>
    /// Whether the operation succeeded.
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// The new state of the circuit after the operation.
    /// </summary>
    public CircuitStateResponse? Circuit { get; set; }

    /// <summary>
    /// Description of what happened.
    /// </summary>
    public string Message { get; set; } = string.Empty;
}
