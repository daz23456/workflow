using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;
using WorkflowGateway.Controllers;
using WorkflowGateway.Models;
using WorkflowGateway.Services;
using Xunit;

namespace WorkflowGateway.Tests.Controllers;

public class ExecutionHistoryControllerTests
{
    private readonly Mock<IExecutionRepository> _repositoryMock;
    private readonly Mock<IWorkflowDiscoveryService> _workflowDiscoveryMock;
    private readonly Mock<IExecutionTraceService> _traceServiceMock;
    private readonly ExecutionHistoryController _controller;

    public ExecutionHistoryControllerTests()
    {
        _repositoryMock = new Mock<IExecutionRepository>();
        _workflowDiscoveryMock = new Mock<IWorkflowDiscoveryService>();
        _traceServiceMock = new Mock<IExecutionTraceService>();
        _controller = new ExecutionHistoryController(
            _repositoryMock.Object,
            _workflowDiscoveryMock.Object,
            _traceServiceMock.Object);
    }

    [Fact]
    public async Task GetExecutionDetails_ShouldReturn404_WhenExecutionNotFound()
    {
        // Arrange
        var executionId = Guid.NewGuid();
        _repositoryMock
            .Setup(x => x.GetExecutionAsync(executionId))
            .ReturnsAsync((ExecutionRecord?)null);

        // Act
        var result = await _controller.GetExecutionDetails(executionId);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
        var notFoundResult = (NotFoundObjectResult)result;
        notFoundResult.Value.Should().BeEquivalentTo(new { error = $"Execution {executionId} not found" });
    }

    [Fact]
    public async Task GetExecutionDetails_ShouldReturnExecutionDetails_WhenExecutionExists()
    {
        // Arrange
        var executionId = Guid.NewGuid();
        var workflowName = "user-workflow";
        var inputSnapshot = "{\"userId\":\"123\"}";
        var startedAt = DateTime.UtcNow.AddMinutes(-5);
        var completedAt = DateTime.UtcNow;

        var executionRecord = new ExecutionRecord
        {
            Id = executionId,
            WorkflowName = workflowName,
            Status = ExecutionStatus.Succeeded,
            StartedAt = startedAt,
            CompletedAt = completedAt,
            Duration = TimeSpan.FromMinutes(5),
            InputSnapshot = inputSnapshot,
            TaskExecutionRecords = new List<TaskExecutionRecord>
            {
                new TaskExecutionRecord
                {
                    ExecutionId = executionId,
                    TaskId = "task-1",
                    TaskRef = "fetch-user",
                    Status = "Succeeded",
                    Output = "{\"name\":\"John\"}",
                    Errors = null,
                    Duration = TimeSpan.FromMilliseconds(150),
                    RetryCount = 0,
                    StartedAt = startedAt,
                    CompletedAt = startedAt.AddMilliseconds(150)
                }
            }
        };

        _repositoryMock
            .Setup(x => x.GetExecutionAsync(executionId))
            .ReturnsAsync(executionRecord);

        // Act
        var result = await _controller.GetExecutionDetails(executionId);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        var response = okResult.Value.Should().BeOfType<DetailedWorkflowExecutionResponse>().Subject;

        response.ExecutionId.Should().Be(executionId);
        response.WorkflowName.Should().Be(workflowName);
        response.Status.Should().Be("Succeeded");
        response.StartedAt.Should().Be(startedAt);
        response.CompletedAt.Should().Be(completedAt);
        response.DurationMs.Should().Be((long)TimeSpan.FromMinutes(5).TotalMilliseconds);

        response.Input.Should().ContainKey("userId");
        response.Input["userId"].ToString().Should().Be("123");

        response.Tasks.Should().HaveCount(1);
        var taskDetail = response.Tasks[0];
        taskDetail.TaskId.Should().Be("task-1");
        taskDetail.TaskRef.Should().Be("fetch-user");
        taskDetail.Success.Should().BeTrue();
        taskDetail.RetryCount.Should().Be(0);
        taskDetail.DurationMs.Should().Be(150);
    }

