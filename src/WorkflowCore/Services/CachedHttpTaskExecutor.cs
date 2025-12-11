using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using WorkflowCore.Interfaces;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Decorator that wraps HttpTaskExecutor to add caching support.
/// Checks cache before making HTTP calls, stores results after successful calls.
/// Supports stale-while-revalidate and cache bypass conditions.
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

        // Check bypass condition
        if (ShouldBypassCache(cacheOptions, context))
        {
            _logger.LogDebug("Cache bypassed due to bypass condition");
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

        // Handle stale-while-revalidate pattern
        if (cacheOptions.StaleWhileRevalidate)
        {
            return await ExecuteWithStaleWhileRevalidateAsync(taskSpec, context, cacheKey, cacheOptions, cancellationToken);
        }

        // Standard cache check
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
    /// Executes with stale-while-revalidate pattern.
    /// Returns stale data immediately if available, triggers background refresh.
    /// </summary>
    private async Task<TaskExecutionResult> ExecuteWithStaleWhileRevalidateAsync(
        WorkflowTaskSpec taskSpec,
        TemplateContext context,
        string cacheKey,
        TaskCacheOptions cacheOptions,
        CancellationToken cancellationToken)
    {
        var taskRef = taskSpec.Type ?? "unknown";
        var cacheEntry = await _cacheProvider.GetWithMetadataAsync(cacheKey, cancellationToken);

        // No cache entry at all - execute fresh
        if (cacheEntry == null)
        {
            _logger.LogDebug("Cache miss (stale-while-revalidate) for task {TaskRef}, executing fresh", taskRef);
            var freshResult = await _inner.ExecuteAsync(taskSpec, context, cancellationToken);

            if (ShouldCacheResult(freshResult, cacheOptions))
            {
                await _cacheProvider.SetAsync(cacheKey, freshResult, cacheOptions, cancellationToken);
            }

            return freshResult;
        }

        // Entry is beyond stale TTL - execute fresh
        if (cacheEntry.IsBeyondStaleTtl || cacheEntry.Result == null)
        {
            _logger.LogDebug("Cache entry beyond stale TTL for task {TaskRef}, executing fresh", taskRef);
            var freshResult = await _inner.ExecuteAsync(taskSpec, context, cancellationToken);

            if (ShouldCacheResult(freshResult, cacheOptions))
            {
                await _cacheProvider.SetAsync(cacheKey, freshResult, cacheOptions, cancellationToken);
            }

            return freshResult;
        }

        // Entry is within TTL (fresh) - return immediately
        if (!cacheEntry.IsStale)
        {
            _logger.LogInformation("Cache hit (fresh) for task {TaskRef}", taskRef);
            return cacheEntry.Result;
        }

        // Entry is stale but within stale TTL - return stale data and trigger background refresh
        _logger.LogInformation("Serving stale data for task {TaskRef}, triggering background refresh", taskRef);

        // Fire-and-forget background refresh
        _ = RefreshCacheInBackgroundAsync(taskSpec, context, cacheKey, cacheOptions);

        return cacheEntry.Result;
    }

    /// <summary>
    /// Refreshes the cache in the background without blocking the response.
    /// </summary>
    private async Task RefreshCacheInBackgroundAsync(
        WorkflowTaskSpec taskSpec,
        TemplateContext context,
        string cacheKey,
        TaskCacheOptions cacheOptions)
    {
        try
        {
            var taskRef = taskSpec.Type ?? "unknown";
            _logger.LogDebug("Starting background cache refresh for task {TaskRef}", taskRef);

            var freshResult = await _inner.ExecuteAsync(taskSpec, context, CancellationToken.None);

            if (ShouldCacheResult(freshResult, cacheOptions))
            {
                await _cacheProvider.SetAsync(cacheKey, freshResult, cacheOptions, CancellationToken.None);
                _logger.LogDebug("Background cache refresh completed for task {TaskRef}", taskRef);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Background cache refresh failed");
        }
    }

    /// <summary>
    /// Determines if the cache should be bypassed based on the BypassWhen condition.
    /// </summary>
    private static bool ShouldBypassCache(TaskCacheOptions options, TemplateContext context)
    {
        if (string.IsNullOrWhiteSpace(options.BypassWhen))
        {
            return false;
        }

        // Evaluate simple template expressions like {{input.forceRefresh}}
        var bypassValue = EvaluateSimpleTemplate(options.BypassWhen, context);
        return IsTruthy(bypassValue);
    }

    /// <summary>
    /// Evaluates a simple template expression against the context.
    /// Supports {{input.field}} syntax.
    /// </summary>
    private static string EvaluateSimpleTemplate(string template, TemplateContext context)
    {
        var pattern = @"\{\{input\.(\w+)\}\}";
        var match = Regex.Match(template, pattern);

        if (match.Success && context.Input != null)
        {
            var fieldName = match.Groups[1].Value;
            if (context.Input.TryGetValue(fieldName, out var value))
            {
                return value?.ToString() ?? "";
            }
        }

        return template;
    }

    /// <summary>
    /// Determines if a value is truthy (true, "true", non-zero, etc.)
    /// </summary>
    private static bool IsTruthy(object? value)
    {
        return value switch
        {
            null => false,
            bool b => b,
            string s => s.Equals("true", StringComparison.OrdinalIgnoreCase) || s == "1",
            int i => i != 0,
            long l => l != 0,
            _ => !string.IsNullOrEmpty(value.ToString())
        };
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
