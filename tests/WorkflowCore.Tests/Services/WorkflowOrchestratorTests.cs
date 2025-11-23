using FluentAssertions;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class WorkflowOrchestratorTests
{
    private readonly Mock<IExecutionGraphBuilder> _graphBuilderMock;
    private readonly Mock<IHttpTaskExecutor> _taskExecutorMock;
    private readonly IWorkflowOrchestrator _orchestrator;

    public WorkflowOrchestratorTests()
    {
        _graphBuilderMock = new Mock<IExecutionGraphBuilder>();
        _taskExecutorMock = new Mock<IHttpTaskExecutor>();
        _orchestrator = new WorkflowOrchestrator(_graphBuilderMock.Object, _taskExecutorMock.Object);
    }

    [Fact]
    public async Task ExecuteAsync_WithLinearWorkflow_ShouldExecuteTasksInOrder()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "fetch-user" },
                    new WorkflowTaskStep
                    {
                        Id = "task-2",
                        TaskRef = "fetch-orders",
                        Input = new Dictionary<string, string>
                        {
                            ["userId"] = "{{tasks.task-1.output.id}}"
                        }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["fetch-user"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } },
            ["fetch-orders"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        var inputs = new Dictionary<string, object> { ["userId"] = "user-123" };

        // Setup execution graph
        var graph = new ExecutionGraph();
        graph.AddNode("task-1");
        graph.AddDependency("task-2", "task-1");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = graph
            });

        // Setup task executor
        _taskExecutorMock.Setup(x => x.ExecuteAsync(
            It.Is<WorkflowTaskSpec>(s => s.Type == "http"),
            It.Is<TemplateContext>(c => c.TaskOutputs.Count == 0),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TaskExecutionResult
            {
                Success = true,
                Output = new Dictionary<string, object> { ["id"] = "user-456" }
            });

        _taskExecutorMock.Setup(x => x.ExecuteAsync(
            It.Is<WorkflowTaskSpec>(s => s.Type == "http"),
            It.Is<TemplateContext>(c => c.TaskOutputs.ContainsKey("task-1")),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TaskExecutionResult
            {
                Success = true,
                Output = new Dictionary<string, object> { ["orders"] = new[] { "order-1", "order-2" } }
            });

        // Act
        var result = await _orchestrator.ExecuteAsync(workflow, tasks, inputs, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.TaskResults.Should().HaveCount(2);
        result.TaskResults["task-1"].Success.Should().BeTrue();
        result.TaskResults["task-2"].Success.Should().BeTrue();
        result.Output.Should().NotBeNull();
    }

    [Fact]
    public async Task ExecuteAsync_WithParallelTasks_ShouldExecuteConcurrently()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "fetch-user" },
                    new WorkflowTaskStep { Id = "task-2", TaskRef = "fetch-orders" }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["fetch-user"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } },
            ["fetch-orders"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        var inputs = new Dictionary<string, object>();

        // Setup execution graph with independent tasks
        var graph = new ExecutionGraph();
        graph.AddNode("task-1");
        graph.AddNode("task-2");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = graph
            });

        var executionTimes = new List<DateTime>();

        _taskExecutorMock.Setup(x => x.ExecuteAsync(
            It.IsAny<WorkflowTaskSpec>(),
            It.IsAny<TemplateContext>(),
            It.IsAny<CancellationToken>()))
            .Returns(async () =>
            {
                executionTimes.Add(DateTime.UtcNow);
                await Task.Delay(10); // Simulate work
                return new TaskExecutionResult
                {
                    Success = true,
                    Output = new Dictionary<string, object> { ["data"] = "test" }
                };
            });

        // Act
        var result = await _orchestrator.ExecuteAsync(workflow, tasks, inputs, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.TaskResults.Should().HaveCount(2);

        // Both tasks should start within a short time window (indicating parallel execution)
        if (executionTimes.Count == 2)
        {
            var timeDiff = Math.Abs((executionTimes[1] - executionTimes[0]).TotalMilliseconds);
            timeDiff.Should().BeLessThan(50); // Started within 50ms of each other
        }
    }

    [Fact]
    public async Task ExecuteAsync_WithDiamondPattern_ShouldExecuteCorrectly()
    {
        // Arrange - Diamond: task-1 → (task-2, task-3) → task-4
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
                        Input = new Dictionary<string, string> { ["data"] = "{{tasks.task-1.output.x}}" }
                    },
                    new WorkflowTaskStep
                    {
                        Id = "task-3",
                        TaskRef = "ref-3",
                        Input = new Dictionary<string, string> { ["data"] = "{{tasks.task-1.output.y}}" }
                    },
                    new WorkflowTaskStep
                    {
                        Id = "task-4",
                        TaskRef = "ref-4",
                        Input = new Dictionary<string, string>
                        {
                            ["a"] = "{{tasks.task-2.output.result}}",
                            ["b"] = "{{tasks.task-3.output.result}}"
                        }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["ref-1"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } },
            ["ref-2"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } },
            ["ref-3"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } },
            ["ref-4"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        var inputs = new Dictionary<string, object>();

        // Setup execution graph
        var graph = new ExecutionGraph();
        graph.AddDependency("task-2", "task-1");
        graph.AddDependency("task-3", "task-1");
        graph.AddDependency("task-4", "task-2");
        graph.AddDependency("task-4", "task-3");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = graph
            });

        _taskExecutorMock.Setup(x => x.ExecuteAsync(
            It.IsAny<WorkflowTaskSpec>(),
            It.IsAny<TemplateContext>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TaskExecutionResult
            {
                Success = true,
                Output = new Dictionary<string, object> { ["result"] = "success" }
            });

        // Act
        var result = await _orchestrator.ExecuteAsync(workflow, tasks, inputs, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.TaskResults.Should().HaveCount(4);
        result.TaskResults.Values.Should().OnlyContain(r => r.Success);
    }

    [Fact]
    public async Task ExecuteAsync_WithTaskFailure_ShouldPropagateErrorAndSkipDependentTasks()
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
                        Input = new Dictionary<string, string> { ["data"] = "{{tasks.task-1.output.id}}" }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["ref-1"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } },
            ["ref-2"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        var inputs = new Dictionary<string, object>();

        // Setup execution graph
        var graph = new ExecutionGraph();
        graph.AddDependency("task-2", "task-1");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = graph
            });

        // task-1 fails
        _taskExecutorMock.Setup(x => x.ExecuteAsync(
            It.IsAny<WorkflowTaskSpec>(),
            It.Is<TemplateContext>(c => c.TaskOutputs.Count == 0),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TaskExecutionResult
            {
                Success = false,
                Errors = new List<string> { "Network error" }
            });

        // Act
        var result = await _orchestrator.ExecuteAsync(workflow, tasks, inputs, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.TaskResults.Should().ContainKey("task-1");
        result.TaskResults["task-1"].Success.Should().BeFalse();

        // task-2 should be skipped (not executed)
        result.TaskResults.Should().ContainKey("task-2");
        result.TaskResults["task-2"].Success.Should().BeFalse();
        result.TaskResults["task-2"].Errors.Should().Contain(e => e.Contains("skipped"));

        result.Errors.Should().NotBeEmpty();
    }

    [Fact]
    public async Task ExecuteAsync_WithInvalidGraph_ShouldReturnError()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "ref-1" }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>();
        var inputs = new Dictionary<string, object>();

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult
            {
                IsValid = false,
                Errors = new List<ValidationError>
                {
                    new ValidationError { Message = "Circular dependency detected" }
                }
            });

        // Act
        var result = await _orchestrator.ExecuteAsync(workflow, tasks, inputs, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("Circular dependency"));
        result.TaskResults.Should().BeEmpty();
    }

    [Fact]
    public async Task ExecuteAsync_WithEmptyWorkflow_ShouldReturnSuccess()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>()
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>();
        var inputs = new Dictionary<string, object>();

        var graph = new ExecutionGraph();

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = graph
            });

        // Act
        var result = await _orchestrator.ExecuteAsync(workflow, tasks, inputs, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.TaskResults.Should().BeEmpty();
        result.Output.Should().NotBeNull();
    }

    [Fact]
    public async Task ExecuteAsync_WithCancellation_ShouldStopExecution()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "ref-1" }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["ref-1"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        var inputs = new Dictionary<string, object>();

        var graph = new ExecutionGraph();
        graph.AddNode("task-1");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = graph
            });

        var cts = new CancellationTokenSource();
        cts.Cancel();

        _taskExecutorMock.Setup(x => x.ExecuteAsync(
            It.IsAny<WorkflowTaskSpec>(),
            It.IsAny<TemplateContext>(),
            It.IsAny<CancellationToken>()))
            .ThrowsAsync(new OperationCanceledException());

        // Act
        var result = await _orchestrator.ExecuteAsync(workflow, tasks, inputs, cts.Token);

        // Assert
        result.Success.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("cancelled") || e.Contains("canceled"));
    }

    [Fact]
    public async Task ExecuteAsync_WithUnexpectedException_ShouldReturnError()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "ref-1" }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["ref-1"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        var inputs = new Dictionary<string, object>();

        var graph = new ExecutionGraph();
        graph.AddNode("task-1");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = graph
            });

        _taskExecutorMock.Setup(x => x.ExecuteAsync(
            It.IsAny<WorkflowTaskSpec>(),
            It.IsAny<TemplateContext>(),
            It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Unexpected system error"));

        // Act
        var result = await _orchestrator.ExecuteAsync(workflow, tasks, inputs, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("Workflow execution failed"));
    }

    [Fact]
    public async Task ExecuteAsync_WithMissingTaskReference_ShouldSkipAndContinue()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "missing-ref" }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>(); // Empty - missing the reference

        var inputs = new Dictionary<string, object>();

        var graph = new ExecutionGraph();
        graph.AddNode("task-1");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = graph
            });

        // Act
        var result = await _orchestrator.ExecuteAsync(workflow, tasks, inputs, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.TaskResults.Should().ContainKey("task-1");
        result.TaskResults["task-1"].Success.Should().BeFalse();
        result.TaskResults["task-1"].Errors.Should().Contain(e => e.Contains("not found"));
    }

    [Fact]
    public async Task ExecuteAsync_WithNullGraph_ShouldReturnError()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "ref-1" }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>();
        var inputs = new Dictionary<string, object>();

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = null // Null graph
            });

        // Act
        var result = await _orchestrator.ExecuteAsync(workflow, tasks, inputs, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Should().Be("Execution graph is null");
        result.TotalDuration.Should().BeGreaterThan(TimeSpan.Zero);
    }

    [Fact]
    public async Task ExecuteAsync_WithSuccessfulTaskExecution_ShouldUpdateContextBetweenTasks()
    {
        // Arrange - Test that context is properly maintained and updated
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "ref-1" },
                    new WorkflowTaskStep { Id = "task-2", TaskRef = "ref-2" }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["ref-1"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } },
            ["ref-2"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        var inputs = new Dictionary<string, object> { ["userId"] = "123" };

        var graph = new ExecutionGraph();
        graph.AddNode("task-1");
        graph.AddNode("task-2");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = graph
            });

        _taskExecutorMock.Setup(x => x.ExecuteAsync(
            It.IsAny<WorkflowTaskSpec>(),
            It.IsAny<TemplateContext>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync((WorkflowTaskSpec spec, TemplateContext context, CancellationToken ct) =>
            {
                // Verify context has input
                context.Input.Should().ContainKey("userId");

                return new TaskExecutionResult
                {
                    Success = true,
                    Output = new Dictionary<string, object> { ["data"] = "test" }
                };
            });

        // Act
        var result = await _orchestrator.ExecuteAsync(workflow, tasks, inputs, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.TaskResults.Should().HaveCount(2);
        // Verify executor was called twice
        _taskExecutorMock.Verify(x => x.ExecuteAsync(
            It.IsAny<WorkflowTaskSpec>(),
            It.IsAny<TemplateContext>(),
            It.IsAny<CancellationToken>()), Times.Exactly(2));
    }

    [Fact]
    public async Task ExecuteAsync_WithMultipleFailures_ShouldCollectAllErrors()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "missing-ref-1" },
                    new WorkflowTaskStep { Id = "task-2", TaskRef = "missing-ref-2" }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>(); // All refs missing
        var inputs = new Dictionary<string, object>();

        var graph = new ExecutionGraph();
        graph.AddNode("task-1");
        graph.AddNode("task-2");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = graph
            });

        // Act
        var result = await _orchestrator.ExecuteAsync(workflow, tasks, inputs, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Errors.Should().HaveCount(2);
        result.Errors.Should().Contain(e => e.Contains("task-1") && e.Contains("missing-ref-1"));
        result.Errors.Should().Contain(e => e.Contains("task-2") && e.Contains("missing-ref-2"));
    }

    [Fact]
    public async Task ExecuteAsync_ShouldAlwaysPopulateTotalDuration()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "ref-1" }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["ref-1"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        var inputs = new Dictionary<string, object>();

        var graph = new ExecutionGraph();
        graph.AddNode("task-1");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = graph
            });

        _taskExecutorMock.Setup(x => x.ExecuteAsync(
            It.IsAny<WorkflowTaskSpec>(),
            It.IsAny<TemplateContext>(),
            It.IsAny<CancellationToken>()))
            .Returns(async () =>
            {
                await Task.Delay(50); // Simulate work
                return new TaskExecutionResult
                {
                    Success = true,
                    Output = new Dictionary<string, object>()
                };
            });

        // Act
        var result = await _orchestrator.ExecuteAsync(workflow, tasks, inputs, CancellationToken.None);

        // Assert
        result.TotalDuration.Should().BeGreaterThan(TimeSpan.FromMilliseconds(40));
        result.TotalDuration.Should().BeLessThan(TimeSpan.FromSeconds(2));
    }

    [Fact]
    public async Task ExecuteAsync_WithSkippedTask_ShouldHaveExactErrorMessage()
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
                        Input = new Dictionary<string, string> { ["data"] = "{{tasks.task-1.output.id}}" }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["ref-1"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } },
            ["ref-2"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        var inputs = new Dictionary<string, object>();

        var graph = new ExecutionGraph();
        graph.AddDependency("task-2", "task-1");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = graph
            });

        _taskExecutorMock.Setup(x => x.ExecuteAsync(
            It.IsAny<WorkflowTaskSpec>(),
            It.Is<TemplateContext>(c => c.TaskOutputs.Count == 0),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TaskExecutionResult
            {
                Success = false,
                Errors = new List<string> { "HTTP request failed" }
            });

        // Act
        var result = await _orchestrator.ExecuteAsync(workflow, tasks, inputs, CancellationToken.None);

        // Assert
        result.TaskResults["task-2"].Errors.Should().ContainSingle();
        result.TaskResults["task-2"].Errors[0].Should().Be("Task skipped due to failed dependency");
    }

    [Fact]
    public async Task ExecuteAsync_WithTaskOutputWithoutOutput_ShouldNotAddToContext()
    {
        // Arrange - Test that null output doesn't get added to context
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "ref-1" },
                    new WorkflowTaskStep { Id = "task-2", TaskRef = "ref-2" }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["ref-1"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } },
            ["ref-2"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        var inputs = new Dictionary<string, object>();

        var graph = new ExecutionGraph();
        graph.AddNode("task-1");
        graph.AddNode("task-2");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = graph
            });

        _taskExecutorMock.Setup(x => x.ExecuteAsync(
            It.IsAny<WorkflowTaskSpec>(),
            It.IsAny<TemplateContext>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TaskExecutionResult
            {
                Success = true,
                Output = null // No output
            });

        // Act
        var result = await _orchestrator.ExecuteAsync(workflow, tasks, inputs, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.TaskResults.Should().HaveCount(2);
        // Both tasks succeeded but had no output, so context should remain empty
        _taskExecutorMock.Verify(x => x.ExecuteAsync(
            It.IsAny<WorkflowTaskSpec>(),
            It.Is<TemplateContext>(c => c.TaskOutputs.Count == 0),
            It.IsAny<CancellationToken>()), Times.Exactly(2));
    }

    [Fact]
    public async Task ExecuteAsync_WithOutputMapping_ShouldMapTaskOutputsToWorkflowOutput()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "fetch-user", TaskRef = "fetch-user-task" },
                    new WorkflowTaskStep { Id = "fetch-orders", TaskRef = "fetch-orders-task" }
                },
                Output = new Dictionary<string, string>
                {
                    ["userId"] = "{{tasks.fetch-user.output.id}}",
                    ["userName"] = "{{tasks.fetch-user.output.name}}",
                    ["orderCount"] = "{{tasks.fetch-orders.output.count}}"
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["fetch-user-task"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } },
            ["fetch-orders-task"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        var graph = new ExecutionGraph();
        graph.AddNode("fetch-user");
        graph.AddNode("fetch-orders");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = graph
            });

        var userOutput = new Dictionary<string, object>
        {
            ["id"] = "user-123",
            ["name"] = "John Doe"
        };

        var ordersOutput = new Dictionary<string, object>
        {
            ["count"] = 5
        };

        _taskExecutorMock.SetupSequence(x => x.ExecuteAsync(
                It.IsAny<WorkflowTaskSpec>(),
                It.IsAny<TemplateContext>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TaskExecutionResult
            {
                Success = true,
                Output = userOutput
            })
            .ReturnsAsync(new TaskExecutionResult
            {
                Success = true,
                Output = ordersOutput
            });

        var inputs = new Dictionary<string, object>();

        // Act
        var result = await _orchestrator.ExecuteAsync(workflow, tasks, inputs, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Output.Should().NotBeNull();
        result.Output.Should().ContainKey("userId");
        result.Output["userId"].Should().Be("user-123");
        result.Output.Should().ContainKey("userName");
        result.Output["userName"].Should().Be("John Doe");
        result.Output.Should().ContainKey("orderCount");
        result.Output["orderCount"].Should().Be(5);
    }

    [Fact]
    public async Task ExecuteAsync_WithIndependentTasks_ShouldExecuteAllSuccessfully()
    {
        // Arrange - Diamond pattern where task-2 and task-3 can run in parallel
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "task-ref-1" },
                    new WorkflowTaskStep { Id = "task-2", TaskRef = "task-ref-2" },
                    new WorkflowTaskStep { Id = "task-3", TaskRef = "task-ref-3" },
                    new WorkflowTaskStep { Id = "task-4", TaskRef = "task-ref-4" }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["task-ref-1"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } },
            ["task-ref-2"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } },
            ["task-ref-3"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } },
            ["task-ref-4"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        // Build graph: task-1 is independent
        //              task-2 and task-3 depend on task-1 (can run in parallel)
        //              task-4 depends on task-2 and task-3
        var graph = new ExecutionGraph();
        graph.AddNode("task-1");
        graph.AddNode("task-2");
        graph.AddNode("task-3");
        graph.AddNode("task-4");
        graph.AddDependency("task-2", "task-1");
        graph.AddDependency("task-3", "task-1");
        graph.AddDependency("task-4", "task-2");
        graph.AddDependency("task-4", "task-3");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = graph
            });

        // Simple mock - just return success for all tasks
        _taskExecutorMock.Setup(x => x.ExecuteAsync(
                It.IsAny<WorkflowTaskSpec>(),
                It.IsAny<TemplateContext>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((WorkflowTaskSpec spec, TemplateContext ctx, CancellationToken ct) =>
            {
                return new TaskExecutionResult
                {
                    Success = true,
                    Output = new Dictionary<string, object> { ["result"] = "output" }
                };
            });

        var inputs = new Dictionary<string, object>();

        // Act
        var result = await _orchestrator.ExecuteAsync(workflow, tasks, inputs, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.TaskResults.Should().HaveCount(4);
        result.TaskResults["task-1"].Success.Should().BeTrue();
        result.TaskResults["task-2"].Success.Should().BeTrue();
        result.TaskResults["task-3"].Success.Should().BeTrue();
        result.TaskResults["task-4"].Success.Should().BeTrue();

        // Verify task executor was called 4 times (once for each task)
        _taskExecutorMock.Verify(x => x.ExecuteAsync(
            It.IsAny<WorkflowTaskSpec>(),
            It.IsAny<TemplateContext>(),
            It.IsAny<CancellationToken>()), Times.Exactly(4));
    }
}