    [Fact]
    public async Task GetExecutionDetails_ShouldHandleNullCompletedAt_ForRunningExecution()
    {
        // Arrange
        var executionId = Guid.NewGuid();
        var executionRecord = new ExecutionRecord
        {
            Id = executionId,
            WorkflowName = "long-running-workflow",
            Status = ExecutionStatus.Running,
            StartedAt = DateTime.UtcNow.AddMinutes(-10),
            CompletedAt = null,
            Duration = null,
            InputSnapshot = "{}",
            TaskExecutionRecords = new List<TaskExecutionRecord>()
        };

        _repositoryMock
            .Setup(x => x.GetExecutionAsync(executionId))
            .ReturnsAsync(executionRecord);

        // Act
        var result = await _controller.GetExecutionDetails(executionId);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        var response = okResult.Value.Should().BeOfType<DetailedWorkflowExecutionResponse>().Subject;

        response.Status.Should().Be("Running");
        response.CompletedAt.Should().BeNull();
        response.DurationMs.Should().BeNull();
    }

    [Fact]
    public async Task GetExecutionDetails_ShouldDeserializeTaskOutputs_WhenPresent()
    {
        // Arrange
        var executionId = Guid.NewGuid();
        var executionRecord = new ExecutionRecord
        {
            Id = executionId,
            WorkflowName = "data-workflow",
            Status = ExecutionStatus.Succeeded,
            StartedAt = DateTime.UtcNow,
            CompletedAt = DateTime.UtcNow,
            Duration = TimeSpan.FromSeconds(1),
            InputSnapshot = "{}",
            TaskExecutionRecords = new List<TaskExecutionRecord>
            {
                new TaskExecutionRecord
                {
                    ExecutionId = executionId,
                    TaskId = "task-1",
                    TaskRef = "fetch-data",
                    Status = "Succeeded",
                    Output = "{\"users\":[{\"id\":1,\"name\":\"Alice\"},{\"id\":2,\"name\":\"Bob\"}]}",
                    Errors = null,
                    Duration = TimeSpan.FromMilliseconds(500),
                    RetryCount = 0,
                    StartedAt = DateTime.UtcNow,
                    CompletedAt = DateTime.UtcNow
                }
            }
        };

        _repositoryMock
            .Setup(x => x.GetExecutionAsync(executionId))
            .ReturnsAsync(executionRecord);

        // Act
        var result = await _controller.GetExecutionDetails(executionId);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        var response = okResult.Value.Should().BeOfType<DetailedWorkflowExecutionResponse>().Subject;

        response.Tasks.Should().HaveCount(1);
        var taskDetail = response.Tasks[0];
        taskDetail.Output.Should().NotBeNull();
        taskDetail.Output.Should().ContainKey("users");
    }

    [Fact]
    public async Task GetExecutionDetails_ShouldDeserializeErrors_WhenPresent()
    {
        // Arrange
        var executionId = Guid.NewGuid();
        var executionRecord = new ExecutionRecord
        {
            Id = executionId,
            WorkflowName = "failed-workflow",
            Status = ExecutionStatus.Failed,
            StartedAt = DateTime.UtcNow,
            CompletedAt = DateTime.UtcNow,
            Duration = TimeSpan.FromSeconds(1),
            InputSnapshot = "{}",
            TaskExecutionRecords = new List<TaskExecutionRecord>
            {
                new TaskExecutionRecord
                {
                    ExecutionId = executionId,
                    TaskId = "task-1",
                    TaskRef = "failing-task",
                    Status = "Failed",
                    Output = null,
                    Errors = "[\"Connection timeout\",\"Retry limit exceeded\"]",
                    Duration = TimeSpan.FromSeconds(5),
                    RetryCount = 3,
                    StartedAt = DateTime.UtcNow,
                    CompletedAt = DateTime.UtcNow
                }
            }
        };

        _repositoryMock
            .Setup(x => x.GetExecutionAsync(executionId))
            .ReturnsAsync(executionRecord);

        // Act
        var result = await _controller.GetExecutionDetails(executionId);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        var response = okResult.Value.Should().BeOfType<DetailedWorkflowExecutionResponse>().Subject;

        response.Tasks.Should().HaveCount(1);
        var taskDetail = response.Tasks[0];
        taskDetail.Success.Should().BeFalse();
        taskDetail.Errors.Should().HaveCount(2);
        taskDetail.Errors.Should().Contain("Connection timeout");
        taskDetail.Errors.Should().Contain("Retry limit exceeded");
    }

