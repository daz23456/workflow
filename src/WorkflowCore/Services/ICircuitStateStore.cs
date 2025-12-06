using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Interface for persisting circuit breaker state.
/// Enables shared circuit state across multiple service instances.
/// </summary>
public interface ICircuitStateStore
{
    /// <summary>
    /// Gets the circuit state for a given service name.
    /// Returns a default closed state if not found.
    /// </summary>
    Task<CircuitStateInfo> GetStateAsync(string serviceName);

    /// <summary>
    /// Saves the circuit state for a given service name.
    /// </summary>
    Task SaveStateAsync(string serviceName, CircuitStateInfo state);

    /// <summary>
    /// Atomically records a failure and returns the updated state.
    /// </summary>
    Task<CircuitStateInfo> RecordFailureAsync(string serviceName, CircuitBreakerOptions options);

    /// <summary>
    /// Atomically records a success and returns the updated state.
    /// </summary>
    Task<CircuitStateInfo> RecordSuccessAsync(string serviceName, CircuitBreakerOptions options);

    /// <summary>
    /// Gets all circuit states in the store.
    /// </summary>
    Task<IReadOnlyDictionary<string, CircuitStateInfo>> GetAllStatesAsync();

    /// <summary>
    /// Removes a circuit state from the store.
    /// </summary>
    Task<bool> RemoveStateAsync(string serviceName);

    /// <summary>
    /// Clears all circuit states.
    /// </summary>
    Task ClearAllAsync();

    /// <summary>
    /// Checks if the store is healthy (e.g., Redis connection is active).
    /// </summary>
    Task<bool> IsHealthyAsync();
}
