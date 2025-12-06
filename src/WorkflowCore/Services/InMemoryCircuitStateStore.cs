using System.Collections.Concurrent;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// In-memory implementation of circuit state store.
/// Suitable for single-instance deployments or as a fallback when Redis is unavailable.
/// </summary>
public class InMemoryCircuitStateStore : ICircuitStateStore
{
    private readonly ConcurrentDictionary<string, CircuitStateInfo> _states = new();
    private readonly ConcurrentDictionary<string, List<DateTime>> _failureTimestamps = new();
    private readonly object _lockObject = new();

    public Task<CircuitStateInfo> GetStateAsync(string serviceName)
    {
        ArgumentNullException.ThrowIfNull(serviceName);

        var state = _states.GetOrAdd(serviceName, _ => new CircuitStateInfo());

        // Return a copy to prevent external modification
        return Task.FromResult(CloneState(state));
    }

    public Task SaveStateAsync(string serviceName, CircuitStateInfo state)
    {
        ArgumentNullException.ThrowIfNull(serviceName);
        ArgumentNullException.ThrowIfNull(state);

        _states[serviceName] = CloneState(state);
        return Task.CompletedTask;
    }

    public Task<CircuitStateInfo> RecordFailureAsync(string serviceName, CircuitBreakerOptions options)
    {
        ArgumentNullException.ThrowIfNull(serviceName);
        ArgumentNullException.ThrowIfNull(options);

        lock (_lockObject)
        {
            var state = _states.GetOrAdd(serviceName, _ => new CircuitStateInfo());
            var timestamps = _failureTimestamps.GetOrAdd(serviceName, _ => new List<DateTime>());
            var now = DateTime.UtcNow;

            state.LastFailureTime = now;

            switch (state.State)
            {
                case CircuitState.Closed:
                    timestamps.Add(now);

                    // Evict old failures outside sampling window
                    var cutoff = now - options.SamplingDuration;
                    timestamps.RemoveAll(t => t < cutoff);

                    state.FailureCount = timestamps.Count;

                    if (timestamps.Count >= options.FailureThreshold)
                    {
                        state.State = CircuitState.Open;
                        state.CircuitOpenedAt = now;
                        state.LastStateTransitionAt = now;
                    }
                    break;

                case CircuitState.HalfOpen:
                    state.State = CircuitState.Open;
                    state.CircuitOpenedAt = now;
                    state.LastStateTransitionAt = now;
                    state.HalfOpenSuccessCount = 0;
                    break;

                case CircuitState.Open:
                    // Already open, just update failure time
                    break;
            }

            _states[serviceName] = state;
            return Task.FromResult(CloneState(state));
        }
    }

    public Task<CircuitStateInfo> RecordSuccessAsync(string serviceName, CircuitBreakerOptions options)
    {
        ArgumentNullException.ThrowIfNull(serviceName);
        ArgumentNullException.ThrowIfNull(options);

        lock (_lockObject)
        {
            var state = _states.GetOrAdd(serviceName, _ => new CircuitStateInfo());

            switch (state.State)
            {
                case CircuitState.Closed:
                    // Reset failure tracking on success
                    if (_failureTimestamps.TryGetValue(serviceName, out var timestamps))
                    {
                        timestamps.Clear();
                    }
                    state.FailureCount = 0;
                    break;

                case CircuitState.HalfOpen:
                    state.HalfOpenSuccessCount++;
                    if (state.HalfOpenSuccessCount >= options.HalfOpenRequests)
                    {
                        state.State = CircuitState.Closed;
                        state.LastStateTransitionAt = DateTime.UtcNow;
                        state.HalfOpenSuccessCount = 0;
                        state.FailureCount = 0;
                        if (_failureTimestamps.TryGetValue(serviceName, out var ts))
                        {
                            ts.Clear();
                        }
                    }
                    break;

                case CircuitState.Open:
                    // Ignore success in open state
                    break;
            }

            _states[serviceName] = state;
            return Task.FromResult(CloneState(state));
        }
    }

    public Task<IReadOnlyDictionary<string, CircuitStateInfo>> GetAllStatesAsync()
    {
        var result = _states.ToDictionary(
            kvp => kvp.Key,
            kvp => CloneState(kvp.Value));

        return Task.FromResult<IReadOnlyDictionary<string, CircuitStateInfo>>(result);
    }

    public Task<bool> RemoveStateAsync(string serviceName)
    {
        ArgumentNullException.ThrowIfNull(serviceName);

        var removed = _states.TryRemove(serviceName, out _);
        _failureTimestamps.TryRemove(serviceName, out _);
        return Task.FromResult(removed);
    }

    public Task ClearAllAsync()
    {
        _states.Clear();
        _failureTimestamps.Clear();
        return Task.CompletedTask;
    }

    public Task<bool> IsHealthyAsync()
    {
        // In-memory store is always healthy
        return Task.FromResult(true);
    }

    private static CircuitStateInfo CloneState(CircuitStateInfo source)
    {
        return new CircuitStateInfo
        {
            State = source.State,
            FailureCount = source.FailureCount,
            HalfOpenSuccessCount = source.HalfOpenSuccessCount,
            LastFailureTime = source.LastFailureTime,
            CircuitOpenedAt = source.CircuitOpenedAt,
            LastStateTransitionAt = source.LastStateTransitionAt
        };
    }
}
