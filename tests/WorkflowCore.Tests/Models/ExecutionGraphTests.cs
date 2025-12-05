using FluentAssertions;
using WorkflowCore.Models;
using Xunit;

namespace WorkflowCore.Tests.Models;

public class ExecutionGraphTests
{
    [Fact]
    public void AddNode_ShouldAddNodeToGraph()
    {
        // Arrange
        var graph = new ExecutionGraph();

        // Act
        graph.AddNode("task-1");

        // Assert
        graph.Nodes.Should().ContainSingle()
            .Which.Should().Be("task-1");
        graph.GetDependencies("task-1").Should().BeEmpty();
    }

    [Fact]
    public void AddNode_WhenNodeAlreadyExists_ShouldNotDuplicate()
    {
        // Arrange
        var graph = new ExecutionGraph();
        graph.AddNode("task-1");

        // Act
        graph.AddNode("task-1"); // Add again

        // Assert
        graph.Nodes.Should().ContainSingle()
            .Which.Should().Be("task-1");
    }

    [Fact]
    public void AddDependency_ShouldAddDependencyToNode()
    {
        // Arrange
        var graph = new ExecutionGraph();

        // Act
        graph.AddDependency("task-2", "task-1");

        // Assert
        graph.Nodes.Should().Contain("task-2");
        graph.GetDependencies("task-2").Should().ContainSingle()
            .Which.Should().Be("task-1");
    }

    [Fact]
    public void AddDependency_WhenNodeDoesNotExist_ShouldCreateNode()
    {
        // Arrange
        var graph = new ExecutionGraph();

        // Act
        graph.AddDependency("task-2", "task-1");

        // Assert
        graph.Nodes.Should().Contain("task-2");
        graph.GetDependencies("task-2").Should().Contain("task-1");
    }

    [Fact]
    public void AddDependency_WithMultipleDependencies_ShouldAddAll()
    {
        // Arrange
        var graph = new ExecutionGraph();

        // Act
        graph.AddDependency("task-3", "task-1");
        graph.AddDependency("task-3", "task-2");

        // Assert
        var dependencies = graph.GetDependencies("task-3");
        dependencies.Should().HaveCount(2);
        dependencies.Should().Contain("task-1");
        dependencies.Should().Contain("task-2");
    }

    [Fact]
    public void AddDependency_WithDuplicateDependency_ShouldNotDuplicate()
    {
        // Arrange
        var graph = new ExecutionGraph();

        // Act
        graph.AddDependency("task-2", "task-1");
        graph.AddDependency("task-2", "task-1"); // Add same dependency twice

        // Assert
        graph.GetDependencies("task-2").Should().ContainSingle()
            .Which.Should().Be("task-1");
    }

    [Fact]
    public void GetDependencies_WhenNodeDoesNotExist_ShouldReturnEmptyList()
    {
        // Arrange
        var graph = new ExecutionGraph();

        // Act
        var dependencies = graph.GetDependencies("non-existent");

        // Assert
        dependencies.Should().BeEmpty();
    }

    [Fact]
    public void GetDependencies_WhenNodeHasNoDependencies_ShouldReturnEmptyList()
    {
        // Arrange
        var graph = new ExecutionGraph();
        graph.AddNode("task-1");

        // Act
        var dependencies = graph.GetDependencies("task-1");

        // Assert
        dependencies.Should().BeEmpty();
    }

    [Fact]
    public void DetectCycles_WithNoCycles_ShouldReturnEmptyList()
    {
        // Arrange
        var graph = new ExecutionGraph();
        graph.AddDependency("task-2", "task-1");
        graph.AddDependency("task-3", "task-2");

        // Act
        var cycles = graph.DetectCycles();

        // Assert
        cycles.Should().BeEmpty();
    }

