using FluentAssertions;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class ForEachExecutorTests
{
    private readonly Mock<ITemplateResolver> _mockTemplateResolver;
    private readonly ForEachExecutor _executor;

    public ForEachExecutorTests()
    {
        _mockTemplateResolver = new Mock<ITemplateResolver>();
        _executor = new ForEachExecutor(_mockTemplateResolver.Object);
    }

    #region Basic Iteration Tests

    [Fact]
    public async Task ExecuteAsync_WithNullForEachSpec_ReturnsFailure()
    {
        // Arrange
        var context = new TemplateContext();

        // Act
        var result = await _executor.ExecuteAsync(null, context, ExecuteTask);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("null");
    }

    [Fact]
    public async Task ExecuteAsync_WithEmptyItems_ReturnsSuccessWithEmptyOutputs()
    {
        // Arrange
        var forEachSpec = new ForEachSpec
        {
            Items = "{{input.orders}}",
            ItemVar = "order"
        };
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["orders"] = new List<object>()
            }
        };

        _mockTemplateResolver.Setup(r => r.ResolveAsync("{{input.orders}}", context))
            .ReturnsAsync("[]");

        // Act
        var result = await _executor.ExecuteAsync(forEachSpec, context, ExecuteTask);

        // Assert
        result.Success.Should().BeTrue();
        result.ItemCount.Should().Be(0);
        result.Outputs.Should().BeEmpty();
    }

    [Fact]
    public async Task ExecuteAsync_WithThreeItems_ExecutesTaskThreeTimes()
    {
        // Arrange
        var executionCount = 0;
        var forEachSpec = new ForEachSpec
        {
            Items = "{{input.userIds}}",
            ItemVar = "userId"
        };
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["userIds"] = new List<object> { "user-1", "user-2", "user-3" }
            }
        };

        _mockTemplateResolver.Setup(r => r.ResolveAsync("{{input.userIds}}", context))
            .ReturnsAsync("[\"user-1\",\"user-2\",\"user-3\"]");

        // Act
        var result = await _executor.ExecuteAsync(forEachSpec, context, async (itemContext, item, index) =>
        {
            Interlocked.Increment(ref executionCount);
            return new TaskExecutionResult
            {
                Success = true,
                Output = new Dictionary<string, object> { ["processed"] = item?.ToString() ?? "" }
            };
        });

        // Assert
        executionCount.Should().Be(3);
        result.ItemCount.Should().Be(3);
        result.SuccessCount.Should().Be(3);
        result.FailureCount.Should().Be(0);
    }

    [Fact]
    public async Task ExecuteAsync_PassesCorrectIndexToCallback()
    {
        // Arrange
        var capturedIndices = new List<int>();
        var forEachSpec = new ForEachSpec
        {
            Items = "{{input.items}}",
            ItemVar = "item"
        };
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["items"] = new List<object> { "a", "b", "c" }
            }
        };

        _mockTemplateResolver.Setup(r => r.ResolveAsync("{{input.items}}", context))
            .ReturnsAsync("[\"a\",\"b\",\"c\"]");

        // Act
        await _executor.ExecuteAsync(forEachSpec, context, async (itemContext, item, index) =>
        {
            capturedIndices.Add(index);
            return new TaskExecutionResult { Success = true };
        });

        // Assert
        capturedIndices.Should().BeEquivalentTo(new[] { 0, 1, 2 });
    }

    [Fact]
    public async Task ExecuteAsync_PassesCorrectItemToCallback()
    {
        // Arrange
        var capturedItems = new List<object?>();
        var forEachSpec = new ForEachSpec
        {
            Items = "{{input.values}}",
            ItemVar = "value"
        };
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["values"] = new List<object> { 100, 200, 300 }
            }
        };

        _mockTemplateResolver.Setup(r => r.ResolveAsync("{{input.values}}", context))
            .ReturnsAsync("[100,200,300]");

        // Act
        await _executor.ExecuteAsync(forEachSpec, context, async (itemContext, item, index) =>
        {
            capturedItems.Add(item);
            return new TaskExecutionResult { Success = true };
        });

        // Assert
        capturedItems.Should().HaveCount(3);
    }

    #endregion

    #region ForEach Context Tests

    [Fact]
    public async Task ExecuteAsync_CreatesForEachContext_WithItemVariable()
    {
        // Arrange
        ForEachContext? capturedContext = null;
        var forEachSpec = new ForEachSpec
        {
            Items = "{{input.orders}}",
            ItemVar = "order"
        };
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["orders"] = new List<object> { new Dictionary<string, object> { ["id"] = "ord-1" } }
            }
        };

        _mockTemplateResolver.Setup(r => r.ResolveAsync("{{input.orders}}", context))
            .ReturnsAsync("[{\"id\":\"ord-1\"}]");

        // Act
        await _executor.ExecuteAsync(forEachSpec, context, async (itemContext, item, index) =>
        {
            capturedContext = itemContext.ForEach;
            return new TaskExecutionResult { Success = true };
        });

        // Assert
        capturedContext.Should().NotBeNull();
        capturedContext!.ItemVar.Should().Be("order");
        capturedContext.Index.Should().Be(0);
    }

    [Fact]
    public async Task ExecuteAsync_ForEachContextHasCorrectItem()
    {
        // Arrange
        var capturedItems = new List<object?>();
        var forEachSpec = new ForEachSpec
        {
            Items = "{{input.names}}",
            ItemVar = "name"
        };
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["names"] = new List<object> { "Alice", "Bob" }
            }
        };

        _mockTemplateResolver.Setup(r => r.ResolveAsync("{{input.names}}", context))
            .ReturnsAsync("[\"Alice\",\"Bob\"]");

        // Act
        await _executor.ExecuteAsync(forEachSpec, context, async (itemContext, item, index) =>
        {
            capturedItems.Add(itemContext.ForEach?.CurrentItem);
            return new TaskExecutionResult { Success = true };
        });

        // Assert
        capturedItems.Should().HaveCount(2);
    }

    #endregion

    #region Parallel Execution Tests

    [Fact]
    public async Task ExecuteAsync_WithMaxConcurrency_LimitsConcurrency()
    {
        // Arrange
        var maxConcurrent = 0;
        var currentConcurrent = 0;
        var forEachSpec = new ForEachSpec
        {
            Items = "{{input.items}}",
            ItemVar = "item",
            MaxConcurrency = 2
        };
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["items"] = new List<object> { 1, 2, 3, 4, 5 }
            }
        };

        _mockTemplateResolver.Setup(r => r.ResolveAsync("{{input.items}}", context))
            .ReturnsAsync("[1,2,3,4,5]");

        // Act
        await _executor.ExecuteAsync(forEachSpec, context, async (itemContext, item, index) =>
        {
            var current = Interlocked.Increment(ref currentConcurrent);
            maxConcurrent = Math.Max(maxConcurrent, current);
            await Task.Delay(50); // Simulate work
            Interlocked.Decrement(ref currentConcurrent);
            return new TaskExecutionResult { Success = true };
        });

        // Assert
        maxConcurrent.Should().BeLessOrEqualTo(2);
    }

    [Fact]
    public async Task ExecuteAsync_WithNoMaxConcurrency_RunsAllInParallel()
    {
        // Arrange
        var maxConcurrent = 0;
        var currentConcurrent = 0;
        var forEachSpec = new ForEachSpec
        {
            Items = "{{input.items}}",
            ItemVar = "item"
            // No MaxConcurrency = unlimited
        };
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["items"] = new List<object> { 1, 2, 3, 4, 5 }
            }
        };

        _mockTemplateResolver.Setup(r => r.ResolveAsync("{{input.items}}", context))
            .ReturnsAsync("[1,2,3,4,5]");

        // Act
        await _executor.ExecuteAsync(forEachSpec, context, async (itemContext, item, index) =>
        {
            var current = Interlocked.Increment(ref currentConcurrent);
            maxConcurrent = Math.Max(maxConcurrent, current);
            await Task.Delay(100); // Simulate work
            Interlocked.Decrement(ref currentConcurrent);
            return new TaskExecutionResult { Success = true };
        });

        // Assert
        maxConcurrent.Should().BeGreaterThan(1, "without MaxConcurrency, tasks should run concurrently");
    }

    #endregion

    #region Output Aggregation Tests

    [Fact]
    public async Task ExecuteAsync_CollectsAllOutputs()
    {
        // Arrange
        var forEachSpec = new ForEachSpec
        {
            Items = "{{input.ids}}",
            ItemVar = "id"
        };
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["ids"] = new List<object> { "A", "B", "C" }
            }
        };

        _mockTemplateResolver.Setup(r => r.ResolveAsync("{{input.ids}}", context))
            .ReturnsAsync("[\"A\",\"B\",\"C\"]");

        // Act
        var result = await _executor.ExecuteAsync(forEachSpec, context, async (itemContext, item, index) =>
        {
            return new TaskExecutionResult
            {
                Success = true,
                Output = new Dictionary<string, object> { ["result"] = $"processed-{item}" }
            };
        });

        // Assert
        result.Outputs.Should().HaveCount(3);
        result.Outputs.Select(o => o["result"]).Should().BeEquivalentTo(
            new[] { "processed-A", "processed-B", "processed-C" });
    }

    [Fact]
    public async Task ExecuteAsync_TracksSuccessAndFailureCounts()
    {
        // Arrange
        var forEachSpec = new ForEachSpec
        {
            Items = "{{input.items}}",
            ItemVar = "item"
        };
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["items"] = new List<object> { 1, 2, 3, 4, 5 }
            }
        };

        _mockTemplateResolver.Setup(r => r.ResolveAsync("{{input.items}}", context))
            .ReturnsAsync("[1,2,3,4,5]");

        // Act
        var result = await _executor.ExecuteAsync(forEachSpec, context, async (itemContext, item, index) =>
        {
            // Items 2 and 4 (indices 1 and 3) fail
            var success = index != 1 && index != 3;
            return new TaskExecutionResult
            {
                Success = success,
                Errors = success ? new List<string>() : new List<string> { $"Failed at index {index}" }
            };
        });

        // Assert
        result.SuccessCount.Should().Be(3);
        result.FailureCount.Should().Be(2);
        result.ItemCount.Should().Be(5);
    }

    [Fact]
    public async Task ExecuteAsync_ItemResultsContainDetailedInfo()
    {
        // Arrange
        var forEachSpec = new ForEachSpec
        {
            Items = "{{input.items}}",
            ItemVar = "item"
        };
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["items"] = new List<object> { "x", "y" }
            }
        };

        _mockTemplateResolver.Setup(r => r.ResolveAsync("{{input.items}}", context))
            .ReturnsAsync("[\"x\",\"y\"]");

        // Act
        var result = await _executor.ExecuteAsync(forEachSpec, context, async (itemContext, item, index) =>
        {
            return new TaskExecutionResult
            {
                Success = index == 0,
                Output = new Dictionary<string, object> { ["data"] = item?.ToString() ?? "" },
                Errors = index == 0 ? new List<string>() : new List<string> { "Item y failed" }
            };
        });

        // Assert
        result.ItemResults.Should().HaveCount(2);
        result.ItemResults[0].Success.Should().BeTrue();
        result.ItemResults[0].Index.Should().Be(0);
        result.ItemResults[1].Success.Should().BeFalse();
        result.ItemResults[1].Error.Should().Be("Item y failed");
    }

    #endregion

    #region Error Handling Tests

    [Fact]
    public async Task ExecuteAsync_WithMissingItemsTemplate_ReturnsFailure()
    {
        // Arrange
        var forEachSpec = new ForEachSpec
        {
            Items = "", // Empty items template
            ItemVar = "item"
        };
        var context = new TemplateContext();

        // Act
        var result = await _executor.ExecuteAsync(forEachSpec, context, ExecuteTask);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("Items");
    }

    [Fact]
    public async Task ExecuteAsync_WithMissingItemVar_ReturnsFailure()
    {
        // Arrange
        var forEachSpec = new ForEachSpec
        {
            Items = "{{input.items}}",
            ItemVar = "" // Empty itemVar
        };
        var context = new TemplateContext();

        // Act
        var result = await _executor.ExecuteAsync(forEachSpec, context, ExecuteTask);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("ItemVar");
    }

    [Fact]
    public async Task ExecuteAsync_WhenTemplateResolutionFails_ReturnsFailure()
    {
        // Arrange
        var forEachSpec = new ForEachSpec
        {
            Items = "{{input.nonexistent}}",
            ItemVar = "item"
        };
        var context = new TemplateContext();

        _mockTemplateResolver.Setup(r => r.ResolveAsync("{{input.nonexistent}}", context))
            .ThrowsAsync(new TemplateResolutionException("Field 'nonexistent' not found"));

        // Act
        var result = await _executor.ExecuteAsync(forEachSpec, context, ExecuteTask);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("nonexistent");
    }

    [Fact]
    public async Task ExecuteAsync_WhenItemsNotArray_ReturnsFailure()
    {
        // Arrange
        var forEachSpec = new ForEachSpec
        {
            Items = "{{input.notAnArray}}",
            ItemVar = "item"
        };
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["notAnArray"] = "just a string"
            }
        };

        _mockTemplateResolver.Setup(r => r.ResolveAsync("{{input.notAnArray}}", context))
            .ReturnsAsync("\"just a string\"");

        // Act
        var result = await _executor.ExecuteAsync(forEachSpec, context, ExecuteTask);

        // Assert
        result.Success.Should().BeFalse();
        result.Error.Should().Contain("array");
    }

    [Fact]
    public async Task ExecuteAsync_ContinuesOnTaskFailure()
    {
        // Arrange
        var executionCount = 0;
        var forEachSpec = new ForEachSpec
        {
            Items = "{{input.items}}",
            ItemVar = "item"
        };
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["items"] = new List<object> { 1, 2, 3 }
            }
        };

        _mockTemplateResolver.Setup(r => r.ResolveAsync("{{input.items}}", context))
            .ReturnsAsync("[1,2,3]");

        // Act
        var result = await _executor.ExecuteAsync(forEachSpec, context, async (itemContext, item, index) =>
        {
            Interlocked.Increment(ref executionCount);
            if (index == 1) // Second item fails
            {
                return new TaskExecutionResult { Success = false, Errors = new List<string> { "Deliberate failure" } };
            }
            return new TaskExecutionResult { Success = true };
        });

        // Assert
        executionCount.Should().Be(3, "all items should be processed even if some fail");
        result.SuccessCount.Should().Be(2);
        result.FailureCount.Should().Be(1);
    }

    #endregion

    #region Task Output Reference Tests

    [Fact]
    public async Task ExecuteAsync_FromTaskOutput_ResolvesItems()
    {
        // Arrange
        var forEachSpec = new ForEachSpec
        {
            Items = "{{tasks.fetch-orders.output.orders}}",
            ItemVar = "order"
        };
        var context = new TemplateContext();
        context.TaskOutputs["fetch-orders"] = new Dictionary<string, object>
        {
            ["orders"] = new List<object>
            {
                new Dictionary<string, object> { ["id"] = "ord-1" },
                new Dictionary<string, object> { ["id"] = "ord-2" }
            }
        };

        _mockTemplateResolver.Setup(r => r.ResolveAsync("{{tasks.fetch-orders.output.orders}}", context))
            .ReturnsAsync("[{\"id\":\"ord-1\"},{\"id\":\"ord-2\"}]");

        // Act
        var result = await _executor.ExecuteAsync(forEachSpec, context, async (itemContext, item, index) =>
        {
            return new TaskExecutionResult { Success = true };
        });

        // Assert
        result.Success.Should().BeTrue();
        result.ItemCount.Should().Be(2);
    }

    #endregion

    #region Overall Success Tests

    [Fact]
    public async Task ExecuteAsync_WithAllSuccessful_ReturnsOverallSuccess()
    {
        // Arrange
        var forEachSpec = new ForEachSpec
        {
            Items = "{{input.items}}",
            ItemVar = "item"
        };
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["items"] = new List<object> { 1, 2, 3 }
            }
        };

        _mockTemplateResolver.Setup(r => r.ResolveAsync("{{input.items}}", context))
            .ReturnsAsync("[1,2,3]");

        // Act
        var result = await _executor.ExecuteAsync(forEachSpec, context, async (itemContext, item, index) =>
        {
            return new TaskExecutionResult { Success = true };
        });

        // Assert
        result.Success.Should().BeTrue();
    }

    [Fact]
    public async Task ExecuteAsync_WithAnyFailure_ReturnsOverallFailure()
    {
        // Arrange
        var forEachSpec = new ForEachSpec
        {
            Items = "{{input.items}}",
            ItemVar = "item"
        };
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["items"] = new List<object> { 1, 2, 3 }
            }
        };

        _mockTemplateResolver.Setup(r => r.ResolveAsync("{{input.items}}", context))
            .ReturnsAsync("[1,2,3]");

        // Act
        var result = await _executor.ExecuteAsync(forEachSpec, context, async (itemContext, item, index) =>
        {
            return new TaskExecutionResult { Success = index != 1 }; // Second item fails
        });

        // Assert
        result.Success.Should().BeFalse();
    }

    #endregion

    #region Mutation Testing - Kill Surviving Mutants

    [Fact]
    public void Constructor_NullTemplateResolver_ShouldThrow()
    {
        // Arrange & Act
        var act = () => new ForEachExecutor(null!);

        // Assert - Line 17: null coalescing mutation
        act.Should().Throw<ArgumentNullException>()
            .Which.ParamName.Should().Be("templateResolver");
    }

    [Fact]
    public async Task ExecuteAsync_TasksAreActuallyAwaited_OutputsCollectedAfterAll()
    {
        // This test kills Line 85: removing Task.WhenAll
        // If Task.WhenAll is removed, outputs won't be collected properly
        var forEachSpec = new ForEachSpec
        {
            Items = "{{input.items}}",
            ItemVar = "item"
        };
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["items"] = new List<object> { 1, 2, 3, 4, 5 }
            }
        };

        _mockTemplateResolver.Setup(r => r.ResolveAsync("{{input.items}}", context))
            .ReturnsAsync("[1,2,3,4,5]");

        var result = await _executor.ExecuteAsync(forEachSpec, context, async (itemContext, item, index) =>
        {
            await Task.Delay(50); // Simulate async work
            return new TaskExecutionResult
            {
                Success = true,
                Output = new Dictionary<string, object> { ["value"] = index }
            };
        });

        // All 5 outputs must be collected - if Task.WhenAll is removed, this won't work
        result.ItemCount.Should().Be(5);
        result.Outputs.Should().HaveCount(5);
    }

    [Fact]
    public async Task ExecuteAsync_FailedTaskWithOutput_OutputNotIncludedInOutputsList()
    {
        // This test kills Line 90: logical mutation && to ||
        // A failed task should NOT have its output in Outputs even if Output is not null
        var forEachSpec = new ForEachSpec
        {
            Items = "{{input.items}}",
            ItemVar = "item"
        };
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["items"] = new List<object> { 1, 2, 3 }
            }
        };

        _mockTemplateResolver.Setup(r => r.ResolveAsync("{{input.items}}", context))
            .ReturnsAsync("[1,2,3]");

        var result = await _executor.ExecuteAsync(forEachSpec, context, async (itemContext, item, index) =>
        {
            return new TaskExecutionResult
            {
                Success = index != 1, // Second item fails
                Output = new Dictionary<string, object> { ["index"] = index } // All have output
            };
        });

        // Only successful tasks should have outputs in Outputs list
        result.Outputs.Should().HaveCount(2); // indices 0 and 2, not 1
        result.Outputs.Should().AllSatisfy(o =>
        {
            var idx = Convert.ToInt32(o["index"]);
            idx.Should().NotBe(1, "failed task's output should not be included");
        });
    }

    [Fact]
    public async Task ExecuteAsync_ItemResultsHaveNonZeroDurationMs()
    {
        // This test kills Line 151: stopwatch.Stop() removal
        var forEachSpec = new ForEachSpec
        {
            Items = "{{input.items}}",
            ItemVar = "item"
        };
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["items"] = new List<object> { 1 }
            }
        };

        _mockTemplateResolver.Setup(r => r.ResolveAsync("{{input.items}}", context))
            .ReturnsAsync("[1]");

        var result = await _executor.ExecuteAsync(forEachSpec, context, async (itemContext, item, index) =>
        {
            await Task.Delay(20); // Ensure measurable duration
            return new TaskExecutionResult { Success = true };
        });

        // DurationMs must be recorded
        result.ItemResults.Should().HaveCount(1);
        result.ItemResults[0].DurationMs.Should().BeGreaterThan(0,
            "stopwatch must be stopped and duration recorded");
    }

    [Fact]
    public async Task ExecuteAsync_MultipleErrors_AreJoinedWithSemicolon()
    {
        // This test kills Line 155: string mutation to empty string
        var forEachSpec = new ForEachSpec
        {
            Items = "{{input.items}}",
            ItemVar = "item"
        };
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["items"] = new List<object> { 1 }
            }
        };

        _mockTemplateResolver.Setup(r => r.ResolveAsync("{{input.items}}", context))
            .ReturnsAsync("[1]");

        var result = await _executor.ExecuteAsync(forEachSpec, context, async (itemContext, item, index) =>
        {
            return new TaskExecutionResult
            {
                Success = false,
                Errors = new List<string> { "Error A", "Error B", "Error C" }
            };
        });

        // Error message should contain all errors joined with semicolon
        result.ItemResults.Should().HaveCount(1);
        result.ItemResults[0].Error.Should().Be("Error A; Error B; Error C");
    }

    [Fact]
    public async Task ExecuteAsync_SuccessfulTaskWithNullOutput_NotIncludedInOutputs()
    {
        // This ensures both conditions (Success AND Output != null) are verified
        var forEachSpec = new ForEachSpec
        {
            Items = "{{input.items}}",
            ItemVar = "item"
        };
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["items"] = new List<object> { 1, 2 }
            }
        };

        _mockTemplateResolver.Setup(r => r.ResolveAsync("{{input.items}}", context))
            .ReturnsAsync("[1,2]");

        var result = await _executor.ExecuteAsync(forEachSpec, context, async (itemContext, item, index) =>
        {
            return new TaskExecutionResult
            {
                Success = true,
                Output = index == 0 ? new Dictionary<string, object> { ["data"] = "value" } : null
            };
        });

        // Only the task with non-null output should be in Outputs
        result.Outputs.Should().HaveCount(1);
        result.SuccessCount.Should().Be(2);
    }

    [Fact]
    public async Task ExecuteAsync_TaskThrowsException_CapturesErrorMessage()
    {
        // This tests the catch block around task execution
        var forEachSpec = new ForEachSpec
        {
            Items = "{{input.items}}",
            ItemVar = "item"
        };
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["items"] = new List<object> { 1 }
            }
        };

        _mockTemplateResolver.Setup(r => r.ResolveAsync("{{input.items}}", context))
            .ReturnsAsync("[1]");

        var result = await _executor.ExecuteAsync(forEachSpec, context, async (itemContext, item, index) =>
        {
            throw new InvalidOperationException("Task exploded!");
        });

        result.Success.Should().BeFalse();
        result.ItemResults[0].Error.Should().Contain("Task exploded!");
    }

    #endregion

    // Helper method for simple test cases
    private Task<TaskExecutionResult> ExecuteTask(TemplateContext context, object? item, int index)
    {
        return Task.FromResult(new TaskExecutionResult { Success = true });
    }
}
