using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using WorkflowCore.Interfaces;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Decorator that wraps HttpTaskExecutor to add caching support.
/// Checks cache before making HTTP calls, stores results after successful calls.
/// </summary>
public class CachedHttpTaskExecutor : IHttpTaskExecutor
{
    private readonly IHttpTaskExecutor _inner;
    private readonly ITaskCacheProvider _cacheProvider;
    private readonly ILogger<CachedHttpTaskExecutor> _logger;

    public CachedHttpTaskExecutor(
        IHttpTaskExecutor inner,
        ITaskCacheProvider cacheProvider,
        ILogger<CachedHttpTaskExecutor> logger)
    {
        _inner = inner ?? throw new ArgumentNullException(nameof(inner));
        _cacheProvider = cacheProvider ?? throw new ArgumentNullException(nameof(cacheProvider));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    public async Task<TaskExecutionResult> ExecuteAsync(
        WorkflowTaskSpec taskSpec,
        TemplateContext context,
        CancellationToken cancellationToken = default)
    {
        var cacheOptions = taskSpec.Cache;

        // If caching is not enabled, delegate directly to inner executor
        if (cacheOptions == null || !cacheOptions.Enabled)
        {
            _logger.LogDebug("Cache disabled for task, executing directly");
            return await _inner.ExecuteAsync(taskSpec, context, cancellationToken);
        }

        var httpRequest = taskSpec.Http ?? taskSpec.Request;
        if (httpRequest == null)
        {
            _logger.LogWarning("No HTTP request definition found, executing directly");
            return await _inner.ExecuteAsync(taskSpec, context, cancellationToken);
        }

        var httpMethod = httpRequest.Method?.ToUpperInvariant() ?? "GET";

        // Check if this HTTP method is cacheable
        if (!IsCacheableMethod(httpMethod, cacheOptions.CacheableMethods))
        {
            _logger.LogDebug("HTTP method {Method} is not cacheable, executing directly", httpMethod);
            return await _inner.ExecuteAsync(taskSpec, context, cancellationToken);
        }

        // Generate cache key
        var taskRef = taskSpec.Type ?? "unknown";
        var url = httpRequest.Url ?? "";
        var body = httpRequest.Body;
        var cacheKey = GenerateCacheKey(taskRef, httpMethod, url, body);

        // Check cache
        var cachedResult = await _cacheProvider.GetAsync(cacheKey, cancellationToken);
        if (cachedResult != null)
        {
            _logger.LogInformation("Cache hit for task {TaskRef}, returning cached result", taskRef);
            return cachedResult;
        }

        // Cache miss - execute the task
        _logger.LogDebug("Cache miss for task {TaskRef}, executing HTTP request", taskRef);
        var result = await _inner.ExecuteAsync(taskSpec, context, cancellationToken);

        // Cache the result if appropriate
        if (ShouldCacheResult(result, cacheOptions))
        {
            await _cacheProvider.SetAsync(cacheKey, result, cacheOptions, cancellationToken);
            _logger.LogDebug("Cached result for task {TaskRef} with TTL {Ttl}", taskRef, cacheOptions.Ttl);
        }

        return result;
    }

    /// <summary>
    /// Determines if a result should be cached based on cache options.
    /// </summary>
    private static bool ShouldCacheResult(TaskExecutionResult result, TaskCacheOptions options)
    {
        if (options.CacheOnlySuccess && !result.Success)
        {
            return false;
        }

        return true;
    }

    /// <summary>
    /// Generates a deterministic cache key from the task specification and context.
    /// Key format: task:{taskRef}|{method}|{resolvedUrl}|{bodyHash}
    /// </summary>
    public static string GenerateCacheKey(
        string taskRef,
        string httpMethod,
        string resolvedUrl,
        string? requestBody)
    {
        var normalizedMethod = httpMethod.ToUpperInvariant();

        // Compute body hash if body exists
        var bodyHash = string.Empty;
        if (!string.IsNullOrEmpty(requestBody))
        {
            var bodyBytes = Encoding.UTF8.GetBytes(requestBody);
            var hashBytes = SHA256.HashData(bodyBytes);
            bodyHash = Convert.ToHexString(hashBytes).ToLowerInvariant()[..16]; // First 16 chars of hash
        }

        return $"task:{taskRef}|{normalizedMethod}|{resolvedUrl}|{bodyHash}";
    }

    /// <summary>
    /// Determines if an HTTP method is cacheable based on the task's cache options.
    /// </summary>
    public static bool IsCacheableMethod(string httpMethod, CacheMethods cacheableMethods)
    {
        var normalizedMethod = httpMethod.ToUpperInvariant();

        var methodFlag = normalizedMethod switch
        {
            "GET" => CacheMethods.Get,
            "POST" => CacheMethods.Post,
            "PUT" => CacheMethods.Put,
            "DELETE" => CacheMethods.Delete,
            _ => CacheMethods.None
        };

        return cacheableMethods.HasFlag(methodFlag);
    }
}