    [Fact]
    public void DetectCycles_WithSimpleCycle_ShouldDetectCycle()
    {
        // Arrange - Create cycle: A -> B -> A
        var graph = new ExecutionGraph();
        graph.AddDependency("task-a", "task-b");
        graph.AddDependency("task-b", "task-a");

        // Act
        var cycles = graph.DetectCycles();

        // Assert
        cycles.Should().ContainSingle();
        var cycle = cycles[0];
        cycle.Should().HaveCount(3); // [A, B, A] or [B, A, B]
        cycle[0].Should().Be(cycle[2]); // First and last should be same (completes cycle)
    }

    [Fact]
    public void DetectCycles_WithThreeNodeCycle_ShouldDetectCycle()
    {
        // Arrange - Create cycle: A -> B -> C -> A
        var graph = new ExecutionGraph();
        graph.AddDependency("task-a", "task-b");
        graph.AddDependency("task-b", "task-c");
        graph.AddDependency("task-c", "task-a");

        // Act
        var cycles = graph.DetectCycles();

        // Assert
        cycles.Should().ContainSingle();
        var cycle = cycles[0];
        cycle.Should().HaveCount(4); // [A, B, C, A] or similar
        cycle[0].Should().Be(cycle[3]); // First and last should be same
    }

    [Fact]
    public void DetectCycles_WithSelfLoop_ShouldDetectCycle()
    {
        // Arrange - Self-referencing node
        var graph = new ExecutionGraph();
        graph.AddDependency("task-1", "task-1");

        // Act
        var cycles = graph.DetectCycles();

        // Assert
        cycles.Should().ContainSingle();
        var cycle = cycles[0];
        cycle.Should().HaveCount(2); // [task-1, task-1]
        cycle[0].Should().Be("task-1");
        cycle[1].Should().Be("task-1");
    }

    [Fact]
    public void DetectCycles_WithDisconnectedGraph_ShouldCheckAllComponents()
    {
        // Arrange - Two separate components, one with cycle
        var graph = new ExecutionGraph();
        // Component 1: No cycle
        graph.AddDependency("task-1", "task-2");
        // Component 2: Has cycle
        graph.AddDependency("task-a", "task-b");
        graph.AddDependency("task-b", "task-a");

        // Act
        var cycles = graph.DetectCycles();

        // Assert
        cycles.Should().ContainSingle();
        cycles[0].Should().Contain("task-a");
        cycles[0].Should().Contain("task-b");
    }

    [Fact]
    public void GetExecutionOrder_WithEmptyGraph_ShouldReturnEmptyList()
    {
        // Arrange
        var graph = new ExecutionGraph();

        // Act
        var order = graph.GetExecutionOrder();

        // Assert
        order.Should().BeEmpty();
    }

    [Fact]
    public void GetExecutionOrder_WithSingleNode_ShouldReturnSingleNode()
    {
        // Arrange
        var graph = new ExecutionGraph();
        graph.AddNode("task-1");

        // Act
        var order = graph.GetExecutionOrder();

        // Assert
        order.Should().ContainSingle()
            .Which.Should().Be("task-1");
    }

    [Fact]
    public void GetExecutionOrder_WithLinearDependencies_ShouldReturnCorrectOrder()
    {
        // Arrange - Linear: task-3 -> task-2 -> task-1
        var graph = new ExecutionGraph();
        graph.AddDependency("task-2", "task-1");
        graph.AddDependency("task-3", "task-2");

        // Act
        var order = graph.GetExecutionOrder();

        // Assert
        order.Should().HaveCount(3);
        order.Should().Equal("task-1", "task-2", "task-3");
    }