    [Fact]
    public async Task GetExecutionDetails_ShouldHandleInvalidInputSnapshotJson()
    {
        // Arrange
        var executionId = Guid.NewGuid();
        var executionRecord = new ExecutionRecord
        {
            Id = executionId,
            WorkflowName = "workflow",
            Status = ExecutionStatus.Succeeded,
            StartedAt = DateTime.UtcNow,
            CompletedAt = DateTime.UtcNow,
            Duration = TimeSpan.FromSeconds(1),
            InputSnapshot = "invalid-json",
            TaskExecutionRecords = new List<TaskExecutionRecord>()
        };

        _repositoryMock
            .Setup(x => x.GetExecutionAsync(executionId))
            .ReturnsAsync(executionRecord);

        // Act
        var result = await _controller.GetExecutionDetails(executionId);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        var response = okResult.Value.Should().BeOfType<DetailedWorkflowExecutionResponse>().Subject;

        // Should return empty dictionary if JSON is invalid
        response.Input.Should().NotBeNull();
        response.Input.Should().BeEmpty();
    }

    [Fact]
    public void Constructor_ShouldThrowArgumentNullException_WhenRepositoryIsNull()
    {
        // Act & Assert
        var act = () => new ExecutionHistoryController(null!, _workflowDiscoveryMock.Object, _traceServiceMock.Object);
        act.Should().Throw<ArgumentNullException>()
            .WithMessage("*executionRepository*");
    }

    [Fact]
    public async Task ListExecutions_ShouldReturnExecutionList_WithDefaultPagination()
    {
        // Arrange
        var workflowName = "user-workflow";
        var executions = new List<ExecutionRecord>
        {
            new ExecutionRecord
            {
                Id = Guid.NewGuid(),
                WorkflowName = workflowName,
                Status = ExecutionStatus.Succeeded,
                StartedAt = DateTime.UtcNow.AddHours(-2),
                CompletedAt = DateTime.UtcNow.AddHours(-1),
                Duration = TimeSpan.FromHours(1)
            },
            new ExecutionRecord
            {
                Id = Guid.NewGuid(),
                WorkflowName = workflowName,
                Status = ExecutionStatus.Running,
                StartedAt = DateTime.UtcNow.AddMinutes(-30),
                CompletedAt = null,
                Duration = null
            }
        };

        _repositoryMock
            .Setup(x => x.ListExecutionsAsync(workflowName, null, 0, 20))
            .ReturnsAsync(executions);

        // Act
        var result = await _controller.ListExecutions(workflowName);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        var response = okResult.Value.Should().BeOfType<ExecutionListResponse>().Subject;

        response.WorkflowName.Should().Be(workflowName);
        response.Executions.Should().HaveCount(2);
        response.TotalCount.Should().Be(2);
        response.Skip.Should().Be(0);
        response.Take.Should().Be(20);
    }

