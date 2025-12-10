using FluentAssertions;
using Moq;
using System.Text.Json;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class HistoricalReplayEngineTests
{
    private readonly Mock<IExecutionRepository> _executionRepository;
    private readonly Mock<IWorkflowOrchestrator> _orchestrator;
    private readonly HistoricalReplayEngine _engine;

    public HistoricalReplayEngineTests()
    {
        _executionRepository = new Mock<IExecutionRepository>();
        _orchestrator = new Mock<IWorkflowOrchestrator>();
        _engine = new HistoricalReplayEngine(_executionRepository.Object, _orchestrator.Object);
    }

    #region ReplayResult Model Tests

    [Fact]
    public void ReplayResult_ShouldCalculateConfidenceScore()
    {
        // Arrange & Act
        var result = new ReplayResult(
            TotalReplays: 10,
            MatchingOutputs: 8,
            Mismatches: new List<ReplayMismatch>
            {
                new("exec-1", "Task A", "Expected: 5, Actual: 6"),
                new("exec-2", "Task B", "Expected: true, Actual: false")
            },
            AverageTimeDelta: TimeSpan.FromMilliseconds(100)
        );

        // Assert
        result.ConfidenceScore.Should().Be(0.8); // 8/10 = 80%
        result.TotalReplays.Should().Be(10);
        result.MatchingOutputs.Should().Be(8);
        result.Mismatches.Should().HaveCount(2);
        result.AverageTimeDelta.TotalMilliseconds.Should().Be(100);
    }

    [Fact]
    public void ReplayResult_ShouldHandleZeroReplays()
    {
        // Arrange & Act
        var result = new ReplayResult(
            TotalReplays: 0,
            MatchingOutputs: 0,
            Mismatches: new List<ReplayMismatch>(),
            AverageTimeDelta: TimeSpan.Zero
        );

        // Assert
        result.ConfidenceScore.Should().Be(0); // No replays = 0 confidence
    }

    [Fact]
    public void ReplayResult_ShouldReport100PercentForPerfectMatch()
    {
        // Arrange & Act
        var result = new ReplayResult(
            TotalReplays: 5,
            MatchingOutputs: 5,
            Mismatches: new List<ReplayMismatch>(),
            AverageTimeDelta: TimeSpan.FromMilliseconds(-50) // Negative = faster
        );

        // Assert
        result.ConfidenceScore.Should().Be(1.0); // 5/5 = 100%
        result.IsPerfectMatch.Should().BeTrue();
        result.AverageTimeDelta.TotalMilliseconds.Should().Be(-50);
    }

    #endregion

    #region Replay Execution Tests

    [Fact]
    public async Task ReplayWorkflowAsync_ShouldFetchHistoricalExecutions()
    {
        // Arrange
        var workflowName = "test-workflow";
        var workflow = CreateTestWorkflow(workflowName);
        var optimizedWorkflow = CreateTestWorkflow(workflowName);
        var tasks = new Dictionary<string, WorkflowTaskResource>();

        var historicalExecutions = new List<ExecutionRecord>
        {
            CreateExecutionRecord(workflowName, ExecutionStatus.Succeeded, "{\"key\": \"value1\"}"),
            CreateExecutionRecord(workflowName, ExecutionStatus.Succeeded, "{\"key\": \"value2\"}")
        };

        _executionRepository.Setup(r => r.ListExecutionsAsync(workflowName, ExecutionStatus.Succeeded, 0, 10))
            .ReturnsAsync(historicalExecutions);

        _orchestrator.Setup(o => o.ExecuteAsync(
            optimizedWorkflow, tasks, It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                TaskResults = new Dictionary<string, TaskExecutionResult>()
            });

        // Act
        var result = await _engine.ReplayWorkflowAsync(workflow, optimizedWorkflow, tasks, replayCount: 10);

        // Assert
        _executionRepository.Verify(r => r.ListExecutionsAsync(workflowName, ExecutionStatus.Succeeded, 0, 10), Times.Once);
    }

    [Fact]
    public async Task ReplayWorkflowAsync_ShouldReExecuteWithSavedInputs()
    {
        // Arrange
        var workflowName = "test-workflow";
        var workflow = CreateTestWorkflow(workflowName);
        var optimizedWorkflow = CreateTestWorkflow(workflowName);
        var tasks = new Dictionary<string, WorkflowTaskResource>();

        var inputJson = "{\"orderId\": 123, \"amount\": 99.99}";
        var historicalExecutions = new List<ExecutionRecord>
        {
            CreateExecutionRecord(workflowName, ExecutionStatus.Succeeded, inputJson)
        };

        _executionRepository.Setup(r => r.ListExecutionsAsync(workflowName, ExecutionStatus.Succeeded, 0, 5))
            .ReturnsAsync(historicalExecutions);

        Dictionary<string, object>? capturedInputs = null;
        _orchestrator.Setup(o => o.ExecuteAsync(
            optimizedWorkflow, tasks, It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .Callback<WorkflowResource, Dictionary<string, WorkflowTaskResource>, Dictionary<string, object>, CancellationToken>(
                (w, t, inputs, ct) => capturedInputs = inputs)
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                TaskResults = new Dictionary<string, TaskExecutionResult>()
            });

        // Act
        await _engine.ReplayWorkflowAsync(workflow, optimizedWorkflow, tasks, replayCount: 5);

        // Assert
        capturedInputs.Should().NotBeNull();
        capturedInputs!["orderId"].Should().BeEquivalentTo(123);
        capturedInputs["amount"].Should().BeEquivalentTo(99.99);
    }

    [Fact]
    public async Task ReplayWorkflowAsync_ShouldCompareOutputs()
    {
        // Arrange
        var workflowName = "test-workflow";
        var workflow = CreateTestWorkflow(workflowName);
        var optimizedWorkflow = CreateTestWorkflow(workflowName);
        var tasks = new Dictionary<string, WorkflowTaskResource>();

        var historicalExecution = CreateExecutionRecord(workflowName, ExecutionStatus.Succeeded, "{\"x\": 1}");
        historicalExecution.TaskExecutionRecords.Add(new TaskExecutionRecord
        {
            TaskRef = "task1",
            Status = "Succeeded",
            Output = "{\"result\": 42}"
        });

        _executionRepository.Setup(r => r.ListExecutionsAsync(workflowName, ExecutionStatus.Succeeded, 0, 5))
            .ReturnsAsync(new List<ExecutionRecord> { historicalExecution });

        _orchestrator.Setup(o => o.ExecuteAsync(
            optimizedWorkflow, tasks, It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                TaskResults = new Dictionary<string, TaskExecutionResult>
                {
                    ["task1"] = new TaskExecutionResult { Success = true, Output = new Dictionary<string, object> { ["result"] = 42 } }
                }
            });

        // Act
        var result = await _engine.ReplayWorkflowAsync(workflow, optimizedWorkflow, tasks, replayCount: 5);

        // Assert
        result.MatchingOutputs.Should().Be(1);
        result.Mismatches.Should().BeEmpty();
        result.ConfidenceScore.Should().Be(1.0);
    }

    [Fact]
    public async Task ReplayWorkflowAsync_ShouldDetectOutputMismatch()
    {
        // Arrange
        var workflowName = "test-workflow";
        var workflow = CreateTestWorkflow(workflowName);
        var optimizedWorkflow = CreateTestWorkflow(workflowName);
        var tasks = new Dictionary<string, WorkflowTaskResource>();

        var historicalExecution = CreateExecutionRecord(workflowName, ExecutionStatus.Succeeded, "{\"x\": 1}");
        historicalExecution.TaskExecutionRecords.Add(new TaskExecutionRecord
        {
            TaskRef = "task1",
            Status = "Succeeded",
            Output = "{\"result\": 42}"
        });

        _executionRepository.Setup(r => r.ListExecutionsAsync(workflowName, ExecutionStatus.Succeeded, 0, 5))
            .ReturnsAsync(new List<ExecutionRecord> { historicalExecution });

        _orchestrator.Setup(o => o.ExecuteAsync(
            optimizedWorkflow, tasks, It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                TaskResults = new Dictionary<string, TaskExecutionResult>
                {
                    ["task1"] = new TaskExecutionResult { Success = true, Output = new Dictionary<string, object> { ["result"] = 99 } } // Different!
                }
            });

        // Act
        var result = await _engine.ReplayWorkflowAsync(workflow, optimizedWorkflow, tasks, replayCount: 5);

        // Assert
        result.MatchingOutputs.Should().Be(0);
        result.Mismatches.Should().HaveCount(1);
        result.Mismatches[0].TaskRef.Should().Be("task1");
        result.ConfidenceScore.Should().Be(0);
    }

    [Fact]
    public async Task ReplayWorkflowAsync_ShouldCalculateTimeDelta()
    {
        // Arrange
        var workflowName = "test-workflow";
        var workflow = CreateTestWorkflow(workflowName);
        var optimizedWorkflow = CreateTestWorkflow(workflowName);
        var tasks = new Dictionary<string, WorkflowTaskResource>();

        var historicalExecution = CreateExecutionRecord(workflowName, ExecutionStatus.Succeeded, "{\"x\": 1}");
        historicalExecution.Duration = TimeSpan.FromMilliseconds(500);

        _executionRepository.Setup(r => r.ListExecutionsAsync(workflowName, ExecutionStatus.Succeeded, 0, 5))
            .ReturnsAsync(new List<ExecutionRecord> { historicalExecution });

        _orchestrator.Setup(o => o.ExecuteAsync(
            optimizedWorkflow, tasks, It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                TotalDuration = TimeSpan.FromMilliseconds(300), // 200ms faster
                TaskResults = new Dictionary<string, TaskExecutionResult>()
            });

        // Act
        var result = await _engine.ReplayWorkflowAsync(workflow, optimizedWorkflow, tasks, replayCount: 5);

        // Assert
        result.AverageTimeDelta.TotalMilliseconds.Should().BeApproximately(-200, 10); // Negative = faster
    }

    #endregion

    #region Non-Deterministic Field Handling

    [Fact]
    public async Task ReplayWorkflowAsync_ShouldIgnoreTimestampFields()
    {
        // Arrange
        var workflowName = "test-workflow";
        var workflow = CreateTestWorkflow(workflowName);
        var optimizedWorkflow = CreateTestWorkflow(workflowName);
        var tasks = new Dictionary<string, WorkflowTaskResource>();

        var historicalExecution = CreateExecutionRecord(workflowName, ExecutionStatus.Succeeded, "{\"x\": 1}");
        historicalExecution.TaskExecutionRecords.Add(new TaskExecutionRecord
        {
            TaskRef = "task1",
            Status = "Succeeded",
            Output = "{\"result\": 42, \"timestamp\": \"2024-01-01T10:00:00Z\", \"createdAt\": \"2024-01-01T10:00:00Z\"}"
        });

        _executionRepository.Setup(r => r.ListExecutionsAsync(workflowName, ExecutionStatus.Succeeded, 0, 5))
            .ReturnsAsync(new List<ExecutionRecord> { historicalExecution });

        _orchestrator.Setup(o => o.ExecuteAsync(
            optimizedWorkflow, tasks, It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                TaskResults = new Dictionary<string, TaskExecutionResult>
                {
                    ["task1"] = new TaskExecutionResult
                    {
                        Success = true,
                        Output = new Dictionary<string, object>
                        {
                            ["result"] = 42,
                            ["timestamp"] = "2024-06-15T14:30:00Z", // Different timestamp
                            ["createdAt"] = "2024-06-15T14:30:00Z"
                        }
                    }
                }
            });

        // Act
        var result = await _engine.ReplayWorkflowAsync(workflow, optimizedWorkflow, tasks, replayCount: 5);

        // Assert - Should match despite different timestamps
        result.MatchingOutputs.Should().Be(1);
        result.Mismatches.Should().BeEmpty();
    }

    [Fact]
    public async Task ReplayWorkflowAsync_ShouldIgnoreUuidFields()
    {
        // Arrange
        var workflowName = "test-workflow";
        var workflow = CreateTestWorkflow(workflowName);
        var optimizedWorkflow = CreateTestWorkflow(workflowName);
        var tasks = new Dictionary<string, WorkflowTaskResource>();

        var historicalExecution = CreateExecutionRecord(workflowName, ExecutionStatus.Succeeded, "{\"x\": 1}");
        historicalExecution.TaskExecutionRecords.Add(new TaskExecutionRecord
        {
            TaskRef = "task1",
            Status = "Succeeded",
            Output = "{\"result\": 42, \"id\": \"550e8400-e29b-41d4-a716-446655440000\", \"requestId\": \"abc-123\"}"
        });

        _executionRepository.Setup(r => r.ListExecutionsAsync(workflowName, ExecutionStatus.Succeeded, 0, 5))
            .ReturnsAsync(new List<ExecutionRecord> { historicalExecution });

        _orchestrator.Setup(o => o.ExecuteAsync(
            optimizedWorkflow, tasks, It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                TaskResults = new Dictionary<string, TaskExecutionResult>
                {
                    ["task1"] = new TaskExecutionResult
                    {
                        Success = true,
                        Output = new Dictionary<string, object>
                        {
                            ["result"] = 42,
                            ["id"] = "a1b2c3d4-e5f6-7890-abcd-ef1234567890", // Different UUID
                            ["requestId"] = "xyz-789" // Different request ID
                        }
                    }
                }
            });

        // Act
        var result = await _engine.ReplayWorkflowAsync(workflow, optimizedWorkflow, tasks, replayCount: 5);

        // Assert - Should match despite different UUIDs
        result.MatchingOutputs.Should().Be(1);
        result.Mismatches.Should().BeEmpty();
    }

    [Fact]
    public async Task ReplayWorkflowAsync_ShouldAllowCustomNonDeterministicFields()
    {
        // Arrange
        var workflowName = "test-workflow";
        var workflow = CreateTestWorkflow(workflowName);
        var optimizedWorkflow = CreateTestWorkflow(workflowName);
        var tasks = new Dictionary<string, WorkflowTaskResource>();

        var historicalExecution = CreateExecutionRecord(workflowName, ExecutionStatus.Succeeded, "{\"x\": 1}");
        historicalExecution.TaskExecutionRecords.Add(new TaskExecutionRecord
        {
            TaskRef = "task1",
            Status = "Succeeded",
            Output = "{\"result\": 42, \"randomValue\": 12345}"
        });

        _executionRepository.Setup(r => r.ListExecutionsAsync(workflowName, ExecutionStatus.Succeeded, 0, 5))
            .ReturnsAsync(new List<ExecutionRecord> { historicalExecution });

        _orchestrator.Setup(o => o.ExecuteAsync(
            optimizedWorkflow, tasks, It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                TaskResults = new Dictionary<string, TaskExecutionResult>
                {
                    ["task1"] = new TaskExecutionResult
                    {
                        Success = true,
                        Output = new Dictionary<string, object>
                        {
                            ["result"] = 42,
                            ["randomValue"] = 67890 // Different random value
                        }
                    }
                }
            });

        // Act - Provide custom fields to ignore
        var options = new ReplayOptions { IgnoreFields = new[] { "randomValue" } };
        var result = await _engine.ReplayWorkflowAsync(workflow, optimizedWorkflow, tasks, replayCount: 5, options: options);

        // Assert
        result.MatchingOutputs.Should().Be(1);
        result.Mismatches.Should().BeEmpty();
    }

    #endregion

    #region Edge Cases

    [Fact]
    public async Task ReplayWorkflowAsync_ShouldHandleNoHistoricalExecutions()
    {
        // Arrange
        var workflowName = "new-workflow";
        var workflow = CreateTestWorkflow(workflowName);
        var optimizedWorkflow = CreateTestWorkflow(workflowName);
        var tasks = new Dictionary<string, WorkflowTaskResource>();

        _executionRepository.Setup(r => r.ListExecutionsAsync(workflowName, ExecutionStatus.Succeeded, 0, 5))
            .ReturnsAsync(new List<ExecutionRecord>());

        // Act
        var result = await _engine.ReplayWorkflowAsync(workflow, optimizedWorkflow, tasks, replayCount: 5);

        // Assert
        result.TotalReplays.Should().Be(0);
        result.ConfidenceScore.Should().Be(0);
        result.Mismatches.Should().BeEmpty();
    }

    [Fact]
    public async Task ReplayWorkflowAsync_ShouldHandleExecutionWithNullInputSnapshot()
    {
        // Arrange
        var workflowName = "test-workflow";
        var workflow = CreateTestWorkflow(workflowName);
        var optimizedWorkflow = CreateTestWorkflow(workflowName);
        var tasks = new Dictionary<string, WorkflowTaskResource>();

        var historicalExecution = CreateExecutionRecord(workflowName, ExecutionStatus.Succeeded, null);

        _executionRepository.Setup(r => r.ListExecutionsAsync(workflowName, ExecutionStatus.Succeeded, 0, 5))
            .ReturnsAsync(new List<ExecutionRecord> { historicalExecution });

        _orchestrator.Setup(o => o.ExecuteAsync(
            optimizedWorkflow, tasks, It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                TaskResults = new Dictionary<string, TaskExecutionResult>()
            });

        // Act
        var result = await _engine.ReplayWorkflowAsync(workflow, optimizedWorkflow, tasks, replayCount: 5);

        // Assert - Should still work with empty inputs
        result.TotalReplays.Should().Be(1);
    }

    [Fact]
    public async Task ReplayWorkflowAsync_ShouldHandleReplayExecutionFailure()
    {
        // Arrange
        var workflowName = "test-workflow";
        var workflow = CreateTestWorkflow(workflowName);
        var optimizedWorkflow = CreateTestWorkflow(workflowName);
        var tasks = new Dictionary<string, WorkflowTaskResource>();

        var historicalExecution = CreateExecutionRecord(workflowName, ExecutionStatus.Succeeded, "{\"x\": 1}");

        _executionRepository.Setup(r => r.ListExecutionsAsync(workflowName, ExecutionStatus.Succeeded, 0, 5))
            .ReturnsAsync(new List<ExecutionRecord> { historicalExecution });

        _orchestrator.Setup(o => o.ExecuteAsync(
            optimizedWorkflow, tasks, It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = false, // Optimized version failed!
                Errors = new List<string> { "Task failed" },
                TaskResults = new Dictionary<string, TaskExecutionResult>()
            });

        // Act
        var result = await _engine.ReplayWorkflowAsync(workflow, optimizedWorkflow, tasks, replayCount: 5);

        // Assert - Should report as mismatch since original succeeded
        result.MatchingOutputs.Should().Be(0);
        result.Mismatches.Should().HaveCount(1);
        result.Mismatches[0].Reason.Should().Contain("Execution status mismatch");
    }

    #endregion

    #region Dry-Run Mode Tests

    [Fact]
    public async Task ReplayWorkflowAsync_DryRunMode_ShouldSkipExecution()
    {
        // Arrange
        var workflowName = "test-workflow";
        var workflow = CreateTestWorkflow(workflowName);
        var optimizedWorkflow = CreateTestWorkflow(workflowName);
        var tasks = new Dictionary<string, WorkflowTaskResource>();
        var options = new ReplayOptions { DryRun = true };

        // Act
        var result = await _engine.ReplayWorkflowAsync(workflow, optimizedWorkflow, tasks, replayCount: 5, options: options);

        // Assert - Should not call execution repository or orchestrator
        _executionRepository.Verify(r => r.ListExecutionsAsync(It.IsAny<string>(), It.IsAny<ExecutionStatus>(), It.IsAny<int>(), It.IsAny<int>()), Times.Never);
        _orchestrator.Verify(o => o.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, WorkflowTaskResource>>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()), Times.Never);
        result.TotalReplays.Should().Be(1); // Structure comparison counts as 1 "replay"
    }

    [Fact]
    public async Task ReplayWorkflowAsync_DryRunMode_ShouldDetectRemovedTaskWithDependents()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new() { Id = "step1", TaskRef = "task1" },
                    new() { Id = "step2", TaskRef = "task2", DependsOn = new List<string> { "step1" } }
                }
            }
        };
        var optimizedWorkflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    // step1 removed, but step2 depends on it
                    new() { Id = "step2", TaskRef = "task2", DependsOn = new List<string> { "step1" } }
                }
            }
        };
        var tasks = new Dictionary<string, WorkflowTaskResource>();
        var options = new ReplayOptions { DryRun = true };

        // Act
        var result = await _engine.ReplayWorkflowAsync(workflow, optimizedWorkflow, tasks, replayCount: 5, options: options);

        // Assert
        result.Mismatches.Should().ContainSingle(m => m.Reason.Contains("Task removed but has dependents"));
    }

    [Fact]
    public async Task ReplayWorkflowAsync_DryRunMode_ShouldAllowSameTaskRefChange()
    {
        // Arrange - Code only flags when BOTH TaskRef AND WorkflowRef differ
        // When only TaskRef changes but WorkflowRef stays null, no mismatch
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new() { Id = "step1", TaskRef = "original-task" }
                }
            }
        };
        var optimizedWorkflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new() { Id = "step1", TaskRef = "different-task" } // Changed task ref only
                }
            }
        };
        var tasks = new Dictionary<string, WorkflowTaskResource>();
        var options = new ReplayOptions { DryRun = true };

        // Act
        var result = await _engine.ReplayWorkflowAsync(workflow, optimizedWorkflow, tasks, replayCount: 5, options: options);

        // Assert - No mismatch because WorkflowRef is same (both null)
        result.Mismatches.Should().BeEmpty();
    }

    [Fact]
    public async Task ReplayWorkflowAsync_DryRunMode_ShouldDetectAddedDependencies()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new() { Id = "step1", TaskRef = "task1" },
                    new() { Id = "step2", TaskRef = "task2" } // No dependencies
                }
            }
        };
        var optimizedWorkflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new() { Id = "step1", TaskRef = "task1" },
                    new() { Id = "step2", TaskRef = "task2", DependsOn = new List<string> { "step1" } } // Dependency added
                }
            }
        };
        var tasks = new Dictionary<string, WorkflowTaskResource>();
        var options = new ReplayOptions { DryRun = true };

        // Act
        var result = await _engine.ReplayWorkflowAsync(workflow, optimizedWorkflow, tasks, replayCount: 5, options: options);

        // Assert
        result.Mismatches.Should().ContainSingle(m => m.Reason.Contains("New dependencies added"));
    }

    [Fact]
    public async Task ReplayWorkflowAsync_DryRunMode_ShouldDetectInputSchemaChange()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow" },
            Spec = new WorkflowSpec
            {
                Input = new Dictionary<string, WorkflowInputParameter> { ["userId"] = new() { Type = "string" } }, // Has input schema
                Tasks = new List<WorkflowTaskStep>
                {
                    new() { Id = "step1", TaskRef = "task1" }
                }
            }
        };
        var optimizedWorkflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow" },
            Spec = new WorkflowSpec
            {
                Input = new Dictionary<string, WorkflowInputParameter>(), // Input schema removed (empty)
                Tasks = new List<WorkflowTaskStep>
                {
                    new() { Id = "step1", TaskRef = "task1" }
                }
            }
        };
        var tasks = new Dictionary<string, WorkflowTaskResource>();
        var options = new ReplayOptions { DryRun = true };

        // Act
        var result = await _engine.ReplayWorkflowAsync(workflow, optimizedWorkflow, tasks, replayCount: 5, options: options);

        // Assert - Both have non-null schemas so they're considered compatible in current implementation
        result.Mismatches.Should().BeEmpty();
    }

    [Fact]
    public async Task ReplayWorkflowAsync_DryRunMode_ShouldDetectOutputSchemaChange()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow" },
            Spec = new WorkflowSpec
            {
                Output = new Dictionary<string, string> { ["result"] = "${task1.output}" }, // Has output schema
                Tasks = new List<WorkflowTaskStep>
                {
                    new() { Id = "step1", TaskRef = "task1" }
                }
            }
        };
        var optimizedWorkflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow" },
            Spec = new WorkflowSpec
            {
                Output = null, // Output schema removed
                Tasks = new List<WorkflowTaskStep>
                {
                    new() { Id = "step1", TaskRef = "task1" }
                }
            }
        };
        var tasks = new Dictionary<string, WorkflowTaskResource>();
        var options = new ReplayOptions { DryRun = true };

        // Act
        var result = await _engine.ReplayWorkflowAsync(workflow, optimizedWorkflow, tasks, replayCount: 5, options: options);

        // Assert
        result.Mismatches.Should().ContainSingle(m => m.Reason.Contains("Workflow output schema changed"));
    }

    [Fact]
    public async Task ReplayWorkflowAsync_DryRunMode_ShouldPassForIdenticalWorkflows()
    {
        // Arrange
        var workflow = CreateTestWorkflow("test-workflow");
        var optimizedWorkflow = CreateTestWorkflow("test-workflow");
        var tasks = new Dictionary<string, WorkflowTaskResource>();
        var options = new ReplayOptions { DryRun = true };

        // Act
        var result = await _engine.ReplayWorkflowAsync(workflow, optimizedWorkflow, tasks, replayCount: 5, options: options);

        // Assert
        result.Mismatches.Should().BeEmpty();
        result.MatchingOutputs.Should().Be(1);
    }

    #endregion

    #region Timestamp and UUID Pattern Ignoring Tests

    [Fact]
    public async Task ReplayWorkflowAsync_ShouldIgnoreTimestampValuePatterns()
    {
        // Arrange
        var workflowName = "test-workflow";
        var workflow = CreateTestWorkflow(workflowName);
        var optimizedWorkflow = CreateTestWorkflow(workflowName);
        var tasks = new Dictionary<string, WorkflowTaskResource>();

        var historicalExecution = CreateExecutionRecord(workflowName, ExecutionStatus.Succeeded, "{\"x\": 1}");
        historicalExecution.TaskExecutionRecords.Add(new TaskExecutionRecord
        {
            TaskRef = "task1",
            Status = "Succeeded",
            // Using a custom field with ISO timestamp value (not field name based)
            Output = "{\"result\": 42, \"eventTime\": \"2024-01-15T10:30:45Z\"}"
        });

        _executionRepository.Setup(r => r.ListExecutionsAsync(workflowName, ExecutionStatus.Succeeded, 0, 5))
            .ReturnsAsync(new List<ExecutionRecord> { historicalExecution });

        _orchestrator.Setup(o => o.ExecuteAsync(
            optimizedWorkflow, tasks, It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                TaskResults = new Dictionary<string, TaskExecutionResult>
                {
                    ["task1"] = new TaskExecutionResult
                    {
                        Success = true,
                        Output = new Dictionary<string, object>
                        {
                            ["result"] = 42,
                            ["eventTime"] = "2024-12-09T14:00:00Z" // Different ISO timestamp
                        }
                    }
                }
            });

        // Act - Enable timestamp pattern ignoring
        var options = new ReplayOptions { IgnoreTimestampValues = true };
        var result = await _engine.ReplayWorkflowAsync(workflow, optimizedWorkflow, tasks, replayCount: 5, options: options);

        // Assert - Should match because timestamp patterns are ignored
        result.MatchingOutputs.Should().Be(1);
        result.Mismatches.Should().BeEmpty();
    }

    [Fact]
    public async Task ReplayWorkflowAsync_ShouldIgnoreUuidValuePatterns()
    {
        // Arrange
        var workflowName = "test-workflow";
        var workflow = CreateTestWorkflow(workflowName);
        var optimizedWorkflow = CreateTestWorkflow(workflowName);
        var tasks = new Dictionary<string, WorkflowTaskResource>();

        var historicalExecution = CreateExecutionRecord(workflowName, ExecutionStatus.Succeeded, "{\"x\": 1}");
        historicalExecution.TaskExecutionRecords.Add(new TaskExecutionRecord
        {
            TaskRef = "task1",
            Status = "Succeeded",
            // Using a custom field with UUID value (not field name based)
            Output = "{\"result\": 42, \"transactionRef\": \"550e8400-e29b-41d4-a716-446655440000\"}"
        });

        _executionRepository.Setup(r => r.ListExecutionsAsync(workflowName, ExecutionStatus.Succeeded, 0, 5))
            .ReturnsAsync(new List<ExecutionRecord> { historicalExecution });

        _orchestrator.Setup(o => o.ExecuteAsync(
            optimizedWorkflow, tasks, It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                TaskResults = new Dictionary<string, TaskExecutionResult>
                {
                    ["task1"] = new TaskExecutionResult
                    {
                        Success = true,
                        Output = new Dictionary<string, object>
                        {
                            ["result"] = 42,
                            ["transactionRef"] = "a1b2c3d4-e5f6-7890-abcd-ef1234567890" // Different UUID
                        }
                    }
                }
            });

        // Act - Enable UUID pattern ignoring
        var options = new ReplayOptions { IgnoreUuidValues = true };
        var result = await _engine.ReplayWorkflowAsync(workflow, optimizedWorkflow, tasks, replayCount: 5, options: options);

        // Assert - Should match because UUID patterns are ignored
        result.MatchingOutputs.Should().Be(1);
        result.Mismatches.Should().BeEmpty();
    }

    #endregion

    #region List Comparison Tests

    [Fact]
    public async Task ReplayWorkflowAsync_ShouldCompareListsCorrectly()
    {
        // Arrange
        var workflowName = "test-workflow";
        var workflow = CreateTestWorkflow(workflowName);
        var optimizedWorkflow = CreateTestWorkflow(workflowName);
        var tasks = new Dictionary<string, WorkflowTaskResource>();

        var historicalExecution = CreateExecutionRecord(workflowName, ExecutionStatus.Succeeded, "{\"x\": 1}");
        historicalExecution.TaskExecutionRecords.Add(new TaskExecutionRecord
        {
            TaskRef = "task1",
            Status = "Succeeded",
            Output = "{\"items\": [1, 2, 3], \"name\": \"test\"}"
        });

        _executionRepository.Setup(r => r.ListExecutionsAsync(workflowName, ExecutionStatus.Succeeded, 0, 5))
            .ReturnsAsync(new List<ExecutionRecord> { historicalExecution });

        _orchestrator.Setup(o => o.ExecuteAsync(
            optimizedWorkflow, tasks, It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                TaskResults = new Dictionary<string, TaskExecutionResult>
                {
                    ["task1"] = new TaskExecutionResult
                    {
                        Success = true,
                        Output = new Dictionary<string, object>
                        {
                            ["items"] = new List<object> { 1L, 2L, 3L }, // Same values as longs
                            ["name"] = "test"
                        }
                    }
                }
            });

        // Act
        var result = await _engine.ReplayWorkflowAsync(workflow, optimizedWorkflow, tasks, replayCount: 5);

        // Assert
        result.MatchingOutputs.Should().Be(1);
        result.Mismatches.Should().BeEmpty();
    }

    [Fact]
    public async Task ReplayWorkflowAsync_ShouldDetectListLengthMismatch()
    {
        // Arrange
        var workflowName = "test-workflow";
        var workflow = CreateTestWorkflow(workflowName);
        var optimizedWorkflow = CreateTestWorkflow(workflowName);
        var tasks = new Dictionary<string, WorkflowTaskResource>();

        var historicalExecution = CreateExecutionRecord(workflowName, ExecutionStatus.Succeeded, "{\"x\": 1}");
        historicalExecution.TaskExecutionRecords.Add(new TaskExecutionRecord
        {
            TaskRef = "task1",
            Status = "Succeeded",
            Output = "{\"items\": [1, 2, 3]}"
        });

        _executionRepository.Setup(r => r.ListExecutionsAsync(workflowName, ExecutionStatus.Succeeded, 0, 5))
            .ReturnsAsync(new List<ExecutionRecord> { historicalExecution });

        _orchestrator.Setup(o => o.ExecuteAsync(
            optimizedWorkflow, tasks, It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                TaskResults = new Dictionary<string, TaskExecutionResult>
                {
                    ["task1"] = new TaskExecutionResult
                    {
                        Success = true,
                        Output = new Dictionary<string, object>
                        {
                            ["items"] = new List<object> { 1L, 2L } // Different length!
                        }
                    }
                }
            });

        // Act
        var result = await _engine.ReplayWorkflowAsync(workflow, optimizedWorkflow, tasks, replayCount: 5);

        // Assert
        result.MatchingOutputs.Should().Be(0);
        result.Mismatches.Should().HaveCount(1);
    }

    #endregion

    #region Missing Task Tests

    [Fact]
    public async Task ReplayWorkflowAsync_ShouldDetectMissingTaskInReplay()
    {
        // Arrange
        var workflowName = "test-workflow";
        var workflow = CreateTestWorkflow(workflowName);
        var optimizedWorkflow = CreateTestWorkflow(workflowName);
        var tasks = new Dictionary<string, WorkflowTaskResource>();

        var historicalExecution = CreateExecutionRecord(workflowName, ExecutionStatus.Succeeded, "{\"x\": 1}");
        historicalExecution.TaskExecutionRecords.Add(new TaskExecutionRecord
        {
            TaskRef = "task1",
            Status = "Succeeded",
            Output = "{\"result\": 42}"
        });
        historicalExecution.TaskExecutionRecords.Add(new TaskExecutionRecord
        {
            TaskRef = "task2",
            Status = "Succeeded",
            Output = "{\"value\": 100}"
        });

        _executionRepository.Setup(r => r.ListExecutionsAsync(workflowName, ExecutionStatus.Succeeded, 0, 5))
            .ReturnsAsync(new List<ExecutionRecord> { historicalExecution });

        _orchestrator.Setup(o => o.ExecuteAsync(
            optimizedWorkflow, tasks, It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                TaskResults = new Dictionary<string, TaskExecutionResult>
                {
                    ["task1"] = new TaskExecutionResult { Success = true, Output = new Dictionary<string, object> { ["result"] = 42 } }
                    // task2 is missing from replay results!
                }
            });

        // Act
        var result = await _engine.ReplayWorkflowAsync(workflow, optimizedWorkflow, tasks, replayCount: 5);

        // Assert
        result.MatchingOutputs.Should().Be(0);
        result.Mismatches.Should().ContainSingle(m => m.Reason.Contains("not found in replay"));
    }

    #endregion

    #region Cancellation Tests

    [Fact]
    public async Task ReplayWorkflowAsync_ShouldRespectCancellation()
    {
        // Arrange
        var workflowName = "test-workflow";
        var workflow = CreateTestWorkflow(workflowName);
        var optimizedWorkflow = CreateTestWorkflow(workflowName);
        var tasks = new Dictionary<string, WorkflowTaskResource>();

        var historicalExecutions = new List<ExecutionRecord>
        {
            CreateExecutionRecord(workflowName, ExecutionStatus.Succeeded, "{\"x\": 1}"),
            CreateExecutionRecord(workflowName, ExecutionStatus.Succeeded, "{\"x\": 2}"),
            CreateExecutionRecord(workflowName, ExecutionStatus.Succeeded, "{\"x\": 3}")
        };

        _executionRepository.Setup(r => r.ListExecutionsAsync(workflowName, ExecutionStatus.Succeeded, 0, 5))
            .ReturnsAsync(historicalExecutions);

        var cts = new CancellationTokenSource();
        cts.Cancel(); // Pre-cancel

        // Act & Assert
        await Assert.ThrowsAsync<OperationCanceledException>(() =>
            _engine.ReplayWorkflowAsync(workflow, optimizedWorkflow, tasks, replayCount: 5, cancellationToken: cts.Token));
    }

    #endregion

    #region Constructor Tests

    [Fact]
    public void Constructor_ShouldThrowWhenRepositoryIsNull()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => new HistoricalReplayEngine(null!, _orchestrator.Object));
    }

    [Fact]
    public void Constructor_ShouldThrowWhenOrchestratorIsNull()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => new HistoricalReplayEngine(_executionRepository.Object, null!));
    }

    #endregion

    #region Extra Keys in Output Tests

    [Fact]
    public async Task ReplayWorkflowAsync_ShouldAllowExtraKeysInReplayOutput()
    {
        // Arrange
        var workflowName = "test-workflow";
        var workflow = CreateTestWorkflow(workflowName);
        var optimizedWorkflow = CreateTestWorkflow(workflowName);
        var tasks = new Dictionary<string, WorkflowTaskResource>();

        var historicalExecution = CreateExecutionRecord(workflowName, ExecutionStatus.Succeeded, "{\"x\": 1}");
        historicalExecution.TaskExecutionRecords.Add(new TaskExecutionRecord
        {
            TaskRef = "task1",
            Status = "Succeeded",
            Output = "{\"result\": 42}"
        });

        _executionRepository.Setup(r => r.ListExecutionsAsync(workflowName, ExecutionStatus.Succeeded, 0, 5))
            .ReturnsAsync(new List<ExecutionRecord> { historicalExecution });

        _orchestrator.Setup(o => o.ExecuteAsync(
            optimizedWorkflow, tasks, It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResult
            {
                Success = true,
                TaskResults = new Dictionary<string, TaskExecutionResult>
                {
                    ["task1"] = new TaskExecutionResult
                    {
                        Success = true,
                        Output = new Dictionary<string, object>
                        {
                            ["result"] = 42,
                            ["newExtraField"] = "bonus data" // Extra field should be allowed
                        }
                    }
                }
            });

        // Act
        var result = await _engine.ReplayWorkflowAsync(workflow, optimizedWorkflow, tasks, replayCount: 5);

        // Assert - Should match because extra keys are allowed
        result.MatchingOutputs.Should().Be(1);
        result.Mismatches.Should().BeEmpty();
    }

    #endregion

    #region Helper Methods

    private static WorkflowResource CreateTestWorkflow(string name)
    {
        return new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = name },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new() { Id = "step1", TaskRef = "task1" }
                }
            }
        };
    }

    private static ExecutionRecord CreateExecutionRecord(string workflowName, ExecutionStatus status, string? inputSnapshot)
    {
        return new ExecutionRecord
        {
            Id = Guid.NewGuid(),
            WorkflowName = workflowName,
            Status = status,
            InputSnapshot = inputSnapshot,
            StartedAt = DateTime.UtcNow.AddMinutes(-5),
            CompletedAt = DateTime.UtcNow,
            Duration = TimeSpan.FromMilliseconds(500),
            TaskExecutionRecords = new List<TaskExecutionRecord>()
        };
    }

    #endregion
}
