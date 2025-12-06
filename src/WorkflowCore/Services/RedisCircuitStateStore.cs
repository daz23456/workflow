using System.Text.Json;
using StackExchange.Redis;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Redis-backed implementation of circuit state store.
/// Enables shared circuit state across multiple service instances for distributed deployments.
/// </summary>
public class RedisCircuitStateStore : ICircuitStateStore
{
    private readonly IConnectionMultiplexer _connection;
    private readonly string _keyPrefix;
    private readonly TimeSpan _stateTtl;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    /// <summary>
    /// Creates a new Redis circuit state store.
    /// </summary>
    /// <param name="connection">Redis connection multiplexer</param>
    /// <param name="keyPrefix">Prefix for Redis keys (default: "circuit:")</param>
    /// <param name="stateTtl">TTL for circuit state entries (default: 1 hour)</param>
    public RedisCircuitStateStore(
        IConnectionMultiplexer connection,
        string keyPrefix = "circuit:",
        TimeSpan? stateTtl = null)
    {
        _connection = connection ?? throw new ArgumentNullException(nameof(connection));
        _keyPrefix = keyPrefix ?? "circuit:";
        _stateTtl = stateTtl ?? TimeSpan.FromHours(1);
    }

    private IDatabase Database => _connection.GetDatabase();

    private string GetKey(string serviceName) => $"{_keyPrefix}{serviceName}";

    public async Task<CircuitStateInfo> GetStateAsync(string serviceName)
    {
        ArgumentNullException.ThrowIfNull(serviceName);

        var key = GetKey(serviceName);
        var value = await Database.StringGetAsync(key);

        if (value.IsNullOrEmpty)
        {
            return new CircuitStateInfo();
        }

        try
        {
            return JsonSerializer.Deserialize<CircuitStateInfo>(value.ToString(), JsonOptions) ?? new CircuitStateInfo();
        }
        catch (JsonException)
        {
            // If deserialization fails, return default state
            return new CircuitStateInfo();
        }
    }

    public async Task SaveStateAsync(string serviceName, CircuitStateInfo state)
    {
        ArgumentNullException.ThrowIfNull(serviceName);
        ArgumentNullException.ThrowIfNull(state);

        var key = GetKey(serviceName);
        var json = JsonSerializer.Serialize(state, JsonOptions);
        await Database.StringSetAsync(key, json, _stateTtl);
    }

    public async Task<CircuitStateInfo> RecordFailureAsync(string serviceName, CircuitBreakerOptions options)
    {
        ArgumentNullException.ThrowIfNull(serviceName);
        ArgumentNullException.ThrowIfNull(options);

        // Get current state
        var state = await GetStateAsync(serviceName);
        var now = DateTime.UtcNow;

        state.LastFailureTime = now;

        switch (state.State)
        {
            case CircuitState.Closed:
                state.FailureCount++;

                if (state.FailureCount >= options.FailureThreshold)
                {
                    state.State = CircuitState.Open;
                    state.CircuitOpenedAt = now;
                    state.LastStateTransitionAt = now;
                }
                break;

            case CircuitState.HalfOpen:
                state.State = CircuitState.Open;
                state.CircuitOpenedAt = now;
                state.LastStateTransitionAt = now;
                state.HalfOpenSuccessCount = 0;
                break;

            case CircuitState.Open:
                // Already open, just update failure time
                break;
        }

        await SaveStateAsync(serviceName, state);
        return state;
    }

    public async Task<CircuitStateInfo> RecordSuccessAsync(string serviceName, CircuitBreakerOptions options)
    {
        ArgumentNullException.ThrowIfNull(serviceName);
        ArgumentNullException.ThrowIfNull(options);

        // Get current state
        var state = await GetStateAsync(serviceName);

        switch (state.State)
        {
            case CircuitState.Closed:
                state.FailureCount = 0;
                break;

            case CircuitState.HalfOpen:
                state.HalfOpenSuccessCount++;
                if (state.HalfOpenSuccessCount >= options.HalfOpenRequests)
                {
                    state.State = CircuitState.Closed;
                    state.LastStateTransitionAt = DateTime.UtcNow;
                    state.HalfOpenSuccessCount = 0;
                    state.FailureCount = 0;
                }
                break;

            case CircuitState.Open:
                // Ignore success in open state
                break;
        }

        await SaveStateAsync(serviceName, state);
        return state;
    }

    public async Task<IReadOnlyDictionary<string, CircuitStateInfo>> GetAllStatesAsync()
    {
        var result = new Dictionary<string, CircuitStateInfo>();
        var server = _connection.GetServers().FirstOrDefault();

        if (server == null)
        {
            return result;
        }

        var pattern = $"{_keyPrefix}*";
        var keys = server.Keys(pattern: pattern);

        foreach (var key in keys)
        {
            var serviceName = key.ToString().Replace(_keyPrefix, string.Empty);
            var state = await GetStateAsync(serviceName);
            result[serviceName] = state;
        }

        return result;
    }

    public async Task<bool> RemoveStateAsync(string serviceName)
    {
        ArgumentNullException.ThrowIfNull(serviceName);

        var key = GetKey(serviceName);
        return await Database.KeyDeleteAsync(key);
    }

    public async Task ClearAllAsync()
    {
        var server = _connection.GetServers().FirstOrDefault();

        if (server == null)
        {
            return;
        }

        var pattern = $"{_keyPrefix}*";
        var keys = server.Keys(pattern: pattern).ToArray();

        if (keys.Length > 0)
        {
            await Database.KeyDeleteAsync(keys);
        }
    }

    public async Task<bool> IsHealthyAsync()
    {
        try
        {
            if (!_connection.IsConnected)
            {
                return false;
            }

            await Database.PingAsync();
            return true;
        }
        catch
        {
            return false;
        }
    }
}
