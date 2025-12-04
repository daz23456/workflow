using TestApiServer.Models;

namespace TestApiServer.Services;

/// <summary>
/// Service for managing chaos engineering configuration
/// </summary>
public interface IChaosService
{
    ChaosConfiguration Configuration { get; }
    void Configure(ChaosConfiguration config);
    void SetMode(ChaosMode mode);
    void Reset();
    bool ShouldFail(string path);
    int GetFailureStatusCode();
    int GetDelayMs();
    bool ShouldDelay(string path);
}
