namespace TestApiServer.Services;

/// <summary>
/// Failure modes for endpoint simulation
/// </summary>
public enum FailureMode
{
    /// <summary>Normal operation - no failures</summary>
    None = 0,

    /// <summary>Always fail every request</summary>
    AlwaysFail = 1,

    /// <summary>Fail only the first request, then succeed</summary>
    FailOnce = 2,

    /// <summary>Fail N times, then succeed</summary>
    FailNTimes = 3,

    /// <summary>Fail randomly based on probability</summary>
    Intermittent = 4,

    /// <summary>Simulate circuit breaker pattern</summary>
    CircuitBreaker = 5
}

/// <summary>
/// Service for managing failure modes per endpoint
/// </summary>
public interface IFailureStateService
{
    /// <summary>
    /// Sets the failure mode for a specific endpoint
    /// </summary>
    void SetFailureMode(string endpointId, FailureMode mode);

    /// <summary>
    /// Gets the current failure mode for an endpoint (defaults to None)
    /// </summary>
    FailureMode GetFailureMode(string endpointId);

    /// <summary>
    /// Resets all failure modes to None
    /// </summary>
    void Reset();

    /// <summary>
    /// Gets a snapshot of all configured failure modes
    /// </summary>
    Dictionary<string, FailureMode> GetAllModes();
}
