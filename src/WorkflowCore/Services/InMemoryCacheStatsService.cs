using System.Collections.Concurrent;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;

namespace WorkflowCore.Services;

/// <summary>
/// In-memory implementation of cache statistics service.
/// Tracks cache hits, misses, and key access patterns.
/// </summary>
public class InMemoryCacheStatsService : ICacheStatsService
{
    private readonly ITaskCacheProvider _cacheProvider;
    private readonly ILogger<InMemoryCacheStatsService> _logger;
    private readonly ConcurrentDictionary<string, KeyStats> _keyStats = new();
    private long _totalHits;
    private long _totalMisses;

    private class KeyStats
    {
        public int Hits { get; set; }
        public DateTime LastAccess { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public InMemoryCacheStatsService(
        ITaskCacheProvider cacheProvider,
        ILogger<InMemoryCacheStatsService> logger)
    {
        _cacheProvider = cacheProvider ?? throw new ArgumentNullException(nameof(cacheProvider));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public Task<TaskCacheStats> GetStatsAsync(CancellationToken cancellationToken = default)
    {
        var now = DateTime.UtcNow;
        var recentKeys = _keyStats
            .OrderByDescending(kv => kv.Value.LastAccess)
            .Take(10)
            .Select(kv => new CacheKeyStats
            {
                Key = kv.Key,
                Hits = kv.Value.Hits,
                LastAccess = kv.Value.LastAccess
            })
            .ToList();

        var oldestKey = _keyStats.Values.MinBy(v => v.CreatedAt);
        var oldestAge = oldestKey != null ? now - oldestKey.CreatedAt : (TimeSpan?)null;

        var stats = new TaskCacheStats
        {
            TotalHits = Interlocked.Read(ref _totalHits),
            TotalMisses = Interlocked.Read(ref _totalMisses),
            TotalEntries = _keyStats.Count,
            MemoryUsageBytes = EstimateMemoryUsage(),
            OldestEntryAge = oldestAge,
            RecentKeys = recentKeys,
            GeneratedAt = now
        };

        return Task.FromResult(stats);
    }

    public void RecordHit(string cacheKey)
    {
        Interlocked.Increment(ref _totalHits);

        _keyStats.AddOrUpdate(
            cacheKey,
            _ => new KeyStats { Hits = 1, LastAccess = DateTime.UtcNow, CreatedAt = DateTime.UtcNow },
            (_, existing) =>
            {
                existing.Hits++;
                existing.LastAccess = DateTime.UtcNow;
                return existing;
            });
    }

    public void RecordMiss(string cacheKey)
    {
        Interlocked.Increment(ref _totalMisses);

        // Update last access for tracking purposes
        _keyStats.AddOrUpdate(
            cacheKey,
            _ => new KeyStats { Hits = 0, LastAccess = DateTime.UtcNow, CreatedAt = DateTime.UtcNow },
            (_, existing) =>
            {
                existing.LastAccess = DateTime.UtcNow;
                return existing;
            });
    }

    public async Task InvalidateKeyAsync(string cacheKey, CancellationToken cancellationToken = default)
    {
        await _cacheProvider.InvalidateAsync(cacheKey, cancellationToken);
        _keyStats.TryRemove(cacheKey, out _);
        _logger.LogInformation("Invalidated cache key: {CacheKey}", cacheKey);
    }

    public async Task ClearAllAsync(CancellationToken cancellationToken = default)
    {
        // Clear all tracked keys
        foreach (var key in _keyStats.Keys.ToList())
        {
            await _cacheProvider.InvalidateAsync(key, cancellationToken);
        }

        _keyStats.Clear();
        Interlocked.Exchange(ref _totalHits, 0);
        Interlocked.Exchange(ref _totalMisses, 0);
        _logger.LogInformation("Cleared all cache entries");
    }

    private long EstimateMemoryUsage()
    {
        // Rough estimate: average key length * entry count * some overhead factor
        const int averageKeyBytes = 100;
        const int averageValueBytes = 500;
        const int overheadBytes = 50;

        return _keyStats.Count * (averageKeyBytes + averageValueBytes + overheadBytes);
    }
}
