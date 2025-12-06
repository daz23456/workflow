using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Thread-safe circuit breaker implementation with sliding window failure counting.
/// Implements the standard circuit breaker pattern: Closed -> Open -> HalfOpen -> Closed.
/// </summary>
public class CircuitBreaker : ICircuitBreaker
{
    private readonly CircuitBreakerOptions _options;
    private readonly object _lock = new();
    private readonly List<DateTime> _failureTimestamps = new();

    private CircuitState _state = CircuitState.Closed;
    private int _halfOpenSuccessCount;
    private DateTime? _lastFailureTime;
    private DateTime? _circuitOpenedAt;
    private DateTime? _lastStateTransitionAt;

    public CircuitBreaker(CircuitBreakerOptions options)
    {
        _options = options ?? throw new ArgumentNullException(nameof(options));
    }

    public bool CanExecute()
    {
        lock (_lock)
        {
            switch (_state)
            {
                case CircuitState.Closed:
                    return true;

                case CircuitState.Open:
                    // Check if break duration has elapsed
                    if (_circuitOpenedAt.HasValue &&
                        DateTime.UtcNow - _circuitOpenedAt.Value >= _options.BreakDuration)
                    {
                        TransitionTo(CircuitState.HalfOpen);
                        return true;
                    }
                    return false;

                case CircuitState.HalfOpen:
                    return true;

                default:
                    return false;
            }
        }
    }

    public void RecordSuccess()
    {
        lock (_lock)
        {
            switch (_state)
            {
                case CircuitState.Closed:
                    // Success in closed state resets failure tracking
                    ResetFailureTracking();
                    break;

                case CircuitState.HalfOpen:
                    _halfOpenSuccessCount++;
                    if (_halfOpenSuccessCount >= _options.HalfOpenRequests)
                    {
                        TransitionTo(CircuitState.Closed);
                        ResetFailureTracking();
                        _halfOpenSuccessCount = 0;
                    }
                    break;

                case CircuitState.Open:
                    // Ignore success in open state (shouldn't happen normally)
                    break;
            }
        }
    }

    public void RecordFailure()
    {
        lock (_lock)
        {
            var now = DateTime.UtcNow;
            _lastFailureTime = now;

            switch (_state)
            {
                case CircuitState.Closed:
                    // Add failure to sliding window
                    _failureTimestamps.Add(now);

                    // Evict failures outside the sampling window
                    EvictOldFailures(now);

                    // Check if threshold reached
                    if (_failureTimestamps.Count >= _options.FailureThreshold)
                    {
                        TransitionTo(CircuitState.Open);
                        _circuitOpenedAt = now;
                    }
                    break;

                case CircuitState.HalfOpen:
                    // Any failure in half-open state reopens the circuit
                    TransitionTo(CircuitState.Open);
                    _circuitOpenedAt = now;
                    _halfOpenSuccessCount = 0;
                    break;

                case CircuitState.Open:
                    // Ignore failure in open state
                    break;
            }
        }
    }

    public CircuitStateInfo GetState()
    {
        lock (_lock)
        {
            // Evict old failures before reporting count
            EvictOldFailures(DateTime.UtcNow);

            return new CircuitStateInfo
            {
                State = _state,
                FailureCount = _failureTimestamps.Count,
                HalfOpenSuccessCount = _halfOpenSuccessCount,
                LastFailureTime = _lastFailureTime,
                CircuitOpenedAt = _circuitOpenedAt,
                LastStateTransitionAt = _lastStateTransitionAt
            };
        }
    }

    public void ForceOpen()
    {
        lock (_lock)
        {
            TransitionTo(CircuitState.Open);
            _circuitOpenedAt = DateTime.UtcNow;
        }
    }

    public void ForceClose()
    {
        lock (_lock)
        {
            TransitionTo(CircuitState.Closed);
            ResetFailureTracking();
            _halfOpenSuccessCount = 0;
        }
    }

    public void Reset()
    {
        lock (_lock)
        {
            _state = CircuitState.Closed;
            _failureTimestamps.Clear();
            _halfOpenSuccessCount = 0;
            _lastFailureTime = null;
            _circuitOpenedAt = null;
            _lastStateTransitionAt = null;
        }
    }

    private void TransitionTo(CircuitState newState)
    {
        if (_state != newState)
        {
            _state = newState;
            _lastStateTransitionAt = DateTime.UtcNow;
        }
    }

    private void ResetFailureTracking()
    {
        _failureTimestamps.Clear();
    }

    private void EvictOldFailures(DateTime now)
    {
        var cutoff = now - _options.SamplingDuration;
        _failureTimestamps.RemoveAll(t => t < cutoff);
    }
}
