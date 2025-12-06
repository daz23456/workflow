using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Interface for circuit breaker pattern implementation.
/// Provides fault tolerance by preventing repeated calls to a failing service.
/// </summary>
public interface ICircuitBreaker
{
    /// <summary>
    /// Checks if the circuit allows execution.
    /// May transition the circuit from Open to HalfOpen if break duration has elapsed.
    /// </summary>
    /// <returns>True if execution is allowed, false if circuit is open.</returns>
    bool CanExecute();

    /// <summary>
    /// Records a successful execution.
    /// In Closed state: resets failure count.
    /// In HalfOpen state: increments success count, may transition to Closed.
    /// </summary>
    void RecordSuccess();

    /// <summary>
    /// Records a failed execution.
    /// In Closed state: increments failure count, may transition to Open.
    /// In HalfOpen state: immediately transitions to Open.
    /// </summary>
    void RecordFailure();

    /// <summary>
    /// Gets the current state information of the circuit breaker.
    /// </summary>
    /// <returns>A copy of the current circuit state information.</returns>
    CircuitStateInfo GetState();

    /// <summary>
    /// Forces the circuit to open state, blocking all executions.
    /// </summary>
    void ForceOpen();

    /// <summary>
    /// Forces the circuit to closed state, allowing all executions.
    /// </summary>
    void ForceClose();

    /// <summary>
    /// Resets all circuit breaker state to initial values.
    /// </summary>
    void Reset();
}
