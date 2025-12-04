using System.Collections.Concurrent;
using System.Text.RegularExpressions;
using TestApiServer.Models;

namespace TestApiServer.Services;

/// <summary>
/// Service for managing chaos engineering configuration
/// </summary>
public class ChaosService : IChaosService
{
    private readonly Random _random = new();
    private readonly ConcurrentDictionary<string, int> _failureCounts = new();
    private ChaosConfiguration _config = new();

    public ChaosConfiguration Configuration => _config;

    public void Configure(ChaosConfiguration config)
    {
        _config = config;
    }

    public void SetMode(ChaosMode mode)
    {
        _config.Mode = mode;
    }

    public void Reset()
    {
        _config = new ChaosConfiguration();
        _failureCounts.Clear();
    }

    public bool ShouldFail(string path)
    {
        if (!IsPathTargeted(path))
            return false;

        return _config.Mode switch
        {
            ChaosMode.Normal => false,
            ChaosMode.AbsoluteFailure => true,
            ChaosMode.RandomFailure => _random.NextDouble() < _config.FailureProbability,
            ChaosMode.Intermittent => ShouldFailIntermittent(path),
            ChaosMode.TotalChaos => _random.NextDouble() < _config.FailureProbability,
            _ => false
        };
    }

    public bool ShouldDelay(string path)
    {
        if (!IsPathTargeted(path))
            return false;

        return _config.Mode switch
        {
            ChaosMode.RandomDelay => true,
            ChaosMode.TotalChaos => _random.NextDouble() < _config.DelayProbability,
            _ => false
        };
    }

    public int GetFailureStatusCode()
    {
        var codes = _config.FailureStatusCodes;
        return codes.Length > 0 ? codes[_random.Next(codes.Length)] : 500;
    }

    public int GetDelayMs()
    {
        return _random.Next(_config.MinDelayMs, _config.MaxDelayMs + 1);
    }

    private bool ShouldFailIntermittent(string path)
    {
        var count = _failureCounts.AddOrUpdate(path, 1, (_, c) => c + 1);
        if (count <= _config.FailCountBeforeSuccess)
        {
            return true;
        }
        // Reset counter after success
        _failureCounts.TryRemove(path, out _);
        return false;
    }

    private bool IsPathTargeted(string path)
    {
        // If no targeting is configured, all paths are affected
        if (string.IsNullOrEmpty(_config.PathPattern) && _config.TargetEndpoints == null)
            return true;

        // Check path pattern
        if (!string.IsNullOrEmpty(_config.PathPattern))
        {
            try
            {
                if (Regex.IsMatch(path, _config.PathPattern))
                    return true;
            }
            catch
            {
                // Invalid regex, ignore
            }
        }

        // Check specific endpoints
        if (_config.TargetEndpoints != null)
        {
            return _config.TargetEndpoints.Any(e => path.StartsWith(e, StringComparison.OrdinalIgnoreCase));
        }

        return false;
    }
}
