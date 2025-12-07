using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class WorkflowAnalyzerTests
{
    private readonly IWorkflowAnalyzer _analyzer;

    public WorkflowAnalyzerTests()
    {
        _analyzer = new WorkflowAnalyzer();
    }

    #region Dead Task Detection

    [Fact]
    public void DetectDeadTasks_NoDeadTasks_ReturnsEmpty()
    {
        // Arrange - All task outputs are used
        var workflow = CreateWorkflow("test-workflow", new List<WorkflowTaskStep>
        {
            new() { Id = "task-a", TaskRef = "fetch-data", Input = new() },
            new() { Id = "task-b", TaskRef = "process-data", Input = new() { ["data"] = "{{ tasks.task-a.output.result }}" }, DependsOn = ["task-a"] }
        },
        new Dictionary<string, string> { ["result"] = "{{ tasks.task-b.output.result }}" });

        // Act
        var result = _analyzer.Analyze(workflow);

        // Assert
        result.Candidates.Where(c => c.Type == "dead-task").Should().BeEmpty();
    }

    [Fact]
    public void DetectDeadTasks_UnusedTaskOutput_ReturnsCandidate()
    {
        // Arrange - task-a output is never referenced
        var workflow = CreateWorkflow("test-workflow", new List<WorkflowTaskStep>
        {
            new() { Id = "task-a", TaskRef = "fetch-data", Input = new() },
            new() { Id = "task-b", TaskRef = "other-task", Input = new() { ["id"] = "{{ input.id }}" } }
        },
        new Dictionary<string, string> { ["result"] = "{{ tasks.task-b.output.result }}" });

        // Act
        var result = _analyzer.Analyze(workflow);

        // Assert
        var deadTaskCandidates = result.Candidates.Where(c => c.Type == "dead-task").ToList();
        deadTaskCandidates.Should().HaveCount(1);
        deadTaskCandidates[0].TaskId.Should().Be("task-a");
        deadTaskCandidates[0].Description.Should().Contain("never consumed");
    }

    [Fact]
    public void DetectDeadTasks_TaskOutputUsedInDependentTask_NotDead()
    {
        // Arrange - task-a output is used by task-b
        var workflow = CreateWorkflow("test-workflow", new List<WorkflowTaskStep>
        {
            new() { Id = "task-a", TaskRef = "fetch-user", Input = new() },
            new() { Id = "task-b", TaskRef = "send-email", Input = new() { ["email"] = "{{ tasks.task-a.output.email }}" }, DependsOn = ["task-a"] }
        },
        new Dictionary<string, string> { ["status"] = "{{ tasks.task-b.output.status }}" });

        // Act
        var result = _analyzer.Analyze(workflow);

        // Assert
        result.Candidates.Where(c => c.Type == "dead-task").Should().BeEmpty();
    }

    #endregion

    #region Parallel Promotion Detection

    [Fact]
    public void DetectParallelPromotion_SequentialNoDependency_ReturnsCandidate()
    {
        // Arrange - task-a and task-b have no dependency on each other but are sequential
        var workflow = CreateWorkflow("test-workflow", new List<WorkflowTaskStep>
        {
            new() { Id = "task-a", TaskRef = "fetch-user", Input = new() { ["id"] = "{{ input.userId }}" } },
            new() { Id = "task-b", TaskRef = "fetch-orders", Input = new() { ["id"] = "{{ input.userId }}" }, DependsOn = ["task-a"] }
        },
        new Dictionary<string, string>
        {
            ["user"] = "{{ tasks.task-a.output.user }}",
            ["orders"] = "{{ tasks.task-b.output.orders }}"
        });

        // Act
        var result = _analyzer.Analyze(workflow);

        // Assert
        var parallelCandidates = result.Candidates.Where(c => c.Type == "parallel-promotion").ToList();
        parallelCandidates.Should().HaveCount(1);
        parallelCandidates[0].TaskId.Should().Be("task-b");
        parallelCandidates[0].Description.Should().Contain("task-a");
    }

    [Fact]
    public void DetectParallelPromotion_TrueDataDependency_NoCandidates()
    {
        // Arrange - task-b genuinely depends on task-a output
        var workflow = CreateWorkflow("test-workflow", new List<WorkflowTaskStep>
        {
            new() { Id = "task-a", TaskRef = "fetch-user", Input = new() },
            new() { Id = "task-b", TaskRef = "fetch-orders", Input = new() { ["userId"] = "{{ tasks.task-a.output.id }}" }, DependsOn = ["task-a"] }
        },
        new Dictionary<string, string> { ["orders"] = "{{ tasks.task-b.output.orders }}" });

        // Act
        var result = _analyzer.Analyze(workflow);

        // Assert
        result.Candidates.Where(c => c.Type == "parallel-promotion").Should().BeEmpty();
    }

    [Fact]
    public void DetectParallelPromotion_MultipleIndependentTasks_ReturnsMultipleCandidates()
    {
        // Arrange - task-b, task-c have unnecessary dependency on task-a
        var workflow = CreateWorkflow("test-workflow", new List<WorkflowTaskStep>
        {
            new() { Id = "task-a", TaskRef = "fetch-config", Input = new() },
            new() { Id = "task-b", TaskRef = "fetch-user", Input = new() { ["id"] = "{{ input.userId }}" }, DependsOn = ["task-a"] },
            new() { Id = "task-c", TaskRef = "fetch-products", Input = new() { ["id"] = "{{ input.productId }}" }, DependsOn = ["task-a"] }
        },
        new Dictionary<string, string>
        {
            ["config"] = "{{ tasks.task-a.output.config }}",
            ["user"] = "{{ tasks.task-b.output.user }}",
            ["products"] = "{{ tasks.task-c.output.products }}"
        });

        // Act
        var result = _analyzer.Analyze(workflow);

        // Assert
        var parallelCandidates = result.Candidates.Where(c => c.Type == "parallel-promotion").ToList();
        parallelCandidates.Should().HaveCount(2);
    }

    #endregion

    #region Output Usage Graph

    [Fact]
    public void BuildOutputUsageGraph_SingleConsumer_TracksCorrectly()
    {
        // Arrange
        var workflow = CreateWorkflow("test-workflow", new List<WorkflowTaskStep>
        {
            new() { Id = "task-a", TaskRef = "fetch-data", Input = new() },
            new() { Id = "task-b", TaskRef = "process", Input = new() { ["data"] = "{{ tasks.task-a.output.result }}" }, DependsOn = ["task-a"] }
        },
        new Dictionary<string, string> { ["result"] = "{{ tasks.task-b.output.result }}" });

        // Act
        var result = _analyzer.Analyze(workflow);

        // Assert
        result.OutputUsage.Should().ContainKey("task-a");
        result.OutputUsage["task-a"].Should().Contain("task-b");
    }

    [Fact]
    public void BuildOutputUsageGraph_MultipleConsumers_TracksAll()
    {
        // Arrange
        var workflow = CreateWorkflow("test-workflow", new List<WorkflowTaskStep>
        {
            new() { Id = "task-a", TaskRef = "fetch-data", Input = new() },
            new() { Id = "task-b", TaskRef = "process-1", Input = new() { ["data"] = "{{ tasks.task-a.output.result }}" }, DependsOn = ["task-a"] },
            new() { Id = "task-c", TaskRef = "process-2", Input = new() { ["data"] = "{{ tasks.task-a.output.result }}" }, DependsOn = ["task-a"] }
        },
        new Dictionary<string, string>
        {
            ["result1"] = "{{ tasks.task-b.output.result }}",
            ["result2"] = "{{ tasks.task-c.output.result }}"
        });

        // Act
        var result = _analyzer.Analyze(workflow);

        // Assert
        result.OutputUsage.Should().ContainKey("task-a");
        result.OutputUsage["task-a"].Should().Contain("task-b");
        result.OutputUsage["task-a"].Should().Contain("task-c");
    }

    [Fact]
    public void BuildOutputUsageGraph_OutputMapping_TracksAsConsumer()
    {
        // Arrange - task-a output is used in workflow output mapping
        var workflow = CreateWorkflow("test-workflow", new List<WorkflowTaskStep>
        {
            new() { Id = "task-a", TaskRef = "fetch-data", Input = new() }
        },
        new Dictionary<string, string> { ["result"] = "{{ tasks.task-a.output.result }}" });

        // Act
        var result = _analyzer.Analyze(workflow);

        // Assert
        result.OutputUsage.Should().ContainKey("task-a");
        result.OutputUsage["task-a"].Should().Contain("_workflow_output");
    }

    #endregion

    #region Analysis Result

    [Fact]
    public void Analyze_ReturnsWorkflowName()
    {
        // Arrange
        var workflow = CreateWorkflow("my-workflow", new List<WorkflowTaskStep>
        {
            new() { Id = "task-a", TaskRef = "fetch-data", Input = new() }
        },
        new Dictionary<string, string> { ["result"] = "{{ tasks.task-a.output.result }}" });

        // Act
        var result = _analyzer.Analyze(workflow);

        // Assert
        result.WorkflowName.Should().Be("my-workflow");
    }

    [Fact]
    public void Analyze_EstimatesImpact_ForDeadTask()
    {
        // Arrange
        var workflow = CreateWorkflow("test-workflow", new List<WorkflowTaskStep>
        {
            new() { Id = "task-a", TaskRef = "unused-task", Input = new() },
            new() { Id = "task-b", TaskRef = "used-task", Input = new() }
        },
        new Dictionary<string, string> { ["result"] = "{{ tasks.task-b.output.result }}" });

        // Act
        var result = _analyzer.Analyze(workflow);

        // Assert
        var deadTask = result.Candidates.First(c => c.Type == "dead-task");
        deadTask.EstimatedImpact.Should().BeGreaterThan(0);
        deadTask.EstimatedImpact.Should().BeLessThanOrEqualTo(1.0);
    }

    #endregion

    #region Edge Cases

    [Fact]
    public void Analyze_EmptyWorkflow_ReturnsEmptyCandidates()
    {
        // Arrange
        var workflow = CreateWorkflow("empty-workflow", new List<WorkflowTaskStep>(), null);

        // Act
        var result = _analyzer.Analyze(workflow);

        // Assert
        result.Candidates.Should().BeEmpty();
        result.OutputUsage.Should().BeEmpty();
    }

    [Fact]
    public void Analyze_SingleTask_NoOptimizations()
    {
        // Arrange
        var workflow = CreateWorkflow("single-task", new List<WorkflowTaskStep>
        {
            new() { Id = "task-a", TaskRef = "fetch-data", Input = new() }
        },
        new Dictionary<string, string> { ["result"] = "{{ tasks.task-a.output.result }}" });

        // Act
        var result = _analyzer.Analyze(workflow);

        // Assert
        result.Candidates.Should().BeEmpty();
    }

    #endregion

    #region Helper Methods

    private static WorkflowResource CreateWorkflow(
        string name,
        List<WorkflowTaskStep> tasks,
        Dictionary<string, string>? output)
    {
        return new WorkflowResource
        {
            ApiVersion = "workflow.io/v1",
            Kind = "Workflow",
            Metadata = new ResourceMetadata { Name = name },
            Spec = new WorkflowSpec
            {
                Tasks = tasks,
                Output = output
            }
        };
    }

    #endregion
}
