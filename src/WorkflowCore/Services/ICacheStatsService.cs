namespace WorkflowCore.Services;

/// <summary>
/// Information about a cache key for statistics reporting.
/// </summary>
public class CacheKeyStats
{
    public string Key { get; set; } = string.Empty;
    public int Hits { get; set; }
    public DateTime LastAccess { get; set; }
}

/// <summary>
/// Cache statistics for monitoring.
/// </summary>
public class TaskCacheStats
{
    public long TotalHits { get; set; }
    public long TotalMisses { get; set; }
    public double HitRatio => TotalHits + TotalMisses > 0 ? (double)TotalHits / (TotalHits + TotalMisses) : 0;
    public int TotalEntries { get; set; }
    public long MemoryUsageBytes { get; set; }
    public TimeSpan? OldestEntryAge { get; set; }
    public List<CacheKeyStats> RecentKeys { get; set; } = new();
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Service for collecting and reporting cache statistics.
/// </summary>
public interface ICacheStatsService
{
    /// <summary>
    /// Gets current cache statistics.
    /// </summary>
    Task<TaskCacheStats> GetStatsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Records a cache hit.
    /// </summary>
    void RecordHit(string cacheKey);

    /// <summary>
    /// Records a cache miss.
    /// </summary>
    void RecordMiss(string cacheKey);

    /// <summary>
    /// Invalidates a specific cache key.
    /// </summary>
    Task InvalidateKeyAsync(string cacheKey, CancellationToken cancellationToken = default);

    /// <summary>
    /// Clears all cache entries.
    /// </summary>
    Task ClearAllAsync(CancellationToken cancellationToken = default);
}
