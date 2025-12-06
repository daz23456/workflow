using System.Text.Json;
using FluentAssertions;
using Moq;
using StackExchange.Redis;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class RedisCircuitStateStoreTests
{
    private readonly Mock<IConnectionMultiplexer> _mockConnection;
    private readonly Mock<IDatabase> _mockDatabase;
    private readonly RedisCircuitStateStore _store;

    // Use same JSON options as RedisCircuitStateStore
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    public RedisCircuitStateStoreTests()
    {
        _mockConnection = new Mock<IConnectionMultiplexer>();
        _mockDatabase = new Mock<IDatabase>();
        _mockConnection.Setup(c => c.GetDatabase(It.IsAny<int>(), It.IsAny<object>()))
            .Returns(_mockDatabase.Object);
        _mockConnection.Setup(c => c.IsConnected).Returns(true);

        _store = new RedisCircuitStateStore(_mockConnection.Object, "circuit:");
    }

    #region GetStateAsync Tests

    [Fact]
    public async Task GetStateAsync_WhenKeyExists_ShouldDeserializeAndReturnState()
    {
        // Arrange
        var serviceName = "test-service";
        var stateJson = """{"state":1,"failureCount":3,"halfOpenSuccessCount":0,"lastFailureTime":"2024-01-15T10:30:00Z"}""";
        _mockDatabase.Setup(d => d.StringGetAsync(It.Is<RedisKey>(k => k.ToString() == "circuit:test-service"), It.IsAny<CommandFlags>()))
            .ReturnsAsync((RedisValue)stateJson);

        // Act
        var result = await _store.GetStateAsync(serviceName);

        // Assert
        result.Should().NotBeNull();
        result.State.Should().Be(CircuitState.Open);
        result.FailureCount.Should().Be(3);
    }

    [Fact]
    public async Task GetStateAsync_WhenKeyDoesNotExist_ShouldReturnDefaultClosedState()
    {
        // Arrange
        var serviceName = "unknown-service";
        _mockDatabase.Setup(d => d.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync(RedisValue.Null);

        // Act
        var result = await _store.GetStateAsync(serviceName);

        // Assert
        result.Should().NotBeNull();
        result.State.Should().Be(CircuitState.Closed);
        result.FailureCount.Should().Be(0);
    }

    #endregion

    #region SaveStateAsync Tests

    [Fact]
    public async Task SaveStateAsync_ShouldSerializeAndSetKeyWithTtl()
    {
        // Arrange
        var serviceName = "test-service";
        var state = new CircuitStateInfo
        {
            State = CircuitState.Open,
            FailureCount = 5
        };

        // Act
        await _store.SaveStateAsync(serviceName, state);

        // Assert
        _mockDatabase.Verify(d => d.StringSetAsync(
            It.Is<RedisKey>(k => k.ToString() == "circuit:test-service"),
            It.Is<RedisValue>(v => v.ToString().Contains("\"state\":1")),
            It.IsAny<TimeSpan?>(),
            It.IsAny<bool>(),
            It.IsAny<When>(),
            It.IsAny<CommandFlags>()), Times.Once);
    }

    #endregion

    #region RecordFailureAsync Tests

    [Fact]
    public async Task RecordFailureAsync_WhenClosedBelowThreshold_ShouldIncrementFailureCount()
    {
        // Arrange
        var serviceName = "test-service";
        var options = new CircuitBreakerOptions
        {
            FailureThreshold = 5,
            SamplingDuration = TimeSpan.FromMinutes(1),
            BreakDuration = TimeSpan.FromSeconds(30)
        };
        var initialState = new CircuitStateInfo { State = CircuitState.Closed, FailureCount = 1 };
        var stateJson = JsonSerializer.Serialize(initialState, JsonOptions);

        _mockDatabase.Setup(d => d.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync((RedisValue)stateJson);

        // Act
        var result = await _store.RecordFailureAsync(serviceName, options);

        // Assert
        result.Should().NotBeNull();
        result.State.Should().Be(CircuitState.Closed);
        _mockDatabase.Verify(d => d.StringSetAsync(
            It.IsAny<RedisKey>(),
            It.IsAny<RedisValue>(),
            It.IsAny<TimeSpan?>(),
            It.IsAny<bool>(),
            It.IsAny<When>(),
            It.IsAny<CommandFlags>()), Times.Once);
    }

    [Fact]
    public async Task RecordFailureAsync_WhenClosedAtThreshold_ShouldTransitionToOpen()
    {
        // Arrange
        var serviceName = "test-service";
        var options = new CircuitBreakerOptions
        {
            FailureThreshold = 3,
            SamplingDuration = TimeSpan.FromMinutes(1),
            BreakDuration = TimeSpan.FromSeconds(30)
        };
        var initialState = new CircuitStateInfo { State = CircuitState.Closed, FailureCount = 2 };
        var stateJson = JsonSerializer.Serialize(initialState, JsonOptions);

        _mockDatabase.Setup(d => d.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync((RedisValue)stateJson);

        // Act
        var result = await _store.RecordFailureAsync(serviceName, options);

        // Assert
        result.Should().NotBeNull();
        result.State.Should().Be(CircuitState.Open);
    }

    #endregion

    #region RecordSuccessAsync Tests

    [Fact]
    public async Task RecordSuccessAsync_WhenHalfOpenMeetsThreshold_ShouldTransitionToClosed()
    {
        // Arrange
        var serviceName = "test-service";
        var options = new CircuitBreakerOptions
        {
            HalfOpenRequests = 2
        };
        var initialState = new CircuitStateInfo { State = CircuitState.HalfOpen, HalfOpenSuccessCount = 1 };
        var stateJson = JsonSerializer.Serialize(initialState, JsonOptions);

        _mockDatabase.Setup(d => d.StringGetAsync(It.IsAny<RedisKey>(), It.IsAny<CommandFlags>()))
            .ReturnsAsync((RedisValue)stateJson);

        // Act
        var result = await _store.RecordSuccessAsync(serviceName, options);

        // Assert
        result.Should().NotBeNull();
        result.State.Should().Be(CircuitState.Closed);
    }

    #endregion

    #region IsHealthyAsync Tests

    [Fact]
    public async Task IsHealthyAsync_WhenRedisConnected_ShouldReturnTrue()
    {
        // Arrange
        _mockConnection.Setup(c => c.IsConnected).Returns(true);
        _mockDatabase.Setup(d => d.PingAsync(It.IsAny<CommandFlags>()))
            .ReturnsAsync(TimeSpan.FromMilliseconds(5));

        // Act
        var result = await _store.IsHealthyAsync();

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task IsHealthyAsync_WhenRedisDisconnected_ShouldReturnFalse()
    {
        // Arrange
        _mockConnection.Setup(c => c.IsConnected).Returns(false);

        // Act
        var result = await _store.IsHealthyAsync();

        // Assert
        result.Should().BeFalse();
    }

    #endregion

    #region GetAllStatesAsync Tests

    [Fact]
    public async Task GetAllStatesAsync_ShouldReturnAllCircuitStates()
    {
        // Arrange
        var mockServer = new Mock<IServer>();
        var keys = new RedisKey[] { "circuit:service1", "circuit:service2" };

        _mockConnection.Setup(c => c.GetServers()).Returns(new[] { mockServer.Object });
        mockServer.Setup(s => s.Keys(It.IsAny<int>(), It.Is<RedisValue>(v => v.ToString() == "circuit:*"),
            It.IsAny<int>(), It.IsAny<long>(), It.IsAny<int>(), It.IsAny<CommandFlags>()))
            .Returns(keys.Select(k => k));

        var state1 = new CircuitStateInfo { State = CircuitState.Closed };
        var state2 = new CircuitStateInfo { State = CircuitState.Open };

        _mockDatabase.Setup(d => d.StringGetAsync(It.Is<RedisKey>(k => k.ToString() == "circuit:service1"), It.IsAny<CommandFlags>()))
            .ReturnsAsync((RedisValue)JsonSerializer.Serialize(state1, JsonOptions));
        _mockDatabase.Setup(d => d.StringGetAsync(It.Is<RedisKey>(k => k.ToString() == "circuit:service2"), It.IsAny<CommandFlags>()))
            .ReturnsAsync((RedisValue)JsonSerializer.Serialize(state2, JsonOptions));

        // Act
        var result = await _store.GetAllStatesAsync();

        // Assert
        result.Should().HaveCount(2);
        result["service1"].State.Should().Be(CircuitState.Closed);
        result["service2"].State.Should().Be(CircuitState.Open);
    }

    #endregion
}
