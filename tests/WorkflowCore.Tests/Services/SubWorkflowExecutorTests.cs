using System.Collections.Concurrent;
using FluentAssertions;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class SubWorkflowExecutorTests
{
    private readonly Mock<IWorkflowOrchestrator> _mockOrchestrator;
    private readonly Mock<IWorkflowRefResolver> _mockResolver;
    private readonly Mock<IWorkflowCycleDetector> _mockCycleDetector;
    private readonly SubWorkflowExecutor _executor;

    public SubWorkflowExecutorTests()
    {
        _mockOrchestrator = new Mock<IWorkflowOrchestrator>();
        _mockResolver = new Mock<IWorkflowRefResolver>();
        _mockCycleDetector = new Mock<IWorkflowCycleDetector>();

        // Default: allow execution (no cycles)
        _mockCycleDetector
            .Setup(x => x.CheckBeforeExecution(It.IsAny<string>(), It.IsAny<WorkflowCallStack>()))
            .Returns(CycleDetectionResult.Success());

        _executor = new SubWorkflowExecutor(_mockOrchestrator.Object, _mockResolver.Object, _mockCycleDetector.Object);
    }

    // ========== BASIC EXECUTION TESTS ==========

    [Fact]
    public async Task ExecuteAsync_SimpleSubWorkflow_ShouldReturnSuccess()
    {
        // Arrange
        var subWorkflow = CreateWorkflow("sub-workflow", new[]
        {
            new WorkflowTaskStep { Id = "task-1", TaskRef = "http-task" }
        });

        var availableTasks = new Dictionary<string, WorkflowTaskResource>();
        var availableWorkflows = new Dictionary<string, WorkflowResource>
        {
            ["default/sub-workflow"] = subWorkflow
        };

        var parentContext = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["userId"] = "123" }
        };

        var inputMappings = new Dictionary<string, string>
        {
            ["id"] = "{{input.userId}}"
        };

        _mockOrchestrator
            .Setup(x => x.ExecuteAsync(
                subWorkflow,
                availableTasks,
                It.IsAny<Dictionary<string, object>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                Output = new Dictionary<string, object> { ["result"] = "success" }
            });

        // Act
        var result = await _executor.ExecuteAsync(
            subWorkflow,
            availableTasks,
            availableWorkflows,
            parentContext,
            inputMappings,
            timeout: null,
            callStack: null,
            CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Output.Should().ContainKey("result");
        result.Output["result"].Should().Be("success");
    }

    [Fact]
    public async Task ExecuteAsync_WithInputMapping_ShouldResolveTemplates()
    {
        // Arrange
        var subWorkflow = CreateWorkflow("sub-workflow");
        var availableTasks = new Dictionary<string, WorkflowTaskResource>();
        var availableWorkflows = new Dictionary<string, WorkflowResource>();

        var parentContext = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["orderId"] = "ORD-456",
                ["priority"] = "high"
            }
        };

        var inputMappings = new Dictionary<string, string>
        {
            ["order"] = "{{input.orderId}}",
            ["level"] = "{{input.priority}}"
        };

        Dictionary<string, object>? capturedInputs = null;
        _mockOrchestrator
            .Setup(x => x.ExecuteAsync(
                subWorkflow,
                availableTasks,
                It.IsAny<Dictionary<string, object>>(),
                It.IsAny<CancellationToken>()))
            .Callback<WorkflowResource, Dictionary<string, WorkflowTaskResource>, Dictionary<string, object>, CancellationToken>(
                (_, _, inputs, _) => capturedInputs = inputs)
            .ReturnsAsync(new WorkflowExecutionResult { Success = true });

        // Act
        await _executor.ExecuteAsync(
            subWorkflow,
            availableTasks,
            availableWorkflows,
            parentContext,
            inputMappings,
            timeout: null,
            callStack: null,
            CancellationToken.None);

        // Assert
        capturedInputs.Should().NotBeNull();
        capturedInputs!["order"].Should().Be("ORD-456");
        capturedInputs["level"].Should().Be("high");
    }

    [Fact]
    public async Task ExecuteAsync_AccessParentTaskOutputs_ShouldResolve()
    {
        // Arrange
        var subWorkflow = CreateWorkflow("sub-workflow");
        var availableTasks = new Dictionary<string, WorkflowTaskResource>();
        var availableWorkflows = new Dictionary<string, WorkflowResource>();

        var parentContext = new TemplateContext
        {
            Input = new Dictionary<string, object>(),
            TaskOutputs = new ConcurrentDictionary<string, Dictionary<string, object>>(
                new Dictionary<string, Dictionary<string, object>>
                {
                    ["fetch-user"] = new Dictionary<string, object>
                    {
                        ["body"] = new Dictionary<string, object>
                        {
                            ["customerId"] = "CUST-789"
                        }
                    }
                })
        };

        var inputMappings = new Dictionary<string, string>
        {
            ["customer"] = "{{tasks.fetch-user.output.body.customerId}}"
        };

        Dictionary<string, object>? capturedInputs = null;
        _mockOrchestrator
            .Setup(x => x.ExecuteAsync(
                subWorkflow,
                availableTasks,
                It.IsAny<Dictionary<string, object>>(),
                It.IsAny<CancellationToken>()))
            .Callback<WorkflowResource, Dictionary<string, WorkflowTaskResource>, Dictionary<string, object>, CancellationToken>(
                (_, _, inputs, _) => capturedInputs = inputs)
            .ReturnsAsync(new WorkflowExecutionResult { Success = true });

        // Act
        await _executor.ExecuteAsync(
            subWorkflow,
            availableTasks,
            availableWorkflows,
            parentContext,
            inputMappings,
            timeout: null,
            callStack: null,
            CancellationToken.None);

        // Assert
        capturedInputs.Should().NotBeNull();
        capturedInputs!["customer"].Should().Be("CUST-789");
    }

    // ========== CONTEXT ISOLATION TESTS ==========

    [Fact]
    public async Task ExecuteAsync_SubWorkflowTaskOutputs_ShouldNotPolluteParent()
    {
        // Arrange
        var subWorkflow = CreateWorkflow("sub-workflow");
        var availableTasks = new Dictionary<string, WorkflowTaskResource>();
        var availableWorkflows = new Dictionary<string, WorkflowResource>();

        var parentContext = new TemplateContext
        {
            Input = new Dictionary<string, object>(),
            TaskOutputs = new ConcurrentDictionary<string, Dictionary<string, object>>(
                new Dictionary<string, Dictionary<string, object>>
                {
                    ["parent-task"] = new Dictionary<string, object> { ["data"] = "parent-data" }
                })
        };

        _mockOrchestrator
            .Setup(x => x.ExecuteAsync(
                subWorkflow,
                availableTasks,
                It.IsAny<Dictionary<string, object>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                TaskResults = new Dictionary<string, TaskExecutionResult>
                {
                    ["sub-task"] = new TaskExecutionResult
                    {
                        Success = true,
                        Output = new Dictionary<string, object> { ["subData"] = "sub-data" }
                    }
                }
            });

        // Act
        await _executor.ExecuteAsync(
            subWorkflow,
            availableTasks,
            availableWorkflows,
            parentContext,
            new Dictionary<string, string>(),
            timeout: null,
            callStack: null,
            CancellationToken.None);

        // Assert - Parent context should not have sub-workflow's task outputs
        parentContext.TaskOutputs.Should().ContainKey("parent-task");
        parentContext.TaskOutputs.Should().NotContainKey("sub-task");
    }

    [Fact]
    public async Task ExecuteAsync_SubWorkflowOutput_ShouldBecomeTaskResult()
    {
        // Arrange
        var subWorkflow = CreateWorkflow("sub-workflow");
        subWorkflow.Spec.Output = new Dictionary<string, string>
        {
            ["processedData"] = "{{tasks.transform.output.result}}"
        };

        var availableTasks = new Dictionary<string, WorkflowTaskResource>();
        var availableWorkflows = new Dictionary<string, WorkflowResource>();
        var parentContext = new TemplateContext { Input = new Dictionary<string, object>() };

        _mockOrchestrator
            .Setup(x => x.ExecuteAsync(
                subWorkflow,
                availableTasks,
                It.IsAny<Dictionary<string, object>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                Output = new Dictionary<string, object>
                {
                    ["processedData"] = new List<object> { 1, 2, 3 }
                }
            });

        // Act
        var result = await _executor.ExecuteAsync(
            subWorkflow,
            availableTasks,
            availableWorkflows,
            parentContext,
            new Dictionary<string, string>(),
            timeout: null,
            callStack: null,
            CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Output.Should().ContainKey("processedData");
    }

    // ========== ERROR HANDLING TESTS ==========

    [Fact]
    public async Task ExecuteAsync_SubWorkflowFails_ShouldPropagateError()
    {
        // Arrange
        var subWorkflow = CreateWorkflow("failing-workflow");
        var availableTasks = new Dictionary<string, WorkflowTaskResource>();
        var availableWorkflows = new Dictionary<string, WorkflowResource>();
        var parentContext = new TemplateContext { Input = new Dictionary<string, object>() };

        _mockOrchestrator
            .Setup(x => x.ExecuteAsync(
                subWorkflow,
                availableTasks,
                It.IsAny<Dictionary<string, object>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = false,
                Errors = new List<string> { "Task 'process-data' failed: Connection refused" }
            });

        // Act
        var result = await _executor.ExecuteAsync(
            subWorkflow,
            availableTasks,
            availableWorkflows,
            parentContext,
            new Dictionary<string, string>(),
            timeout: null,
            callStack: null,
            CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("process-data"));
    }

    [Fact]
    public async Task ExecuteAsync_TemplateResolutionFails_ShouldReturnError()
    {
        // Arrange
        var subWorkflow = CreateWorkflow("sub-workflow");
        var availableTasks = new Dictionary<string, WorkflowTaskResource>();
        var availableWorkflows = new Dictionary<string, WorkflowResource>();
        var parentContext = new TemplateContext { Input = new Dictionary<string, object>() };

        var inputMappings = new Dictionary<string, string>
        {
            ["missing"] = "{{tasks.nonexistent.output.data}}"
        };

        // Act
        var result = await _executor.ExecuteAsync(
            subWorkflow,
            availableTasks,
            availableWorkflows,
            parentContext,
            inputMappings,
            timeout: null,
            callStack: null,
            CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("nonexistent") || e.Contains("resolve"));
    }

    // ========== TIMEOUT TESTS ==========

    [Fact]
    public async Task ExecuteAsync_WithTimeout_ShouldPassToCancellationToken()
    {
        // Arrange
        var subWorkflow = CreateWorkflow("slow-workflow");
        var availableTasks = new Dictionary<string, WorkflowTaskResource>();
        var availableWorkflows = new Dictionary<string, WorkflowResource>();
        var parentContext = new TemplateContext { Input = new Dictionary<string, object>() };

        _mockOrchestrator
            .Setup(x => x.ExecuteAsync(
                subWorkflow,
                availableTasks,
                It.IsAny<Dictionary<string, object>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult { Success = true });

        // Act
        var result = await _executor.ExecuteAsync(
            subWorkflow,
            availableTasks,
            availableWorkflows,
            parentContext,
            new Dictionary<string, string>(),
            timeout: "30s",
            callStack: null,
            CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        _mockOrchestrator.Verify(x => x.ExecuteAsync(
            subWorkflow,
            availableTasks,
            It.IsAny<Dictionary<string, object>>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_TimeoutExpires_ShouldReturnTimeoutError()
    {
        // Arrange
        var subWorkflow = CreateWorkflow("slow-workflow");
        var availableTasks = new Dictionary<string, WorkflowTaskResource>();
        var availableWorkflows = new Dictionary<string, WorkflowResource>();
        var parentContext = new TemplateContext { Input = new Dictionary<string, object>() };

        _mockOrchestrator
            .Setup(x => x.ExecuteAsync(
                subWorkflow,
                availableTasks,
                It.IsAny<Dictionary<string, object>>(),
                It.IsAny<CancellationToken>()))
            .Returns(async (WorkflowResource _, Dictionary<string, WorkflowTaskResource> _, Dictionary<string, object> _, CancellationToken ct) =>
            {
                await Task.Delay(TimeSpan.FromSeconds(5), ct);
                return new WorkflowExecutionResult { Success = true };
            });

        // Act
        var result = await _executor.ExecuteAsync(
            subWorkflow,
            availableTasks,
            availableWorkflows,
            parentContext,
            new Dictionary<string, string>(),
            timeout: "100ms",
            callStack: null,
            CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("timeout", StringComparison.OrdinalIgnoreCase));
    }

    // ========== TIMING TESTS ==========

    [Fact]
    public async Task ExecuteAsync_ShouldSetStartedAndCompletedTimes()
    {
        // Arrange
        var subWorkflow = CreateWorkflow("sub-workflow");
        var availableTasks = new Dictionary<string, WorkflowTaskResource>();
        var availableWorkflows = new Dictionary<string, WorkflowResource>();
        var parentContext = new TemplateContext { Input = new Dictionary<string, object>() };

        var beforeExecution = DateTime.UtcNow;

        _mockOrchestrator
            .Setup(x => x.ExecuteAsync(
                subWorkflow,
                availableTasks,
                It.IsAny<Dictionary<string, object>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult { Success = true });

        // Act
        var result = await _executor.ExecuteAsync(
            subWorkflow,
            availableTasks,
            availableWorkflows,
            parentContext,
            new Dictionary<string, string>(),
            timeout: null,
            callStack: null,
            CancellationToken.None);

        var afterExecution = DateTime.UtcNow;

        // Assert
        result.StartedAt.Should().BeOnOrAfter(beforeExecution);
        result.CompletedAt.Should().BeOnOrAfter(result.StartedAt);
        result.CompletedAt.Should().BeOnOrBefore(afterExecution);
        result.Duration.Should().BeGreaterOrEqualTo(TimeSpan.Zero);
    }

    // ========== NULL/EMPTY INPUT TESTS ==========

    [Fact]
    public async Task ExecuteAsync_EmptyInputMappings_ShouldSucceed()
    {
        // Arrange
        var subWorkflow = CreateWorkflow("sub-workflow");
        var availableTasks = new Dictionary<string, WorkflowTaskResource>();
        var availableWorkflows = new Dictionary<string, WorkflowResource>();
        var parentContext = new TemplateContext { Input = new Dictionary<string, object>() };

        _mockOrchestrator
            .Setup(x => x.ExecuteAsync(
                subWorkflow,
                availableTasks,
                It.IsAny<Dictionary<string, object>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult { Success = true });

        // Act
        var result = await _executor.ExecuteAsync(
            subWorkflow,
            availableTasks,
            availableWorkflows,
            parentContext,
            new Dictionary<string, string>(), // Empty
            timeout: null,
            callStack: null,
            CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
    }

    [Fact]
    public async Task ExecuteAsync_NullSubWorkflow_ShouldThrowArgumentNullException()
    {
        // Arrange
        var availableTasks = new Dictionary<string, WorkflowTaskResource>();
        var availableWorkflows = new Dictionary<string, WorkflowResource>();
        var parentContext = new TemplateContext { Input = new Dictionary<string, object>() };

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentNullException>(() =>
            _executor.ExecuteAsync(
                null!,
                availableTasks,
                availableWorkflows,
                parentContext,
                new Dictionary<string, string>(),
                timeout: null,
                callStack: null,
                CancellationToken.None));
    }

    // ========== CANCELLATION TESTS ==========

    [Fact]
    public async Task ExecuteAsync_CancellationRequested_ShouldThrow()
    {
        // Arrange
        var subWorkflow = CreateWorkflow("sub-workflow");
        var availableTasks = new Dictionary<string, WorkflowTaskResource>();
        var availableWorkflows = new Dictionary<string, WorkflowResource>();
        var parentContext = new TemplateContext { Input = new Dictionary<string, object>() };

        var cts = new CancellationTokenSource();
        cts.Cancel();

        // Act & Assert
        await Assert.ThrowsAsync<OperationCanceledException>(() =>
            _executor.ExecuteAsync(
                subWorkflow,
                availableTasks,
                availableWorkflows,
                parentContext,
                new Dictionary<string, string>(),
                timeout: null,
                callStack: null,
                cts.Token));
    }

    // ========== CYCLE DETECTION TESTS ==========

    [Fact]
    public async Task ExecuteAsync_CycleDetected_ShouldReturnError()
    {
        // Arrange
        var subWorkflow = CreateWorkflow("workflow-a");
        var availableTasks = new Dictionary<string, WorkflowTaskResource>();
        var availableWorkflows = new Dictionary<string, WorkflowResource>();
        var parentContext = new TemplateContext { Input = new Dictionary<string, object>() };

        _mockCycleDetector
            .Setup(x => x.CheckBeforeExecution("workflow-a", It.IsAny<WorkflowCallStack>()))
            .Returns(CycleDetectionResult.CycleDetected("workflow-a → workflow-b → workflow-a", "workflow-a"));

        // Act
        var result = await _executor.ExecuteAsync(
            subWorkflow,
            availableTasks,
            availableWorkflows,
            parentContext,
            new Dictionary<string, string>(),
            timeout: null,
            callStack: null,
            CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("Cycle detected"));
        _mockOrchestrator.Verify(x => x.ExecuteAsync(
            It.IsAny<WorkflowResource>(),
            It.IsAny<Dictionary<string, WorkflowTaskResource>>(),
            It.IsAny<Dictionary<string, object>>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ExecuteAsync_MaxDepthExceeded_ShouldReturnError()
    {
        // Arrange
        var subWorkflow = CreateWorkflow("workflow-d");
        var availableTasks = new Dictionary<string, WorkflowTaskResource>();
        var availableWorkflows = new Dictionary<string, WorkflowResource>();
        var parentContext = new TemplateContext { Input = new Dictionary<string, object>() };

        _mockCycleDetector
            .Setup(x => x.CheckBeforeExecution("workflow-d", It.IsAny<WorkflowCallStack>()))
            .Returns(CycleDetectionResult.MaxDepthExceeded(5, "a → b → c → d → e → workflow-d"));

        // Act
        var result = await _executor.ExecuteAsync(
            subWorkflow,
            availableTasks,
            availableWorkflows,
            parentContext,
            new Dictionary<string, string>(),
            timeout: null,
            callStack: null,
            CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("Maximum nesting depth"));
        _mockOrchestrator.Verify(x => x.ExecuteAsync(
            It.IsAny<WorkflowResource>(),
            It.IsAny<Dictionary<string, WorkflowTaskResource>>(),
            It.IsAny<Dictionary<string, object>>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ExecuteAsync_NoCycle_ShouldExecuteWorkflow()
    {
        // Arrange
        var subWorkflow = CreateWorkflow("workflow-c");
        var availableTasks = new Dictionary<string, WorkflowTaskResource>();
        var availableWorkflows = new Dictionary<string, WorkflowResource>();
        var parentContext = new TemplateContext { Input = new Dictionary<string, object>() };

        _mockCycleDetector
            .Setup(x => x.CheckBeforeExecution("workflow-c", It.IsAny<WorkflowCallStack>()))
            .Returns(CycleDetectionResult.Success());

        _mockOrchestrator
            .Setup(x => x.ExecuteAsync(
                subWorkflow,
                availableTasks,
                It.IsAny<Dictionary<string, object>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult { Success = true });

        // Act
        var result = await _executor.ExecuteAsync(
            subWorkflow,
            availableTasks,
            availableWorkflows,
            parentContext,
            new Dictionary<string, string>(),
            timeout: null,
            callStack: null,
            CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        _mockOrchestrator.Verify(x => x.ExecuteAsync(
            subWorkflow,
            availableTasks,
            It.IsAny<Dictionary<string, object>>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_WithExistingCallStack_ShouldPassToDetector()
    {
        // Arrange
        var subWorkflow = CreateWorkflow("workflow-b");
        var availableTasks = new Dictionary<string, WorkflowTaskResource>();
        var availableWorkflows = new Dictionary<string, WorkflowResource>();
        var parentContext = new TemplateContext { Input = new Dictionary<string, object>() };

        var existingCallStack = new WorkflowCallStack();
        existingCallStack.Push("workflow-a");

        WorkflowCallStack? capturedCallStack = null;
        _mockCycleDetector
            .Setup(x => x.CheckBeforeExecution("workflow-b", It.IsAny<WorkflowCallStack>()))
            .Callback<string, WorkflowCallStack>((_, stack) => capturedCallStack = stack)
            .Returns(CycleDetectionResult.Success());

        _mockOrchestrator
            .Setup(x => x.ExecuteAsync(
                subWorkflow,
                availableTasks,
                It.IsAny<Dictionary<string, object>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult { Success = true });

        // Act
        await _executor.ExecuteAsync(
            subWorkflow,
            availableTasks,
            availableWorkflows,
            parentContext,
            new Dictionary<string, string>(),
            timeout: null,
            callStack: existingCallStack,
            CancellationToken.None);

        // Assert
        capturedCallStack.Should().NotBeNull();
        capturedCallStack!.WorkflowNames.Should().Contain("workflow-a");
    }

    [Fact]
    public async Task ExecuteAsync_CallStackPopAfterExecution_ShouldRestore()
    {
        // Arrange
        var subWorkflow = CreateWorkflow("workflow-b");
        var availableTasks = new Dictionary<string, WorkflowTaskResource>();
        var availableWorkflows = new Dictionary<string, WorkflowResource>();
        var parentContext = new TemplateContext { Input = new Dictionary<string, object>() };

        var callStack = new WorkflowCallStack();
        callStack.Push("workflow-a");

        _mockOrchestrator
            .Setup(x => x.ExecuteAsync(
                subWorkflow,
                availableTasks,
                It.IsAny<Dictionary<string, object>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult { Success = true });

        // Act
        await _executor.ExecuteAsync(
            subWorkflow,
            availableTasks,
            availableWorkflows,
            parentContext,
            new Dictionary<string, string>(),
            timeout: null,
            callStack: callStack,
            CancellationToken.None);

        // Assert - Call stack should be back to just workflow-a
        callStack.CurrentDepth.Should().Be(1);
        callStack.WorkflowNames.Should().ContainSingle()
            .Which.Should().Be("workflow-a");
    }

    [Fact]
    public async Task ExecuteAsync_CallStackPopAfterFailure_ShouldStillRestore()
    {
        // Arrange
        var subWorkflow = CreateWorkflow("workflow-b");
        var availableTasks = new Dictionary<string, WorkflowTaskResource>();
        var availableWorkflows = new Dictionary<string, WorkflowResource>();
        var parentContext = new TemplateContext { Input = new Dictionary<string, object>() };

        var callStack = new WorkflowCallStack();
        callStack.Push("workflow-a");

        _mockOrchestrator
            .Setup(x => x.ExecuteAsync(
                subWorkflow,
                availableTasks,
                It.IsAny<Dictionary<string, object>>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = false,
                Errors = new List<string> { "Some error" }
            });

        // Act
        await _executor.ExecuteAsync(
            subWorkflow,
            availableTasks,
            availableWorkflows,
            parentContext,
            new Dictionary<string, string>(),
            timeout: null,
            callStack: callStack,
            CancellationToken.None);

        // Assert - Call stack should be restored even after failure
        callStack.CurrentDepth.Should().Be(1);
        callStack.WorkflowNames.Should().ContainSingle()
            .Which.Should().Be("workflow-a");
    }

    // ========== HELPER METHODS ==========

    private static WorkflowResource CreateWorkflow(string name, WorkflowTaskStep[]? tasks = null)
    {
        return new WorkflowResource
        {
            ApiVersion = "workflows.example.com/v1",
            Kind = "Workflow",
            Metadata = new ResourceMetadata
            {
                Name = name,
                Namespace = "default"
            },
            Spec = new WorkflowSpec
            {
                Tasks = tasks?.ToList() ?? new List<WorkflowTaskStep>()
            }
        };
    }
}
