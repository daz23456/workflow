using FluentAssertions;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class BlastRadiusAnalyzerTests
{
    private readonly Mock<ITaskDependencyTracker> _dependencyTrackerMock;
    private readonly BlastRadiusAnalyzer _analyzer;

    public BlastRadiusAnalyzerTests()
    {
        _dependencyTrackerMock = new Mock<ITaskDependencyTracker>();
        _analyzer = new BlastRadiusAnalyzer(_dependencyTrackerMock.Object);
    }

    #region Empty/Unknown Task Tests

    [Fact]
    public async Task AnalyzeAsync_UnknownTask_ReturnsEmptyResult()
    {
        // Arrange
        _dependencyTrackerMock
            .Setup(x => x.GetAffectedWorkflows("unknown-task"))
            .Returns(Array.Empty<string>());

        // Act
        var result = await _analyzer.AnalyzeAsync("unknown-task", maxDepth: 1);

        // Assert
        result.Should().NotBeNull();
        result.TaskName.Should().Be("unknown-task");
        result.AnalysisDepth.Should().Be(1);
        result.TotalAffectedWorkflows.Should().Be(0);
        result.TotalAffectedTasks.Should().Be(0);
        result.TruncatedAtDepth.Should().BeFalse();
    }

    [Fact]
    public async Task AnalyzeAsync_TaskWithNoDependents_ReturnsEmptyResult()
    {
        // Arrange
        _dependencyTrackerMock
            .Setup(x => x.GetAffectedWorkflows("isolated-task"))
            .Returns(Array.Empty<string>());

        // Act
        var result = await _analyzer.AnalyzeAsync("isolated-task", maxDepth: 2);

        // Assert
        result.AffectedWorkflows.Should().BeEmpty();
        result.AffectedTasks.Should().BeEmpty();
        result.ByDepth.Should().BeEmpty();
    }

    #endregion

    #region Depth 1 Tests

    [Fact]
    public async Task AnalyzeAsync_Depth1_ReturnsDirectWorkflows()
    {
        // Arrange
        _dependencyTrackerMock
            .Setup(x => x.GetAffectedWorkflows("task-a"))
            .Returns(new[] { "workflow-1", "workflow-2" });

        // Act
        var result = await _analyzer.AnalyzeAsync("task-a", maxDepth: 1);

        // Assert
        result.TaskName.Should().Be("task-a");
        result.AnalysisDepth.Should().Be(1);
        result.TotalAffectedWorkflows.Should().Be(2);
        result.AffectedWorkflows.Should().BeEquivalentTo(new[] { "workflow-1", "workflow-2" });
    }

    [Fact]
    public async Task AnalyzeAsync_Depth1_IncludesOtherTasksInWorkflows()
    {
        // Arrange: task-a is used by workflow-1, which also uses task-b and task-c
        _dependencyTrackerMock
            .Setup(x => x.GetAffectedWorkflows("task-a"))
            .Returns(new[] { "workflow-1" });

        _dependencyTrackerMock
            .Setup(x => x.GetTasksInWorkflow("workflow-1"))
            .Returns(new[] { "task-a", "task-b", "task-c" });

        // Act
        var result = await _analyzer.AnalyzeAsync("task-a", maxDepth: 1);

        // Assert
        result.TotalAffectedTasks.Should().Be(2); // task-b and task-c (not task-a itself)
        result.AffectedTasks.Should().BeEquivalentTo(new[] { "task-b", "task-c" });
    }

    [Fact]
    public async Task AnalyzeAsync_Depth1_RecordsByDepthCorrectly()
    {
        // Arrange
        _dependencyTrackerMock
            .Setup(x => x.GetAffectedWorkflows("task-a"))
            .Returns(new[] { "workflow-1" });

        _dependencyTrackerMock
            .Setup(x => x.GetTasksInWorkflow("workflow-1"))
            .Returns(new[] { "task-a", "task-b" });

        // Act
        var result = await _analyzer.AnalyzeAsync("task-a", maxDepth: 1);

        // Assert
        result.ByDepth.Should().HaveCount(1);
        result.ByDepth[0].Depth.Should().Be(1);
        result.ByDepth[0].Workflows.Should().BeEquivalentTo(new[] { "workflow-1" });
        result.ByDepth[0].Tasks.Should().BeEquivalentTo(new[] { "task-b" });
    }

    #endregion

    #region Depth 2+ Tests

    [Fact]
    public async Task AnalyzeAsync_Depth2_IncludesIndirectWorkflows()
    {
        // Arrange: task-a → workflow-1 (contains task-b) → workflow-2 uses task-b
        _dependencyTrackerMock
            .Setup(x => x.GetAffectedWorkflows("task-a"))
            .Returns(new[] { "workflow-1" });

        _dependencyTrackerMock
            .Setup(x => x.GetTasksInWorkflow("workflow-1"))
            .Returns(new[] { "task-a", "task-b" });

        _dependencyTrackerMock
            .Setup(x => x.GetAffectedWorkflows("task-b"))
            .Returns(new[] { "workflow-1", "workflow-2" }); // workflow-2 also uses task-b

        _dependencyTrackerMock
            .Setup(x => x.GetTasksInWorkflow("workflow-2"))
            .Returns(new[] { "task-b", "task-c" });

        // Act
        var result = await _analyzer.AnalyzeAsync("task-a", maxDepth: 2);

        // Assert
        result.AnalysisDepth.Should().Be(2);
        result.TotalAffectedWorkflows.Should().Be(2);
        result.AffectedWorkflows.Should().BeEquivalentTo(new[] { "workflow-1", "workflow-2" });
        result.TotalAffectedTasks.Should().Be(2); // task-b and task-c
        result.AffectedTasks.Should().BeEquivalentTo(new[] { "task-b", "task-c" });
    }

    [Fact]
    public async Task AnalyzeAsync_Depth2_RecordsCorrectDepthLevels()
    {
        // Arrange
        _dependencyTrackerMock
            .Setup(x => x.GetAffectedWorkflows("task-a"))
            .Returns(new[] { "workflow-1" });

        _dependencyTrackerMock
            .Setup(x => x.GetTasksInWorkflow("workflow-1"))
            .Returns(new[] { "task-a", "task-b" });

        _dependencyTrackerMock
            .Setup(x => x.GetAffectedWorkflows("task-b"))
            .Returns(new[] { "workflow-2" });

        _dependencyTrackerMock
            .Setup(x => x.GetTasksInWorkflow("workflow-2"))
            .Returns(new[] { "task-b", "task-c" });

        // Act
        var result = await _analyzer.AnalyzeAsync("task-a", maxDepth: 2);

        // Assert
        result.ByDepth.Should().HaveCount(2);

        result.ByDepth[0].Depth.Should().Be(1);
        result.ByDepth[0].Workflows.Should().BeEquivalentTo(new[] { "workflow-1" });
        result.ByDepth[0].Tasks.Should().BeEquivalentTo(new[] { "task-b" });

        result.ByDepth[1].Depth.Should().Be(2);
        result.ByDepth[1].Workflows.Should().BeEquivalentTo(new[] { "workflow-2" });
        result.ByDepth[1].Tasks.Should().BeEquivalentTo(new[] { "task-c" });
    }

    #endregion

    #region Cycle Detection Tests

    [Fact]
    public async Task AnalyzeAsync_CyclicDependency_DoesNotInfiniteLoop()
    {
        // Arrange: task-a → workflow-1 → task-b → workflow-2 → task-a (cycle!)
        _dependencyTrackerMock
            .Setup(x => x.GetAffectedWorkflows("task-a"))
            .Returns(new[] { "workflow-1" });

        _dependencyTrackerMock
            .Setup(x => x.GetTasksInWorkflow("workflow-1"))
            .Returns(new[] { "task-a", "task-b" });

        _dependencyTrackerMock
            .Setup(x => x.GetAffectedWorkflows("task-b"))
            .Returns(new[] { "workflow-2" });

        _dependencyTrackerMock
            .Setup(x => x.GetTasksInWorkflow("workflow-2"))
            .Returns(new[] { "task-a", "task-b" }); // Cycle back to task-a

        // Act - should complete without hanging
        var result = await _analyzer.AnalyzeAsync("task-a", maxDepth: 10);

        // Assert
        result.Should().NotBeNull();
        result.AffectedWorkflows.Should().BeEquivalentTo(new[] { "workflow-1", "workflow-2" });
        result.AffectedTasks.Should().BeEquivalentTo(new[] { "task-b" }); // task-a not included (source)
    }

    [Fact]
    public async Task AnalyzeAsync_DiamondDependency_DeduplicatesCorrectly()
    {
        // Arrange: task-a used by workflow-1 and workflow-2, both contain task-b
        _dependencyTrackerMock
            .Setup(x => x.GetAffectedWorkflows("task-a"))
            .Returns(new[] { "workflow-1", "workflow-2" });

        _dependencyTrackerMock
            .Setup(x => x.GetTasksInWorkflow("workflow-1"))
            .Returns(new[] { "task-a", "task-b" });

        _dependencyTrackerMock
            .Setup(x => x.GetTasksInWorkflow("workflow-2"))
            .Returns(new[] { "task-a", "task-b" });

        // Act
        var result = await _analyzer.AnalyzeAsync("task-a", maxDepth: 1);

        // Assert - task-b should only appear once
        result.AffectedTasks.Should().HaveCount(1);
        result.AffectedTasks.Should().Contain("task-b");
    }

    #endregion

    #region Depth Limiting Tests

    [Fact]
    public async Task AnalyzeAsync_DepthLimit_StopsAtSpecifiedDepth()
    {
        // Arrange: deep chain that goes beyond depth 2
        _dependencyTrackerMock
            .Setup(x => x.GetAffectedWorkflows("task-a"))
            .Returns(new[] { "workflow-1" });

        _dependencyTrackerMock
            .Setup(x => x.GetTasksInWorkflow("workflow-1"))
            .Returns(new[] { "task-a", "task-b" });

        _dependencyTrackerMock
            .Setup(x => x.GetAffectedWorkflows("task-b"))
            .Returns(new[] { "workflow-2" });

        _dependencyTrackerMock
            .Setup(x => x.GetTasksInWorkflow("workflow-2"))
            .Returns(new[] { "task-b", "task-c" });

        _dependencyTrackerMock
            .Setup(x => x.GetAffectedWorkflows("task-c"))
            .Returns(new[] { "workflow-3" }); // This is depth 3

        // Act
        var result = await _analyzer.AnalyzeAsync("task-a", maxDepth: 2);

        // Assert
        result.AnalysisDepth.Should().Be(2);
        result.AffectedWorkflows.Should().NotContain("workflow-3");
        result.TruncatedAtDepth.Should().BeTrue();
    }

    [Fact]
    public async Task AnalyzeAsync_UnlimitedDepth_TraversesFullGraph()
    {
        // Arrange
        _dependencyTrackerMock
            .Setup(x => x.GetAffectedWorkflows("task-a"))
            .Returns(new[] { "workflow-1" });

        _dependencyTrackerMock
            .Setup(x => x.GetTasksInWorkflow("workflow-1"))
            .Returns(new[] { "task-a", "task-b" });

        _dependencyTrackerMock
            .Setup(x => x.GetAffectedWorkflows("task-b"))
            .Returns(new[] { "workflow-2" });

        _dependencyTrackerMock
            .Setup(x => x.GetTasksInWorkflow("workflow-2"))
            .Returns(new[] { "task-b", "task-c" });

        _dependencyTrackerMock
            .Setup(x => x.GetAffectedWorkflows("task-c"))
            .Returns(Array.Empty<string>()); // End of chain

        // Act
        var result = await _analyzer.AnalyzeAsync("task-a", maxDepth: int.MaxValue);

        // Assert
        result.TruncatedAtDepth.Should().BeFalse();
        result.AffectedWorkflows.Should().BeEquivalentTo(new[] { "workflow-1", "workflow-2" });
    }

    #endregion

    #region Graph Output Tests

    [Fact]
    public async Task AnalyzeAsync_ReturnsCorrectGraphNodes()
    {
        // Arrange
        _dependencyTrackerMock
            .Setup(x => x.GetAffectedWorkflows("task-a"))
            .Returns(new[] { "workflow-1" });

        _dependencyTrackerMock
            .Setup(x => x.GetTasksInWorkflow("workflow-1"))
            .Returns(new[] { "task-a", "task-b" });

        // Act
        var result = await _analyzer.AnalyzeAsync("task-a", maxDepth: 1);

        // Assert
        result.Graph.Should().NotBeNull();
        result.Graph.Nodes.Should().HaveCount(3); // task-a (source), workflow-1, task-b

        var sourceNode = result.Graph.Nodes.First(n => n.Name == "task-a");
        sourceNode.IsSource.Should().BeTrue();
        sourceNode.Type.Should().Be(BlastRadiusNodeType.Task);
        sourceNode.Depth.Should().Be(0);

        var workflowNode = result.Graph.Nodes.First(n => n.Name == "workflow-1");
        workflowNode.Type.Should().Be(BlastRadiusNodeType.Workflow);
        workflowNode.Depth.Should().Be(1);
    }

    [Fact]
    public async Task AnalyzeAsync_ReturnsCorrectGraphEdges()
    {
        // Arrange
        _dependencyTrackerMock
            .Setup(x => x.GetAffectedWorkflows("task-a"))
            .Returns(new[] { "workflow-1" });

        _dependencyTrackerMock
            .Setup(x => x.GetTasksInWorkflow("workflow-1"))
            .Returns(new[] { "task-a", "task-b" });

        // Act
        var result = await _analyzer.AnalyzeAsync("task-a", maxDepth: 1);

        // Assert
        result.Graph.Edges.Should().Contain(e =>
            e.Source == "task:task-a" &&
            e.Target == "workflow:workflow-1" &&
            e.Relationship == "usedBy");

        result.Graph.Edges.Should().Contain(e =>
            e.Source == "workflow:workflow-1" &&
            e.Target == "task:task-b" &&
            e.Relationship == "contains");
    }

    #endregion

    #region Cancellation Tests

    [Fact]
    public async Task AnalyzeAsync_CancellationRequested_ThrowsOperationCanceledException()
    {
        // Arrange
        var cts = new CancellationTokenSource();
        cts.Cancel();

        _dependencyTrackerMock
            .Setup(x => x.GetAffectedWorkflows("task-a"))
            .Returns(new[] { "workflow-1" });

        // Act & Assert
        await Assert.ThrowsAsync<OperationCanceledException>(
            () => _analyzer.AnalyzeAsync("task-a", maxDepth: 1, cts.Token));
    }

    #endregion
}
