using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Represents a cached entry with metadata for stale-while-revalidate pattern.
/// </summary>
public class CacheEntryWithMetadata
{
    /// <summary>
    /// The cached task execution result.
    /// Null if the entry doesn't exist or is beyond stale TTL.
    /// </summary>
    public TaskExecutionResult? Result { get; set; }

    /// <summary>
    /// When the cache entry was created.
    /// </summary>
    public DateTime CreatedAtUtc { get; set; }

    /// <summary>
    /// Whether the entry is stale (past TTL but within stale TTL).
    /// </summary>
    public bool IsStale { get; set; }

    /// <summary>
    /// Whether the entry is beyond the stale TTL and should not be served.
    /// </summary>
    public bool IsBeyondStaleTtl { get; set; }
}

/// <summary>
/// Interface for task-level caching providers.
/// Implementations can use in-memory, Redis, or other distributed cache backends.
/// </summary>
public interface ITaskCacheProvider
{
    /// <summary>
    /// Retrieves a cached task execution result by key.
    /// </summary>
    /// <param name="cacheKey">The cache key</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The cached result, or null if not found or expired</returns>
    Task<TaskExecutionResult?> GetAsync(string cacheKey, CancellationToken cancellationToken = default);

    /// <summary>
    /// Retrieves a cached entry with metadata for stale-while-revalidate pattern.
    /// </summary>
    /// <param name="cacheKey">The cache key</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Cache entry with metadata including staleness info</returns>
    Task<CacheEntryWithMetadata?> GetWithMetadataAsync(string cacheKey, CancellationToken cancellationToken = default);

    /// <summary>
    /// Stores a task execution result in the cache.
    /// </summary>
    /// <param name="cacheKey">The cache key</param>
    /// <param name="result">The result to cache</param>
    /// <param name="options">Cache options including TTL</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task SetAsync(string cacheKey, TaskExecutionResult result, TaskCacheOptions options, CancellationToken cancellationToken = default);

    /// <summary>
    /// Removes a specific entry from the cache.
    /// </summary>
    /// <param name="cacheKey">The cache key to invalidate</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task InvalidateAsync(string cacheKey, CancellationToken cancellationToken = default);

    /// <summary>
    /// Removes all entries matching a pattern from the cache.
    /// Pattern format: "task:*" matches all task entries
    /// </summary>
    /// <param name="pattern">The pattern to match (supports * wildcard)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task InvalidateByPatternAsync(string pattern, CancellationToken cancellationToken = default);
}
