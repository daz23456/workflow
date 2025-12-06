using System.Collections.Concurrent;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Thread-safe registry for managing circuit breakers per task reference.
/// Uses ConcurrentDictionary for thread safety without explicit locking.
/// </summary>
public class CircuitBreakerRegistry : ICircuitBreakerRegistry
{
    private readonly ConcurrentDictionary<string, ICircuitBreaker> _circuitBreakers = new();

    public ICircuitBreaker GetOrCreate(string taskRef, CircuitBreakerOptions options)
    {
        ArgumentNullException.ThrowIfNull(taskRef);
        ArgumentNullException.ThrowIfNull(options);

        return _circuitBreakers.GetOrAdd(taskRef, _ => new CircuitBreaker(options));
    }

    public bool TryGet(string taskRef, out ICircuitBreaker? circuitBreaker)
    {
        ArgumentNullException.ThrowIfNull(taskRef);

        return _circuitBreakers.TryGetValue(taskRef, out circuitBreaker);
    }

    public IReadOnlyDictionary<string, ICircuitBreaker> GetAll()
    {
        return _circuitBreakers.ToDictionary(kvp => kvp.Key, kvp => kvp.Value);
    }

    public bool Remove(string taskRef)
    {
        ArgumentNullException.ThrowIfNull(taskRef);

        return _circuitBreakers.TryRemove(taskRef, out _);
    }

    public void Clear()
    {
        _circuitBreakers.Clear();
    }
}
