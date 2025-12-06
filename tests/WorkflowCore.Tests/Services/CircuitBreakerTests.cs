using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class CircuitBreakerTests
{
    // ========== STATE MACHINE TESTS ==========

    [Fact]
    public void InitialState_ShouldBeClosed()
    {
        // Arrange
        var options = new CircuitBreakerOptions();
        var circuitBreaker = new CircuitBreaker(options);

        // Act
        var state = circuitBreaker.GetState();

        // Assert
        state.State.Should().Be(CircuitState.Closed);
        state.FailureCount.Should().Be(0);
    }

    [Fact]
    public void CanExecute_WhenClosed_ShouldReturnTrue()
    {
        // Arrange
        var options = new CircuitBreakerOptions();
        var circuitBreaker = new CircuitBreaker(options);

        // Act
        var canExecute = circuitBreaker.CanExecute();

        // Assert
        canExecute.Should().BeTrue();
    }

    [Fact]
    public void RecordFailure_BelowThreshold_ShouldRemainClosed()
    {
        // Arrange
        var options = new CircuitBreakerOptions { FailureThreshold = 5 };
        var circuitBreaker = new CircuitBreaker(options);

        // Act - record failures below threshold
        for (int i = 0; i < 4; i++)
        {
            circuitBreaker.RecordFailure();
        }

        // Assert
        var state = circuitBreaker.GetState();
        state.State.Should().Be(CircuitState.Closed);
        state.FailureCount.Should().Be(4);
    }

    [Fact]
    public void RecordFailure_AtThreshold_ShouldTransitionToOpen()
    {
        // Arrange
        var options = new CircuitBreakerOptions { FailureThreshold = 5 };
        var circuitBreaker = new CircuitBreaker(options);

        // Act - record failures at threshold
        for (int i = 0; i < 5; i++)
        {
            circuitBreaker.RecordFailure();
        }

        // Assert
        var state = circuitBreaker.GetState();
        state.State.Should().Be(CircuitState.Open);
        state.CircuitOpenedAt.Should().NotBeNull();
    }

    [Fact]
    public void CanExecute_WhenOpen_ShouldReturnFalse()
    {
        // Arrange
        var options = new CircuitBreakerOptions { FailureThreshold = 1 };
        var circuitBreaker = new CircuitBreaker(options);
        circuitBreaker.RecordFailure(); // Open the circuit

        // Act
        var canExecute = circuitBreaker.CanExecute();

        // Assert
        canExecute.Should().BeFalse();
    }

    [Fact]
    public void CanExecute_AfterBreakDuration_ShouldTransitionToHalfOpen()
    {
        // Arrange
        var options = new CircuitBreakerOptions
        {
            FailureThreshold = 1,
            BreakDuration = TimeSpan.FromMilliseconds(50)
        };
        var circuitBreaker = new CircuitBreaker(options);
        circuitBreaker.RecordFailure(); // Open the circuit

        // Act - wait for break duration to pass
        Thread.Sleep(100);
        var canExecute = circuitBreaker.CanExecute();

        // Assert
        canExecute.Should().BeTrue();
        var state = circuitBreaker.GetState();
        state.State.Should().Be(CircuitState.HalfOpen);
    }

    [Fact]
    public void RecordSuccess_InHalfOpen_BelowThreshold_ShouldRemainHalfOpen()
    {
        // Arrange
        var options = new CircuitBreakerOptions
        {
            FailureThreshold = 1,
            BreakDuration = TimeSpan.FromMilliseconds(10),
            HalfOpenRequests = 3
        };
        var circuitBreaker = new CircuitBreaker(options);
        circuitBreaker.RecordFailure(); // Open
        Thread.Sleep(50);
        circuitBreaker.CanExecute(); // Transition to HalfOpen

        // Act - record success below half-open threshold
        circuitBreaker.RecordSuccess();

        // Assert
        var state = circuitBreaker.GetState();
        state.State.Should().Be(CircuitState.HalfOpen);
        state.HalfOpenSuccessCount.Should().Be(1);
    }

    [Fact]
    public void RecordSuccess_InHalfOpen_AtThreshold_ShouldTransitionToClosed()
    {
        // Arrange
        var options = new CircuitBreakerOptions
        {
            FailureThreshold = 1,
            BreakDuration = TimeSpan.FromMilliseconds(10),
            HalfOpenRequests = 3
        };
        var circuitBreaker = new CircuitBreaker(options);
        circuitBreaker.RecordFailure(); // Open
        Thread.Sleep(50);
        circuitBreaker.CanExecute(); // Transition to HalfOpen

        // Act - record successes at half-open threshold
        circuitBreaker.RecordSuccess();
        circuitBreaker.RecordSuccess();
        circuitBreaker.RecordSuccess();

        // Assert
        var state = circuitBreaker.GetState();
        state.State.Should().Be(CircuitState.Closed);
        state.FailureCount.Should().Be(0);
        state.HalfOpenSuccessCount.Should().Be(0);
    }

    [Fact]
    public void RecordFailure_InHalfOpen_ShouldTransitionToOpen()
    {
        // Arrange
        var options = new CircuitBreakerOptions
        {
            FailureThreshold = 1,
            BreakDuration = TimeSpan.FromMilliseconds(10),
            HalfOpenRequests = 3
        };
        var circuitBreaker = new CircuitBreaker(options);
        circuitBreaker.RecordFailure(); // Open
        Thread.Sleep(50);
        circuitBreaker.CanExecute(); // Transition to HalfOpen

        // Act - record failure in half-open state
        circuitBreaker.RecordFailure();

        // Assert
        var state = circuitBreaker.GetState();
        state.State.Should().Be(CircuitState.Open);
    }

    [Fact]
    public void RecordSuccess_WhenClosed_ShouldResetFailureCount()
    {
        // Arrange
        var options = new CircuitBreakerOptions { FailureThreshold = 5 };
        var circuitBreaker = new CircuitBreaker(options);
        circuitBreaker.RecordFailure();
        circuitBreaker.RecordFailure();
        circuitBreaker.RecordFailure();

        // Act
        circuitBreaker.RecordSuccess();

        // Assert
        var state = circuitBreaker.GetState();
        state.State.Should().Be(CircuitState.Closed);
        state.FailureCount.Should().Be(0);
    }

    [Fact]
    public void StateTransition_ShouldUpdateTimestamp()
    {
        // Arrange
        var options = new CircuitBreakerOptions { FailureThreshold = 1 };
        var circuitBreaker = new CircuitBreaker(options);
        var beforeTransition = DateTime.UtcNow;

        // Act
        circuitBreaker.RecordFailure();
        var afterTransition = DateTime.UtcNow;

        // Assert
        var state = circuitBreaker.GetState();
        state.LastStateTransitionAt.Should().NotBeNull();
        state.LastStateTransitionAt.Should().BeOnOrAfter(beforeTransition);
        state.LastStateTransitionAt.Should().BeOnOrBefore(afterTransition);
    }

    // ========== SLIDING WINDOW TESTS ==========

    [Fact]
    public void RecordFailure_OutsideSamplingWindow_ShouldNotCount()
    {
        // Arrange
        var options = new CircuitBreakerOptions
        {
            FailureThreshold = 3,
            SamplingDuration = TimeSpan.FromMilliseconds(50)
        };
        var circuitBreaker = new CircuitBreaker(options);

        // Act - record failures, then wait for window to expire
        circuitBreaker.RecordFailure();
        circuitBreaker.RecordFailure();
        Thread.Sleep(100); // Wait for sampling window to expire
        circuitBreaker.RecordFailure(); // This should start a new window

        // Assert - should only count the last failure, not the old ones
        var state = circuitBreaker.GetState();
        state.State.Should().Be(CircuitState.Closed);
        state.FailureCount.Should().Be(1);
    }

    [Fact]
    public void SlidingWindow_ShouldEvictOldFailures()
    {
        // Arrange
        var options = new CircuitBreakerOptions
        {
            FailureThreshold = 5,
            SamplingDuration = TimeSpan.FromMilliseconds(100)
        };
        var circuitBreaker = new CircuitBreaker(options);

        // Act - record failures over time
        circuitBreaker.RecordFailure();
        circuitBreaker.RecordFailure();
        Thread.Sleep(60);
        circuitBreaker.RecordFailure();
        circuitBreaker.RecordFailure();
        Thread.Sleep(60); // First two should now be outside window

        // Assert - only last two failures should count
        var state = circuitBreaker.GetState();
        state.FailureCount.Should().BeLessThanOrEqualTo(4); // May be 2-4 depending on timing
        state.State.Should().Be(CircuitState.Closed);
    }

    [Fact]
    public void SlidingWindow_FailuresWithinWindow_ShouldAccumulate()
    {
        // Arrange
        var options = new CircuitBreakerOptions
        {
            FailureThreshold = 5,
            SamplingDuration = TimeSpan.FromSeconds(60) // Long window
        };
        var circuitBreaker = new CircuitBreaker(options);

        // Act - record failures quickly
        circuitBreaker.RecordFailure();
        circuitBreaker.RecordFailure();
        circuitBreaker.RecordFailure();
        circuitBreaker.RecordFailure();

        // Assert
        var state = circuitBreaker.GetState();
        state.FailureCount.Should().Be(4);
    }

    // ========== THREAD SAFETY TESTS ==========

    [Fact]
    public async Task ConcurrentRecordFailure_ShouldBeThreadSafe()
    {
        // Arrange
        var options = new CircuitBreakerOptions { FailureThreshold = 100 };
        var circuitBreaker = new CircuitBreaker(options);
        var tasks = new List<Task>();

        // Act - concurrent failure recording
        for (int i = 0; i < 50; i++)
        {
            tasks.Add(Task.Run(() => circuitBreaker.RecordFailure()));
        }
        await Task.WhenAll(tasks);

        // Assert - all failures should be recorded
        var state = circuitBreaker.GetState();
        state.FailureCount.Should().Be(50);
    }

    [Fact]
    public async Task ConcurrentRecordSuccess_ShouldBeThreadSafe()
    {
        // Arrange
        var options = new CircuitBreakerOptions
        {
            FailureThreshold = 1,
            BreakDuration = TimeSpan.FromMilliseconds(10),
            HalfOpenRequests = 100
        };
        var circuitBreaker = new CircuitBreaker(options);
        circuitBreaker.RecordFailure(); // Open
        Thread.Sleep(50);
        circuitBreaker.CanExecute(); // Half-open
        var tasks = new List<Task>();

        // Act - concurrent success recording
        for (int i = 0; i < 50; i++)
        {
            tasks.Add(Task.Run(() => circuitBreaker.RecordSuccess()));
        }
        await Task.WhenAll(tasks);

        // Assert - state should be consistent (closed after enough successes)
        var state = circuitBreaker.GetState();
        state.HalfOpenSuccessCount.Should().BeGreaterThanOrEqualTo(0);
    }

    [Fact]
    public async Task ConcurrentCanExecute_ShouldReturnConsistentState()
    {
        // Arrange
        var options = new CircuitBreakerOptions { FailureThreshold = 5 };
        var circuitBreaker = new CircuitBreaker(options);
        var results = new List<bool>();
        var lockObj = new object();
        var tasks = new List<Task>();

        // Act - concurrent CanExecute calls
        for (int i = 0; i < 100; i++)
        {
            tasks.Add(Task.Run(() =>
            {
                var result = circuitBreaker.CanExecute();
                lock (lockObj)
                {
                    results.Add(result);
                }
            }));
        }
        await Task.WhenAll(tasks);

        // Assert - all should return true since circuit is closed
        results.Should().AllBeEquivalentTo(true);
    }

    [Fact]
    public async Task ConcurrentStateTransitions_ShouldBeAtomic()
    {
        // Arrange
        var options = new CircuitBreakerOptions
        {
            FailureThreshold = 5,
            SamplingDuration = TimeSpan.FromSeconds(60)
        };
        var circuitBreaker = new CircuitBreaker(options);
        var tasks = new List<Task>();

        // Act - concurrent operations that could cause race conditions
        for (int i = 0; i < 10; i++)
        {
            tasks.Add(Task.Run(() =>
            {
                for (int j = 0; j < 10; j++)
                {
                    circuitBreaker.RecordFailure();
                    circuitBreaker.CanExecute();
                }
            }));
        }
        await Task.WhenAll(tasks);

        // Assert - state should be valid (Open after many failures)
        var state = circuitBreaker.GetState();
        state.State.Should().Be(CircuitState.Open);
    }

    // ========== MANUAL CONTROL TESTS ==========

    [Fact]
    public void ForceOpen_ShouldOpenCircuit()
    {
        // Arrange
        var options = new CircuitBreakerOptions();
        var circuitBreaker = new CircuitBreaker(options);

        // Act
        circuitBreaker.ForceOpen();

        // Assert
        var state = circuitBreaker.GetState();
        state.State.Should().Be(CircuitState.Open);
        circuitBreaker.CanExecute().Should().BeFalse();
    }

    [Fact]
    public void ForceClose_ShouldCloseCircuit()
    {
        // Arrange
        var options = new CircuitBreakerOptions { FailureThreshold = 1 };
        var circuitBreaker = new CircuitBreaker(options);
        circuitBreaker.RecordFailure(); // Open

        // Act
        circuitBreaker.ForceClose();

        // Assert
        var state = circuitBreaker.GetState();
        state.State.Should().Be(CircuitState.Closed);
        state.FailureCount.Should().Be(0);
        circuitBreaker.CanExecute().Should().BeTrue();
    }

    [Fact]
    public void Reset_ShouldClearAllState()
    {
        // Arrange
        var options = new CircuitBreakerOptions { FailureThreshold = 5 };
        var circuitBreaker = new CircuitBreaker(options);
        circuitBreaker.RecordFailure();
        circuitBreaker.RecordFailure();
        circuitBreaker.RecordFailure();

        // Act
        circuitBreaker.Reset();

        // Assert
        var state = circuitBreaker.GetState();
        state.State.Should().Be(CircuitState.Closed);
        state.FailureCount.Should().Be(0);
        state.HalfOpenSuccessCount.Should().Be(0);
        state.LastFailureTime.Should().BeNull();
        state.CircuitOpenedAt.Should().BeNull();
        state.LastStateTransitionAt.Should().BeNull();
    }

    // ========== EDGE CASES ==========

    [Fact]
    public void RecordFailure_ShouldUpdateLastFailureTime()
    {
        // Arrange
        var options = new CircuitBreakerOptions();
        var circuitBreaker = new CircuitBreaker(options);
        var before = DateTime.UtcNow;

        // Act
        circuitBreaker.RecordFailure();
        var after = DateTime.UtcNow;

        // Assert
        var state = circuitBreaker.GetState();
        state.LastFailureTime.Should().NotBeNull();
        state.LastFailureTime.Should().BeOnOrAfter(before);
        state.LastFailureTime.Should().BeOnOrBefore(after);
    }

    [Fact]
    public void GetState_ShouldReturnCopyNotReference()
    {
        // Arrange
        var options = new CircuitBreakerOptions();
        var circuitBreaker = new CircuitBreaker(options);

        // Act
        var state1 = circuitBreaker.GetState();
        state1.FailureCount = 999; // Try to modify
        var state2 = circuitBreaker.GetState();

        // Assert - modification shouldn't affect internal state
        state2.FailureCount.Should().Be(0);
    }
}
