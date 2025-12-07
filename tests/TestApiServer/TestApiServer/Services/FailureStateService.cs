using System.Collections.Concurrent;

namespace TestApiServer.Services;

/// <summary>
/// Thread-safe service for managing failure modes per endpoint
/// </summary>
public class FailureStateService : IFailureStateService
{
    private readonly ConcurrentDictionary<string, FailureMode> _modes = new();

    /// <inheritdoc />
    public void SetFailureMode(string endpointId, FailureMode mode)
    {
        _modes[endpointId] = mode;
    }

    /// <inheritdoc />
    public FailureMode GetFailureMode(string endpointId)
    {
        return _modes.TryGetValue(endpointId, out var mode) ? mode : FailureMode.None;
    }

    /// <inheritdoc />
    public void Reset()
    {
        _modes.Clear();
    }

    /// <inheritdoc />
    public Dictionary<string, FailureMode> GetAllModes()
    {
        return new Dictionary<string, FailureMode>(_modes);
    }
}
