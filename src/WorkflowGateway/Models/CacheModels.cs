namespace WorkflowGateway.Models;

/// <summary>
/// Information about a single cache key.
/// </summary>
public class CacheKeyInfo
{
    public string Key { get; set; } = string.Empty;
    public int Hits { get; set; }
    public string LastAccess { get; set; } = string.Empty;
}

/// <summary>
/// Response containing cache statistics.
/// </summary>
public class CacheStatsResponse
{
    public long TotalHits { get; set; }
    public long TotalMisses { get; set; }
    public double HitRatio { get; set; }
    public int TotalEntries { get; set; }
    public long MemoryUsageBytes { get; set; }
    public string OldestEntryAge { get; set; } = string.Empty;
    public List<CacheKeyInfo> RecentKeys { get; set; } = new();
    public string GeneratedAt { get; set; } = string.Empty;
}

/// <summary>
/// Request to invalidate a specific cache key.
/// </summary>
public class InvalidateCacheRequest
{
    public string Key { get; set; } = string.Empty;
}
