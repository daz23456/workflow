using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Wrapper for cache entries that includes metadata for stale-while-revalidate pattern.
/// </summary>
internal class CacheEntryWrapper
{
    public TaskExecutionResult? Result { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public TimeSpan Ttl { get; set; }
    public TimeSpan StaleTtl { get; set; }
}

/// <summary>
/// Task cache provider that uses IDistributedCache for storage.
/// Supports in-memory cache (dev) and Redis (prod) via DI configuration.
/// </summary>
public class DistributedTaskCacheProvider : ITaskCacheProvider
{
    private readonly IDistributedCache _cache;
    private readonly ILogger<DistributedTaskCacheProvider> _logger;
    private readonly JsonSerializerOptions _jsonOptions;

    public DistributedTaskCacheProvider(
        IDistributedCache cache,
        ILogger<DistributedTaskCacheProvider> logger)
    {
        _cache = cache ?? throw new ArgumentNullException(nameof(cache));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            WriteIndented = false
        };
    }

    public async Task<TaskExecutionResult?> GetAsync(string cacheKey, CancellationToken cancellationToken = default)
    {
        var bytes = await _cache.GetAsync(cacheKey, cancellationToken);

        if (bytes == null)
        {
            _logger.LogDebug("Cache miss for key: {CacheKey}", cacheKey);
            return null;
        }

        try
        {
            // Try to deserialize as wrapper first (new format with metadata)
            var wrapper = JsonSerializer.Deserialize<CacheEntryWrapper>(bytes, _jsonOptions);
            if (wrapper?.Result != null)
            {
                // Check if entry is still within TTL (not stale)
                var age = DateTime.UtcNow - wrapper.CreatedAtUtc;
                if (age <= wrapper.Ttl)
                {
                    _logger.LogDebug("Cache hit for key: {CacheKey}", cacheKey);
                    return wrapper.Result;
                }
                // Entry is stale - for simple GetAsync, treat as miss
                _logger.LogDebug("Cache stale for key: {CacheKey}", cacheKey);
                return null;
            }

            // Fall back to legacy format (direct TaskExecutionResult)
            var result = JsonSerializer.Deserialize<TaskExecutionResult>(bytes, _jsonOptions);
            _logger.LogDebug("Cache hit (legacy format) for key: {CacheKey}", cacheKey);
            return result;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to deserialize cached result for key: {CacheKey}", cacheKey);
            return null;
        }
    }

    public async Task<CacheEntryWithMetadata?> GetWithMetadataAsync(string cacheKey, CancellationToken cancellationToken = default)
    {
        var bytes = await _cache.GetAsync(cacheKey, cancellationToken);

        if (bytes == null)
        {
            _logger.LogDebug("Cache miss for key: {CacheKey}", cacheKey);
            return null;
        }

        try
        {
            var wrapper = JsonSerializer.Deserialize<CacheEntryWrapper>(bytes, _jsonOptions);
            if (wrapper == null)
            {
                return null;
            }

            var now = DateTime.UtcNow;
            var age = now - wrapper.CreatedAtUtc;
            var isStale = age > wrapper.Ttl;
            var isBeyondStaleTtl = age > wrapper.StaleTtl;

            _logger.LogDebug(
                "Cache hit with metadata for key: {CacheKey}, Age: {Age}, IsStale: {IsStale}, IsBeyondStaleTtl: {IsBeyondStaleTtl}",
                cacheKey, age, isStale, isBeyondStaleTtl);

            return new CacheEntryWithMetadata
            {
                Result = isBeyondStaleTtl ? null : wrapper.Result,
                CreatedAtUtc = wrapper.CreatedAtUtc,
                IsStale = isStale,
                IsBeyondStaleTtl = isBeyondStaleTtl
            };
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to deserialize cached result for key: {CacheKey}", cacheKey);
            return null;
        }
    }

    public async Task SetAsync(string cacheKey, TaskExecutionResult result, TaskCacheOptions options, CancellationToken cancellationToken = default)
    {
        var ttl = options.GetTtlTimeSpan();
        var staleTtl = options.GetStaleTtlTimeSpan();

        // Use the larger of TTL or StaleTTL for cache expiration
        var maxTtl = staleTtl > ttl ? staleTtl : ttl;

        var wrapper = new CacheEntryWrapper
        {
            Result = result,
            CreatedAtUtc = DateTime.UtcNow,
            Ttl = ttl,
            StaleTtl = staleTtl
        };

        var bytes = JsonSerializer.SerializeToUtf8Bytes(wrapper, _jsonOptions);

        var entryOptions = new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = maxTtl
        };

        await _cache.SetAsync(cacheKey, bytes, entryOptions, cancellationToken);
        _logger.LogDebug("Cached result for key: {CacheKey} with TTL: {Ttl}, StaleTTL: {StaleTtl}", cacheKey, ttl, staleTtl);
    }

    public async Task InvalidateAsync(string cacheKey, CancellationToken cancellationToken = default)
    {
        await _cache.RemoveAsync(cacheKey, cancellationToken);
        _logger.LogDebug("Invalidated cache key: {CacheKey}", cacheKey);
    }

    public Task InvalidateByPatternAsync(string pattern, CancellationToken cancellationToken = default)
    {
        // Note: IDistributedCache doesn't support pattern-based deletion natively.
        // This is a limitation of the abstraction. For full pattern support, use Redis directly.
        _logger.LogWarning(
            "Pattern-based cache invalidation is not supported by IDistributedCache. " +
            "Pattern '{Pattern}' will be ignored. Use Redis KEYS/SCAN for pattern support.",
            pattern);

        return Task.CompletedTask;
    }
}
