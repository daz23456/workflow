using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class CircuitBreakerRegistryTests
{
    [Fact]
    public void GetOrCreate_ShouldReturnSameInstanceForSameTaskRef()
    {
        // Arrange
        var registry = new CircuitBreakerRegistry();
        var options = new CircuitBreakerOptions();

        // Act
        var cb1 = registry.GetOrCreate("task-a", options);
        var cb2 = registry.GetOrCreate("task-a", options);

        // Assert
        cb1.Should().BeSameAs(cb2);
    }

    [Fact]
    public void GetOrCreate_ShouldReturnDifferentInstancesForDifferentTaskRefs()
    {
        // Arrange
        var registry = new CircuitBreakerRegistry();
        var options = new CircuitBreakerOptions();

        // Act
        var cbA = registry.GetOrCreate("task-a", options);
        var cbB = registry.GetOrCreate("task-b", options);

        // Assert
        cbA.Should().NotBeSameAs(cbB);
    }

    [Fact]
    public void GetOrCreate_ShouldUseProvidedOptions()
    {
        // Arrange
        var registry = new CircuitBreakerRegistry();
        var options = new CircuitBreakerOptions { FailureThreshold = 10 };

        // Act
        var cb = registry.GetOrCreate("task-a", options);

        // Record failures up to threshold
        for (int i = 0; i < 10; i++)
        {
            cb.RecordFailure();
        }

        // Assert
        var state = cb.GetState();
        state.State.Should().Be(CircuitState.Open);
    }

    [Fact]
    public void TryGet_ShouldReturnFalseForUnknownTaskRef()
    {
        // Arrange
        var registry = new CircuitBreakerRegistry();

        // Act
        var result = registry.TryGet("unknown-task", out var circuitBreaker);

        // Assert
        result.Should().BeFalse();
        circuitBreaker.Should().BeNull();
    }

    [Fact]
    public void TryGet_ShouldReturnTrueAndCircuitBreakerForKnownTaskRef()
    {
        // Arrange
        var registry = new CircuitBreakerRegistry();
        var options = new CircuitBreakerOptions();
        var created = registry.GetOrCreate("task-a", options);

        // Act
        var result = registry.TryGet("task-a", out var retrieved);

        // Assert
        result.Should().BeTrue();
        retrieved.Should().BeSameAs(created);
    }

    [Fact]
    public void GetAll_ShouldReturnEmptyWhenNoCircuitBreakers()
    {
        // Arrange
        var registry = new CircuitBreakerRegistry();

        // Act
        var all = registry.GetAll();

        // Assert
        all.Should().BeEmpty();
    }

    [Fact]
    public void GetAll_ShouldReturnAllCircuitBreakers()
    {
        // Arrange
        var registry = new CircuitBreakerRegistry();
        var options = new CircuitBreakerOptions();
        registry.GetOrCreate("task-a", options);
        registry.GetOrCreate("task-b", options);
        registry.GetOrCreate("task-c", options);

        // Act
        var all = registry.GetAll();

        // Assert
        all.Should().HaveCount(3);
        all.Keys.Should().Contain("task-a");
        all.Keys.Should().Contain("task-b");
        all.Keys.Should().Contain("task-c");
    }

    [Fact]
    public void Remove_ShouldRemoveCircuitBreaker()
    {
        // Arrange
        var registry = new CircuitBreakerRegistry();
        var options = new CircuitBreakerOptions();
        registry.GetOrCreate("task-a", options);

        // Act
        var result = registry.Remove("task-a");

        // Assert
        result.Should().BeTrue();
        registry.TryGet("task-a", out _).Should().BeFalse();
    }

    [Fact]
    public void Remove_ShouldReturnFalseForUnknownTaskRef()
    {
        // Arrange
        var registry = new CircuitBreakerRegistry();

        // Act
        var result = registry.Remove("unknown-task");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void Clear_ShouldRemoveAllCircuitBreakers()
    {
        // Arrange
        var registry = new CircuitBreakerRegistry();
        var options = new CircuitBreakerOptions();
        registry.GetOrCreate("task-a", options);
        registry.GetOrCreate("task-b", options);

        // Act
        registry.Clear();

        // Assert
        registry.GetAll().Should().BeEmpty();
    }

    [Fact]
    public async Task ConcurrentGetOrCreate_ShouldBeThreadSafe()
    {
        // Arrange
        var registry = new CircuitBreakerRegistry();
        var options = new CircuitBreakerOptions();
        var tasks = new List<Task<ICircuitBreaker>>();

        // Act - concurrent creation for same task ref
        for (int i = 0; i < 100; i++)
        {
            tasks.Add(Task.Run(() => registry.GetOrCreate("task-a", options)));
        }
        var results = await Task.WhenAll(tasks);

        // Assert - all should be the same instance
        var first = results[0];
        results.Should().AllSatisfy(cb => cb.Should().BeSameAs(first));
    }

    [Fact]
    public async Task ConcurrentGetOrCreate_DifferentTaskRefs_ShouldBeThreadSafe()
    {
        // Arrange
        var registry = new CircuitBreakerRegistry();
        var options = new CircuitBreakerOptions();
        var tasks = new List<Task<ICircuitBreaker>>();

        // Act - concurrent creation for different task refs
        for (int i = 0; i < 100; i++)
        {
            var taskRef = $"task-{i}";
            tasks.Add(Task.Run(() => registry.GetOrCreate(taskRef, options)));
        }
        await Task.WhenAll(tasks);

        // Assert
        registry.GetAll().Should().HaveCount(100);
    }

    [Fact]
    public void IndependentCircuits_ShouldMaintainIndependentState()
    {
        // Arrange
        var registry = new CircuitBreakerRegistry();
        var options = new CircuitBreakerOptions { FailureThreshold = 3 };
        var cbA = registry.GetOrCreate("task-a", options);
        var cbB = registry.GetOrCreate("task-b", options);

        // Act - open circuit A but not B
        cbA.RecordFailure();
        cbA.RecordFailure();
        cbA.RecordFailure(); // Opens circuit A

        cbB.RecordFailure(); // Circuit B has 1 failure

        // Assert
        cbA.GetState().State.Should().Be(CircuitState.Open);
        cbB.GetState().State.Should().Be(CircuitState.Closed);
        cbB.GetState().FailureCount.Should().Be(1);
    }
}