    [Fact]
    public void GetExecutionOrder_WithParallelBranches_ShouldReturnValidOrder()
    {
        // Arrange - Diamond: task-4 depends on task-2 and task-3, both depend on task-1
        var graph = new ExecutionGraph();
        graph.AddDependency("task-2", "task-1");
        graph.AddDependency("task-3", "task-1");
        graph.AddDependency("task-4", "task-2");
        graph.AddDependency("task-4", "task-3");

        // Act
        var order = graph.GetExecutionOrder();

        // Assert
        order.Should().HaveCount(4);
        var task1Index = order.IndexOf("task-1");
        var task2Index = order.IndexOf("task-2");
        var task3Index = order.IndexOf("task-3");
        var task4Index = order.IndexOf("task-4");

        // task-1 must come first
        task1Index.Should().Be(0);
        // task-2 and task-3 must come after task-1 but before task-4
        task2Index.Should().BeGreaterThan(task1Index).And.BeLessThan(task4Index);
        task3Index.Should().BeGreaterThan(task1Index).And.BeLessThan(task4Index);
        // task-4 must come last
        task4Index.Should().Be(3);
    }

    [Fact]
    public void GetExecutionOrder_WithIndependentNodes_ShouldIncludeAllNodes()
    {
        // Arrange - Independent nodes
        var graph = new ExecutionGraph();
        graph.AddNode("task-1");
        graph.AddNode("task-2");
        graph.AddNode("task-3");

        // Act
        var order = graph.GetExecutionOrder();

        // Assert
        order.Should().HaveCount(3);
        order.Should().Contain("task-1");
        order.Should().Contain("task-2");
        order.Should().Contain("task-3");
    }

    [Fact]
    public void Nodes_ShouldReturnAllAddedNodes()
    {
        // Arrange
        var graph = new ExecutionGraph();
        graph.AddNode("task-1");
        graph.AddNode("task-2");
        graph.AddDependency("task-3", "task-1");

        // Act
        var nodes = graph.Nodes;

        // Assert
        nodes.Should().HaveCount(3);
        nodes.Should().Contain("task-1");
        nodes.Should().Contain("task-2");
        nodes.Should().Contain("task-3");
    }

    [Fact]
    public void GetIndependentTasks_WithEmptyGraph_ShouldReturnEmptyList()
    {
        // Arrange
        var graph = new ExecutionGraph();

        // Act
        var independentTasks = graph.GetIndependentTasks();

        // Assert
        independentTasks.Should().BeEmpty();
    }

    [Fact]
    public void GetIndependentTasks_WithSingleNode_ShouldReturnThatNode()
    {
        // Arrange
        var graph = new ExecutionGraph();
        graph.AddNode("task-1");

        // Act
        var independentTasks = graph.GetIndependentTasks();

        // Assert
        independentTasks.Should().ContainSingle()
            .Which.Should().Be("task-1");
    }

    [Fact]
    public void GetIndependentTasks_WithMultipleIndependentNodes_ShouldReturnAllIndependent()
    {
        // Arrange
        var graph = new ExecutionGraph();
        graph.AddNode("task-1");
        graph.AddNode("task-2");
        graph.AddNode("task-3");

        // Act
        var independentTasks = graph.GetIndependentTasks();

        // Assert
        independentTasks.Should().HaveCount(3);
        independentTasks.Should().Contain("task-1");
        independentTasks.Should().Contain("task-2");
        independentTasks.Should().Contain("task-3");
    }

    [Fact]
    public void GetIndependentTasks_WithDependencies_ShouldReturnOnlyIndependent()
    {
        // Arrange - task-2 depends on task-1, task-3 depends on task-2
        var graph = new ExecutionGraph();
        graph.AddNode("task-1");
        graph.AddNode("task-2");
        graph.AddNode("task-3");
        graph.AddDependency("task-2", "task-1");
        graph.AddDependency("task-3", "task-2");

        // Act
        var independentTasks = graph.GetIndependentTasks();

        // Assert
        independentTasks.Should().ContainSingle()
            .Which.Should().Be("task-1");
    }

    [Fact]
    public void GetIndependentTasks_WithDiamondDependencies_ShouldReturnOnlyRootNode()
    {
        // Arrange - Diamond: task-4 depends on task-2 and task-3, both depend on task-1
        var graph = new ExecutionGraph();
        graph.AddNode("task-1");
        graph.AddNode("task-2");
        graph.AddNode("task-3");
        graph.AddNode("task-4");
        graph.AddDependency("task-2", "task-1");
        graph.AddDependency("task-3", "task-1");
        graph.AddDependency("task-4", "task-2");
        graph.AddDependency("task-4", "task-3");

        // Act
        var independentTasks = graph.GetIndependentTasks();

        // Assert
        independentTasks.Should().ContainSingle()
            .Which.Should().Be("task-1");
    }

