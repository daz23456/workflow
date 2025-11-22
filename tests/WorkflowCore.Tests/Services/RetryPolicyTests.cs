using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class RetryPolicyTests
{
    [Fact]
    public void CalculateDelay_WithFirstRetry_ShouldReturnInitialDelay()
    {
        // Arrange
        var policy = new RetryPolicy(new RetryPolicyOptions
        {
            InitialDelayMilliseconds = 100,
            MaxDelayMilliseconds = 30000,
            BackoffMultiplier = 2.0
        });

        // Act
        var delay = policy.CalculateDelay(attemptNumber: 1);

        // Assert
        delay.Should().Be(TimeSpan.FromMilliseconds(100));
    }

    [Fact]
    public void CalculateDelay_WithExponentialBackoff_ShouldDoubleEachTime()
    {
        // Arrange
        var policy = new RetryPolicy(new RetryPolicyOptions
        {
            InitialDelayMilliseconds = 100,
            MaxDelayMilliseconds = 30000,
            BackoffMultiplier = 2.0
        });

        // Act & Assert
        policy.CalculateDelay(1).Should().Be(TimeSpan.FromMilliseconds(100));   // 100ms
        policy.CalculateDelay(2).Should().Be(TimeSpan.FromMilliseconds(200));   // 200ms
        policy.CalculateDelay(3).Should().Be(TimeSpan.FromMilliseconds(400));   // 400ms
        policy.CalculateDelay(4).Should().Be(TimeSpan.FromMilliseconds(800));   // 800ms
    }

    [Fact]
    public void CalculateDelay_ExceedingMaxDelay_ShouldCapAtMaximum()
    {
        // Arrange
        var policy = new RetryPolicy(new RetryPolicyOptions
        {
            InitialDelayMilliseconds = 100,
            MaxDelayMilliseconds = 500,
            BackoffMultiplier = 2.0
        });

        // Act
        var delay = policy.CalculateDelay(10); // Would be 51200ms without cap

        // Assert
        delay.Should().Be(TimeSpan.FromMilliseconds(500));
    }

    [Fact]
    public void ShouldRetry_WithinMaxRetries_ShouldReturnTrue()
    {
        // Arrange
        var policy = new RetryPolicy(new RetryPolicyOptions
        {
            MaxRetryCount = 3
        });
        var exception = new HttpRequestException("Temporary network error");

        // Act & Assert
        policy.ShouldRetry(exception, attemptNumber: 1).Should().BeTrue();
        policy.ShouldRetry(exception, attemptNumber: 2).Should().BeTrue();
        policy.ShouldRetry(exception, attemptNumber: 3).Should().BeTrue();
    }

    [Fact]
    public void ShouldRetry_ExceedingMaxRetries_ShouldReturnFalse()
    {
        // Arrange
        var policy = new RetryPolicy(new RetryPolicyOptions
        {
            MaxRetryCount = 3
        });
        var exception = new HttpRequestException("Temporary network error");

        // Act
        var shouldRetry = policy.ShouldRetry(exception, attemptNumber: 4);

        // Assert
        shouldRetry.Should().BeFalse();
    }

    [Fact]
    public void ShouldRetry_WithTaskCanceledException_ShouldReturnFalse()
    {
        // Arrange
        var policy = new RetryPolicy(new RetryPolicyOptions { MaxRetryCount = 3 });
        var exception = new TaskCanceledException("Request cancelled");

        // Act
        var shouldRetry = policy.ShouldRetry(exception, attemptNumber: 1);

        // Assert
        shouldRetry.Should().BeFalse();
    }

    [Fact]
    public void ShouldRetry_WithOperationCanceledException_ShouldReturnFalse()
    {
        // Arrange
        var policy = new RetryPolicy(new RetryPolicyOptions { MaxRetryCount = 3 });
        var exception = new OperationCanceledException("Operation cancelled");

        // Act
        var shouldRetry = policy.ShouldRetry(exception, attemptNumber: 1);

        // Assert
        shouldRetry.Should().BeFalse();
    }

    [Fact]
    public void ShouldRetry_WithHttpRequestException_ShouldReturnTrue()
    {
        // Arrange
        var policy = new RetryPolicy(new RetryPolicyOptions { MaxRetryCount = 3 });
        var exception = new HttpRequestException("Network error");

        // Act
        var shouldRetry = policy.ShouldRetry(exception, attemptNumber: 1);

        // Assert
        shouldRetry.Should().BeTrue();
    }
}
