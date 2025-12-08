using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Controllers;
using WorkflowGateway.Models;
using Xunit;

namespace WorkflowGateway.Tests.Controllers;

/// <summary>
/// Tests for TaskImpactController - provides impact analysis API.
/// </summary>
public class TaskImpactControllerTests
{
    private readonly Mock<ITaskDependencyTracker> _dependencyTrackerMock;
    private readonly Mock<ITaskLifecycleManager> _lifecycleManagerMock;
    private readonly TaskImpactController _controller;

    public TaskImpactControllerTests()
    {
        _dependencyTrackerMock = new Mock<ITaskDependencyTracker>();
        _lifecycleManagerMock = new Mock<ITaskLifecycleManager>();
        _controller = new TaskImpactController(_dependencyTrackerMock.Object, _lifecycleManagerMock.Object);
    }

    [Fact]
    public async Task GetImpact_ShouldReturnAffectedWorkflows()
    {
        _dependencyTrackerMock.Setup(x => x.GetAffectedWorkflows("get-user"))
            .Returns(new List<string> { "workflow-1", "workflow-2" });
        _lifecycleManagerMock.Setup(x => x.GetLifecycle("get-user"))
            .Returns(new TaskLifecycle { TaskName = "get-user", State = TaskLifecycleState.Active });

        var result = await _controller.GetImpact("get-user");

        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<TaskImpactResponse>().Subject;
        response.TaskName.Should().Be("get-user");
        response.AffectedWorkflows.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetImpact_ShouldReturnNotFound_WhenTaskDoesNotExist()
    {
        _dependencyTrackerMock.Setup(x => x.GetDependency("unknown-task")).Returns((TaskDependency?)null);
        _lifecycleManagerMock.Setup(x => x.GetLifecycle("unknown-task")).Returns((TaskLifecycle?)null);

        var result = await _controller.GetImpact("unknown-task");

        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task GetImpact_ShouldIndicateBreakingChange_WhenFieldRemoved()
    {
        _dependencyTrackerMock.Setup(x => x.GetAffectedWorkflows("get-user"))
            .Returns(new List<string> { "workflow-1" });
        _dependencyTrackerMock.Setup(x => x.GetWorkflowsUsingField("get-user", "email"))
            .Returns(new List<string> { "workflow-1" });
        _lifecycleManagerMock.Setup(x => x.GetLifecycle("get-user"))
            .Returns(new TaskLifecycle { TaskName = "get-user", State = TaskLifecycleState.Active });

        var result = await _controller.GetImpact("get-user", removedField: "email");

        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<TaskImpactResponse>().Subject;
        response.IsBreaking.Should().BeTrue();
        response.BlockedWorkflows.Should().Contain("workflow-1");
    }

    [Fact]
    public async Task GetLifecycle_ShouldReturnLifecycleState()
    {
        _lifecycleManagerMock.Setup(x => x.GetLifecycle("get-user"))
            .Returns(new TaskLifecycle { TaskName = "get-user", State = TaskLifecycleState.Superseded, SupersededBy = "get-user-v2" });

        var result = await _controller.GetLifecycle("get-user");

        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<TaskLifecycleResponse>().Subject;
        response.State.Should().Be("Superseded");
        response.SupersededBy.Should().Be("get-user-v2");
    }

    [Fact]
    public async Task SupersedeTask_ShouldUpdateLifecycle()
    {
        _lifecycleManagerMock.Setup(x => x.GetLifecycle("get-user"))
            .Returns(new TaskLifecycle { TaskName = "get-user", State = TaskLifecycleState.Active });

        var result = await _controller.SupersedeTask("get-user", new SupersedeTaskRequest { NewTaskName = "get-user-v2" });

        result.Should().BeOfType<OkResult>();
        _lifecycleManagerMock.Verify(x => x.SupersedeTask("get-user", "get-user-v2"), Times.Once);
    }

    [Fact]
    public async Task DeprecateTask_ShouldSetDeprecationDate()
    {
        var deprecationDate = DateTime.UtcNow.AddMonths(3);
        _lifecycleManagerMock.Setup(x => x.GetLifecycle("get-user"))
            .Returns(new TaskLifecycle { TaskName = "get-user", State = TaskLifecycleState.Active });

        var result = await _controller.DeprecateTask("get-user", new DeprecateTaskRequest { DeprecationDate = deprecationDate });

        result.Should().BeOfType<OkResult>();
        _lifecycleManagerMock.Verify(x => x.DeprecateTask("get-user", deprecationDate), Times.Once);
    }
}
