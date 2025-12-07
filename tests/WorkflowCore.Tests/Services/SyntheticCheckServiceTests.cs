using FluentAssertions;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using System.Net;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class SyntheticCheckServiceTests
{
    private readonly Mock<IExecutionRepository> _executionRepoMock;
    private readonly Mock<HttpMessageHandler> _httpHandlerMock;
    private readonly HttpClient _httpClient;
    private readonly IMemoryCache _cache;
    private readonly SyntheticCheckOptions _options;
    private readonly SyntheticCheckService _service;

    public SyntheticCheckServiceTests()
    {
        _executionRepoMock = new Mock<IExecutionRepository>();
        _httpHandlerMock = new Mock<HttpMessageHandler>();
        _httpClient = new HttpClient(_httpHandlerMock.Object);
        _cache = new MemoryCache(new MemoryCacheOptions());
        _options = new SyntheticCheckOptions
        {
            Enabled = true,
            TimeoutSeconds = 10,
            OnlyCheckGetRequests = true,
            CacheTTLSeconds = 300
        };

        _service = new SyntheticCheckService(
            _executionRepoMock.Object,
            _httpClient,
            _cache,
            Options.Create(_options));
    }

    #region CheckWorkflowHealthAsync Tests

    [Fact]
    public async Task CheckWorkflowHealthAsync_WithNoExecutionHistory_ReturnsUnknownStatus()
    {
        // Arrange
        _executionRepoMock
            .Setup(r => r.ListExecutionsAsync("test-workflow", ExecutionStatus.Succeeded, 0, 1))
            .ReturnsAsync(new List<ExecutionRecord>());

        // Act
        var result = await _service.CheckWorkflowHealthAsync("test-workflow");

        // Assert
        result.Should().NotBeNull();
        result.WorkflowName.Should().Be("test-workflow");
        result.OverallHealth.Should().Be(HealthState.Unknown);
        result.Tasks.Should().BeEmpty();
    }

    [Fact]
    public async Task CheckWorkflowHealthAsync_WithNoGetTasks_ReturnsHealthyWithEmptyTasks()
    {
        // Arrange
        var execution = CreateExecutionWithTasks(
            new TaskExecutionRecord { TaskId = "post-task", HttpMethod = "POST", ResolvedUrl = "http://api/data", Status = "Succeeded" }
        );
        _executionRepoMock
            .Setup(r => r.ListExecutionsAsync("test-workflow", ExecutionStatus.Succeeded, 0, 1))
            .ReturnsAsync(new List<ExecutionRecord> { execution });

        // Act
        var result = await _service.CheckWorkflowHealthAsync("test-workflow");

        // Assert
        result.OverallHealth.Should().Be(HealthState.Healthy);
        result.Tasks.Should().BeEmpty(); // POST requests are skipped
    }

    [Fact]
    public async Task CheckWorkflowHealthAsync_WithHealthyEndpoint_ReturnsHealthy()
    {
        // Arrange
        var execution = CreateExecutionWithTasks(
            new TaskExecutionRecord
            {
                TaskId = "get-user",
                TaskRef = "fetch-user",
                HttpMethod = "GET",
                ResolvedUrl = "http://api.example.com/users/1",
                Status = "Succeeded"
            }
        );
        _executionRepoMock
            .Setup(r => r.ListExecutionsAsync("test-workflow", ExecutionStatus.Succeeded, 0, 1))
            .ReturnsAsync(new List<ExecutionRecord> { execution });

        SetupHttpResponse("http://api.example.com/users/1", HttpStatusCode.OK);

        // Act
        var result = await _service.CheckWorkflowHealthAsync("test-workflow");

        // Assert
        result.OverallHealth.Should().Be(HealthState.Healthy);
        result.Tasks.Should().HaveCount(1);
        result.Tasks[0].TaskId.Should().Be("get-user");
        result.Tasks[0].TaskRef.Should().Be("fetch-user");
        result.Tasks[0].Status.Should().Be(HealthState.Healthy);
        result.Tasks[0].Reachable.Should().BeTrue();
        result.Tasks[0].StatusCode.Should().Be(200);
    }

    [Fact]
    public async Task CheckWorkflowHealthAsync_WithDegradedEndpoint_ReturnsDegraded()
    {
        // Arrange
        var execution = CreateExecutionWithTasks(
            new TaskExecutionRecord
            {
                TaskId = "get-user",
                HttpMethod = "GET",
                ResolvedUrl = "http://api.example.com/users/1",
                Status = "Succeeded"
            }
        );
        _executionRepoMock
            .Setup(r => r.ListExecutionsAsync("test-workflow", ExecutionStatus.Succeeded, 0, 1))
            .ReturnsAsync(new List<ExecutionRecord> { execution });

        // Return 404 - reachable but not 2xx
        SetupHttpResponse("http://api.example.com/users/1", HttpStatusCode.NotFound);

        // Act
        var result = await _service.CheckWorkflowHealthAsync("test-workflow");

        // Assert
        result.OverallHealth.Should().Be(HealthState.Degraded);
        result.Tasks[0].Status.Should().Be(HealthState.Degraded);
        result.Tasks[0].Reachable.Should().BeTrue();
        result.Tasks[0].StatusCode.Should().Be(404);
    }

    [Fact]
    public async Task CheckWorkflowHealthAsync_WithUnreachableEndpoint_ReturnsUnhealthy()
    {
        // Arrange
        var execution = CreateExecutionWithTasks(
            new TaskExecutionRecord
            {
                TaskId = "get-user",
                HttpMethod = "GET",
                ResolvedUrl = "http://api.example.com/users/1",
                Status = "Succeeded"
            }
        );
        _executionRepoMock
            .Setup(r => r.ListExecutionsAsync("test-workflow", ExecutionStatus.Succeeded, 0, 1))
            .ReturnsAsync(new List<ExecutionRecord> { execution });

        // Simulate network error
        SetupHttpException("http://api.example.com/users/1", new HttpRequestException("Connection refused"));

        // Act
        var result = await _service.CheckWorkflowHealthAsync("test-workflow");

        // Assert
        result.OverallHealth.Should().Be(HealthState.Unhealthy);
        result.Tasks[0].Status.Should().Be(HealthState.Unhealthy);
        result.Tasks[0].Reachable.Should().BeFalse();
        result.Tasks[0].ErrorMessage.Should().Contain("Connection refused");
    }

    [Fact]
    public async Task CheckWorkflowHealthAsync_WithMultipleTasks_AggregatesWorstStatus()
    {
        // Arrange
        var execution = CreateExecutionWithTasks(
            new TaskExecutionRecord { TaskId = "task1", HttpMethod = "GET", ResolvedUrl = "http://api1/data", Status = "Succeeded" },
            new TaskExecutionRecord { TaskId = "task2", HttpMethod = "GET", ResolvedUrl = "http://api2/data", Status = "Succeeded" }
        );
        _executionRepoMock
            .Setup(r => r.ListExecutionsAsync("test-workflow", ExecutionStatus.Succeeded, 0, 1))
            .ReturnsAsync(new List<ExecutionRecord> { execution });

        // First endpoint healthy, second unhealthy
        SetupHttpResponse("http://api1/data", HttpStatusCode.OK);
        SetupHttpException("http://api2/data", new HttpRequestException("Timeout"));

        // Act
        var result = await _service.CheckWorkflowHealthAsync("test-workflow");

        // Assert - overall should be worst case (Unhealthy)
        result.OverallHealth.Should().Be(HealthState.Unhealthy);
        result.Tasks.Should().HaveCount(2);
    }

    [Fact]
    public async Task CheckWorkflowHealthAsync_SkipsTasksWithNullResolvedUrl()
    {
        // Arrange
        var execution = CreateExecutionWithTasks(
            new TaskExecutionRecord { TaskId = "task1", HttpMethod = "GET", ResolvedUrl = null, Status = "Succeeded" },
            new TaskExecutionRecord { TaskId = "task2", HttpMethod = "GET", ResolvedUrl = "http://api/data", Status = "Succeeded" }
        );
        _executionRepoMock
            .Setup(r => r.ListExecutionsAsync("test-workflow", ExecutionStatus.Succeeded, 0, 1))
            .ReturnsAsync(new List<ExecutionRecord> { execution });

        SetupHttpResponse("http://api/data", HttpStatusCode.OK);

        // Act
        var result = await _service.CheckWorkflowHealthAsync("test-workflow");

        // Assert - only one task should be checked
        result.Tasks.Should().HaveCount(1);
        result.Tasks[0].TaskId.Should().Be("task2");
    }

    [Fact]
    public async Task CheckWorkflowHealthAsync_OnlyChecksGetRequests_WhenConfigured()
    {
        // Arrange - options already set OnlyCheckGetRequests = true
        var execution = CreateExecutionWithTasks(
            new TaskExecutionRecord { TaskId = "get-task", HttpMethod = "GET", ResolvedUrl = "http://api/get", Status = "Succeeded" },
            new TaskExecutionRecord { TaskId = "post-task", HttpMethod = "POST", ResolvedUrl = "http://api/post", Status = "Succeeded" },
            new TaskExecutionRecord { TaskId = "put-task", HttpMethod = "PUT", ResolvedUrl = "http://api/put", Status = "Succeeded" }
        );
        _executionRepoMock
            .Setup(r => r.ListExecutionsAsync("test-workflow", ExecutionStatus.Succeeded, 0, 1))
            .ReturnsAsync(new List<ExecutionRecord> { execution });

        SetupHttpResponse("http://api/get", HttpStatusCode.OK);

        // Act
        var result = await _service.CheckWorkflowHealthAsync("test-workflow");

        // Assert - only GET task should be checked
        result.Tasks.Should().HaveCount(1);
        result.Tasks[0].TaskId.Should().Be("get-task");
    }

    [Fact]
    public async Task CheckWorkflowHealthAsync_RecordsLatency()
    {
        // Arrange
        var execution = CreateExecutionWithTasks(
            new TaskExecutionRecord { TaskId = "task1", HttpMethod = "GET", ResolvedUrl = "http://api/data", Status = "Succeeded" }
        );
        _executionRepoMock
            .Setup(r => r.ListExecutionsAsync("test-workflow", ExecutionStatus.Succeeded, 0, 1))
            .ReturnsAsync(new List<ExecutionRecord> { execution });

        SetupHttpResponse("http://api/data", HttpStatusCode.OK);

        // Act
        var result = await _service.CheckWorkflowHealthAsync("test-workflow");

        // Assert
        result.Tasks[0].LatencyMs.Should().BeGreaterOrEqualTo(0);
        result.DurationMs.Should().BeGreaterOrEqualTo(0);
    }

    [Fact]
    public async Task CheckWorkflowHealthAsync_CachesResult()
    {
        // Arrange
        var execution = CreateExecutionWithTasks(
            new TaskExecutionRecord { TaskId = "task1", HttpMethod = "GET", ResolvedUrl = "http://api/data", Status = "Succeeded" }
        );
        _executionRepoMock
            .Setup(r => r.ListExecutionsAsync("test-workflow", ExecutionStatus.Succeeded, 0, 1))
            .ReturnsAsync(new List<ExecutionRecord> { execution });

        SetupHttpResponse("http://api/data", HttpStatusCode.OK);

        // Act
        var result1 = await _service.CheckWorkflowHealthAsync("test-workflow");

        // Get cached result
        var result2 = await _service.GetCachedHealthStatusAsync("test-workflow");

        // Assert
        result2.Should().NotBeNull();
        result2!.WorkflowName.Should().Be(result1.WorkflowName);
        result2.CheckedAt.Should().Be(result1.CheckedAt);
    }

    #endregion

    #region GetCachedHealthStatusAsync Tests

    [Fact]
    public async Task GetCachedHealthStatusAsync_WhenNotCached_ReturnsNull()
    {
        // Act
        var result = await _service.GetCachedHealthStatusAsync("unknown-workflow");

        // Assert
        result.Should().BeNull();
    }

    #endregion

    #region GetAllHealthStatusesAsync Tests

    [Fact]
    public async Task GetAllHealthStatusesAsync_ReturnsAllCachedStatuses()
    {
        // Arrange - perform health checks to populate cache
        var execution1 = CreateExecutionWithTasks(
            new TaskExecutionRecord { TaskId = "task1", HttpMethod = "GET", ResolvedUrl = "http://api1/data", Status = "Succeeded" }
        );
        var execution2 = CreateExecutionWithTasks(
            new TaskExecutionRecord { TaskId = "task2", HttpMethod = "GET", ResolvedUrl = "http://api2/data", Status = "Succeeded" }
        );

        _executionRepoMock
            .Setup(r => r.ListExecutionsAsync("workflow1", ExecutionStatus.Succeeded, 0, 1))
            .ReturnsAsync(new List<ExecutionRecord> { execution1 });
        _executionRepoMock
            .Setup(r => r.ListExecutionsAsync("workflow2", ExecutionStatus.Succeeded, 0, 1))
            .ReturnsAsync(new List<ExecutionRecord> { execution2 });

        SetupHttpResponse("http://api1/data", HttpStatusCode.OK);
        SetupHttpResponse("http://api2/data", HttpStatusCode.OK);

        await _service.CheckWorkflowHealthAsync("workflow1");
        await _service.CheckWorkflowHealthAsync("workflow2");

        // Act
        var result = await _service.GetAllHealthStatusesAsync();

        // Assert
        result.Should().HaveCount(2);
        result.Select(s => s.WorkflowName).Should().Contain("workflow1");
        result.Select(s => s.WorkflowName).Should().Contain("workflow2");
    }

    #endregion

    #region ServiceAccountToken Tests

    [Fact]
    public async Task CheckWorkflowHealthAsync_AddsAuthorizationHeader_WhenTokenConfigured()
    {
        // Arrange
        var optionsWithToken = new SyntheticCheckOptions
        {
            Enabled = true,
            TimeoutSeconds = 10,
            OnlyCheckGetRequests = true,
            ServiceAccountToken = "test-bearer-token"
        };

        var service = new SyntheticCheckService(
            _executionRepoMock.Object,
            _httpClient,
            _cache,
            Options.Create(optionsWithToken));

        var execution = CreateExecutionWithTasks(
            new TaskExecutionRecord { TaskId = "task1", HttpMethod = "GET", ResolvedUrl = "http://api/data", Status = "Succeeded" }
        );
        _executionRepoMock
            .Setup(r => r.ListExecutionsAsync("test-workflow", ExecutionStatus.Succeeded, 0, 1))
            .ReturnsAsync(new List<ExecutionRecord> { execution });

        HttpRequestMessage? capturedRequest = null;
        _httpHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .Callback<HttpRequestMessage, CancellationToken>((req, _) => capturedRequest = req)
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK));

        // Act
        await service.CheckWorkflowHealthAsync("test-workflow");

        // Assert
        capturedRequest.Should().NotBeNull();
        capturedRequest!.Headers.Authorization.Should().NotBeNull();
        capturedRequest.Headers.Authorization!.Scheme.Should().Be("Bearer");
        capturedRequest.Headers.Authorization.Parameter.Should().Be("test-bearer-token");
    }

    #endregion

    #region OverallHealth Aggregation Tests

    [Fact]
    public async Task CheckWorkflowHealthAsync_AllHealthy_ReturnsHealthy()
    {
        // Arrange
        var execution = CreateExecutionWithTasks(
            new TaskExecutionRecord { TaskId = "task1", HttpMethod = "GET", ResolvedUrl = "http://api1/data", Status = "Succeeded" },
            new TaskExecutionRecord { TaskId = "task2", HttpMethod = "GET", ResolvedUrl = "http://api2/data", Status = "Succeeded" }
        );
        _executionRepoMock
            .Setup(r => r.ListExecutionsAsync("test-workflow", ExecutionStatus.Succeeded, 0, 1))
            .ReturnsAsync(new List<ExecutionRecord> { execution });

        SetupHttpResponse("http://api1/data", HttpStatusCode.OK);
        SetupHttpResponse("http://api2/data", HttpStatusCode.OK);

        // Act
        var result = await _service.CheckWorkflowHealthAsync("test-workflow");

        // Assert
        result.OverallHealth.Should().Be(HealthState.Healthy);
    }

    [Fact]
    public async Task CheckWorkflowHealthAsync_OneDegraded_ReturnsDegraded()
    {
        // Arrange
        var execution = CreateExecutionWithTasks(
            new TaskExecutionRecord { TaskId = "task1", HttpMethod = "GET", ResolvedUrl = "http://api1/data", Status = "Succeeded" },
            new TaskExecutionRecord { TaskId = "task2", HttpMethod = "GET", ResolvedUrl = "http://api2/data", Status = "Succeeded" }
        );
        _executionRepoMock
            .Setup(r => r.ListExecutionsAsync("test-workflow", ExecutionStatus.Succeeded, 0, 1))
            .ReturnsAsync(new List<ExecutionRecord> { execution });

        SetupHttpResponse("http://api1/data", HttpStatusCode.OK);
        SetupHttpResponse("http://api2/data", HttpStatusCode.NotFound); // Degraded

        // Act
        var result = await _service.CheckWorkflowHealthAsync("test-workflow");

        // Assert
        result.OverallHealth.Should().Be(HealthState.Degraded);
    }

    [Fact]
    public async Task CheckWorkflowHealthAsync_OneUnhealthy_ReturnsUnhealthy()
    {
        // Arrange
        var execution = CreateExecutionWithTasks(
            new TaskExecutionRecord { TaskId = "task1", HttpMethod = "GET", ResolvedUrl = "http://api1/data", Status = "Succeeded" },
            new TaskExecutionRecord { TaskId = "task2", HttpMethod = "GET", ResolvedUrl = "http://api2/data", Status = "Succeeded" }
        );
        _executionRepoMock
            .Setup(r => r.ListExecutionsAsync("test-workflow", ExecutionStatus.Succeeded, 0, 1))
            .ReturnsAsync(new List<ExecutionRecord> { execution });

        SetupHttpResponse("http://api1/data", HttpStatusCode.OK);
        SetupHttpException("http://api2/data", new HttpRequestException("Unreachable"));

        // Act
        var result = await _service.CheckWorkflowHealthAsync("test-workflow");

        // Assert
        result.OverallHealth.Should().Be(HealthState.Unhealthy);
    }

    #endregion

    #region Helper Methods

    private ExecutionRecord CreateExecutionWithTasks(params TaskExecutionRecord[] tasks)
    {
        var execution = new ExecutionRecord
        {
            Id = Guid.NewGuid(),
            WorkflowName = "test-workflow",
            Status = ExecutionStatus.Succeeded,
            StartedAt = DateTime.UtcNow.AddMinutes(-5),
            CompletedAt = DateTime.UtcNow.AddMinutes(-4),
            TaskExecutionRecords = tasks.ToList()
        };

        foreach (var task in tasks)
        {
            task.ExecutionId = execution.Id;
        }

        return execution;
    }

    private void SetupHttpResponse(string url, HttpStatusCode statusCode)
    {
        _httpHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(req => req.RequestUri!.ToString() == url),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(statusCode));
    }

    private void SetupHttpException(string url, Exception exception)
    {
        _httpHandlerMock
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(req => req.RequestUri!.ToString() == url),
                ItExpr.IsAny<CancellationToken>())
            .ThrowsAsync(exception);
    }

    #endregion
}