    [Fact]
    public void GetIndependentTasks_WithMixedGraph_ShouldReturnAllIndependent()
    {
        // Arrange - task-1 independent, task-2 independent, task-3 depends on task-2
        var graph = new ExecutionGraph();
        graph.AddNode("task-1");
        graph.AddNode("task-2");
        graph.AddNode("task-3");
        graph.AddDependency("task-3", "task-2");

        // Act
        var independentTasks = graph.GetIndependentTasks();

        // Assert
        independentTasks.Should().HaveCount(2);
        independentTasks.Should().Contain("task-1");
        independentTasks.Should().Contain("task-2");
    }

    #region GetParallelGroups Tests

    [Fact]
    public void GetParallelGroups_WithEmptyGraph_ShouldReturnEmptyList()
    {
        // Arrange
        var graph = new ExecutionGraph();

        // Act
        var groups = graph.GetParallelGroups();

        // Assert
        groups.Should().BeEmpty();
    }

    [Fact]
    public void GetParallelGroups_WithSingleNode_ShouldReturnSingleGroupAtLevelZero()
    {
        // Arrange
        var graph = new ExecutionGraph();
        graph.AddNode("task-1");

        // Act
        var groups = graph.GetParallelGroups();

        // Assert
        groups.Should().ContainSingle();
        groups[0].Level.Should().Be(0);
        groups[0].TaskIds.Should().ContainSingle().Which.Should().Be("task-1");
    }

    [Fact]
    public void GetParallelGroups_WithIndependentNodes_ShouldReturnAllInSameGroup()
    {
        // Arrange
        var graph = new ExecutionGraph();
        graph.AddNode("task-1");
        graph.AddNode("task-2");
        graph.AddNode("task-3");

        // Act
        var groups = graph.GetParallelGroups();

        // Assert
        groups.Should().ContainSingle();
        groups[0].Level.Should().Be(0);
        groups[0].TaskIds.Should().HaveCount(3);
        groups[0].TaskIds.Should().Contain("task-1");
        groups[0].TaskIds.Should().Contain("task-2");
        groups[0].TaskIds.Should().Contain("task-3");
    }

    [Fact]
    public void GetParallelGroups_WithLinearDependencies_ShouldReturnSeparateGroups()
    {
        // Arrange - Linear: task-3 -> task-2 -> task-1
        var graph = new ExecutionGraph();
        graph.AddNode("task-1");
        graph.AddDependency("task-2", "task-1");
        graph.AddDependency("task-3", "task-2");

        // Act
        var groups = graph.GetParallelGroups();

        // Assert
        groups.Should().HaveCount(3);
        groups[0].Level.Should().Be(0);
        groups[0].TaskIds.Should().ContainSingle().Which.Should().Be("task-1");
        groups[1].Level.Should().Be(1);
        groups[1].TaskIds.Should().ContainSingle().Which.Should().Be("task-2");
        groups[2].Level.Should().Be(2);
        groups[2].TaskIds.Should().ContainSingle().Which.Should().Be("task-3");
    }

