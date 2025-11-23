using FluentAssertions;
using WorkflowGateway.Models;

namespace WorkflowGateway.Tests.Models;

public class DetailedWorkflowExecutionResponseTests
{
    [Fact]
    public void DetailedWorkflowExecutionResponse_ShouldInitialize_WithDefaultValues()
    {
        // Arrange & Act
        var response = new DetailedWorkflowExecutionResponse();

        // Assert
        response.ExecutionId.Should().BeEmpty();
        response.WorkflowName.Should().BeNull();
        response.Status.Should().BeNull();
        response.CompletedAt.Should().BeNull();
        response.DurationMs.Should().BeNull();
        response.Input.Should().BeNull();
        response.Output.Should().BeNull();
        response.Tasks.Should().NotBeNull();
        response.Tasks.Should().BeEmpty();
        response.Errors.Should().NotBeNull();
        response.Errors.Should().BeEmpty();
    }

    [Fact]
    public void DetailedWorkflowExecutionResponse_ShouldSet_AllProperties()
    {
        // Arrange
        var executionId = Guid.NewGuid();
        var startedAt = DateTime.UtcNow.AddMinutes(-5);
        var completedAt = DateTime.UtcNow;
        var input = new Dictionary<string, object> { ["userId"] = "123" };
        var output = new Dictionary<string, object> { ["result"] = "success" };
        var tasks = new List<TaskExecutionDetail>
        {
            new TaskExecutionDetail { TaskId = "task-1", Success = true }
        };

        // Act
        var response = new DetailedWorkflowExecutionResponse
        {
            ExecutionId = executionId,
            WorkflowName = "user-onboarding",
            Status = "Succeeded",
            StartedAt = startedAt,
            CompletedAt = completedAt,
            DurationMs = 5000,
            Input = input,
            Output = output,
            Tasks = tasks,
            Errors = new List<string>()
        };

        // Assert
        response.ExecutionId.Should().Be(executionId);
        response.WorkflowName.Should().Be("user-onboarding");
        response.Status.Should().Be("Succeeded");
        response.StartedAt.Should().Be(startedAt);
        response.CompletedAt.Should().Be(completedAt);
        response.DurationMs.Should().Be(5000);
        response.Input.Should().BeEquivalentTo(input);
        response.Output.Should().BeEquivalentTo(output);
        response.Tasks.Should().HaveCount(1);
        response.Errors.Should().BeEmpty();
    }

    [Fact]
    public void DetailedWorkflowExecutionResponse_ShouldInclude_TaskDetails()
    {
        // Arrange
        var tasks = new List<TaskExecutionDetail>
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
                DurationMs = 200,
                RetryCount = 1
            }
        };

        // Act
        var response = new DetailedWorkflowExecutionResponse
        {
            ExecutionId = Guid.NewGuid(),
            WorkflowName = "email-campaign",
            Status = "Succeeded",
            Tasks = tasks
        };

        // Assert
        response.Tasks.Should().HaveCount(2);
        response.Tasks[0].TaskRef.Should().Be("fetch-user");
        response.Tasks[1].RetryCount.Should().Be(1);
    }

    [Fact]
    public void DetailedWorkflowExecutionResponse_ShouldInclude_Errors_WhenFailed()
    {
        // Arrange
        var errors = new List<string>
        {
            "Task 'fetch-user' failed: Connection timeout",
            "Workflow execution aborted"
        };

        // Act
        var response = new DetailedWorkflowExecutionResponse
        {
            ExecutionId = Guid.NewGuid(),
            WorkflowName = "failing-workflow",
            Status = "Failed",
            Errors = errors,
            DurationMs = 3000
        };

        // Assert
        response.Status.Should().Be("Failed");
        response.Errors.Should().HaveCount(2);
        response.Errors.Should().Contain("Task 'fetch-user' failed: Connection timeout");
    }

    [Fact]
    public void DetailedWorkflowExecutionResponse_ShouldHandle_RunningExecution()
    {
        // Arrange & Act
        var response = new DetailedWorkflowExecutionResponse
        {
            ExecutionId = Guid.NewGuid(),
            WorkflowName = "long-running-job",
            Status = "Running",
            StartedAt = DateTime.UtcNow.AddHours(-1),
            CompletedAt = null,
            DurationMs = null,
            Input = new Dictionary<string, object> { ["batchSize"] = 1000 }
        };

        // Assert
        response.Status.Should().Be("Running");
        response.CompletedAt.Should().BeNull();
        response.DurationMs.Should().BeNull();
        response.Input.Should().NotBeNull();
    }

    [Fact]
    public void DetailedWorkflowExecutionResponse_ShouldHandle_NullOutput()
    {
        // Arrange & Act
        var response = new DetailedWorkflowExecutionResponse
        {
            ExecutionId = Guid.NewGuid(),
            WorkflowName = "no-output-workflow",
            Status = "Succeeded",
            Output = null
        };

        // Assert
        response.Output.Should().BeNull();
        response.Status.Should().Be("Succeeded");
    }
}
