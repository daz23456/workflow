using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Parses CircuitBreakerSpec into CircuitBreakerOptions.
/// Converts duration strings (e.g., "60s", "2m") to TimeSpan values.
/// </summary>
public static class CircuitBreakerOptionsParser
{
    /// <summary>
    /// Converts a CircuitBreakerSpec (YAML configuration) to CircuitBreakerOptions (runtime options).
    /// </summary>
    public static CircuitBreakerOptions ConvertToOptions(CircuitBreakerSpec spec)
    {
        ArgumentNullException.ThrowIfNull(spec);

        return new CircuitBreakerOptions
        {
            FailureThreshold = spec.FailureThreshold,
            SamplingDuration = ParseDuration(spec.SamplingDuration),
            BreakDuration = ParseDuration(spec.BreakDuration),
            HalfOpenRequests = spec.HalfOpenRequests
        };
    }

    /// <summary>
    /// Parses a duration string into a TimeSpan.
    /// Supported formats: ms (milliseconds), s (seconds), m (minutes), h (hours)
    /// Examples: "100ms", "30s", "5m", "1h"
    /// </summary>
    public static TimeSpan ParseDuration(string duration)
    {
        if (string.IsNullOrWhiteSpace(duration))
            return TimeSpan.Zero;

        duration = duration.Trim().ToLowerInvariant();

        // Try to parse milliseconds (e.g., "100ms", "500ms")
        if (duration.EndsWith("ms"))
        {
            if (double.TryParse(duration.AsSpan(0, duration.Length - 2), out var ms))
                return TimeSpan.FromMilliseconds(ms);
        }
        // Try to parse seconds (e.g., "30s", "60s")
        else if (duration.EndsWith("s"))
        {
            if (double.TryParse(duration.AsSpan(0, duration.Length - 1), out var seconds))
                return TimeSpan.FromSeconds(seconds);
        }
        // Try to parse minutes (e.g., "1m", "5m")
        else if (duration.EndsWith("m"))
        {
            if (double.TryParse(duration.AsSpan(0, duration.Length - 1), out var minutes))
                return TimeSpan.FromMinutes(minutes);
        }
        // Try to parse hours (e.g., "1h", "2h")
        else if (duration.EndsWith("h"))
        {
            if (double.TryParse(duration.AsSpan(0, duration.Length - 1), out var hours))
                return TimeSpan.FromHours(hours);
        }

        return TimeSpan.Zero;
    }
}
