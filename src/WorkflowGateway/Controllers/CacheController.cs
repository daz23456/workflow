using Microsoft.AspNetCore.Mvc;
using WorkflowCore.Services;
using WorkflowGateway.Models;

namespace WorkflowGateway.Controllers;

/// <summary>
/// Controller for cache management operations.
/// </summary>
[ApiController]
[Route("api/v1/cache")]
public class CacheController : ControllerBase
{
    private readonly ICacheStatsService _cacheStatsService;
    private readonly ILogger<CacheController> _logger;

    public CacheController(
        ICacheStatsService cacheStatsService,
        ILogger<CacheController> logger)
    {
        _cacheStatsService = cacheStatsService ?? throw new ArgumentNullException(nameof(cacheStatsService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Gets current cache statistics.
    /// </summary>
    [HttpGet("stats")]
    [ProducesResponseType(typeof(CacheStatsResponse), StatusCodes.Status200OK)]
    public async Task<ActionResult<CacheStatsResponse>> GetStats(CancellationToken cancellationToken)
    {
        var stats = await _cacheStatsService.GetStatsAsync(cancellationToken);

        var response = new CacheStatsResponse
        {
            TotalHits = stats.TotalHits,
            TotalMisses = stats.TotalMisses,
            HitRatio = stats.HitRatio,
            TotalEntries = stats.TotalEntries,
            MemoryUsageBytes = stats.MemoryUsageBytes,
            OldestEntryAge = FormatTimeSpan(stats.OldestEntryAge),
            RecentKeys = stats.RecentKeys.Select(k => new CacheKeyInfo
            {
                Key = k.Key,
                Hits = k.Hits,
                LastAccess = FormatTimeAgo(k.LastAccess)
            }).ToList(),
            GeneratedAt = stats.GeneratedAt.ToString("O")
        };

        return Ok(response);
    }

    /// <summary>
    /// Invalidates a specific cache key.
    /// </summary>
    [HttpPost("invalidate")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> InvalidateKey(
        [FromBody] InvalidateCacheRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Key))
        {
            return BadRequest(new { error = "Cache key is required" });
        }

        await _cacheStatsService.InvalidateKeyAsync(request.Key, cancellationToken);
        _logger.LogInformation("Cache key invalidated via API: {CacheKey}", request.Key);

        return Ok(new { message = "Cache key invalidated", key = request.Key });
    }

    /// <summary>
    /// Clears all cache entries.
    /// </summary>
    [HttpPost("clear")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<IActionResult> ClearCache(CancellationToken cancellationToken)
    {
        await _cacheStatsService.ClearAllAsync(cancellationToken);
        _logger.LogInformation("All cache entries cleared via API");

        return Ok(new { message = "All cache entries cleared" });
    }

    private static string FormatTimeSpan(TimeSpan? timeSpan)
    {
        if (!timeSpan.HasValue)
        {
            return "N/A";
        }

        var ts = timeSpan.Value;
        if (ts.TotalHours >= 1)
        {
            return $"{(int)ts.TotalHours}h {ts.Minutes}m";
        }
        if (ts.TotalMinutes >= 1)
        {
            return $"{(int)ts.TotalMinutes}m {ts.Seconds}s";
        }
        return $"{ts.Seconds}s";
    }

    private static string FormatTimeAgo(DateTime dateTime)
    {
        var elapsed = DateTime.UtcNow - dateTime;

        if (elapsed.TotalHours >= 1)
        {
            return $"{(int)elapsed.TotalHours}h ago";
        }
        if (elapsed.TotalMinutes >= 1)
        {
            return $"{(int)elapsed.TotalMinutes}m ago";
        }
        return "just now";
    }
}