    [Fact]
    public void GetParallelGroups_WithDiamondDependencies_ShouldGroupParallelTasks()
    {
        // Arrange - Diamond: task-4 depends on task-2 and task-3, both depend on task-1
        var graph = new ExecutionGraph();
        graph.AddNode("task-1");
        graph.AddDependency("task-2", "task-1");
        graph.AddDependency("task-3", "task-1");
        graph.AddDependency("task-4", "task-2");
        graph.AddDependency("task-4", "task-3");

        // Act
        var groups = graph.GetParallelGroups();

        // Assert
        groups.Should().HaveCount(3);

        // Level 0: task-1 (no dependencies)
        groups[0].Level.Should().Be(0);
        groups[0].TaskIds.Should().ContainSingle().Which.Should().Be("task-1");

        // Level 1: task-2 and task-3 (both depend only on task-1)
        groups[1].Level.Should().Be(1);
        groups[1].TaskIds.Should().HaveCount(2);
        groups[1].TaskIds.Should().Contain("task-2");
        groups[1].TaskIds.Should().Contain("task-3");

        // Level 2: task-4 (depends on task-2 and task-3)
        groups[2].Level.Should().Be(2);
        groups[2].TaskIds.Should().ContainSingle().Which.Should().Be("task-4");
    }

    [Fact]
    public void GetParallelGroups_WithComplexGraph_ShouldCalculateCorrectLevels()
    {
        // Arrange - Complex graph:
        // task-1 (independent)
        // task-2 depends on task-1
        // task-3 depends on task-1
        // task-4 depends on task-2
        // task-5 depends on task-3 and task-4
        var graph = new ExecutionGraph();
        graph.AddNode("task-1");
        graph.AddDependency("task-2", "task-1");
        graph.AddDependency("task-3", "task-1");
        graph.AddDependency("task-4", "task-2");
        graph.AddDependency("task-5", "task-3");
        graph.AddDependency("task-5", "task-4");

        // Act
        var groups = graph.GetParallelGroups();

        // Assert
        groups.Should().HaveCount(4);

        // Level 0: task-1
        groups[0].TaskIds.Should().ContainSingle().Which.Should().Be("task-1");

        // Level 1: task-2, task-3
        groups[1].TaskIds.Should().HaveCount(2);
        groups[1].TaskIds.Should().Contain("task-2");
        groups[1].TaskIds.Should().Contain("task-3");

        // Level 2: task-4
        groups[2].TaskIds.Should().ContainSingle().Which.Should().Be("task-4");

        // Level 3: task-5 (must wait for both task-3 at level 1 AND task-4 at level 2)
        groups[3].TaskIds.Should().ContainSingle().Which.Should().Be("task-5");
    }

    [Fact]
    public void GetParallelGroups_WithMultipleIndependentRoots_ShouldGroupAllAtLevelZero()
    {
        // Arrange - Two independent chains
        var graph = new ExecutionGraph();
        graph.AddNode("root-1");
        graph.AddNode("root-2");
        graph.AddDependency("child-1", "root-1");
        graph.AddDependency("child-2", "root-2");

        // Act
        var groups = graph.GetParallelGroups();

        // Assert
        groups.Should().HaveCount(2);

        // Level 0: both roots
        groups[0].Level.Should().Be(0);
        groups[0].TaskIds.Should().HaveCount(2);
        groups[0].TaskIds.Should().Contain("root-1");
        groups[0].TaskIds.Should().Contain("root-2");

        // Level 1: both children
        groups[1].Level.Should().Be(1);
        groups[1].TaskIds.Should().HaveCount(2);
        groups[1].TaskIds.Should().Contain("child-1");
        groups[1].TaskIds.Should().Contain("child-2");
    }

    [Fact]
    public void GetParallelGroups_TaskIdsShouldBeSortedWithinGroup()
    {
        // Arrange
        var graph = new ExecutionGraph();
        graph.AddNode("z-task");
        graph.AddNode("a-task");
        graph.AddNode("m-task");

        // Act
        var groups = graph.GetParallelGroups();

        // Assert
        groups.Should().ContainSingle();
        groups[0].TaskIds.Should().BeInAscendingOrder();
        groups[0].TaskIds.Should().Equal("a-task", "m-task", "z-task");
    }

    #endregion

    #region GetDependentTasks Tests

    [Fact]
    public void GetDependentTasks_WithNoDepenents_ShouldReturnEmptyList()
    {
        // Arrange
        var graph = new ExecutionGraph();
        graph.AddNode("task-1");
        graph.AddNode("task-2");

        // Act
        var dependents = graph.GetDependentTasks("task-1");

        // Assert
        dependents.Should().BeEmpty();
    }