    [Fact]
    public async Task ListExecutions_ShouldFilterByStatus_WhenStatusProvided()
    {
        // Arrange
        var workflowName = "user-workflow";
        var status = ExecutionStatus.Succeeded;
        var executions = new List<ExecutionRecord>
        {
            new ExecutionRecord
            {
                Id = Guid.NewGuid(),
                WorkflowName = workflowName,
                Status = ExecutionStatus.Succeeded,
                StartedAt = DateTime.UtcNow.AddHours(-2),
                CompletedAt = DateTime.UtcNow.AddHours(-1),
                Duration = TimeSpan.FromHours(1)
            }
        };

        _repositoryMock
            .Setup(x => x.ListExecutionsAsync(workflowName, status, 0, 20))
            .ReturnsAsync(executions);

        // Act
        var result = await _controller.ListExecutions(workflowName, status);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        var response = okResult.Value.Should().BeOfType<ExecutionListResponse>().Subject;

        response.Executions.Should().HaveCount(1);
        response.Executions[0].Status.Should().Be("Succeeded");
    }

    [Fact]
    public async Task ListExecutions_ShouldSupportPagination()
    {
        // Arrange
        var workflowName = "user-workflow";
        var skip = 10;
        var take = 5;
        var executions = new List<ExecutionRecord>
        {
            new ExecutionRecord
            {
                Id = Guid.NewGuid(),
                WorkflowName = workflowName,
                Status = ExecutionStatus.Succeeded,
                StartedAt = DateTime.UtcNow,
                CompletedAt = DateTime.UtcNow,
                Duration = TimeSpan.FromSeconds(1)
            }
        };

        _repositoryMock
            .Setup(x => x.ListExecutionsAsync(workflowName, null, skip, take))
            .ReturnsAsync(executions);

        // Act
        var result = await _controller.ListExecutions(workflowName, null, skip, take);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        var response = okResult.Value.Should().BeOfType<ExecutionListResponse>().Subject;

        response.Skip.Should().Be(skip);
        response.Take.Should().Be(take);
        _repositoryMock.Verify(x => x.ListExecutionsAsync(workflowName, null, skip, take), Times.Once);
    }

    [Fact]
    public async Task ListExecutions_ShouldReturnEmptyList_WhenNoExecutionsFound()
    {
        // Arrange
        var workflowName = "non-existent-workflow";
        var executions = new List<ExecutionRecord>();

        _repositoryMock
            .Setup(x => x.ListExecutionsAsync(workflowName, null, 0, 20))
            .ReturnsAsync(executions);

        // Act
        var result = await _controller.ListExecutions(workflowName);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        var response = okResult.Value.Should().BeOfType<ExecutionListResponse>().Subject;

        response.Executions.Should().BeEmpty();
        response.TotalCount.Should().Be(0);
    }

    [Fact]
    public async Task ListExecutions_ShouldMapExecutionRecords_ToExecutionSummaries()
    {
        // Arrange
        var workflowName = "user-workflow";
        var executionId = Guid.NewGuid();
        var startedAt = DateTime.UtcNow.AddHours(-1);
        var completedAt = DateTime.UtcNow;
        var duration = TimeSpan.FromHours(1);

        var executions = new List<ExecutionRecord>
        {
            new ExecutionRecord
            {
                Id = executionId,
                WorkflowName = workflowName,
                Status = ExecutionStatus.Succeeded,
                StartedAt = startedAt,
                CompletedAt = completedAt,
                Duration = duration
            }
        };

        _repositoryMock
            .Setup(x => x.ListExecutionsAsync(workflowName, null, 0, 20))
            .ReturnsAsync(executions);

        // Act
        var result = await _controller.ListExecutions(workflowName);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        var response = okResult.Value.Should().BeOfType<ExecutionListResponse>().Subject;

        response.Executions.Should().HaveCount(1);
        var summary = response.Executions[0];
        summary.Id.Should().Be(executionId);
        summary.WorkflowName.Should().Be(workflowName);
        summary.Status.Should().Be("Succeeded");
        summary.StartedAt.Should().Be(startedAt);
        summary.CompletedAt.Should().Be(completedAt);
        summary.DurationMs.Should().Be((long)duration.TotalMilliseconds);
    }

