using System.Collections.Concurrent;

namespace TestApiServer.Services;

/// <summary>
/// Thread-safe service for managing retry counters
/// Used by fail-once, fail-n-times, flaky, and circuit-breaker patterns
/// </summary>
public class RetryCounterService : IRetryCounterService
{
    private readonly ConcurrentDictionary<string, int> _counters = new();

    /// <inheritdoc />
    public int IncrementAndGet(string key)
    {
        return _counters.AddOrUpdate(key, 1, (_, current) => current + 1);
    }

    /// <inheritdoc />
    public int GetCount(string key)
    {
        return _counters.TryGetValue(key, out var count) ? count : 0;
    }

    /// <inheritdoc />
    public void Reset(string key)
    {
        _counters.TryRemove(key, out _);
    }

    /// <inheritdoc />
    public void ResetAll()
    {
        _counters.Clear();
    }

    /// <inheritdoc />
    public Dictionary<string, int> GetAllCounters()
    {
        return new Dictionary<string, int>(_counters);
    }
}
