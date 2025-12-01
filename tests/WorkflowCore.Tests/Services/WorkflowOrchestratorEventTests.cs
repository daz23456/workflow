using FluentAssertions;
using Moq;
using WorkflowCore.Interfaces;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class WorkflowOrchestratorEventTests
{
    private readonly Mock<IExecutionGraphBuilder> _mockGraphBuilder;
    private readonly Mock<IHttpTaskExecutor> _mockHttpExecutor;
    private readonly Mock<ITemplateResolver> _mockTemplateResolver;
    private readonly Mock<IResponseStorage> _mockResponseStorage;
    private readonly Mock<IWorkflowEventNotifier> _mockEventNotifier;
    private readonly WorkflowOrchestrator _orchestrator;

    public WorkflowOrchestratorEventTests()
    {
        _mockGraphBuilder = new Mock<IExecutionGraphBuilder>();
        _mockHttpExecutor = new Mock<IHttpTaskExecutor>();
        _mockTemplateResolver = new Mock<ITemplateResolver>();
        _mockResponseStorage = new Mock<IResponseStorage>();
        _mockEventNotifier = new Mock<IWorkflowEventNotifier>();

        _orchestrator = new WorkflowOrchestrator(
            _mockGraphBuilder.Object,
            _mockHttpExecutor.Object,
            _mockTemplateResolver.Object,
            _mockResponseStorage.Object,
            maxConcurrentTasks: 10,
            transformTaskExecutor: null,
            eventNotifier: _mockEventNotifier.Object
        );
    }

    [Fact]
    public async Task ExecuteAsync_WithEventNotifier_EmitsWorkflowStartedEvent()
    {
        // Arrange
        var workflow = CreateSimpleWorkflow("test-workflow");
        var availableTasks = CreateAvailableTasks();
        var inputs = new Dictionary<string, object>();

        SetupSuccessfulExecution();

        // Act
        await _orchestrator.ExecuteAsync(workflow, availableTasks, inputs);

        // Assert
        _mockEventNotifier.Verify(
            n => n.OnWorkflowStartedAsync(
                It.Is<Guid>(id => id != Guid.Empty),
                "test-workflow",
                It.IsAny<DateTime>()
            ),
            Times.Once
        );
    }

    [Fact]
    public async Task ExecuteAsync_WithEventNotifier_EmitsTaskStartedEvent()
    {
        // Arrange
        var workflow = CreateSimpleWorkflow("test-workflow");
        var availableTasks = CreateAvailableTasks();
        var inputs = new Dictionary<string, object>();

        SetupSuccessfulExecution();

        // Act
        await _orchestrator.ExecuteAsync(workflow, availableTasks, inputs);

        // Assert
        _mockEventNotifier.Verify(
            n => n.OnTaskStartedAsync(
                It.IsAny<Guid>(),
                "task1",
                "fetch-user",
                It.IsAny<DateTime>()
            ),
            Times.Once
        );
    }

    [Fact]
    public async Task ExecuteAsync_WithEventNotifier_EmitsTaskCompletedEventOnSuccess()
    {
        // Arrange
        var workflow = CreateSimpleWorkflow("test-workflow");
        var availableTasks = CreateAvailableTasks();
        var inputs = new Dictionary<string, object>();

        SetupSuccessfulExecution();

        // Act
        await _orchestrator.ExecuteAsync(workflow, availableTasks, inputs);

        // Assert
        _mockEventNotifier.Verify(
            n => n.OnTaskCompletedAsync(
                It.IsAny<Guid>(),
                "task1",
                "fetch-user",
                "Succeeded",
                It.IsAny<Dictionary<string, object>>(),
                It.IsAny<TimeSpan>(),
                It.IsAny<DateTime>()
            ),
            Times.Once
        );
    }

    [Fact]
    public async Task ExecuteAsync_WithEventNotifier_EmitsTaskCompletedEventOnFailure()
    {
        // Arrange
        var workflow = CreateSimpleWorkflow("test-workflow");
        var availableTasks = CreateAvailableTasks();
        var inputs = new Dictionary<string, object>();

        SetupFailedExecution();

        // Act
        await _orchestrator.ExecuteAsync(workflow, availableTasks, inputs);

        // Assert
        _mockEventNotifier.Verify(
            n => n.OnTaskCompletedAsync(
                It.IsAny<Guid>(),
                "task1",
                "fetch-user",
                "Failed",
                It.IsAny<Dictionary<string, object>>(),
                It.IsAny<TimeSpan>(),
                It.IsAny<DateTime>()
            ),
            Times.Once
        );
    }

    [Fact]
    public async Task ExecuteAsync_WithEventNotifier_EmitsWorkflowCompletedEventOnSuccess()
    {
        // Arrange
        var workflow = CreateSimpleWorkflow("test-workflow");
        var availableTasks = CreateAvailableTasks();
        var inputs = new Dictionary<string, object>();

        SetupSuccessfulExecution();

        // Act
        await _orchestrator.ExecuteAsync(workflow, availableTasks, inputs);

        // Assert
        _mockEventNotifier.Verify(
            n => n.OnWorkflowCompletedAsync(
                It.IsAny<Guid>(),
                "test-workflow",
                "Succeeded",
                It.IsAny<Dictionary<string, object>>(),
                It.IsAny<TimeSpan>(),
                It.IsAny<DateTime>()
            ),
            Times.Once
        );
    }

    [Fact]
    public async Task ExecuteAsync_WithEventNotifier_EmitsWorkflowCompletedEventOnFailure()
    {
        // Arrange
        var workflow = CreateSimpleWorkflow("test-workflow");
        var availableTasks = CreateAvailableTasks();
        var inputs = new Dictionary<string, object>();

        SetupFailedExecution();

        // Act
        await _orchestrator.ExecuteAsync(workflow, availableTasks, inputs);

        // Assert
        _mockEventNotifier.Verify(
            n => n.OnWorkflowCompletedAsync(
                It.IsAny<Guid>(),
                "test-workflow",
                "Failed",
                It.IsAny<Dictionary<string, object>>(),
                It.IsAny<TimeSpan>(),
                It.IsAny<DateTime>()
            ),
            Times.Once
        );
    }

    [Fact]
    public async Task ExecuteAsync_WithoutEventNotifier_DoesNotThrow()
    {
        // Arrange
        var orchestratorWithoutNotifier = new WorkflowOrchestrator(
            _mockGraphBuilder.Object,
            _mockHttpExecutor.Object,
            _mockTemplateResolver.Object,
            _mockResponseStorage.Object,
            maxConcurrentTasks: 10,
            transformTaskExecutor: null,
            eventNotifier: null
        );

        var workflow = CreateSimpleWorkflow("test-workflow");
        var availableTasks = CreateAvailableTasks();
        var inputs = new Dictionary<string, object>();

        SetupSuccessfulExecution();

        // Act
        var act = async () => await orchestratorWithoutNotifier.ExecuteAsync(workflow, availableTasks, inputs);

        // Assert
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task ExecuteAsync_WithMultipleTasks_EmitsEventsInCorrectOrder()
    {
        // Arrange
        var workflow = CreateWorkflowWithTwoTasks();
        var availableTasks = CreateAvailableTasks();
        var inputs = new Dictionary<string, object>();

        SetupTwoTaskExecution();

        var eventSequence = new List<string>();
        _mockEventNotifier
            .Setup(n => n.OnWorkflowStartedAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<DateTime>()))
            .Callback(() => eventSequence.Add("workflow_started"));

        _mockEventNotifier
            .Setup(n => n.OnTaskStartedAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<DateTime>()))
            .Callback(() => eventSequence.Add("task_started"));

        _mockEventNotifier
            .Setup(n => n.OnTaskCompletedAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<TimeSpan>(), It.IsAny<DateTime>()))
            .Callback(() => eventSequence.Add("task_completed"));

        _mockEventNotifier
            .Setup(n => n.OnWorkflowCompletedAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<TimeSpan>(), It.IsAny<DateTime>()))
            .Callback(() => eventSequence.Add("workflow_completed"));

        // Act
        await _orchestrator.ExecuteAsync(workflow, availableTasks, inputs);

        // Assert
        eventSequence.Should().HaveCount(6); // workflow_started + 2*(task_started + task_completed) + workflow_completed
        eventSequence[0].Should().Be("workflow_started");
        eventSequence.Last().Should().Be("workflow_completed");
    }

    private WorkflowResource CreateSimpleWorkflow(string name)
    {
        return new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = name, Namespace = "default" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task1", TaskRef = "fetch-user" }
                }
            }
        };
    }

    private WorkflowResource CreateWorkflowWithTwoTasks()
    {
        return new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "two-task-workflow", Namespace = "default" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task1", TaskRef = "fetch-user" },
                    new WorkflowTaskStep { Id = "task2", TaskRef = "fetch-user", DependsOn = new List<string> { "task1" } }
                }
            }
        };
    }

    private Dictionary<string, WorkflowTaskResource> CreateAvailableTasks()
    {
        return new Dictionary<string, WorkflowTaskResource>
        {
            ["fetch-user"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec { Type = "http" }
            }
        };
    }

    private void SetupSuccessfulExecution()
    {
        var graph = new ExecutionGraph();
        graph.AddNode("task1");

        _mockGraphBuilder
            .Setup(b => b.Build(It.IsAny<WorkflowResource>()))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = graph
            });

        _mockHttpExecutor
            .Setup(e => e.ExecuteAsync(It.IsAny<WorkflowTaskSpec>(), It.IsAny<TemplateContext>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TaskExecutionResult
            {
                Success = true,
                Output = new Dictionary<string, object> { ["status"] = "success" },
                Duration = TimeSpan.FromMilliseconds(100)
            });

        _mockTemplateResolver
            .Setup(r => r.ResolveAsync(It.IsAny<string>(), It.IsAny<TemplateContext>()))
            .ReturnsAsync((string template, TemplateContext ctx) => template);
    }

    private void SetupFailedExecution()
    {
        var graph = new ExecutionGraph();
        graph.AddNode("task1");

        _mockGraphBuilder
            .Setup(b => b.Build(It.IsAny<WorkflowResource>()))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = graph
            });

        _mockHttpExecutor
            .Setup(e => e.ExecuteAsync(It.IsAny<WorkflowTaskSpec>(), It.IsAny<TemplateContext>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TaskExecutionResult
            {
                Success = false,
                Errors = new List<string> { "HTTP request failed" },
                Duration = TimeSpan.FromMilliseconds(100)
            });

        _mockTemplateResolver
            .Setup(r => r.ResolveAsync(It.IsAny<string>(), It.IsAny<TemplateContext>()))
            .ReturnsAsync((string template, TemplateContext ctx) => template);
    }

    private void SetupTwoTaskExecution()
    {
        var graph = new ExecutionGraph();
        graph.AddNode("task1");
        graph.AddNode("task2");
        graph.AddDependency("task2", "task1");

        _mockGraphBuilder
            .Setup(b => b.Build(It.IsAny<WorkflowResource>()))
            .Returns(new ExecutionGraphResult
            {
                IsValid = true,
                Graph = graph
            });

        _mockHttpExecutor
            .Setup(e => e.ExecuteAsync(It.IsAny<WorkflowTaskSpec>(), It.IsAny<TemplateContext>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TaskExecutionResult
            {
                Success = true,
                Output = new Dictionary<string, object> { ["status"] = "success" },
                Duration = TimeSpan.FromMilliseconds(100)
            });

        _mockTemplateResolver
            .Setup(r => r.ResolveAsync(It.IsAny<string>(), It.IsAny<TemplateContext>()))
            .ReturnsAsync((string template, TemplateContext ctx) => template);
    }
}
