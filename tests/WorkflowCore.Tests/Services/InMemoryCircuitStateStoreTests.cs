using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class InMemoryCircuitStateStoreTests
{
    [Fact]
    public async Task GetStateAsync_UnknownService_ShouldReturnClosedState()
    {
        // Arrange
        var store = new InMemoryCircuitStateStore();

        // Act
        var state = await store.GetStateAsync("unknown-service");

        // Assert
        state.Should().NotBeNull();
        state.State.Should().Be(CircuitState.Closed);
        state.FailureCount.Should().Be(0);
    }

    [Fact]
    public async Task SaveStateAsync_ShouldPersistState()
    {
        // Arrange
        var store = new InMemoryCircuitStateStore();
        var stateToSave = new CircuitStateInfo
        {
            State = CircuitState.Open,
            FailureCount = 5,
            CircuitOpenedAt = DateTime.UtcNow
        };

        // Act
        await store.SaveStateAsync("test-service", stateToSave);
        var retrieved = await store.GetStateAsync("test-service");

        // Assert
        retrieved.State.Should().Be(CircuitState.Open);
        retrieved.FailureCount.Should().Be(5);
        retrieved.CircuitOpenedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task RecordFailureAsync_ShouldIncrementFailureCount()
    {
        // Arrange
        var store = new InMemoryCircuitStateStore();
        var options = new CircuitBreakerOptions { FailureThreshold = 5 };

        // Act
        var state = await store.RecordFailureAsync("test-service", options);

        // Assert
        state.FailureCount.Should().Be(1);
        state.State.Should().Be(CircuitState.Closed);
    }

    [Fact]
    public async Task RecordFailureAsync_AtThreshold_ShouldOpenCircuit()
    {
        // Arrange
        var store = new InMemoryCircuitStateStore();
        var options = new CircuitBreakerOptions { FailureThreshold = 3 };

        // Act
        await store.RecordFailureAsync("test-service", options);
        await store.RecordFailureAsync("test-service", options);
        var state = await store.RecordFailureAsync("test-service", options);

        // Assert
        state.State.Should().Be(CircuitState.Open);
        state.CircuitOpenedAt.Should().NotBeNull();
    }

    [Fact]
    public async Task RecordSuccessAsync_InClosed_ShouldResetFailureCount()
    {
        // Arrange
        var store = new InMemoryCircuitStateStore();
        var options = new CircuitBreakerOptions { FailureThreshold = 5 };

        // Record some failures first
        await store.RecordFailureAsync("test-service", options);
        await store.RecordFailureAsync("test-service", options);

        // Act
        var state = await store.RecordSuccessAsync("test-service", options);

        // Assert
        state.FailureCount.Should().Be(0);
        state.State.Should().Be(CircuitState.Closed);
    }

    [Fact]
    public async Task RecordSuccessAsync_InHalfOpen_ShouldIncrementSuccessCount()
    {
        // Arrange
        var store = new InMemoryCircuitStateStore();
        var options = new CircuitBreakerOptions { HalfOpenRequests = 3 };

        // Set to half-open state
        await store.SaveStateAsync("test-service", new CircuitStateInfo { State = CircuitState.HalfOpen });

        // Act
        var state = await store.RecordSuccessAsync("test-service", options);

        // Assert
        state.HalfOpenSuccessCount.Should().Be(1);
        state.State.Should().Be(CircuitState.HalfOpen);
    }

    [Fact]
    public async Task RecordSuccessAsync_InHalfOpen_AtThreshold_ShouldCloseCircuit()
    {
        // Arrange
        var store = new InMemoryCircuitStateStore();
        var options = new CircuitBreakerOptions { HalfOpenRequests = 2 };

        // Set to half-open state
        await store.SaveStateAsync("test-service", new CircuitStateInfo { State = CircuitState.HalfOpen });

        // Act
        await store.RecordSuccessAsync("test-service", options);
        var state = await store.RecordSuccessAsync("test-service", options);

        // Assert
        state.State.Should().Be(CircuitState.Closed);
        state.HalfOpenSuccessCount.Should().Be(0);
    }

    [Fact]
    public async Task RecordFailureAsync_InHalfOpen_ShouldOpenCircuit()
    {
        // Arrange
        var store = new InMemoryCircuitStateStore();
        var options = new CircuitBreakerOptions();

        // Set to half-open state
        await store.SaveStateAsync("test-service", new CircuitStateInfo { State = CircuitState.HalfOpen });

        // Act
        var state = await store.RecordFailureAsync("test-service", options);

        // Assert
        state.State.Should().Be(CircuitState.Open);
    }

    [Fact]
    public async Task GetAllStatesAsync_ShouldReturnAllStates()
    {
        // Arrange
        var store = new InMemoryCircuitStateStore();
        var options = new CircuitBreakerOptions();

        await store.RecordFailureAsync("service-a", options);
        await store.RecordFailureAsync("service-b", options);
        await store.RecordFailureAsync("service-c", options);

        // Act
        var allStates = await store.GetAllStatesAsync();

        // Assert
        allStates.Should().HaveCount(3);
        allStates.Keys.Should().Contain("service-a");
        allStates.Keys.Should().Contain("service-b");
        allStates.Keys.Should().Contain("service-c");
    }

    [Fact]
    public async Task RemoveStateAsync_ShouldRemoveState()
    {
        // Arrange
        var store = new InMemoryCircuitStateStore();
        var options = new CircuitBreakerOptions();
        await store.RecordFailureAsync("test-service", options);

        // Act
        var removed = await store.RemoveStateAsync("test-service");
        var state = await store.GetStateAsync("test-service");

        // Assert
        removed.Should().BeTrue();
        state.FailureCount.Should().Be(0); // Fresh state
    }

    [Fact]
    public async Task RemoveStateAsync_UnknownService_ShouldReturnFalse()
    {
        // Arrange
        var store = new InMemoryCircuitStateStore();

        // Act
        var removed = await store.RemoveStateAsync("unknown-service");

        // Assert
        removed.Should().BeFalse();
    }

    [Fact]
    public async Task ClearAllAsync_ShouldRemoveAllStates()
    {
        // Arrange
        var store = new InMemoryCircuitStateStore();
        var options = new CircuitBreakerOptions();
        await store.RecordFailureAsync("service-a", options);
        await store.RecordFailureAsync("service-b", options);

        // Act
        await store.ClearAllAsync();
        var allStates = await store.GetAllStatesAsync();

        // Assert
        allStates.Should().BeEmpty();
    }

    [Fact]
    public async Task IsHealthyAsync_ShouldReturnTrue()
    {
        // Arrange
        var store = new InMemoryCircuitStateStore();

        // Act
        var healthy = await store.IsHealthyAsync();

        // Assert
        healthy.Should().BeTrue();
    }

    [Fact]
    public async Task GetStateAsync_ShouldReturnCopyNotReference()
    {
        // Arrange
        var store = new InMemoryCircuitStateStore();
        var options = new CircuitBreakerOptions();
        await store.RecordFailureAsync("test-service", options);

        // Act
        var state1 = await store.GetStateAsync("test-service");
        state1.FailureCount = 999; // Modify the copy
        var state2 = await store.GetStateAsync("test-service");

        // Assert - original should be unchanged
        state2.FailureCount.Should().Be(1);
    }

    [Fact]
    public async Task SlidingWindow_ShouldEvictOldFailures()
    {
        // Arrange
        var store = new InMemoryCircuitStateStore();
        var options = new CircuitBreakerOptions
        {
            FailureThreshold = 5,
            SamplingDuration = TimeSpan.FromMilliseconds(100)
        };

        // Record failures, wait for window to expire
        await store.RecordFailureAsync("test-service", options);
        await store.RecordFailureAsync("test-service", options);
        await Task.Delay(150); // Wait for sampling window to expire

        // Act - new failure should start fresh count
        var state = await store.RecordFailureAsync("test-service", options);

        // Assert - old failures should be evicted
        state.FailureCount.Should().Be(1);
        state.State.Should().Be(CircuitState.Closed);
    }

    [Fact]
    public async Task ConcurrentRecordFailure_ShouldBeThreadSafe()
    {
        // Arrange
        var store = new InMemoryCircuitStateStore();
        var options = new CircuitBreakerOptions { FailureThreshold = 100 };
        var tasks = new List<Task>();

        // Act - concurrent failures
        for (int i = 0; i < 50; i++)
        {
            tasks.Add(store.RecordFailureAsync("test-service", options));
        }
        await Task.WhenAll(tasks);

        // Assert
        var state = await store.GetStateAsync("test-service");
        state.FailureCount.Should().Be(50);
    }
}
