using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class CircuitBreakerIntegrationTests
{
    private readonly ICircuitBreakerRegistry _circuitBreakerRegistry;

    public CircuitBreakerIntegrationTests()
    {
        _circuitBreakerRegistry = new CircuitBreakerRegistry();
    }

    // ========== DURATION PARSING TESTS ==========

    [Theory]
    [InlineData("30s", 30)]
    [InlineData("60s", 60)]
    [InlineData("1m", 60)]
    [InlineData("2m", 120)]
    [InlineData("5m", 300)]
    [InlineData("100ms", 0.1)]
    [InlineData("500ms", 0.5)]
    public void ParseDuration_ShouldParseCorrectly(string input, double expectedSeconds)
    {
        // Act
        var duration = CircuitBreakerOptionsParser.ParseDuration(input);

        // Assert
        duration.TotalSeconds.Should().BeApproximately(expectedSeconds, 0.01);
    }

    [Theory]
    [InlineData("invalid")]
    [InlineData("")]
    [InlineData("abc")]
    public void ParseDuration_InvalidInput_ShouldReturnDefaultOrThrow(string input)
    {
        // Act
        var duration = CircuitBreakerOptionsParser.ParseDuration(input);

        // Assert - should return zero for invalid input
        duration.Should().Be(TimeSpan.Zero);
    }

    // ========== OPTIONS CONVERSION TESTS ==========

    [Fact]
    public void ConvertSpecToOptions_ShouldConvertCorrectly()
    {
        // Arrange
        var spec = new CircuitBreakerSpec
        {
            FailureThreshold = 10,
            SamplingDuration = "2m",
            BreakDuration = "45s",
            HalfOpenRequests = 5
        };

        // Act
        var options = CircuitBreakerOptionsParser.ConvertToOptions(spec);

        // Assert
        options.FailureThreshold.Should().Be(10);
        options.SamplingDuration.Should().Be(TimeSpan.FromMinutes(2));
        options.BreakDuration.Should().Be(TimeSpan.FromSeconds(45));
        options.HalfOpenRequests.Should().Be(5);
    }

    [Fact]
    public void ConvertSpecToOptions_DefaultValues_ShouldParseCorrectly()
    {
        // Arrange - using default CircuitBreakerSpec values
        var spec = new CircuitBreakerSpec();

        // Act
        var options = CircuitBreakerOptionsParser.ConvertToOptions(spec);

        // Assert
        options.FailureThreshold.Should().Be(5);
        options.SamplingDuration.Should().Be(TimeSpan.FromSeconds(60));
        options.BreakDuration.Should().Be(TimeSpan.FromSeconds(30));
        options.HalfOpenRequests.Should().Be(3);
    }

    // ========== REGISTRY INTEGRATION TESTS ==========

    [Fact]
    public void Registry_ShouldTrackSeparateCircuitsPerTaskRef()
    {
        // Arrange
        var spec = new CircuitBreakerSpec { FailureThreshold = 2 };
        var options = CircuitBreakerOptionsParser.ConvertToOptions(spec);

        // Act - get circuits for different task refs
        var circuitA = _circuitBreakerRegistry.GetOrCreate("http-get-users", options);
        var circuitB = _circuitBreakerRegistry.GetOrCreate("http-get-products", options);

        // Open circuit A
        circuitA.RecordFailure();
        circuitA.RecordFailure();

        // Assert - circuit A is open, circuit B is still closed
        circuitA.GetState().State.Should().Be(CircuitState.Open);
        circuitB.GetState().State.Should().Be(CircuitState.Closed);
    }

    [Fact]
    public void Registry_ShouldReturnSameCircuitForSameTaskRef()
    {
        // Arrange
        var spec = new CircuitBreakerSpec { FailureThreshold = 3 };
        var options = CircuitBreakerOptionsParser.ConvertToOptions(spec);

        // Act - simulate multiple workflow executions hitting same task
        var circuit1 = _circuitBreakerRegistry.GetOrCreate("shared-api-task", options);
        circuit1.RecordFailure();

        var circuit2 = _circuitBreakerRegistry.GetOrCreate("shared-api-task", options);
        circuit2.RecordFailure();

        var circuit3 = _circuitBreakerRegistry.GetOrCreate("shared-api-task", options);
        circuit3.RecordFailure();

        // Assert - all three got the same circuit, which is now open
        circuit3.GetState().State.Should().Be(CircuitState.Open);
        circuit3.GetState().FailureCount.Should().BeGreaterThanOrEqualTo(3);
    }

    // ========== CIRCUIT BREAKER ERROR TYPE TESTS ==========

    [Fact]
    public void TaskErrorType_CircuitBreakerOpen_ShouldExist()
    {
        // Assert - verify the new error type exists
        TaskErrorType.CircuitBreakerOpen.Should().BeDefined();
    }

    [Fact]
    public void TaskErrorInfo_CircuitBreakerOpen_ShouldGenerateCorrectSummary()
    {
        // Arrange
        var errorInfo = new TaskErrorInfo
        {
            TaskId = "fetch-user",
            ErrorType = TaskErrorType.CircuitBreakerOpen,
            ErrorMessage = "Circuit breaker is open for service 'user-api'",
            ServiceName = "user-api"
        };

        // Act
        var summary = errorInfo.GetSummary();

        // Assert
        summary.Should().Contain("fetch-user");
        summary.Should().Contain("CircuitBreakerOpen");
    }

    // ========== TASK EXECUTION RESULT TESTS ==========

    [Fact]
    public void TaskExecutionResult_ShouldIncludeCircuitBreakerState()
    {
        // Arrange
        var result = new TaskExecutionResult
        {
            Success = false,
            CircuitState = CircuitState.Open,
            UsedFallback = false
        };

        // Assert
        result.CircuitState.Should().Be(CircuitState.Open);
        result.UsedFallback.Should().BeFalse();
    }

    [Fact]
    public void TaskExecutionResult_ShouldTrackFallbackExecution()
    {
        // Arrange
        var result = new TaskExecutionResult
        {
            Success = true,
            CircuitState = CircuitState.Open,
            UsedFallback = true,
            FallbackTaskRef = "get-cached-data",
            Output = new Dictionary<string, object> { ["data"] = "cached" }
        };

        // Assert
        result.UsedFallback.Should().BeTrue();
        result.FallbackTaskRef.Should().Be("get-cached-data");
        result.CircuitState.Should().Be(CircuitState.Open);
    }

    // ========== WORKFLOW TASK STEP CONFIGURATION TESTS ==========

    [Fact]
    public void WorkflowTaskStep_WithCircuitBreaker_ShouldBeConfigurable()
    {
        // Arrange
        var step = new WorkflowTaskStep
        {
            Id = "api-call",
            TaskRef = "http-get",
            CircuitBreaker = new CircuitBreakerSpec
            {
                FailureThreshold = 5,
                SamplingDuration = "60s",
                BreakDuration = "30s",
                HalfOpenRequests = 3
            }
        };

        // Assert
        step.CircuitBreaker.Should().NotBeNull();
        step.CircuitBreaker!.FailureThreshold.Should().Be(5);
    }

    [Fact]
    public void WorkflowTaskStep_WithFallback_ShouldBeConfigurable()
    {
        // Arrange
        var step = new WorkflowTaskStep
        {
            Id = "api-call",
            TaskRef = "http-get",
            Fallback = new FallbackSpec
            {
                TaskRef = "cache-lookup",
                Input = new Dictionary<string, string>
                {
                    ["key"] = "{{input.userId}}"
                }
            }
        };

        // Assert
        step.Fallback.Should().NotBeNull();
        step.Fallback!.TaskRef.Should().Be("cache-lookup");
    }
}

