using FluentAssertions;
using WorkflowGateway.Models;
using Xunit;

namespace WorkflowGateway.Tests.Models;

public class WorkflowExecutionResponseTests
{
    [Fact]
    public void WorkflowExecutionResponse_ShouldInitializeWithDefaultValues()
    {
        // Act
        var response = new WorkflowExecutionResponse();

        // Assert
        response.WorkflowName.Should().Be(string.Empty);
        response.Success.Should().BeFalse();
        response.Output.Should().BeNull();
        response.ExecutedTasks.Should().NotBeNull();
        response.ExecutedTasks.Should().BeEmpty();
        response.ExecutionTimeMs.Should().Be(0);
        response.Error.Should().BeNull();
    }

    [Fact]
    public void WorkflowExecutionResponse_ShouldAllowSettingPropertiesForSuccess()
    {
        // Arrange
        var output = new Dictionary<string, object>
        {
            ["userId"] = "123",
            ["email"] = "john@example.com"
        };

        var executedTasks = new List<string> { "fetch-user", "enrich-data" };

        // Act
        var response = new WorkflowExecutionResponse
        {
            WorkflowName = "user-enrichment",
            Success = true,
            Output = output,
            ExecutedTasks = executedTasks,
            ExecutionTimeMs = 245
        };

        // Assert
        response.WorkflowName.Should().Be("user-enrichment");
        response.Success.Should().BeTrue();
        response.Output.Should().NotBeNull();
        response.Output!["userId"].Should().Be("123");
        response.ExecutedTasks.Should().HaveCount(2);
        response.ExecutedTasks[0].Should().Be("fetch-user");
        response.ExecutionTimeMs.Should().Be(245);
        response.Error.Should().BeNull();
    }

    [Fact]
    public void WorkflowExecutionResponse_ShouldAllowSettingPropertiesForFailure()
    {
        // Act
        var response = new WorkflowExecutionResponse
        {
            WorkflowName = "order-processing",
            Success = false,
            Error = "Task 'fetch-order' failed: HTTP 404 Not Found",
            ExecutedTasks = new List<string> { "validate-input" },
            ExecutionTimeMs = 120
        };

        // Assert
        response.WorkflowName.Should().Be("order-processing");
        response.Success.Should().BeFalse();
        response.Error.Should().Be("Task 'fetch-order' failed: HTTP 404 Not Found");
        response.Output.Should().BeNull();
        response.ExecutedTasks.Should().HaveCount(1);
        response.ExecutionTimeMs.Should().Be(120);
    }

    [Fact]
    public void WorkflowExecutionResponse_ShouldSupportNullOutput()
    {
        // Act
        var response = new WorkflowExecutionResponse
        {
            WorkflowName = "test-workflow",
            Success = true,
            Output = null
        };

        // Assert
        response.Output.Should().BeNull();
    }

    [Fact]
    public void WorkflowExecutionResponse_ShouldSupportEmptyExecutedTasksList()
    {
        // Act
        var response = new WorkflowExecutionResponse
        {
            WorkflowName = "failed-workflow",
            Success = false,
            Error = "Workflow validation failed",
            ExecutedTasks = new List<string>()
        };

        // Assert
        response.ExecutedTasks.Should().BeEmpty();
    }

    [Fact]
    public void WorkflowExecutionResponse_ShouldSupportLongExecutionTime()
    {
        // Act
        var response = new WorkflowExecutionResponse
        {
            WorkflowName = "long-workflow",
            Success = true,
            ExecutionTimeMs = 15000
        };

        // Assert
        response.ExecutionTimeMs.Should().Be(15000);
    }

    [Fact]
    public void WorkflowExecutionResponse_ShouldInclude_ExecutionId()
    {
        // Arrange
        var executionId = Guid.NewGuid();

        // Act
        var response = new WorkflowExecutionResponse
        {
            WorkflowName = "user-registration",
            Success = true,
            ExecutionId = executionId
        };

        // Assert
        response.ExecutionId.Should().Be(executionId);
    }

    [Fact]
    public void WorkflowExecutionResponse_ShouldInclude_TaskDetails()
    {
        // Arrange
        var taskDetails = new List<TaskExecutionDetail>
        {
            new TaskExecutionDetail
            {
                TaskId = "task-1",
                TaskRef = "fetch-user",
                Success = true,
                DurationMs = 150,
                RetryCount = 0
            },
            new TaskExecutionDetail
            {
                TaskId = "task-2",
                TaskRef = "send-email",
                Success = true,
                DurationMs = 300,
                RetryCount = 1
            }
        };

        // Act
        var response = new WorkflowExecutionResponse
        {
            WorkflowName = "onboarding",
            Success = true,
            TaskDetails = taskDetails
        };

        // Assert
        response.TaskDetails.Should().HaveCount(2);
        response.TaskDetails[0].TaskRef.Should().Be("fetch-user");
        response.TaskDetails[1].RetryCount.Should().Be(1);
    }

    [Fact]
    public void WorkflowExecutionResponse_ShouldInitialize_TaskDetailsAsEmptyList()
    {
        // Act
        var response = new WorkflowExecutionResponse();

        // Assert
        response.TaskDetails.Should().NotBeNull();
        response.TaskDetails.Should().BeEmpty();
    }

    [Fact]
    public void WorkflowExecutionResponse_ShouldInitialize_ExecutionIdAsEmpty()
    {
        // Act
        var response = new WorkflowExecutionResponse();

        // Assert
        response.ExecutionId.Should().BeEmpty();
    }
}
