using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;
using WorkflowGateway.Controllers;
using WorkflowGateway.Models;
using Xunit;

namespace WorkflowGateway.Tests.Controllers;

public class ExecutionHistoryControllerTests
{
    private readonly Mock<IExecutionRepository> _repositoryMock;
    private readonly ExecutionHistoryController _controller;

    public ExecutionHistoryControllerTests()
    {
        _repositoryMock = new Mock<IExecutionRepository>();
        _controller = new ExecutionHistoryController(_repositoryMock.Object);
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
        var act = () => new ExecutionHistoryController(null!);
        act.Should().Throw<ArgumentNullException>()
            .WithMessage("*executionRepository*");
    }
}
