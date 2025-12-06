using System.Text.Json.Serialization;
using YamlDotNet.Serialization;

namespace WorkflowCore.Models;

/// <summary>
/// Configuration for circuit breaker fault tolerance.
/// Opens circuit after repeated failures, preventing cascade failures.
/// </summary>
public class CircuitBreakerSpec
{
    /// <summary>
    /// Number of failures within the sampling duration before opening the circuit.
    /// Default: 5
    /// </summary>
    [YamlMember(Alias = "failureThreshold")]
    [JsonPropertyName("failureThreshold")]
    public int FailureThreshold { get; set; } = 5;

    /// <summary>
    /// Time window for counting failures (e.g., "60s", "2m").
    /// Failures outside this window are not counted.
    /// Default: "60s"
    /// </summary>
    [YamlMember(Alias = "samplingDuration")]
    [JsonPropertyName("samplingDuration")]
    public string SamplingDuration { get; set; } = "60s";

    /// <summary>
    /// Duration to keep circuit open before transitioning to half-open (e.g., "30s", "1m").
    /// Default: "30s"
    /// </summary>
    [YamlMember(Alias = "breakDuration")]
    [JsonPropertyName("breakDuration")]
    public string BreakDuration { get; set; } = "30s";

    /// <summary>
    /// Number of successful requests in half-open state required to close the circuit.
    /// Default: 3
    /// </summary>
    [YamlMember(Alias = "halfOpenRequests")]
    [JsonPropertyName("halfOpenRequests")]
    public int HalfOpenRequests { get; set; } = 3;
}
