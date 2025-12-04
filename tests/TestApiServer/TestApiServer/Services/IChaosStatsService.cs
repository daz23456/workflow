using TestApiServer.Models;

namespace TestApiServer.Services;

/// <summary>
/// Service for tracking chaos statistics
/// </summary>
public interface IChaosStatsService
{
    ChaosStats Stats { get; }
    void RecordRequest();
    void RecordFailure(int statusCode, string path);
    void RecordDelay(int delayMs);
    void Reset();
}