    [Fact]
    public async Task ListExecutions_ShouldHandleRunningExecutions_WithNullDuration()
    {
        // Arrange
        var workflowName = "long-running-workflow";
        var executions = new List<ExecutionRecord>
        {
            new ExecutionRecord
            {
                Id = Guid.NewGuid(),
                WorkflowName = workflowName,
                Status = ExecutionStatus.Running,
                StartedAt = DateTime.UtcNow.AddMinutes(-30),
                CompletedAt = null,
                Duration = null
            }
        };

        _repositoryMock
            .Setup(x => x.ListExecutionsAsync(workflowName, null, 0, 20))
            .ReturnsAsync(executions);

        // Act
        var result = await _controller.ListExecutions(workflowName);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        var response = okResult.Value.Should().BeOfType<ExecutionListResponse>().Subject;

        var summary = response.Executions[0];
        summary.Status.Should().Be("Running");
        summary.CompletedAt.Should().BeNull();
        summary.DurationMs.Should().BeNull();
    }

    // ===== Execution Trace Endpoint Tests =====

    [Fact]
    public async Task GetTrace_WithValidExecutionId_ReturnsTraceResponse()
    {
        // Arrange
        var executionId = Guid.NewGuid();
        var workflowName = "user-workflow";
        var startTime = DateTime.UtcNow;

        var executionRecord = new ExecutionRecord
        {
            Id = executionId,
            WorkflowName = workflowName,
            Status = ExecutionStatus.Succeeded,
            StartedAt = startTime,
            CompletedAt = startTime.AddMilliseconds(500),
            Duration = TimeSpan.FromMilliseconds(500),
            TaskExecutionRecords = new List<TaskExecutionRecord>
            {
                new TaskExecutionRecord
                {
                    TaskId = "task1",
                    TaskRef = "fetch-user",
                    StartedAt = startTime,
                    CompletedAt = startTime.AddMilliseconds(200),
                    Duration = TimeSpan.FromMilliseconds(200),
                    Status = "Succeeded",
                    RetryCount = 0
                }
            }
        };

        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = workflowName },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task1", TaskRef = "fetch-user" }
                }
            }
        };

        var traceResponse = new ExecutionTraceResponse
        {
            ExecutionId = executionId,
            WorkflowName = workflowName,
            StartedAt = startTime,
            CompletedAt = startTime.AddMilliseconds(500),
            TotalDurationMs = 500,
            TaskTimings = new List<TaskTimingDetail>
            {
                new TaskTimingDetail
                {
                    TaskId = "task1",
                    TaskRef = "fetch-user",
                    StartedAt = startTime,
                    CompletedAt = startTime.AddMilliseconds(200),
                    DurationMs = 200,
                    WaitTimeMs = 0,
                    Success = true,
                    RetryCount = 0
                }
            },
            DependencyOrder = new List<DependencyInfo>(),
            PlannedParallelGroups = new List<ParallelGroup>(),
            ActualParallelGroups = new List<ActualParallelGroup>()
        };

        _repositoryMock
            .Setup(x => x.GetExecutionAsync(executionId))
            .ReturnsAsync(executionRecord);

        _workflowDiscoveryMock
            .Setup(x => x.GetWorkflowByNameAsync(workflowName, null))
            .ReturnsAsync(workflow);

        _traceServiceMock
            .Setup(x => x.BuildTrace(executionRecord, workflow))
            .Returns(traceResponse);

        // Act
        var result = await _controller.GetTrace(executionId);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        var response = okResult.Value.Should().BeOfType<ExecutionTraceResponse>().Subject;

        response.ExecutionId.Should().Be(executionId);
        response.WorkflowName.Should().Be(workflowName);
        response.TotalDurationMs.Should().Be(500);
        response.TaskTimings.Should().HaveCount(1);
        response.TaskTimings[0].TaskId.Should().Be("task1");
        response.TaskTimings[0].WaitTimeMs.Should().Be(0);
    }

    [Fact]
    public async Task GetTrace_ExecutionNotFound_Returns404NotFound()
    {
        // Arrange
        var executionId = Guid.NewGuid();

        _repositoryMock
            .Setup(x => x.GetExecutionAsync(executionId))
            .ReturnsAsync((ExecutionRecord?)null);

        // Act
        var result = await _controller.GetTrace(executionId);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
        var notFoundResult = (NotFoundObjectResult)result;
        notFoundResult.Value.Should().BeEquivalentTo(new { error = $"Execution {executionId} not found" });
    }

    [Fact]
    public async Task GetTrace_WorkflowNotFound_Returns404NotFound()
    {
        // Arrange
        var executionId = Guid.NewGuid();
        var workflowName = "missing-workflow";

        var executionRecord = new ExecutionRecord
        {
            Id = executionId,
            WorkflowName = workflowName,
            Status = ExecutionStatus.Succeeded,
            StartedAt = DateTime.UtcNow,
            CompletedAt = DateTime.UtcNow,
            TaskExecutionRecords = new List<TaskExecutionRecord>()
        };

        _repositoryMock
            .Setup(x => x.GetExecutionAsync(executionId))
            .ReturnsAsync(executionRecord);

        _workflowDiscoveryMock
            .Setup(x => x.GetWorkflowByNameAsync(workflowName, null))
            .ReturnsAsync((WorkflowResource?)null);

        // Act
        var result = await _controller.GetTrace(executionId);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
        var notFoundResult = (NotFoundObjectResult)result;
        notFoundResult.Value.Should().BeEquivalentTo(new { error = $"Workflow definition '{workflowName}' not found" });
    }

    [Fact]
    public async Task GetTrace_ReturnsCompleteTraceStructure_WithAllProperties()
    {
        // Arrange
        var executionId = Guid.NewGuid();
        var workflowName = "complex-workflow";
        var startTime = DateTime.UtcNow;

        var executionRecord = new ExecutionRecord
        {
            Id = executionId,
            WorkflowName = workflowName,
            Status = ExecutionStatus.Succeeded,
            StartedAt = startTime,
            CompletedAt = startTime.AddMilliseconds(1000),
            Duration = TimeSpan.FromMilliseconds(1000),
            TaskExecutionRecords = new List<TaskExecutionRecord>
            {
                new TaskExecutionRecord
                {
                    TaskId = "task1",
                    TaskRef = "fetch-user",
                    StartedAt = startTime,
                    CompletedAt = startTime.AddMilliseconds(200),
                    Duration = TimeSpan.FromMilliseconds(200),
                    Status = "Succeeded",
                    RetryCount = 0
                },
                new TaskExecutionRecord
                {
                    TaskId = "task2",
                    TaskRef = "process-user",
                    StartedAt = startTime.AddMilliseconds(250),
                    CompletedAt = startTime.AddMilliseconds(500),
                    Duration = TimeSpan.FromMilliseconds(250),
                    Status = "Succeeded",
                    RetryCount = 1
                }
            }
        };

        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = workflowName },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task1", TaskRef = "fetch-user" },
                    new WorkflowTaskStep
                    {
                        Id = "task2",
                        TaskRef = "process-user",
                        Input = new Dictionary<string, string>
                        {
                            ["userId"] = "{{tasks.task1.output}}"
                        }
                    }
                }
            }
        };

        var traceResponse = new ExecutionTraceResponse
        {
            ExecutionId = executionId,
            WorkflowName = workflowName,
            StartedAt = startTime,
            CompletedAt = startTime.AddMilliseconds(1000),
            TotalDurationMs = 1000,
            TaskTimings = new List<TaskTimingDetail>
            {
                new TaskTimingDetail
                {
                    TaskId = "task1",
                    DurationMs = 200,
                    WaitTimeMs = 0,
                    WaitedForTasks = new List<string>(),
                    RetryCount = 0,
                    Success = true
                },
                new TaskTimingDetail
                {
                    TaskId = "task2",
                    DurationMs = 250,
                    WaitTimeMs = 50,
                    WaitedForTasks = new List<string> { "task1" },
                    RetryCount = 1,
                    Success = true
                }
            },
            DependencyOrder = new List<DependencyInfo>
            {
                new DependencyInfo
                {
                    TaskId = "task1",
                    DependsOn = new List<string>(),
                    ReadyAt = null,
                    StartedAt = startTime
                },
                new DependencyInfo
                {
                    TaskId = "task2",
                    DependsOn = new List<string> { "task1" },
                    ReadyAt = startTime.AddMilliseconds(200),
                    StartedAt = startTime.AddMilliseconds(250)
                }
            },
            PlannedParallelGroups = new List<ParallelGroup>(),
            ActualParallelGroups = new List<ActualParallelGroup>()
        };

        _repositoryMock
            .Setup(x => x.GetExecutionAsync(executionId))
            .ReturnsAsync(executionRecord);

        _workflowDiscoveryMock
            .Setup(x => x.GetWorkflowByNameAsync(workflowName, null))
            .ReturnsAsync(workflow);

        _traceServiceMock
            .Setup(x => x.BuildTrace(executionRecord, workflow))
            .Returns(traceResponse);

        // Act
        var result = await _controller.GetTrace(executionId);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = (OkObjectResult)result;
        var response = okResult.Value.Should().BeOfType<ExecutionTraceResponse>().Subject;

        // Verify complete trace structure
        response.ExecutionId.Should().Be(executionId);
        response.WorkflowName.Should().Be(workflowName);
        response.TotalDurationMs.Should().Be(1000);

        response.TaskTimings.Should().HaveCount(2);
        response.TaskTimings[0].WaitTimeMs.Should().Be(0);
        response.TaskTimings[1].WaitTimeMs.Should().Be(50);
        response.TaskTimings[1].WaitedForTasks.Should().Contain("task1");

        response.DependencyOrder.Should().HaveCount(2);
        response.DependencyOrder[0].DependsOn.Should().BeEmpty();
        response.DependencyOrder[1].DependsOn.Should().Contain("task1");
        response.DependencyOrder[1].ReadyAt.Should().Be(startTime.AddMilliseconds(200));

        response.PlannedParallelGroups.Should().NotBeNull();
        response.ActualParallelGroups.Should().NotBeNull();
    }

    [Fact]
    public async Task GetTrace_CallsTraceService_WithCorrectParameters()
    {
        // Arrange
        var executionId = Guid.NewGuid();
        var workflowName = "test-workflow";

        var executionRecord = new ExecutionRecord
        {
            Id = executionId,
            WorkflowName = workflowName,
            Status = ExecutionStatus.Succeeded,
            StartedAt = DateTime.UtcNow,
            CompletedAt = DateTime.UtcNow,
            TaskExecutionRecords = new List<TaskExecutionRecord>()
        };

        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = workflowName },
            Spec = new WorkflowSpec { Tasks = new List<WorkflowTaskStep>() }
        };

        var traceResponse = new ExecutionTraceResponse
        {
            ExecutionId = executionId,
            WorkflowName = workflowName
        };

        _repositoryMock
            .Setup(x => x.GetExecutionAsync(executionId))
            .ReturnsAsync(executionRecord);

        _workflowDiscoveryMock
            .Setup(x => x.GetWorkflowByNameAsync(workflowName, null))
            .ReturnsAsync(workflow);

        _traceServiceMock
            .Setup(x => x.BuildTrace(executionRecord, workflow))
            .Returns(traceResponse);

        // Act
        var result = await _controller.GetTrace(executionId);

        // Assert
        _traceServiceMock.Verify(x => x.BuildTrace(executionRecord, workflow), Times.Once);
        result.Should().BeOfType<OkObjectResult>();
    }
}
