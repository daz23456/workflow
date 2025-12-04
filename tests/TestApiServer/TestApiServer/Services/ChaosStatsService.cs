using TestApiServer.Models;

namespace TestApiServer.Services;

/// <summary>
/// Service for tracking chaos statistics
/// </summary>
public class ChaosStatsService : IChaosStatsService
{
    private readonly object _lock = new();
    private ChaosStats _stats = new();

    public ChaosStats Stats
    {
        get
        {
            lock (_lock)
            {
                return new ChaosStats
                {
                    TotalRequests = _stats.TotalRequests,
                    FailuresInjected = _stats.FailuresInjected,
                    DelaysInjected = _stats.DelaysInjected,
                    TotalDelayMs = _stats.TotalDelayMs,
                    FailuresByStatusCode = new Dictionary<int, int>(_stats.FailuresByStatusCode),
                    FailuresByEndpoint = new Dictionary<string, int>(_stats.FailuresByEndpoint),
                    StartedAt = _stats.StartedAt
                };
            }
        }
    }

    public void RecordRequest()
    {
        lock (_lock)
        {
            _stats.TotalRequests++;
        }
    }

    public void RecordFailure(int statusCode, string path)
    {
        lock (_lock)
        {
            _stats.FailuresInjected++;

            if (!_stats.FailuresByStatusCode.ContainsKey(statusCode))
                _stats.FailuresByStatusCode[statusCode] = 0;
            _stats.FailuresByStatusCode[statusCode]++;

            if (!_stats.FailuresByEndpoint.ContainsKey(path))
                _stats.FailuresByEndpoint[path] = 0;
            _stats.FailuresByEndpoint[path]++;
        }
    }

    public void RecordDelay(int delayMs)
    {
        lock (_lock)
        {
            _stats.DelaysInjected++;
            _stats.TotalDelayMs += delayMs;
        }
    }

    public void Reset()
    {
        lock (_lock)
        {
            _stats.Reset();
        }
    }
}
