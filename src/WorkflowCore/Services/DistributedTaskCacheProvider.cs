using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

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
            var result = JsonSerializer.Deserialize<TaskExecutionResult>(bytes, _jsonOptions);
            _logger.LogDebug("Cache hit for key: {CacheKey}", cacheKey);
            return result;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to deserialize cached result for key: {CacheKey}", cacheKey);
            return null;
        }
    }

    public async Task SetAsync(string cacheKey, TaskExecutionResult result, TaskCacheOptions options, CancellationToken cancellationToken = default)
    {
        var bytes = JsonSerializer.SerializeToUtf8Bytes(result, _jsonOptions);
        var ttl = options.GetTtlTimeSpan();

        var entryOptions = new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = ttl
        };

        await _cache.SetAsync(cacheKey, bytes, entryOptions, cancellationToken);
        _logger.LogDebug("Cached result for key: {CacheKey} with TTL: {Ttl}", cacheKey, ttl);
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
