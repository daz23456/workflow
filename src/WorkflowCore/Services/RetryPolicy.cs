using WorkflowCore.Models;

namespace WorkflowCore.Services;

public interface IRetryPolicy
{
    TimeSpan CalculateDelay(int attemptNumber);
    bool ShouldRetry(Exception exception, int attemptNumber);
}

public class RetryPolicy : IRetryPolicy
{
    private readonly RetryPolicyOptions _options;

    public RetryPolicy(RetryPolicyOptions options)
    {
        _options = options ?? throw new ArgumentNullException(nameof(options));
    }

    public TimeSpan CalculateDelay(int attemptNumber)
    {
        if (attemptNumber < 1)
        {
            return TimeSpan.Zero;
        }

        // Exponential backoff: initialDelay * (multiplier ^ (attemptNumber - 1))
        var delayMilliseconds = _options.InitialDelayMilliseconds *
            Math.Pow(_options.BackoffMultiplier, attemptNumber - 1);

        // Cap at maximum delay
        var cappedDelay = Math.Min(delayMilliseconds, _options.MaxDelayMilliseconds);

        return TimeSpan.FromMilliseconds(cappedDelay);
    }

    public bool ShouldRetry(Exception exception, int attemptNumber)
    {
        // Don't retry if max attempts exceeded
        if (attemptNumber > _options.MaxRetryCount)
        {
            return false;
        }

        // Don't retry on cancellation
        if (exception is TaskCanceledException or OperationCanceledException)
        {
            return false;
        }

        // Retry on transient errors (network errors, timeouts)
        if (exception is HttpRequestException)
        {
            return true;
        }

        // Default: don't retry
        return false;
    }
}
