using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class ExecutionGraphBuilderTests
{
    private readonly IExecutionGraphBuilder _builder;

    public ExecutionGraphBuilderTests()
    {
        _builder = new ExecutionGraphBuilder();
    }

    [Fact]
    public void Build_WithLinearWorkflow_ShouldReturnValidGraph()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "ref-1" },
                    new WorkflowTaskStep
                    {
                        Id = "task-2",
                        TaskRef = "ref-2",
                        Input = new Dictionary<string, string>
                        {
                            ["data"] = "{{tasks.task-1.output.result}}"
                        }
                    }
                }
            }
        };

        // Act
        var result = _builder.Build(workflow);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Graph.Should().NotBeNull();
        result.Graph!.Nodes.Should().HaveCount(2);
        result.Graph.GetDependencies("task-2").Should().Contain("task-1");
    }

    [Fact]
    public void Build_WithCircularDependency_ShouldReturnError()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "task-a",
                        TaskRef = "ref-a",
                        Input = new Dictionary<string, string>
                        {
                            ["data"] = "{{tasks.task-c.output.result}}"
                        }
                    },
                    new WorkflowTaskStep
                    {
                        Id = "task-b",
                        TaskRef = "ref-b",
                        Input = new Dictionary<string, string>
                        {
                            ["data"] = "{{tasks.task-a.output.result}}"
                        }
                    },
                    new WorkflowTaskStep
                    {
                        Id = "task-c",
                        TaskRef = "ref-c",
                        Input = new Dictionary<string, string>
                        {
                            ["data"] = "{{tasks.task-b.output.result}}"
                        }
                    }
                }
            }
        };

        // Act
        var result = _builder.Build(workflow);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Message.Should().Contain("Circular dependency");
    }

    [Fact]
    public void Build_WithParallelTasks_ShouldAllowConcurrentExecution()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "task-1",
                        TaskRef = "ref-1",
                        Input = new Dictionary<string, string>
                        {
                            ["data"] = "{{input.userId}}"
                        }
                    },
                    new WorkflowTaskStep
                    {
                        Id = "task-2",
                        TaskRef = "ref-2",
                        Input = new Dictionary<string, string>
                        {
                            ["data"] = "{{input.orderId}}"
                        }
                    }
                }
            }
        };

        // Act
        var result = _builder.Build(workflow);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Graph!.GetDependencies("task-1").Should().BeEmpty();
        result.Graph.GetDependencies("task-2").Should().BeEmpty();
    }

    [Fact]
    public void GetExecutionOrder_ShouldReturnTopologicalSort()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "task-3",
                        TaskRef = "ref-3",
                        Input = new Dictionary<string, string>
                        {
                            ["a"] = "{{tasks.task-1.output.x}}",
                            ["b"] = "{{tasks.task-2.output.y}}"
                        }
                    },
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "ref-1" },
                    new WorkflowTaskStep { Id = "task-2", TaskRef = "ref-2" }
                }
            }
        };

        // Act
        var result = _builder.Build(workflow);
        var executionOrder = result.Graph!.GetExecutionOrder();

        // Assert
        var task3Index = executionOrder.IndexOf("task-3");
        var task1Index = executionOrder.IndexOf("task-1");
        var task2Index = executionOrder.IndexOf("task-2");

        task1Index.Should().BeLessThan(task3Index);
        task2Index.Should().BeLessThan(task3Index);
    }
}
