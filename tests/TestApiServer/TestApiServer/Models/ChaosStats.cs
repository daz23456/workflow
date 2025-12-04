namespace TestApiServer.Models;

/// <summary>
/// Statistics about chaos operations
/// </summary>
public class ChaosStats
{
    public int TotalRequests { get; set; }
    public int FailuresInjected { get; set; }
    public int DelaysInjected { get; set; }
    public long TotalDelayMs { get; set; }
    public Dictionary<int, int> FailuresByStatusCode { get; set; } = new();
    public Dictionary<string, int> FailuresByEndpoint { get; set; } = new();
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;

    public void Reset()
    {
        TotalRequests = 0;
        FailuresInjected = 0;
        DelaysInjected = 0;
        TotalDelayMs = 0;
        FailuresByStatusCode.Clear();
        FailuresByEndpoint.Clear();
        StartedAt = DateTime.UtcNow;
    }
}
