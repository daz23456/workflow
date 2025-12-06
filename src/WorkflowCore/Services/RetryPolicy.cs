using WorkflowCore.Models;

namespace WorkflowCore.Services;

public interface IRetryPolicy
{
    TimeSpan CalculateDelay(int attemptNumber);
    bool ShouldRetry(Exception exception, int attemptNumber);
    bool ShouldRetryStatusCode(int httpStatusCode, int attemptNumber);
    bool IsRetryableStatusCode(int httpStatusCode);
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

    public bool ShouldRetryStatusCode(int httpStatusCode, int attemptNumber)
    {
        // Don't retry if max attempts exceeded
        if (attemptNumber > _options.MaxRetryCount)
        {
            return false;
        }

        return IsRetryableStatusCode(httpStatusCode);
    }

    public bool IsRetryableStatusCode(int httpStatusCode)
    {
        // Retry on server errors (5xx) - these are typically transient
        // 500 Internal Server Error - may be transient
        // 502 Bad Gateway - upstream server issue, often transient
        // 503 Service Unavailable - explicitly transient
        // 504 Gateway Timeout - upstream timeout, often transient
        return httpStatusCode >= 500 && httpStatusCode <= 599;
    }
}
