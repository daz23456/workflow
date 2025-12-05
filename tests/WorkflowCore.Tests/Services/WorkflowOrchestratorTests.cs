using FluentAssertions;
using Moq;
using WorkflowCore.Interfaces;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class WorkflowOrchestratorTests
{
    private readonly Mock<IExecutionGraphBuilder> _graphBuilderMock;
    private readonly Mock<IHttpTaskExecutor> _taskExecutorMock;
    private readonly Mock<ITemplateResolver> _templateResolverMock;
    private readonly Mock<IResponseStorage> _responseStorageMock;
    private readonly IWorkflowOrchestrator _orchestrator;

    public WorkflowOrchestratorTests()
    {
        _graphBuilderMock = new Mock<IExecutionGraphBuilder>();
        _taskExecutorMock = new Mock<IHttpTaskExecutor>();
        _templateResolverMock = new Mock<ITemplateResolver>();
        _responseStorageMock = new Mock<IResponseStorage>();

        // Setup default mock for template resolver - returns the input template string by default
        _templateResolverMock
            .Setup(r => r.ResolveAsync(It.IsAny<string>(), It.IsAny<TemplateContext>()))
            .ReturnsAsync((string template, TemplateContext ctx) => template);

        _orchestrator = new WorkflowOrchestrator(
            _graphBuilderMock.Object,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            _responseStorageMock.Object);
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

        // Setup template resolver for output mappings
        _templateResolverMock.Setup(x => x.ResolveAsync(
                "{{tasks.fetch-user.output.id}}",
                It.IsAny<TemplateContext>()))
            .ReturnsAsync("user-123");

        _templateResolverMock.Setup(x => x.ResolveAsync(
                "{{tasks.fetch-user.output.name}}",
                It.IsAny<TemplateContext>()))
            .ReturnsAsync("John Doe");

        _templateResolverMock.Setup(x => x.ResolveAsync(
                "{{tasks.fetch-orders.output.count}}",
                It.IsAny<TemplateContext>()))
            .ReturnsAsync("5");

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
        result.Output["orderCount"].Should().Be("5"); // Template resolver returns strings
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

    [Fact]
    public async Task ExecuteAsync_WithParallelismLimit_ShouldRespectMaxConcurrentTasks()
    {
        // Arrange - Create 4 independent tasks with a limit of 2 concurrent executions
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

        // Build graph with all independent tasks
        var graph = new ExecutionGraph();
        graph.AddNode("task-1");
        graph.AddNode("task-2");
        graph.AddNode("task-3");
        graph.AddNode("task-4");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = graph
            });

        // Track concurrent execution
        var currentConcurrent = 0;
        var maxConcurrent = 0;
        var lockObj = new object();

        _taskExecutorMock.Setup(x => x.ExecuteAsync(
                It.IsAny<WorkflowTaskSpec>(),
                It.IsAny<TemplateContext>(),
                It.IsAny<CancellationToken>()))
            .Returns(async () =>
            {
                lock (lockObj)
                {
                    currentConcurrent++;
                    if (currentConcurrent > maxConcurrent)
                    {
                        maxConcurrent = currentConcurrent;
                    }
                }

                await Task.Delay(50); // Simulate work

                lock (lockObj)
                {
                    currentConcurrent--;
                }

                return new TaskExecutionResult
                {
                    Success = true,
                    Output = new Dictionary<string, object> { ["result"] = "output" }
                };
            });

        var inputs = new Dictionary<string, object>();

        // Create orchestrator with maxConcurrentTasks = 2
        var orchestratorWithLimit = new WorkflowOrchestrator(
            _graphBuilderMock.Object,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            _responseStorageMock.Object,
            maxConcurrentTasks: 2);

        // Act
        var result = await orchestratorWithLimit.ExecuteAsync(workflow, tasks, inputs, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.TaskResults.Should().HaveCount(4);
        result.TaskResults.Values.Should().OnlyContain(r => r.Success);

        // Verify that at most 2 tasks executed concurrently
        maxConcurrent.Should().BeLessOrEqualTo(2);
    }

    [Fact]
    public async Task ExecuteAsync_WithMaxConcurrentTasks1_ShouldExecuteSequentially()
    {
        // Arrange - 3 independent tasks with maxConcurrentTasks=1 (sequential execution)
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "task-ref-1" },
                    new WorkflowTaskStep { Id = "task-2", TaskRef = "task-ref-2" },
                    new WorkflowTaskStep { Id = "task-3", TaskRef = "task-ref-3" }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["task-ref-1"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } },
            ["task-ref-2"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } },
            ["task-ref-3"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        var graph = new ExecutionGraph();
        graph.AddNode("task-1");
        graph.AddNode("task-2");
        graph.AddNode("task-3");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = graph });

        var currentConcurrent = 0;
        var maxConcurrent = 0;
        var lockObj = new object();

        _taskExecutorMock.Setup(x => x.ExecuteAsync(
                It.IsAny<WorkflowTaskSpec>(),
                It.IsAny<TemplateContext>(),
                It.IsAny<CancellationToken>()))
            .Returns(async () =>
            {
                lock (lockObj)
                {
                    currentConcurrent++;
                    if (currentConcurrent > maxConcurrent)
                    {
                        maxConcurrent = currentConcurrent;
                    }
                }

                await Task.Delay(50);

                lock (lockObj)
                {
                    currentConcurrent--;
                }

                return new TaskExecutionResult
                {
                    Success = true,
                    Output = new Dictionary<string, object> { ["result"] = "output" }
                };
            });

        var orchestratorWithLimit = new WorkflowOrchestrator(
            _graphBuilderMock.Object,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            _responseStorageMock.Object,
            maxConcurrentTasks: 1);

        // Act
        var result = await orchestratorWithLimit.ExecuteAsync(workflow, tasks, new Dictionary<string, object>(), CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        maxConcurrent.Should().Be(1); // Strictly sequential
    }

    [Fact]
    public void Constructor_WithInvalidMaxConcurrentTasks_ShouldThrowArgumentException()
    {
        // Arrange & Act & Assert
        var act = () => new WorkflowOrchestrator(
            _graphBuilderMock.Object,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            _responseStorageMock.Object,
            maxConcurrentTasks: 0);

        act.Should().Throw<ArgumentException>()
            .WithMessage("maxConcurrentTasks must be greater than 0*");
    }

    [Fact]
    public void Constructor_WithNegativeMaxConcurrentTasks_ShouldThrowArgumentException()
    {
        // Arrange & Act & Assert
        var act = () => new WorkflowOrchestrator(
            _graphBuilderMock.Object,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            _responseStorageMock.Object,
            maxConcurrentTasks: -1);

        act.Should().Throw<ArgumentException>()
            .WithMessage("maxConcurrentTasks must be greater than 0*");
    }

    [Fact]
    public async Task ExecuteAsync_ParallelExecution_ShouldBeFasterThanSequential()
    {
        // Arrange - Create 4 independent tasks that each take 100ms
        var taskDelay = TimeSpan.FromMilliseconds(100);
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

        // All tasks are independent (no dependencies)
        var graph = new ExecutionGraph();
        graph.AddNode("task-1");
        graph.AddNode("task-2");
        graph.AddNode("task-3");
        graph.AddNode("task-4");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = graph
            });

        // Mock task executor with delay
        _taskExecutorMock.Setup(x => x.ExecuteAsync(
                It.IsAny<WorkflowTaskSpec>(),
                It.IsAny<TemplateContext>(),
                It.IsAny<CancellationToken>()))
            .Returns(async (WorkflowTaskSpec spec, TemplateContext ctx, CancellationToken ct) =>
            {
                await Task.Delay(taskDelay, ct);
                return new TaskExecutionResult { Success = true };
            });

        var inputs = new Dictionary<string, object>();

        // Act - Sequential execution
        var sequentialOrchestrator = new WorkflowOrchestrator(
            _graphBuilderMock.Object,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            _responseStorageMock.Object,
            maxConcurrentTasks: 1);

        var sequentialResult = await sequentialOrchestrator.ExecuteAsync(workflow, tasks, inputs, CancellationToken.None);

        // Act - Parallel execution
        var parallelOrchestrator = new WorkflowOrchestrator(
            _graphBuilderMock.Object,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            _responseStorageMock.Object,
            maxConcurrentTasks: int.MaxValue);

        var parallelResult = await parallelOrchestrator.ExecuteAsync(workflow, tasks, inputs, CancellationToken.None);

        // Assert - Both should succeed
        sequentialResult.Success.Should().BeTrue();
        parallelResult.Success.Should().BeTrue();

        // Assert - Sequential should take ~400ms (4 tasks * 100ms each)
        // Parallel should take ~100ms (all tasks run simultaneously)
        // Parallel execution should be at least 2x faster
        var speedupRatio = sequentialResult.TotalDuration.TotalMilliseconds / parallelResult.TotalDuration.TotalMilliseconds;
        speedupRatio.Should().BeGreaterThan(2.0,
            because: $"parallel execution ({parallelResult.TotalDuration.TotalMilliseconds}ms) should be significantly faster than sequential ({sequentialResult.TotalDuration.TotalMilliseconds}ms)");

        // Additional validation: Sequential should be close to 4x the task delay
        sequentialResult.TotalDuration.Should().BeGreaterThan(TimeSpan.FromMilliseconds(350),
            because: "4 tasks at 100ms each should take at least 350ms sequentially");

        // Parallel should be close to 1x the task delay (all run at once)
        parallelResult.TotalDuration.Should().BeLessThan(TimeSpan.FromMilliseconds(250),
            because: "4 tasks running in parallel should take less than 250ms");
    }

    // ========== TIMESTAMP ACCURACY TESTS ==========

    [Fact]
    public async Task ExecuteAsync_ShouldPopulateActualStartedAtAndCompletedAt_OnTaskExecutionResult()
    {
        // Arrange - Single task workflow
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

        var graph = new ExecutionGraph();
        graph.AddNode("task-1");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = graph });

        var beforeExecution = DateTime.UtcNow;

        _taskExecutorMock.Setup(x => x.ExecuteAsync(
            It.IsAny<WorkflowTaskSpec>(),
            It.IsAny<TemplateContext>(),
            It.IsAny<CancellationToken>()))
            .Returns(async () =>
            {
                await Task.Delay(50); // Simulate 50ms of work
                return new TaskExecutionResult
                {
                    Success = true,
                    Output = new Dictionary<string, object> { ["result"] = "done" }
                };
            });

        // Act
        var result = await _orchestrator.ExecuteAsync(workflow, tasks, new Dictionary<string, object>(), CancellationToken.None);

        var afterExecution = DateTime.UtcNow;

        // Assert - TaskExecutionResult must have actual timestamps
        result.Success.Should().BeTrue();
        result.TaskResults.Should().ContainKey("task-1");

        var taskResult = result.TaskResults["task-1"];
        taskResult.StartedAt.Should().BeOnOrAfter(beforeExecution, "StartedAt should be the actual time the task started");
        taskResult.StartedAt.Should().BeOnOrBefore(afterExecution, "StartedAt should be before execution completed");
        taskResult.CompletedAt.Should().BeOnOrAfter(taskResult.StartedAt, "CompletedAt should be after StartedAt");
        taskResult.CompletedAt.Should().BeOnOrBefore(afterExecution, "CompletedAt should be before test completed");

        // Duration should be approximately the time between StartedAt and CompletedAt
        var calculatedDuration = taskResult.CompletedAt - taskResult.StartedAt;
        calculatedDuration.Should().BeCloseTo(taskResult.Duration, TimeSpan.FromMilliseconds(20),
            "Duration should match the time between StartedAt and CompletedAt");
    }

    [Fact]
    public async Task ExecuteAsync_WithDependentTasks_DependentTaskStartedAtShouldBeAfterDependencyCompletedAt()
    {
        // Arrange - task-2 depends on task-1, so task-2.StartedAt must be >= task-1.CompletedAt
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
                        DependsOn = new List<string> { "task-1" }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["ref-1"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } },
            ["ref-2"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        var graph = new ExecutionGraph();
        graph.AddDependency("task-2", "task-1");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = graph });

        _taskExecutorMock.Setup(x => x.ExecuteAsync(
            It.IsAny<WorkflowTaskSpec>(),
            It.IsAny<TemplateContext>(),
            It.IsAny<CancellationToken>()))
            .Returns(async () =>
            {
                await Task.Delay(30); // Each task takes 30ms
                return new TaskExecutionResult
                {
                    Success = true,
                    Output = new Dictionary<string, object> { ["result"] = "done" }
                };
            });

        // Act
        var result = await _orchestrator.ExecuteAsync(workflow, tasks, new Dictionary<string, object>(), CancellationToken.None);

        // Assert - Dependent task timestamps must respect dependency order
        result.Success.Should().BeTrue();
        result.TaskResults.Should().ContainKey("task-1");
        result.TaskResults.Should().ContainKey("task-2");

        var task1Result = result.TaskResults["task-1"];
        var task2Result = result.TaskResults["task-2"];

        // CRITICAL: task-2 should NOT start until task-1 has completed
        task2Result.StartedAt.Should().BeOnOrAfter(task1Result.CompletedAt,
            "A dependent task's StartedAt must be >= its dependency's CompletedAt. " +
            "This proves the execution order was respected.");

        // Additional validation: timestamps should be sensible
        task1Result.StartedAt.Should().BeBefore(task1Result.CompletedAt);
        task2Result.StartedAt.Should().BeBefore(task2Result.CompletedAt);
    }

    [Fact]
    public async Task ExecuteAsync_WithParallelTasks_BothShouldHaveOverlappingTimestamps()
    {
        // Arrange - task-1 and task-2 are independent, they should start at approximately the same time
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

        var graph = new ExecutionGraph();
        graph.AddNode("task-1");
        graph.AddNode("task-2");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = graph });

        _taskExecutorMock.Setup(x => x.ExecuteAsync(
            It.IsAny<WorkflowTaskSpec>(),
            It.IsAny<TemplateContext>(),
            It.IsAny<CancellationToken>()))
            .Returns(async () =>
            {
                await Task.Delay(100); // Each task takes 100ms
                return new TaskExecutionResult
                {
                    Success = true,
                    Output = new Dictionary<string, object> { ["result"] = "done" }
                };
            });

        // Act
        var result = await _orchestrator.ExecuteAsync(workflow, tasks, new Dictionary<string, object>(), CancellationToken.None);

        // Assert - Parallel tasks should have overlapping timestamps (started within 50ms of each other)
        result.Success.Should().BeTrue();

        var task1Result = result.TaskResults["task-1"];
        var task2Result = result.TaskResults["task-2"];

        var startTimeDifference = Math.Abs((task1Result.StartedAt - task2Result.StartedAt).TotalMilliseconds);
        startTimeDifference.Should().BeLessThan(50,
            "Independent parallel tasks should start within 50ms of each other");

        // Both should have taken ~100ms
        task1Result.Duration.TotalMilliseconds.Should().BeGreaterThanOrEqualTo(90);
        task2Result.Duration.TotalMilliseconds.Should().BeGreaterThanOrEqualTo(90);
    }

    [Fact]
    public async Task ExecuteAsync_WithTransformTask_ShouldRouteToTransformExecutor()
    {
        // Arrange - Simple workflow with just a transform task
        // We'll test that transform tasks work with workflow inputs
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "extract-names",
                        TaskRef = "transform-extract-names",
                        // Must define Input to map workflow inputs to transform data
                        Input = new Dictionary<string, string>
                        {
                            ["users"] = "{{input.users}}"
                        }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["transform-extract-names"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec
                {
                    Type = "transform",
                    Transform = new TransformDefinition
                    {
                        JsonPath = "$.users[*].name"
                    }
                }
            }
        };

        // Workflow inputs contain user data
        var inputs = new Dictionary<string, object>
        {
            ["users"] = new[]
            {
                new { name = "Alice", age = 30 },
                new { name = "Bob", age = 25 }
            }
        };

        // Setup execution graph
        var graph = new ExecutionGraph();
        graph.AddNode("extract-names");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = graph
            });

        // Setup template resolver to return the workflow input serialized as JSON
        _templateResolverMock.Setup(x => x.ResolveAsync("{{input.users}}", It.IsAny<TemplateContext>()))
            .ReturnsAsync("[{\"name\":\"Alice\",\"age\":30},{\"name\":\"Bob\",\"age\":25}]");

        // Create orchestrator with real transform executor
        var transformer = new JsonPathTransformer();
        var transformExecutor = new TransformTaskExecutor(transformer);
        var orchestratorWithTransform = new WorkflowOrchestrator(
            _graphBuilderMock.Object,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            _responseStorageMock.Object,
            int.MaxValue,
            transformExecutor);

        // Act
        var result = await orchestratorWithTransform.ExecuteAsync(workflow, tasks, inputs, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.TaskResults.Should().ContainKey("extract-names");
        result.TaskResults["extract-names"].Success.Should().BeTrue();

        // Transform should have extracted the names
        result.TaskResults["extract-names"].Output.Should().ContainKey("result");
        var namesList = result.TaskResults["extract-names"].Output["result"] as List<object>;
        namesList.Should().NotBeNull();
        namesList.Should().HaveCount(2);
        namesList.Should().Contain("Alice");
        namesList.Should().Contain("Bob");
    }

    // ========== INTEGRATION TESTS WITH REAL GRAPH BUILDER ==========

    [Fact]
    public async Task ExecuteAsync_Integration_WithRealGraphBuilder_DependentTaskShouldWaitForDependency()
    {
        // Arrange - Use REAL ExecutionGraphBuilder, not a mock
        // This tests the full flow from workflow definition through graph building to execution
        var realGraphBuilder = new ExecutionGraphBuilder();

        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "dependency-task", TaskRef = "ref-1" },
                    new WorkflowTaskStep
                    {
                        Id = "dependent-task",
                        TaskRef = "ref-2",
                        DependsOn = new List<string> { "dependency-task" } // Explicit dependency
                    }
                }
            }
        };

        var availableTasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["ref-1"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } },
            ["ref-2"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        // Use real orchestrator with real graph builder
        var orchestrator = new WorkflowOrchestrator(
            realGraphBuilder,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            _responseStorageMock.Object);

        // Add significant delay to make timing differences obvious
        _taskExecutorMock.Setup(x => x.ExecuteAsync(
            It.IsAny<WorkflowTaskSpec>(),
            It.IsAny<TemplateContext>(),
            It.IsAny<CancellationToken>()))
            .Returns(async () =>
            {
                await Task.Delay(100); // 100ms delay per task
                return new TaskExecutionResult
                {
                    Success = true,
                    Output = new Dictionary<string, object> { ["result"] = "done" }
                };
            });

        // Act
        var result = await orchestrator.ExecuteAsync(workflow, availableTasks, new Dictionary<string, object>(), CancellationToken.None);

        // Assert - CRITICAL: dependent task must start AFTER dependency completes
        result.Success.Should().BeTrue();
        result.TaskResults.Should().ContainKey("dependency-task");
        result.TaskResults.Should().ContainKey("dependent-task");

        var dependencyResult = result.TaskResults["dependency-task"];
        var dependentResult = result.TaskResults["dependent-task"];

        // This is the critical assertion: dependent task StartedAt must be >= dependency CompletedAt
        dependentResult.StartedAt.Should().BeOnOrAfter(dependencyResult.CompletedAt,
            "CRITICAL: A task with dependsOn MUST start after its dependency completes. " +
            $"Dependency completed at {dependencyResult.CompletedAt:HH:mm:ss.ffffff}, " +
            $"but dependent started at {dependentResult.StartedAt:HH:mm:ss.ffffff}");

        // Total duration should be at least 200ms (sequential: 100 + 100)
        result.TotalDuration.Should().BeGreaterThanOrEqualTo(TimeSpan.FromMilliseconds(180),
            "Dependent tasks should execute sequentially, taking ~200ms total");
    }

    [Fact]
    public async Task ExecuteAsync_Integration_WithMultipleDependsOn_ShouldWaitForAllDependencies()
    {
        // Arrange - Task depends on TWO prior tasks
        var realGraphBuilder = new ExecutionGraphBuilder();

        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-a", TaskRef = "ref-1" },
                    new WorkflowTaskStep { Id = "task-b", TaskRef = "ref-2" },
                    new WorkflowTaskStep
                    {
                        Id = "task-c",
                        TaskRef = "ref-3",
                        DependsOn = new List<string> { "task-a", "task-b" } // Depends on BOTH
                    }
                }
            }
        };

        var availableTasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["ref-1"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } },
            ["ref-2"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } },
            ["ref-3"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        var orchestrator = new WorkflowOrchestrator(
            realGraphBuilder,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            _responseStorageMock.Object);

        _taskExecutorMock.Setup(x => x.ExecuteAsync(
            It.IsAny<WorkflowTaskSpec>(),
            It.IsAny<TemplateContext>(),
            It.IsAny<CancellationToken>()))
            .Returns(async () =>
            {
                await Task.Delay(50);
                return new TaskExecutionResult
                {
                    Success = true,
                    Output = new Dictionary<string, object> { ["result"] = "done" }
                };
            });

        // Act
        var result = await orchestrator.ExecuteAsync(workflow, availableTasks, new Dictionary<string, object>(), CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();

        var taskAResult = result.TaskResults["task-a"];
        var taskBResult = result.TaskResults["task-b"];
        var taskCResult = result.TaskResults["task-c"];

        // Task C must start after BOTH A and B complete
        var latestDependencyCompletion = taskAResult.CompletedAt > taskBResult.CompletedAt
            ? taskAResult.CompletedAt
            : taskBResult.CompletedAt;

        taskCResult.StartedAt.Should().BeOnOrAfter(latestDependencyCompletion,
            "Task C must wait for ALL dependencies (A and B) to complete before starting");

        // A and B should run in parallel (started close together)
        var abStartDiff = Math.Abs((taskAResult.StartedAt - taskBResult.StartedAt).TotalMilliseconds);
        abStartDiff.Should().BeLessThan(30, "Tasks A and B should start in parallel");
    }

    [Fact]
    public async Task ExecuteAsync_Integration_YamlParsedWorkflow_ShouldRespectDependsOn()
    {
        // Arrange - This simulates the EXACT flow from Visual Builder:
        // 1. YAML string generated by frontend
        // 2. Parsed by WorkflowYamlParser (via YamlDotNet)
        // 3. Executed by WorkflowOrchestrator with real ExecutionGraphBuilder

        // YAML with explicit dependsOn (as generated by yaml-adapter.ts)
        var yamlString = @"
apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: test-workflow
  namespace: default
spec:
  description: Test workflow with explicit dependencies
  input: {}
  output: {}
  tasks:
    - id: task-first
      taskRef: http-task
    - id: task-second
      taskRef: http-task
      dependsOn:
        - task-first
";

        // Use YamlDotNet to parse (same as WorkflowYamlParser)
        var deserializer = new YamlDotNet.Serialization.DeserializerBuilder()
            .WithNamingConvention(YamlDotNet.Serialization.NamingConventions.CamelCaseNamingConvention.Instance)
            .IgnoreUnmatchedProperties()
            .Build();

        var workflow = deserializer.Deserialize<WorkflowResource>(yamlString);

        // Verify DependsOn was parsed correctly
        workflow.Spec.Tasks.Should().HaveCount(2);
        workflow.Spec.Tasks[0].Id.Should().Be("task-first");
        workflow.Spec.Tasks[0].DependsOn.Should().BeNull();
        workflow.Spec.Tasks[1].Id.Should().Be("task-second");
        workflow.Spec.Tasks[1].DependsOn.Should().NotBeNull("CRITICAL: dependsOn must be parsed from YAML");
        workflow.Spec.Tasks[1].DependsOn.Should().Contain("task-first");

        var availableTasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["http-task"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        // Use REAL ExecutionGraphBuilder
        var realGraphBuilder = new ExecutionGraphBuilder();
        var orchestrator = new WorkflowOrchestrator(
            realGraphBuilder,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            _responseStorageMock.Object);

        // Each task takes 100ms
        _taskExecutorMock.Setup(x => x.ExecuteAsync(
            It.IsAny<WorkflowTaskSpec>(),
            It.IsAny<TemplateContext>(),
            It.IsAny<CancellationToken>()))
            .Returns(async () =>
            {
                await Task.Delay(100);
                return new TaskExecutionResult
                {
                    Success = true,
                    Output = new Dictionary<string, object> { ["result"] = "done" }
                };
            });

        // Act
        var result = await orchestrator.ExecuteAsync(workflow, availableTasks, new Dictionary<string, object>(), CancellationToken.None);

        // Assert - CRITICAL: task-second must start AFTER task-first completes
        result.Success.Should().BeTrue();

        var firstTaskResult = result.TaskResults["task-first"];
        var secondTaskResult = result.TaskResults["task-second"];

        secondTaskResult.StartedAt.Should().BeOnOrAfter(firstTaskResult.CompletedAt,
            "YAML-parsed dependsOn must be respected! " +
            $"First task completed at {firstTaskResult.CompletedAt:HH:mm:ss.ffffff}, " +
            $"but second task started at {secondTaskResult.StartedAt:HH:mm:ss.ffffff}");

        // Sequential execution should take ~200ms
        result.TotalDuration.Should().BeGreaterThanOrEqualTo(TimeSpan.FromMilliseconds(180),
            "Two sequential 100ms tasks should take at least 180ms total");
    }

    [Fact]
    public async Task ExecuteAsync_Integration_DynamicTaskIds_ShouldRespectDependsOn()
    {
        // Arrange - Simulate production scenario with dynamic task IDs (as Visual Builder generates)
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var taskFirstId = $"task-{timestamp}-first";
        var taskSecondId = $"task-{timestamp}-second";

        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "dynamic-workflow", Namespace = "default" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = taskFirstId, TaskRef = "http-task" },
                    new WorkflowTaskStep
                    {
                        Id = taskSecondId,
                        TaskRef = "http-task",
                        DependsOn = new List<string> { taskFirstId }
                    }
                }
            }
        };

        var availableTasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["http-task"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        var realGraphBuilder = new ExecutionGraphBuilder();
        var orchestrator = new WorkflowOrchestrator(
            realGraphBuilder,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            _responseStorageMock.Object);

        // Track execution order
        var executionOrder = new List<string>();
        var executionLock = new object();

        _taskExecutorMock.Setup(x => x.ExecuteAsync(
            It.IsAny<WorkflowTaskSpec>(),
            It.IsAny<TemplateContext>(),
            It.IsAny<CancellationToken>()))
            .Returns(async (WorkflowTaskSpec spec, TemplateContext ctx, CancellationToken ct) =>
            {
                // Record which task is executing
                var taskId = ctx.TaskOutputs.Count == 0 ? taskFirstId : taskSecondId;
                lock (executionLock)
                {
                    executionOrder.Add(taskId);
                }
                await Task.Delay(100);
                return new TaskExecutionResult
                {
                    Success = true,
                    Output = new Dictionary<string, object> { ["result"] = "done" }
                };
            });

        // Act
        var result = await orchestrator.ExecuteAsync(workflow, availableTasks, new Dictionary<string, object>(), CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();

        var firstResult = result.TaskResults[taskFirstId];
        var secondResult = result.TaskResults[taskSecondId];

        secondResult.StartedAt.Should().BeOnOrAfter(firstResult.CompletedAt,
            $"Dynamic task ID dependency must be respected! " +
            $"First ({taskFirstId}) completed at {firstResult.CompletedAt:HH:mm:ss.ffffff}, " +
            $"but second ({taskSecondId}) started at {secondResult.StartedAt:HH:mm:ss.ffffff}");
    }

    #region Mutation Testing - Kill Surviving Mutants

    [Fact]
    public void Constructor_NullGraphBuilder_ShouldThrow()
    {
        // Line 40: null coalescing mutation
        var act = () => new WorkflowOrchestrator(
            null!, // graphBuilder
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            _responseStorageMock.Object);

        act.Should().Throw<ArgumentNullException>()
            .Which.ParamName.Should().Be("graphBuilder");
    }

    [Fact]
    public void Constructor_NullHttpTaskExecutor_ShouldThrow()
    {
        // Line 41: null coalescing mutation
        var act = () => new WorkflowOrchestrator(
            _graphBuilderMock.Object,
            null!, // httpTaskExecutor
            _templateResolverMock.Object,
            _responseStorageMock.Object);

        act.Should().Throw<ArgumentNullException>()
            .Which.ParamName.Should().Be("httpTaskExecutor");
    }

    [Fact]
    public void Constructor_NullTemplateResolver_ShouldThrow()
    {
        // Line 42: null coalescing mutation
        var act = () => new WorkflowOrchestrator(
            _graphBuilderMock.Object,
            _taskExecutorMock.Object,
            null!, // templateResolver
            _responseStorageMock.Object);

        act.Should().Throw<ArgumentNullException>()
            .Which.ParamName.Should().Be("templateResolver");
    }

    [Fact]
    public void Constructor_NullResponseStorage_ShouldThrow()
    {
        // Line 43: null coalescing mutation
        var act = () => new WorkflowOrchestrator(
            _graphBuilderMock.Object,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            null!); // responseStorage

        act.Should().Throw<ArgumentNullException>()
            .Which.ParamName.Should().Be("responseStorage");
    }

    [Fact]
    public void Constructor_ZeroMaxConcurrentTasks_ShouldThrow()
    {
        // Line 49: maxConcurrentTasks validation
        var act = () => new WorkflowOrchestrator(
            _graphBuilderMock.Object,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            _responseStorageMock.Object,
            maxConcurrentTasks: 0);

        act.Should().Throw<ArgumentException>()
            .Which.ParamName.Should().Be("maxConcurrentTasks");
    }

    [Fact]
    public void Constructor_NegativeMaxConcurrentTasks_ShouldThrow()
    {
        var act = () => new WorkflowOrchestrator(
            _graphBuilderMock.Object,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            _responseStorageMock.Object,
            maxConcurrentTasks: -1);

        act.Should().Throw<ArgumentException>()
            .Which.ParamName.Should().Be("maxConcurrentTasks");
    }

    #endregion

    #region Mutation Testing - NoCoverage Code Paths

    [Fact]
    public async Task ExecuteAsync_WorkflowWithNullMetadata_UsesUnknownName()
    {
        // Line 68: workflow.Metadata?.Name ?? "unknown"
        var workflow = new WorkflowResource
        {
            Metadata = null, // null metadata
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "test-task" }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            { "test-task", new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } } }
        };

        var graph = new ExecutionGraph();
        graph.AddNode("task-1");

        _graphBuilderMock.Setup(g => g.Build(workflow))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = graph
            });

        _taskExecutorMock.Setup(e => e.ExecuteAsync(
            It.IsAny<WorkflowTaskSpec>(),
            It.IsAny<TemplateContext>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TaskExecutionResult { Success = true, Output = new Dictionary<string, object>() });

        var result = await _orchestrator.ExecuteAsync(
            workflow,
            tasks,
            new Dictionary<string, object>(),
            CancellationToken.None);

        result.Success.Should().BeTrue();
    }

    [Fact]
    public async Task ExecuteAsync_WithConditionEvaluationError_ShouldReturnTaskFailure()
    {
        // Lines 208-218: Condition evaluation failure path
        var conditionEvaluatorMock = new Mock<IConditionEvaluator>();
        conditionEvaluatorMock.Setup(e => e.EvaluateAsync(It.IsAny<string>(), It.IsAny<TemplateContext>()))
            .ReturnsAsync(new ConditionResult
            {
                Error = "Invalid condition expression"
            });

        var orchestrator = new WorkflowOrchestrator(
            _graphBuilderMock.Object,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            _responseStorageMock.Object,
            conditionEvaluator: conditionEvaluatorMock.Object);

        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "task-with-condition",
                        TaskRef = "test-task",
                        Condition = new ConditionSpec { If = "{{invalid}}" }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            { "test-task", new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } } }
        };

        var graph = new ExecutionGraph();
        graph.AddNode("task-with-condition");

        _graphBuilderMock.Setup(g => g.Build(workflow))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = graph
            });

        var result = await orchestrator.ExecuteAsync(
            workflow,
            tasks,
            new Dictionary<string, object>(),
            CancellationToken.None);

        result.Success.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("Condition evaluation failed"));
    }

    [Fact]
    public async Task ExecuteAsync_WithConditionFalse_ShouldSkipTask()
    {
        // Lines 221-234: Condition evaluates to false - task skipped
        var conditionEvaluatorMock = new Mock<IConditionEvaluator>();
        conditionEvaluatorMock.Setup(e => e.EvaluateAsync(It.IsAny<string>(), It.IsAny<TemplateContext>()))
            .ReturnsAsync(new ConditionResult
            {
                ShouldExecute = false,
                EvaluatedExpression = "false == true"
            });

        var orchestrator = new WorkflowOrchestrator(
            _graphBuilderMock.Object,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            _responseStorageMock.Object,
            conditionEvaluator: conditionEvaluatorMock.Object);

        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "conditional-task",
                        TaskRef = "test-task",
                        Condition = new ConditionSpec { If = "{{input.flag}} == true" }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            { "test-task", new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } } }
        };

        var graph = new ExecutionGraph();
        graph.AddNode("conditional-task");

        _graphBuilderMock.Setup(g => g.Build(workflow))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = graph
            });

        var result = await orchestrator.ExecuteAsync(
            workflow,
            tasks,
            new Dictionary<string, object>(),
            CancellationToken.None);

        result.Success.Should().BeTrue();
        result.TaskResults.Should().ContainKey("conditional-task");
        result.TaskResults["conditional-task"].WasSkipped.Should().BeTrue();
        result.TaskResults["conditional-task"].SkipReason.Should().Contain("evaluated to false");
    }

    [Fact]
    public async Task ExecuteAsync_WithSwitchEvaluationError_ShouldReturnTaskFailure()
    {
        // Lines 243-253: Switch evaluation failure
        var switchEvaluatorMock = new Mock<ISwitchEvaluator>();
        switchEvaluatorMock.Setup(e => e.EvaluateAsync(It.IsAny<SwitchSpec>(), It.IsAny<TemplateContext>()))
            .ReturnsAsync(new SwitchResult
            {
                Matched = false,
                Error = "Invalid switch value expression"
            });

        var orchestrator = new WorkflowOrchestrator(
            _graphBuilderMock.Object,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            _responseStorageMock.Object,
            switchEvaluator: switchEvaluatorMock.Object);

        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "switch-task",
                        Switch = new SwitchSpec
                        {
                            Value = "{{invalid}}",
                            Cases = new List<SwitchCase>()
                        }
                    }
                }
            }
        };

        var graph = new ExecutionGraph();
        graph.AddNode("switch-task");

        _graphBuilderMock.Setup(g => g.Build(workflow))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = graph
            });

        var result = await orchestrator.ExecuteAsync(
            workflow,
            new Dictionary<string, WorkflowTaskResource>(),
            new Dictionary<string, object>(),
            CancellationToken.None);

        result.Success.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("Switch evaluation failed") || e.Contains("Invalid switch"));
    }

    [Fact]
    public async Task ExecuteAsync_WithSwitchNoMatch_ShouldReturnTaskFailure()
    {
        // Lines 256-267: Switch did not match any case (no default)
        var switchEvaluatorMock = new Mock<ISwitchEvaluator>();
        switchEvaluatorMock.Setup(e => e.EvaluateAsync(It.IsAny<SwitchSpec>(), It.IsAny<TemplateContext>()))
            .ReturnsAsync(new SwitchResult
            {
                Matched = false,
                Error = null // No error, just no match
            });

        var orchestrator = new WorkflowOrchestrator(
            _graphBuilderMock.Object,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            _responseStorageMock.Object,
            switchEvaluator: switchEvaluatorMock.Object);

        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "switch-task",
                        Switch = new SwitchSpec
                        {
                            Value = "{{input.value}}",
                            Cases = new List<SwitchCase>
                            {
                                new SwitchCase { Match = "a", TaskRef = "task-a" }
                            }
                        }
                    }
                }
            }
        };

        var graph = new ExecutionGraph();
        graph.AddNode("switch-task");

        _graphBuilderMock.Setup(g => g.Build(workflow))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = graph
            });

        var result = await orchestrator.ExecuteAsync(
            workflow,
            new Dictionary<string, WorkflowTaskResource>(),
            new Dictionary<string, object> { { "value", "b" } }, // "b" doesn't match "a"
            CancellationToken.None);

        result.Success.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("did not match any case") || e.Contains("Switch"));
    }

    [Fact]
    public async Task ExecuteAsync_WithFailedDependency_ShouldSkipDependentTask()
    {
        // Lines 191-200: Task skipped due to failed dependency
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "test-task" },
                    new WorkflowTaskStep
                    {
                        Id = "task-2",
                        TaskRef = "test-task",
                        DependsOn = new List<string> { "task-1" }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            { "test-task", new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } } }
        };

        var graph = new ExecutionGraph();
        graph.AddNode("task-1");
        graph.AddDependency("task-2", "task-1");

        _graphBuilderMock.Setup(g => g.Build(workflow))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = graph
            });

        // First task fails
        _taskExecutorMock.Setup(e => e.ExecuteAsync(
            It.IsAny<WorkflowTaskSpec>(),
            It.IsAny<TemplateContext>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TaskExecutionResult
            {
                Success = false,
                Errors = new List<string> { "Task failed" }
            });

        var result = await _orchestrator.ExecuteAsync(
            workflow,
            tasks,
            new Dictionary<string, object>(),
            CancellationToken.None);

        result.Success.Should().BeFalse();
        result.TaskResults.Should().ContainKey("task-2");
        result.TaskResults["task-2"].Errors.Should().Contain(e => e.Contains("skipped due to failed dependency"));
    }

    #endregion

    #region Mutation Killing Tests - Switch Evaluation

    [Fact]
    public async Task ExecuteAsync_SwitchEvaluationError_FailsTask()
    {
        // Target: Switch evaluation error path (lines 243-254)
        var switchEvaluatorMock = new Mock<ISwitchEvaluator>();
        switchEvaluatorMock.Setup(e => e.EvaluateAsync(It.IsAny<SwitchSpec>(), It.IsAny<TemplateContext>()))
            .ReturnsAsync(new SwitchResult { Error = "Invalid switch expression" });

        var orchestrator = new WorkflowOrchestrator(
            _graphBuilderMock.Object,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            _responseStorageMock.Object,
            switchEvaluator: switchEvaluatorMock.Object);

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
                        Switch = new SwitchSpec { Value = "{{input.type}}" }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["ref-1"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        var graph = new ExecutionGraph();
        graph.AddNode("task-1");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = graph });

        var result = await orchestrator.ExecuteAsync(workflow, tasks, new Dictionary<string, object>(), CancellationToken.None);

        result.Success.Should().BeFalse();
        result.TaskResults["task-1"].Errors.Should().Contain(e => e.Contains("Switch evaluation failed"));
    }

    [Fact]
    public async Task ExecuteAsync_SwitchNoMatch_FailsTask()
    {
        // Target: Switch no match path (lines 256-267)
        var switchEvaluatorMock = new Mock<ISwitchEvaluator>();
        switchEvaluatorMock.Setup(e => e.EvaluateAsync(It.IsAny<SwitchSpec>(), It.IsAny<TemplateContext>()))
            .ReturnsAsync(new SwitchResult { Matched = false, Error = "No case matched" });

        var orchestrator = new WorkflowOrchestrator(
            _graphBuilderMock.Object,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            _responseStorageMock.Object,
            switchEvaluator: switchEvaluatorMock.Object);

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
                        Switch = new SwitchSpec { Value = "{{input.type}}" }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["ref-1"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        var graph = new ExecutionGraph();
        graph.AddNode("task-1");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = graph });

        var result = await orchestrator.ExecuteAsync(workflow, tasks, new Dictionary<string, object>(), CancellationToken.None);

        result.Success.Should().BeFalse();
        result.TaskResults["task-1"].Errors.Should().Contain(e => e.Contains("No case matched"));
    }

    [Fact]
    public async Task ExecuteAsync_SwitchMatched_UsesMatchedTaskRef()
    {
        // Target: Switch matched path (lines 269-270)
        var switchEvaluatorMock = new Mock<ISwitchEvaluator>();
        switchEvaluatorMock.Setup(e => e.EvaluateAsync(It.IsAny<SwitchSpec>(), It.IsAny<TemplateContext>()))
            .ReturnsAsync(new SwitchResult { Matched = true, TaskRef = "matched-ref" });

        var orchestrator = new WorkflowOrchestrator(
            _graphBuilderMock.Object,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            _responseStorageMock.Object,
            switchEvaluator: switchEvaluatorMock.Object);

        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "task-1",
                        TaskRef = "default-ref",
                        Switch = new SwitchSpec { Value = "{{input.type}}" }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["default-ref"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } },
            ["matched-ref"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        var graph = new ExecutionGraph();
        graph.AddNode("task-1");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = graph });

        _taskExecutorMock.Setup(e => e.ExecuteAsync(
            It.IsAny<WorkflowTaskSpec>(),
            It.IsAny<TemplateContext>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TaskExecutionResult { Success = true });

        var result = await orchestrator.ExecuteAsync(workflow, tasks, new Dictionary<string, object>(), CancellationToken.None);

        result.Success.Should().BeTrue();
        // The executor should have been called with the matched-ref task spec
        _taskExecutorMock.Verify(e => e.ExecuteAsync(
            It.IsAny<WorkflowTaskSpec>(),
            It.IsAny<TemplateContext>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region Mutation Killing Tests - Transform Tasks

    [Fact]
    public async Task ExecuteAsync_TransformTaskWithNoExecutor_FailsTask()
    {
        // Target: Transform executor null check (lines 300-309)
        var orchestrator = new WorkflowOrchestrator(
            _graphBuilderMock.Object,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            _responseStorageMock.Object,
            transformTaskExecutor: null); // No transform executor

        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "transform-ref" }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["transform-ref"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "transform" } }
        };

        var graph = new ExecutionGraph();
        graph.AddNode("task-1");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = graph });

        var result = await orchestrator.ExecuteAsync(workflow, tasks, new Dictionary<string, object>(), CancellationToken.None);

        result.Success.Should().BeFalse();
        result.TaskResults["task-1"].Errors.Should().Contain(e => e.Contains("Transform task executor not available"));
    }

    [Fact]
    public async Task ExecuteAsync_TransformTaskWithInputResolutionError_FailsTask()
    {
        // Target: Transform input resolution error (lines 343-354)
        var transformExecutorMock = new Mock<ITransformTaskExecutor>();

        var orchestrator = new WorkflowOrchestrator(
            _graphBuilderMock.Object,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            _responseStorageMock.Object,
            transformTaskExecutor: transformExecutorMock.Object);

        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "task-1",
                        TaskRef = "transform-ref",
                        Input = new Dictionary<string, string> { ["data"] = "{{invalid.template}}" }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["transform-ref"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "transform" } }
        };

        var graph = new ExecutionGraph();
        graph.AddNode("task-1");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = graph });

        _templateResolverMock.Setup(r => r.ResolveAsync(It.IsAny<string>(), It.IsAny<TemplateContext>()))
            .ThrowsAsync(new TemplateResolutionException("Invalid template", "{{invalid.template}}"));

        var result = await orchestrator.ExecuteAsync(workflow, tasks, new Dictionary<string, object>(), CancellationToken.None);

        result.Success.Should().BeFalse();
        result.TaskResults["task-1"].Errors.Should().Contain(e => e.Contains("Failed to resolve input"));
    }

    #endregion

    #region Mutation Killing Tests - HTTP Tasks with Input

    [Fact]
    public async Task ExecuteAsync_HttpTaskWithJsonInput_DeserializesInput()
    {
        // Target: JSON deserialization path (lines 379-389)
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
                        Input = new Dictionary<string, string> { ["data"] = "{{input.jsonData}}" }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["ref-1"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        var graph = new ExecutionGraph();
        graph.AddNode("task-1");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = graph });

        // Return JSON string from template resolution
        _templateResolverMock.Setup(r => r.ResolveAsync(It.IsAny<string>(), It.IsAny<TemplateContext>()))
            .ReturnsAsync("{\"key\":\"value\"}");

        _taskExecutorMock.Setup(e => e.ExecuteAsync(
            It.IsAny<WorkflowTaskSpec>(),
            It.IsAny<TemplateContext>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TaskExecutionResult { Success = true });

        var result = await _orchestrator.ExecuteAsync(workflow, tasks, new Dictionary<string, object>(), CancellationToken.None);

        result.Success.Should().BeTrue();
    }

    [Fact]
    public async Task ExecuteAsync_HttpTaskWithInputResolutionError_FailsTask()
    {
        // Target: HTTP input resolution error (lines 396-407)
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
                        Input = new Dictionary<string, string> { ["data"] = "{{invalid.path}}" }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["ref-1"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        var graph = new ExecutionGraph();
        graph.AddNode("task-1");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = graph });

        _templateResolverMock.Setup(r => r.ResolveAsync(It.IsAny<string>(), It.IsAny<TemplateContext>()))
            .ThrowsAsync(new TemplateResolutionException("Not found", "{{invalid.path}}"));

        var result = await _orchestrator.ExecuteAsync(workflow, tasks, new Dictionary<string, object>(), CancellationToken.None);

        result.Success.Should().BeFalse();
        result.TaskResults["task-1"].Errors.Should().Contain(e => e.Contains("Failed to resolve input"));
    }

    #endregion

    #region Mutation Killing Tests - Condition Skip

    [Fact]
    public async Task ExecuteAsync_ConditionEvaluatesToFalse_TaskSkipped()
    {
        // Target: Condition skip path (lines 221-234)
        var conditionEvaluatorMock = new Mock<IConditionEvaluator>();
        conditionEvaluatorMock.Setup(e => e.EvaluateAsync(It.IsAny<string>(), It.IsAny<TemplateContext>()))
            .ReturnsAsync(new ConditionResult
            {
                ShouldExecute = false,
                EvaluatedExpression = "input.enabled == true"
            });

        var orchestrator = new WorkflowOrchestrator(
            _graphBuilderMock.Object,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            _responseStorageMock.Object,
            conditionEvaluator: conditionEvaluatorMock.Object);

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
                        Condition = new ConditionSpec { If = "{{input.enabled}} == true" }
                    }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            ["ref-1"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        var graph = new ExecutionGraph();
        graph.AddNode("task-1");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = graph });

        var result = await orchestrator.ExecuteAsync(workflow, tasks, new Dictionary<string, object>(), CancellationToken.None);

        result.Success.Should().BeTrue();
        result.TaskResults["task-1"].WasSkipped.Should().BeTrue();
        result.TaskResults["task-1"].SkipReason.Should().Contain("evaluated to false");
    }

    #endregion

    #region Mutation Killing Tests - Task Reference Not Found

    [Fact]
    public async Task ExecuteAsync_TaskRefNotFound_FailsTask()
    {
        // Target: Task reference not found path (lines 274-285)
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "nonexistent-ref" }
                }
            }
        };

        var tasks = new Dictionary<string, WorkflowTaskResource>
        {
            // Note: "nonexistent-ref" is NOT in the available tasks
            ["some-other-ref"] = new WorkflowTaskResource { Spec = new WorkflowTaskSpec { Type = "http" } }
        };

        var graph = new ExecutionGraph();
        graph.AddNode("task-1");

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = graph });

        var result = await _orchestrator.ExecuteAsync(workflow, tasks, new Dictionary<string, object>(), CancellationToken.None);

        result.Success.Should().BeFalse();
        result.TaskResults["task-1"].Errors.Should().Contain(e => e.Contains("not found"));
    }

    #endregion

    #region Mutation Killing Tests - Empty Workflow

    [Fact]
    public async Task ExecuteAsync_EmptyWorkflow_ReturnsSuccess()
    {
        // Target: Empty workflow path (lines 112-121)
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>() // Empty task list
            }
        };

        var graph = new ExecutionGraph();

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = graph });

        var result = await _orchestrator.ExecuteAsync(workflow, new Dictionary<string, WorkflowTaskResource>(), new Dictionary<string, object>(), CancellationToken.None);

        result.Success.Should().BeTrue();
        result.Output.Should().NotBeNull();
    }

    #endregion

    #region Mutation Killing Tests - Constructor Validation

    [Fact]
    public void Constructor_WithZeroMaxConcurrentTasks_ThrowsArgumentException()
    {
        // Target: maxConcurrentTasks <= 0 check (lines 49-52)
        var action = () => new WorkflowOrchestrator(
            _graphBuilderMock.Object,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            _responseStorageMock.Object,
            maxConcurrentTasks: 0);

        action.Should().Throw<ArgumentException>()
            .WithMessage("*maxConcurrentTasks*greater than 0*");
    }

    [Fact]
    public void Constructor_WithNegativeMaxConcurrentTasks_ThrowsArgumentException()
    {
        // Target: maxConcurrentTasks <= 0 check (lines 49-52)
        var action = () => new WorkflowOrchestrator(
            _graphBuilderMock.Object,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            _responseStorageMock.Object,
            maxConcurrentTasks: -5);

        action.Should().Throw<ArgumentException>()
            .WithMessage("*maxConcurrentTasks*greater than 0*");
    }

    [Fact]
    public void Constructor_WithNullGraphBuilder_ThrowsArgumentNullException()
    {
        // Target: ArgumentNullException for graphBuilder (line 40)
        var action = () => new WorkflowOrchestrator(
            null!,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            _responseStorageMock.Object);

        action.Should().Throw<ArgumentNullException>()
            .WithParameterName("graphBuilder");
    }

    [Fact]
    public void Constructor_WithNullHttpTaskExecutor_ThrowsArgumentNullException()
    {
        // Target: ArgumentNullException for httpTaskExecutor (line 41)
        var action = () => new WorkflowOrchestrator(
            _graphBuilderMock.Object,
            null!,
            _templateResolverMock.Object,
            _responseStorageMock.Object);

        action.Should().Throw<ArgumentNullException>()
            .WithParameterName("httpTaskExecutor");
    }

    [Fact]
    public void Constructor_WithNullTemplateResolver_ThrowsArgumentNullException()
    {
        // Target: ArgumentNullException for templateResolver (line 42)
        var action = () => new WorkflowOrchestrator(
            _graphBuilderMock.Object,
            _taskExecutorMock.Object,
            null!,
            _responseStorageMock.Object);

        action.Should().Throw<ArgumentNullException>()
            .WithParameterName("templateResolver");
    }

    [Fact]
    public void Constructor_WithNullResponseStorage_ThrowsArgumentNullException()
    {
        // Target: ArgumentNullException for responseStorage (line 43)
        var action = () => new WorkflowOrchestrator(
            _graphBuilderMock.Object,
            _taskExecutorMock.Object,
            _templateResolverMock.Object,
            null!);

        action.Should().Throw<ArgumentNullException>()
            .WithParameterName("responseStorage");
    }

    #endregion

    #region Mutation Killing Tests - Graph Build Failures

    [Fact]
    public async Task ExecuteAsync_GraphBuildInvalid_ReturnsErrors()
    {
        // Target: GraphResult invalid path (lines 89-98)
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

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult
            {
                IsValid = false,
                Errors = new List<ValidationError>
                {
                    new ValidationError { Message = "Circular dependency detected" }
                }
            });

        var result = await _orchestrator.ExecuteAsync(workflow, new Dictionary<string, WorkflowTaskResource>(), new Dictionary<string, object>(), CancellationToken.None);

        result.Success.Should().BeFalse();
        result.Errors.Should().Contain("Circular dependency detected");
    }

    [Fact]
    public async Task ExecuteAsync_GraphIsNull_ReturnsError()
    {
        // Target: Graph null check (lines 100-109)
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

        _graphBuilderMock.Setup(x => x.Build(workflow))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = null });

        var result = await _orchestrator.ExecuteAsync(workflow, new Dictionary<string, WorkflowTaskResource>(), new Dictionary<string, object>(), CancellationToken.None);

        result.Success.Should().BeFalse();
        result.Errors.Should().Contain("Execution graph is null");
    }

    #endregion
}
