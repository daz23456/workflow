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
