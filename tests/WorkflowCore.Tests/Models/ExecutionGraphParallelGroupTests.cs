using FluentAssertions;
using WorkflowCore.Models;
using Xunit;

namespace WorkflowCore.Tests.Models;

public class ExecutionGraphParallelGroupTests
{
    [Fact]
    public void GetParallelGroups_WithEmptyGraph_ShouldReturnEmptyList()
    {
        // Arrange
        var graph = new ExecutionGraph();

        // Act
        var result = graph.GetParallelGroups();

        // Assert
        result.Should().NotBeNull();
        result.Should().BeEmpty();
    }

    [Fact]
    public void GetParallelGroups_WithSingleTask_ShouldReturnOneGroupAtLevelZero()
    {
        // Arrange
        var graph = new ExecutionGraph();
        graph.AddNode("task1");

        // Act
        var result = graph.GetParallelGroups();

        // Assert
        result.Should().HaveCount(1);
        result[0].Level.Should().Be(0);
        result[0].TaskIds.Should().ContainSingle().Which.Should().Be("task1");
    }

    [Fact]
    public void GetParallelGroups_WithSequentialTasks_ShouldReturnSeparateLevels()
    {
        // Arrange
        var graph = new ExecutionGraph();
        graph.AddNode("task1");
        graph.AddNode("task2");
        graph.AddDependency("task2", "task1"); // task2 depends on task1

        // Act
        var result = graph.GetParallelGroups();

        // Assert
        result.Should().HaveCount(2);
        result[0].Level.Should().Be(0);
        result[0].TaskIds.Should().ContainSingle().Which.Should().Be("task1");
        result[1].Level.Should().Be(1);
        result[1].TaskIds.Should().ContainSingle().Which.Should().Be("task2");
    }

    [Fact]
    public void GetParallelGroups_WithParallelTasks_ShouldGroupAtSameLevel()
    {
        // Arrange
        var graph = new ExecutionGraph();
        graph.AddNode("task1");
        graph.AddNode("task2");
        graph.AddNode("task3");
        // No dependencies - all can run in parallel

        // Act
        var result = graph.GetParallelGroups();

        // Assert
        result.Should().HaveCount(1);
        result[0].Level.Should().Be(0);
        result[0].TaskIds.Should().HaveCount(3);
        result[0].TaskIds.Should().Contain(new[] { "task1", "task2", "task3" });
    }

    [Fact]
    public void GetParallelGroups_WithComplexGraph_ShouldIdentifyCorrectLevels()
    {
        // Arrange
        var graph = new ExecutionGraph();
        graph.AddNode("fetch-user");
        graph.AddNode("fetch-settings");
        graph.AddNode("process-user");
        graph.AddNode("process-settings");
        graph.AddNode("merge-results");

        // Level 0: fetch-user, fetch-settings (parallel)
        // Level 1: process-user (depends on fetch-user), process-settings (depends on fetch-settings) - parallel
        graph.AddDependency("process-user", "fetch-user");
        graph.AddDependency("process-settings", "fetch-settings");

        // Level 2: merge-results (depends on both processed)
        graph.AddDependency("merge-results", "process-user");
        graph.AddDependency("merge-results", "process-settings");

        // Act
        var result = graph.GetParallelGroups();

        // Assert
        result.Should().HaveCount(3);

        // Level 0: two fetches
        result[0].Level.Should().Be(0);
        result[0].TaskIds.Should().HaveCount(2);
        result[0].TaskIds.Should().Contain(new[] { "fetch-user", "fetch-settings" });

        // Level 1: two processes
        result[1].Level.Should().Be(1);
        result[1].TaskIds.Should().HaveCount(2);
        result[1].TaskIds.Should().Contain(new[] { "process-user", "process-settings" });

        // Level 2: merge
        result[2].Level.Should().Be(2);
        result[2].TaskIds.Should().ContainSingle().Which.Should().Be("merge-results");
    }

    [Fact]
    public void GetParallelGroups_WithDiamondPattern_ShouldHandleCorrectly()
    {
        // Arrange
        var graph = new ExecutionGraph();
        graph.AddNode("start");
        graph.AddNode("left");
        graph.AddNode("right");
        graph.AddNode("end");

        // Diamond: start -> left/right (parallel) -> end
        graph.AddDependency("left", "start");
        graph.AddDependency("right", "start");
        graph.AddDependency("end", "left");
        graph.AddDependency("end", "right");

        // Act
        var result = graph.GetParallelGroups();

        // Assert
        result.Should().HaveCount(3);
        result[0].Level.Should().Be(0);
        result[0].TaskIds.Should().ContainSingle().Which.Should().Be("start");
        result[1].Level.Should().Be(1);
        result[1].TaskIds.Should().HaveCount(2);
        result[1].TaskIds.Should().Contain(new[] { "left", "right" });
        result[2].Level.Should().Be(2);
        result[2].TaskIds.Should().ContainSingle().Which.Should().Be("end");
    }

    [Fact]
    public void GetParallelGroups_WithWideParallelism_ShouldHandleManyTasksAtSameLevel()
    {
        // Arrange
        var graph = new ExecutionGraph();
        graph.AddNode("start");
        for (int i = 1; i <= 10; i++)
        {
            var taskId = $"parallel-{i}";
            graph.AddNode(taskId);
            graph.AddDependency(taskId, "start");
        }
        graph.AddNode("end");
        for (int i = 1; i <= 10; i++)
        {
            graph.AddDependency("end", $"parallel-{i}");
        }

        // Act
        var result = graph.GetParallelGroups();

        // Assert
        result.Should().HaveCount(3);
        result[0].Level.Should().Be(0);
        result[0].TaskIds.Should().ContainSingle().Which.Should().Be("start");
        result[1].Level.Should().Be(1);
        result[1].TaskIds.Should().HaveCount(10);
        result[2].Level.Should().Be(2);
        result[2].TaskIds.Should().ContainSingle().Which.Should().Be("end");
    }
}
