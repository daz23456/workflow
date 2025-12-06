using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Registry for managing circuit breakers per task reference.
/// Each task reference gets its own circuit breaker instance.
/// </summary>
public interface ICircuitBreakerRegistry
{
    /// <summary>
    /// Gets or creates a circuit breaker for the specified task reference.
    /// If a circuit breaker already exists, returns the existing instance.
    /// </summary>
    /// <param name="taskRef">The task reference (e.g., "http-get", "payment-service").</param>
    /// <param name="options">Configuration options for the circuit breaker.</param>
    /// <returns>The circuit breaker for the task reference.</returns>
    ICircuitBreaker GetOrCreate(string taskRef, CircuitBreakerOptions options);

    /// <summary>
    /// Tries to get an existing circuit breaker for the specified task reference.
    /// </summary>
    /// <param name="taskRef">The task reference.</param>
    /// <param name="circuitBreaker">The circuit breaker if found, null otherwise.</param>
    /// <returns>True if found, false otherwise.</returns>
    bool TryGet(string taskRef, out ICircuitBreaker? circuitBreaker);

    /// <summary>
    /// Gets all circuit breakers in the registry.
    /// </summary>
    /// <returns>Dictionary of task references to circuit breakers.</returns>
    IReadOnlyDictionary<string, ICircuitBreaker> GetAll();

    /// <summary>
    /// Removes a circuit breaker from the registry.
    /// </summary>
    /// <param name="taskRef">The task reference.</param>
    /// <returns>True if removed, false if not found.</returns>
    bool Remove(string taskRef);

    /// <summary>
    /// Clears all circuit breakers from the registry.
    /// </summary>
    void Clear();
}