    [Fact]
    public void GetDependentTasks_WithSingleDependent_ShouldReturnThatTask()
    {
        // Arrange
        var graph = new ExecutionGraph();
        graph.AddNode("task-1");
        graph.AddDependency("task-2", "task-1");

        // Act
        var dependents = graph.GetDependentTasks("task-1");

        // Assert
        dependents.Should().ContainSingle().Which.Should().Be("task-2");
    }

    [Fact]
    public void GetDependentTasks_WithMultipleDependents_ShouldReturnAllDependents()
    {
        // Arrange - task-2 and task-3 both depend on task-1
        var graph = new ExecutionGraph();
        graph.AddNode("task-1");
        graph.AddDependency("task-2", "task-1");
        graph.AddDependency("task-3", "task-1");

        // Act
        var dependents = graph.GetDependentTasks("task-1");

        // Assert
        dependents.Should().HaveCount(2);
        dependents.Should().Contain("task-2");
        dependents.Should().Contain("task-3");
    }

    [Fact]
    public void GetDependentTasks_ForNonExistentTask_ShouldReturnEmptyList()
    {
        // Arrange
        var graph = new ExecutionGraph();
        graph.AddNode("task-1");

        // Act
        var dependents = graph.GetDependentTasks("non-existent");

        // Assert
        dependents.Should().BeEmpty();
    }

    [Fact]
    public void GetDependentTasks_ShouldOnlyReturnDirectDependents()
    {
        // Arrange - task-3 depends on task-2 which depends on task-1
        var graph = new ExecutionGraph();
        graph.AddNode("task-1");
        graph.AddDependency("task-2", "task-1");
        graph.AddDependency("task-3", "task-2");

        // Act
        var dependents = graph.GetDependentTasks("task-1");

        // Assert - Only task-2 directly depends on task-1, not task-3
        dependents.Should().ContainSingle().Which.Should().Be("task-2");
    }

    #endregion

    #region DetectCycles Edge Cases

    [Fact]
    public void DetectCycles_WithEmptyGraph_ShouldReturnEmptyList()
    {
        // Arrange
        var graph = new ExecutionGraph();

        // Act
        var cycles = graph.DetectCycles();

        // Assert
        cycles.Should().BeEmpty();
    }

    [Fact]
    public void DetectCycles_WithSingleNodeNoCycle_ShouldReturnEmptyList()
    {
        // Arrange
        var graph = new ExecutionGraph();
        graph.AddNode("task-1");

        // Act
        var cycles = graph.DetectCycles();

        // Assert
        cycles.Should().BeEmpty();
    }

    [Fact]
    public void DetectCycles_WithLongChainNoCycle_ShouldReturnEmptyList()
    {
        // Arrange - Long chain: task-5 -> task-4 -> task-3 -> task-2 -> task-1
        var graph = new ExecutionGraph();
        graph.AddNode("task-1");
        graph.AddDependency("task-2", "task-1");
        graph.AddDependency("task-3", "task-2");
        graph.AddDependency("task-4", "task-3");
        graph.AddDependency("task-5", "task-4");

        // Act
        var cycles = graph.DetectCycles();

        // Assert
        cycles.Should().BeEmpty();
    }

    [Fact]
    public void DetectCycles_CycleAtEndOfChain_ShouldDetectCycle()
    {
        // Arrange - Chain with cycle at end: task-1 -> task-2 -> task-3 -> task-2
        var graph = new ExecutionGraph();
        graph.AddNode("task-1");
        graph.AddDependency("task-2", "task-1");
        graph.AddDependency("task-3", "task-2");
        graph.AddDependency("task-3", "task-3"); // Self-loop

        // Act
        var cycles = graph.DetectCycles();

        // Assert
        cycles.Should().ContainSingle();
        cycles[0].Should().Contain("task-3");
    }

    #endregion
}
