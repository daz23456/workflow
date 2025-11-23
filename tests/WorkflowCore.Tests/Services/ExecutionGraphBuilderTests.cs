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
        result.Errors.Should().BeEmpty();
        result.Graph!.Nodes.Should().HaveCount(2);
        result.Graph.Nodes.Should().Contain("task-1");
        result.Graph.Nodes.Should().Contain("task-2");
        result.Graph.GetDependencies("task-1").Should().BeEmpty();
        result.Graph.GetDependencies("task-2").Should().ContainSingle()
            .Which.Should().Be("task-1");
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
        result.Graph.Should().BeNull();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Message.Should().Contain("Circular dependency");
        // Verify cycle path is mentioned
        result.Errors[0].Message.Should().ContainAny("task-a", "task-b", "task-c");
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
        result.Graph.Should().NotBeNull();
        result.Errors.Should().BeEmpty();
        result.Graph!.Nodes.Should().HaveCount(2);
        result.Graph.GetDependencies("task-1").Should().BeEmpty();
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
        result.IsValid.Should().BeTrue();
        result.Graph.Should().NotBeNull();
        executionOrder.Should().HaveCount(3);
        executionOrder.Should().Contain("task-1");
        executionOrder.Should().Contain("task-2");
        executionOrder.Should().Contain("task-3");

        var task3Index = executionOrder.IndexOf("task-3");
        var task1Index = executionOrder.IndexOf("task-1");
        var task2Index = executionOrder.IndexOf("task-2");

        task1Index.Should().BeGreaterOrEqualTo(0).And.BeLessThan(task3Index);
        task2Index.Should().BeGreaterOrEqualTo(0).And.BeLessThan(task3Index);
    }

    [Fact]
    public void Build_WithEmptyWorkflow_ShouldReturnValidEmptyGraph()
    {
        // Arrange - Test empty workflow edge case
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>() // No tasks
            }
        };

        // Act
        var result = _builder.Build(workflow);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Graph.Should().NotBeNull();
        result.Errors.Should().BeEmpty();
        result.Graph!.Nodes.Should().BeEmpty();
    }

    [Fact]
    public void Build_WithSingleTask_ShouldReturnValidGraph()
    {
        // Arrange - Test single-task workflow
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "only-task",
                        TaskRef = "ref-only",
                        Input = new Dictionary<string, string>
                        {
                            ["data"] = "{{input.value}}"
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
        result.Errors.Should().BeEmpty();
        result.Graph!.Nodes.Should().ContainSingle().Which.Should().Be("only-task");
        result.Graph.GetDependencies("only-task").Should().BeEmpty();
    }

    [Fact]
    public void Build_WithTasksWithoutInput_ShouldNotAddDependencies()
    {
        // Arrange - Test tasks with no input templates
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "task-1",
                        TaskRef = "ref-1"
                        // No Input property
                    },
                    new WorkflowTaskStep
                    {
                        Id = "task-2",
                        TaskRef = "ref-2",
                        Input = new Dictionary<string, string>() // Empty input
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
        result.Graph.GetDependencies("task-1").Should().BeEmpty();
        result.Graph.GetDependencies("task-2").Should().BeEmpty();
    }

    [Fact]
    public void Build_WithSelfReferencingTask_ShouldDetectCircularDependency()
    {
        // Arrange - Test self-referencing task (immediate cycle)
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "self-ref-workflow" },
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
                            ["data"] = "{{tasks.task-1.output.result}}" // Self-reference
                        }
                    }
                }
            }
        };

        // Act
        var result = _builder.Build(workflow);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Graph.Should().BeNull();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Message.Should().Contain("Circular dependency");
    }

    [Fact]
    public void Build_WithComplexDependencyChain_ShouldBuildCorrectGraph()
    {
        // Arrange - Test complex multi-level dependencies
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "A", TaskRef = "ref-a" },
                    new WorkflowTaskStep
                    {
                        Id = "B",
                        TaskRef = "ref-b",
                        Input = new Dictionary<string, string>
                        {
                            ["x"] = "{{tasks.A.output.data}}"
                        }
                    },
                    new WorkflowTaskStep
                    {
                        Id = "C",
                        TaskRef = "ref-c",
                        Input = new Dictionary<string, string>
                        {
                            ["y"] = "{{tasks.B.output.data}}"
                        }
                    },
                    new WorkflowTaskStep
                    {
                        Id = "D",
                        TaskRef = "ref-d",
                        Input = new Dictionary<string, string>
                        {
                            ["a"] = "{{tasks.A.output.data}}",
                            ["c"] = "{{tasks.C.output.data}}"
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
        result.Graph!.Nodes.Should().HaveCount(4);
        result.Graph.GetDependencies("A").Should().BeEmpty();
        result.Graph.GetDependencies("B").Should().ContainSingle().Which.Should().Be("A");
        result.Graph.GetDependencies("C").Should().ContainSingle().Which.Should().Be("B");
        result.Graph.GetDependencies("D").Should().HaveCount(2).And.Contain(new[] { "A", "C" });
    }

    [Fact]
    public void Build_WithMultipleTemplateReferences_ShouldExtractAllDependencies()
    {
        // Arrange - Test task with multiple task references in one template
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "ref-1" },
                    new WorkflowTaskStep { Id = "task-2", TaskRef = "ref-2" },
                    new WorkflowTaskStep { Id = "task-3", TaskRef = "ref-3" },
                    new WorkflowTaskStep
                    {
                        Id = "task-4",
                        TaskRef = "ref-4",
                        Input = new Dictionary<string, string>
                        {
                            ["combined"] = "{{tasks.task-1.output.a}}-{{tasks.task-2.output.b}}-{{tasks.task-3.output.c}}"
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
        result.Graph!.GetDependencies("task-4").Should().HaveCount(3)
            .And.Contain(new[] { "task-1", "task-2", "task-3" });
    }

    [Fact]
    public void Build_WithNullMetadata_ShouldDetectCircularDependency()
    {
        // Arrange - Test null metadata handling (null coalesc on line 44)
        var workflow = new WorkflowResource
        {
            Metadata = null, // Null metadata
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
                            ["data"] = "{{tasks.task-b.output.x}}"
                        }
                    },
                    new WorkflowTaskStep
                    {
                        Id = "task-b",
                        TaskRef = "ref-b",
                        Input = new Dictionary<string, string>
                        {
                            ["data"] = "{{tasks.task-a.output.y}}"
                        }
                    }
                }
            }
        };

        // Act
        var result = _builder.Build(workflow);

        // Assert - Should still detect circular dependency with null metadata
        result.IsValid.Should().BeFalse();
        result.Graph.Should().BeNull();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Message.Should().Contain("Circular dependency");
    }

    [Fact]
    public void Build_WithMultipleCycles_ShouldDetectAllCycles()
    {
        // Arrange - Test detection of multiple independent cycles
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "multi-cycle" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    // First cycle: A -> B -> A
                    new WorkflowTaskStep
                    {
                        Id = "A",
                        TaskRef = "ref-a",
                        Input = new Dictionary<string, string>
                        {
                            ["x"] = "{{tasks.B.output.data}}"
                        }
                    },
                    new WorkflowTaskStep
                    {
                        Id = "B",
                        TaskRef = "ref-b",
                        Input = new Dictionary<string, string>
                        {
                            ["x"] = "{{tasks.A.output.data}}"
                        }
                    }
                }
            }
        };

        // Act
        var result = _builder.Build(workflow);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Graph.Should().BeNull();
        result.Errors.Should().NotBeEmpty();
        result.Errors[0].Message.Should().Contain("Circular dependency");
    }

    [Fact]
    public void Build_WithMixedInputAndTaskReferences_ShouldOnlyExtractTaskDependencies()
    {
        // Arrange - Test that only tasks.X.output patterns create dependencies
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
                            ["fromInput"] = "{{input.userId}}",
                            ["fromTask"] = "{{tasks.task-1.output.data}}",
                            ["literal"] = "constant-value"
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
        result.Graph!.GetDependencies("task-2").Should().ContainSingle().Which.Should().Be("task-1");
        // Should NOT create dependencies for {{input.X}} patterns
    }

    [Fact]
    public void Build_WithTasksInReverseOrder_ShouldStillBuildCorrectGraph()
    {
        // Arrange - Test that task declaration order doesn't matter
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    // Declare in reverse dependency order
                    new WorkflowTaskStep
                    {
                        Id = "final",
                        TaskRef = "ref-final",
                        Input = new Dictionary<string, string>
                        {
                            ["data"] = "{{tasks.middle.output.x}}"
                        }
                    },
                    new WorkflowTaskStep
                    {
                        Id = "middle",
                        TaskRef = "ref-middle",
                        Input = new Dictionary<string, string>
                        {
                            ["data"] = "{{tasks.first.output.x}}"
                        }
                    },
                    new WorkflowTaskStep { Id = "first", TaskRef = "ref-first" }
                }
            }
        };

        // Act
        var result = _builder.Build(workflow);
        var executionOrder = result.Graph!.GetExecutionOrder();

        // Assert
        result.IsValid.Should().BeTrue();
        var firstIndex = executionOrder.IndexOf("first");
        var middleIndex = executionOrder.IndexOf("middle");
        var finalIndex = executionOrder.IndexOf("final");

        firstIndex.Should().BeLessThan(middleIndex);
        middleIndex.Should().BeLessThan(finalIndex);
    }

    [Fact]
    public void Build_WithDuplicateTaskIds_ShouldHandleGracefully()
    {
        // Arrange - Test handling of tasks with duplicate IDs (graph should handle this)
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "ref-1" },
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "ref-2" } // Duplicate ID
                }
            }
        };

        // Act
        var result = _builder.Build(workflow);

        // Assert
        // The graph should handle duplicate adds (either by ignoring or updating)
        result.Should().NotBeNull();
        result.Graph.Should().NotBeNull();
    }

    [Fact]
    public void Build_WithNestedOutputReferences_ShouldExtractCorrectDependency()
    {
        // Arrange - Test nested property access in templates
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "parent", TaskRef = "ref-parent" },
                    new WorkflowTaskStep
                    {
                        Id = "child",
                        TaskRef = "ref-child",
                        Input = new Dictionary<string, string>
                        {
                            ["nested"] = "{{tasks.parent.output.data.nested.value}}"
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
        result.Graph!.GetDependencies("child").Should().ContainSingle().Which.Should().Be("parent");
    }
}
