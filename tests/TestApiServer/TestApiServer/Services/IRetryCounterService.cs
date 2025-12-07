namespace TestApiServer.Services;

/// <summary>
/// Service for managing retry counters used by fail-once, fail-n-times, and flaky patterns
/// </summary>
public interface IRetryCounterService
{
    /// <summary>
    /// Increments the counter for the given key and returns the new value
    /// </summary>
    int IncrementAndGet(string key);

    /// <summary>
    /// Gets the current counter value for the given key (0 if not set)
    /// </summary>
    int GetCount(string key);

    /// <summary>
    /// Resets the counter for the given key to 0
    /// </summary>
    void Reset(string key);

    /// <summary>
    /// Resets all counters to 0
    /// </summary>
    void ResetAll();

    /// <summary>
    /// Gets a snapshot of all current counters
    /// </summary>
    Dictionary<string, int> GetAllCounters();
}
