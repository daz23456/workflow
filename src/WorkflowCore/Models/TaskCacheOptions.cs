using System.Text.Json.Serialization;
using YamlDotNet.Serialization;

namespace WorkflowCore.Models;

/// <summary>
/// Configuration options for task-level caching.
/// When enabled, task outputs are cached based on the resolved request parameters.
/// </summary>
public class TaskCacheOptions
{
    /// <summary>
    /// Whether caching is enabled for this task.
    /// Default: false (caching is opt-in)
    /// </summary>
    [YamlMember(Alias = "enabled")]
    [JsonPropertyName("enabled")]
    public bool Enabled { get; set; } = false;

    /// <summary>
    /// Time-to-live for cached entries.
    /// Format: "5m" (5 minutes), "1h" (1 hour), "30s" (30 seconds)
    /// Default: "5m"
    /// </summary>
    [YamlMember(Alias = "ttl")]
    [JsonPropertyName("ttl")]
    public string Ttl { get; set; } = "5m";

    /// <summary>
    /// Custom cache key template. If not specified, key is generated from:
    /// taskRef + HTTP method + resolved URL + body hash
    /// Template can include variables: {{input.x}}, {{taskRef}}, etc.
    /// </summary>
    [YamlMember(Alias = "key")]
    [JsonPropertyName("key")]
    public string? KeyTemplate { get; set; }

    /// <summary>
    /// Only cache successful responses (HTTP 2xx).
    /// Default: true
    /// </summary>
    [YamlMember(Alias = "cacheOnlySuccess")]
    [JsonPropertyName("cacheOnlySuccess")]
    public bool CacheOnlySuccess { get; set; } = true;

    /// <summary>
    /// HTTP methods that are cacheable.
    /// Default: Get only
    /// </summary>
    [YamlMember(Alias = "cacheableMethods")]
    [JsonPropertyName("cacheableMethods")]
    public CacheMethods CacheableMethods { get; set; } = CacheMethods.Get;

    /// <summary>
    /// Enable stale-while-revalidate pattern.
    /// When enabled, serves stale data immediately and refreshes in background.
    /// Default: false
    /// </summary>
    [YamlMember(Alias = "staleWhileRevalidate")]
    [JsonPropertyName("staleWhileRevalidate")]
    public bool StaleWhileRevalidate { get; set; } = false;

    /// <summary>
    /// How long stale data can be served while revalidating.
    /// Only used when StaleWhileRevalidate is true.
    /// Format: "10m" (10 minutes), "1h" (1 hour)
    /// Default: same as Ttl
    /// </summary>
    [YamlMember(Alias = "staleTtl")]
    [JsonPropertyName("staleTtl")]
    public string? StaleTtl { get; set; }

    /// <summary>
    /// Template expression that, when evaluates to true, bypasses the cache.
    /// Useful for forcing refresh: "{{input.forceRefresh}}"
    /// Default: null (no bypass)
    /// </summary>
    [YamlMember(Alias = "bypassWhen")]
    [JsonPropertyName("bypassWhen")]
    public string? BypassWhen { get; set; }

    /// <summary>
    /// Parses the TTL string into a TimeSpan.
    /// Supports formats: "30s", "5m", "1h", "1d"
    /// </summary>
    public TimeSpan GetTtlTimeSpan()
    {
        if (string.IsNullOrWhiteSpace(Ttl))
            return TimeSpan.FromMinutes(5);

        var value = Ttl.TrimEnd('s', 'm', 'h', 'd', 'S', 'M', 'H', 'D');
        if (!int.TryParse(value, out var amount))
            return TimeSpan.FromMinutes(5);

        var unit = Ttl.Length > value.Length ? char.ToLowerInvariant(Ttl[^1]) : 'm';

        return unit switch
        {
            's' => TimeSpan.FromSeconds(amount),
            'm' => TimeSpan.FromMinutes(amount),
            'h' => TimeSpan.FromHours(amount),
            'd' => TimeSpan.FromDays(amount),
            _ => TimeSpan.FromMinutes(5)
        };
    }

    /// <summary>
    /// Parses the StaleTtl string into a TimeSpan.
    /// If StaleTtl is not set, returns the same as Ttl.
    /// </summary>
    public TimeSpan GetStaleTtlTimeSpan()
    {
        if (string.IsNullOrWhiteSpace(StaleTtl))
            return GetTtlTimeSpan();

        var value = StaleTtl.TrimEnd('s', 'm', 'h', 'd', 'S', 'M', 'H', 'D');
        if (!int.TryParse(value, out var amount))
            return GetTtlTimeSpan();

        var unit = StaleTtl.Length > value.Length ? char.ToLowerInvariant(StaleTtl[^1]) : 'm';

        return unit switch
        {
            's' => TimeSpan.FromSeconds(amount),
            'm' => TimeSpan.FromMinutes(amount),
            'h' => TimeSpan.FromHours(amount),
            'd' => TimeSpan.FromDays(amount),
            _ => GetTtlTimeSpan()
        };
    }
}

/// <summary>
/// HTTP methods that can be cached.
/// </summary>
[Flags]
public enum CacheMethods
{
    None = 0,
    Get = 1,
    Post = 2,
    Put = 4,
    Delete = 8,
    All = Get | Post | Put | Delete
}
