using WorkflowCore.Models;

namespace WorkflowCore.Services;

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
