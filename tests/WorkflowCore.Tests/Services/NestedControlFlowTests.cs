using FluentAssertions;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

/// <summary>
/// Tests for nested control flow: forEach inside forEach, condition inside forEach, etc.
/// Stage 19.5: Nested Control Flow
/// </summary>
public class NestedControlFlowTests
{
    #region ForEachContext Stack Tests

    [Fact]
    public void ForEachContext_WithParent_ShouldLinkToParentContext()
    {
        // Arrange
        var parentContext = new ForEachContext
        {
            ItemVar = "dept",
            CurrentItem = new Dictionary<string, object> { ["name"] = "Engineering" },
            Index = 0
        };

        var childContext = new ForEachContext
        {
            ItemVar = "employee",
            CurrentItem = new Dictionary<string, object> { ["name"] = "Alice" },
            Index = 0,
            Parent = parentContext
        };

        // Assert
        childContext.Parent.Should().NotBeNull();
        childContext.Parent!.ItemVar.Should().Be("dept");
        childContext.NestingDepth.Should().Be(2);
    }

    [Fact]
    public void ForEachContext_WithNoParent_ShouldHaveDepthOne()
    {
        // Arrange
        var context = new ForEachContext
        {
            ItemVar = "item",
            CurrentItem = "test",
            Index = 0
        };

        // Assert
        context.Parent.Should().BeNull();
        context.NestingDepth.Should().Be(1);
    }

    [Fact]
    public void ForEachContext_TripleNested_ShouldHaveDepthThree()
    {
        // Arrange
        var level1 = new ForEachContext { ItemVar = "company", Index = 0 };
        var level2 = new ForEachContext { ItemVar = "dept", Index = 0, Parent = level1 };
        var level3 = new ForEachContext { ItemVar = "employee", Index = 0, Parent = level2 };

        // Assert
        level3.NestingDepth.Should().Be(3);
    }

    [Fact]
    public void ForEachContext_GetAncestor_ShouldReturnParentByDepth()
    {
        // Arrange
        var level1 = new ForEachContext { ItemVar = "company", Index = 0 };
        var level2 = new ForEachContext { ItemVar = "dept", Index = 0, Parent = level1 };
        var level3 = new ForEachContext { ItemVar = "employee", Index = 0, Parent = level2 };

        // Assert
        level3.GetAncestor(1).Should().Be(level2); // Parent
        level3.GetAncestor(2).Should().Be(level1); // Grandparent
        level3.GetAncestor(3).Should().BeNull(); // Out of bounds
    }

    [Fact]
    public void ForEachContext_GetRoot_ShouldReturnTopLevelContext()
    {
        // Arrange
        var level1 = new ForEachContext { ItemVar = "company", Index = 0 };
        var level2 = new ForEachContext { ItemVar = "dept", Index = 0, Parent = level1 };
        var level3 = new ForEachContext { ItemVar = "employee", Index = 0, Parent = level2 };

        // Assert
        level3.GetRoot().Should().Be(level1);
        level2.GetRoot().Should().Be(level1);
        level1.GetRoot().Should().Be(level1);
    }

    #endregion

    #region Nested Template Resolution Tests

    [Fact]
    public async Task TemplateResolver_WithNestedForEach_ShouldResolveInnerItem()
    {
        // Arrange
        var resolver = new TemplateResolver();
        var parentContext = new ForEachContext
        {
            ItemVar = "dept",
            CurrentItem = new Dictionary<string, object> { ["name"] = "Engineering" },
            Index = 0
        };
        var childContext = new ForEachContext
        {
            ItemVar = "employee",
            CurrentItem = new Dictionary<string, object> { ["name"] = "Alice" },
            Index = 0,
            Parent = parentContext
        };

        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>(),
            ForEach = childContext
        };

        // Act
        var result = await resolver.ResolveAsync("{{forEach.employee.name}}", context);

        // Assert
        result.Should().Be("Alice");
    }

    [Fact]
    public async Task TemplateResolver_WithParentReference_ShouldResolveParentItem()
    {
        // Arrange
        var resolver = new TemplateResolver();
        var parentContext = new ForEachContext
        {
            ItemVar = "dept",
            CurrentItem = new Dictionary<string, object> { ["name"] = "Engineering" },
            Index = 0
        };
        var childContext = new ForEachContext
        {
            ItemVar = "employee",
            CurrentItem = new Dictionary<string, object> { ["name"] = "Alice" },
            Index = 0,
            Parent = parentContext
        };

        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>(),
            ForEach = childContext
        };

        // Act
        var result = await resolver.ResolveAsync("{{forEach.$parent.dept.name}}", context);

        // Assert
        result.Should().Be("Engineering");
    }

    [Fact]
    public async Task TemplateResolver_WithRootReference_ShouldResolveRootItem()
    {
        // Arrange
        var resolver = new TemplateResolver();
        var level1 = new ForEachContext
        {
            ItemVar = "company",
            CurrentItem = new Dictionary<string, object> { ["name"] = "Acme Corp" },
            Index = 0
        };
        var level2 = new ForEachContext
        {
            ItemVar = "dept",
            CurrentItem = new Dictionary<string, object> { ["name"] = "Engineering" },
            Index = 0,
            Parent = level1
        };
        var level3 = new ForEachContext
        {
            ItemVar = "employee",
            CurrentItem = new Dictionary<string, object> { ["name"] = "Alice" },
            Index = 0,
            Parent = level2
        };

        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>(),
            ForEach = level3
        };

        // Act
        var result = await resolver.ResolveAsync("{{forEach.$root.company.name}}", context);

        // Assert
        result.Should().Be("Acme Corp");
    }

    [Fact]
    public async Task TemplateResolver_WithParentIndex_ShouldResolveParentIndex()
    {
        // Arrange
        var resolver = new TemplateResolver();
        var parentContext = new ForEachContext
        {
            ItemVar = "dept",
            CurrentItem = new Dictionary<string, object> { ["name"] = "Engineering" },
            Index = 2
        };
        var childContext = new ForEachContext
        {
            ItemVar = "employee",
            CurrentItem = new Dictionary<string, object> { ["name"] = "Alice" },
            Index = 0,
            Parent = parentContext
        };

        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>(),
            ForEach = childContext
        };

        // Act
        var result = await resolver.ResolveAsync("{{forEach.$parent.index}}", context);

        // Assert
        result.Should().Be("2");
    }

    [Fact]
    public async Task TemplateResolver_WithNoParent_ShouldThrowForParentReference()
    {
        // Arrange
        var resolver = new TemplateResolver();
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>(),
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = "test",
                Index = 0
            }
        };

        // Act
        var act = async () => await resolver.ResolveAsync("{{forEach.$parent.item}}", context);

        // Assert
        await act.Should().ThrowAsync<TemplateResolutionException>()
            .WithMessage("*no parent*");
    }

    #endregion

    #region Max Nesting Depth Validation Tests

    [Fact]
    public async Task WorkflowValidator_WithExcessiveNesting_ShouldReturnError()
    {
        // Arrange - Create workflow with 4 levels of nesting (exceeds max of 3)
        var workflow = CreateDeeplyNestedWorkflow(nestingDepth: 4);
        var tasks = CreateStandardTasks();

        var templateParser = new Mock<ITemplateParser>();
        templateParser.Setup(x => x.Parse(It.IsAny<string>()))
            .Returns(new TemplateParseResult { IsValid = true });

        var typeChecker = new Mock<ITypeCompatibilityChecker>();
        var validator = new WorkflowValidator(templateParser.Object, typeChecker.Object);

        // Act
        var result = await validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e =>
            e.Message.Contains("nesting") &&
            e.Message.Contains("depth") &&
            e.Message.Contains("3"));
    }

    [Fact]
    public async Task WorkflowValidator_WithMaxNesting_ShouldPass()
    {
        // Arrange - Create workflow with exactly 3 levels (at the limit)
        var workflow = CreateDeeplyNestedWorkflow(nestingDepth: 3);
        var tasks = CreateStandardTasks();

        var templateParser = new Mock<ITemplateParser>();
        templateParser.Setup(x => x.Parse(It.IsAny<string>()))
            .Returns(new TemplateParseResult { IsValid = true });

        var typeChecker = new Mock<ITypeCompatibilityChecker>();
        var validator = new WorkflowValidator(templateParser.Object, typeChecker.Object);

        // Act
        var result = await validator.ValidateAsync(workflow, tasks);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    #endregion

    #region ForEach Executor Nested Tests

    [Fact]
    public async Task ForEachExecutor_WithNestedForEach_ShouldExecuteAllCombinations()
    {
        // Arrange
        var templateResolver = new TemplateResolver();
        var executor = new ForEachExecutor(templateResolver);

        var outerItems = new[] { "A", "B" };
        var innerItems = new[] { "1", "2" };

        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["outerItems"] = System.Text.Json.JsonSerializer.Serialize(outerItems),
                ["innerItems"] = System.Text.Json.JsonSerializer.Serialize(innerItems)
            }
        };

        var executedCombinations = new List<string>();

        // Act - Execute outer forEach
        var outerResult = await executor.ExecuteAsync(
            new ForEachSpec { Items = "{{input.outerItems}}", ItemVar = "outer" },
            context,
            async (outerCtx, outerItem, outerIndex) =>
            {
                // Execute inner forEach for each outer item
                var innerResult = await executor.ExecuteAsync(
                    new ForEachSpec { Items = "{{input.innerItems}}", ItemVar = "inner" },
                    outerCtx,
                    async (innerCtx, innerItem, innerIndex) =>
                    {
                        // Record combination: outer value + inner value
                        var outerVal = await templateResolver.ResolveAsync("{{forEach.$parent.outer}}", innerCtx);
                        var innerVal = await templateResolver.ResolveAsync("{{forEach.inner}}", innerCtx);
                        executedCombinations.Add($"{outerVal}-{innerVal}");

                        return new TaskExecutionResult { Success = true };
                    });

                return new TaskExecutionResult
                {
                    Success = innerResult.Success,
                    Output = new Dictionary<string, object> { ["innerCount"] = innerResult.ItemCount }
                };
            });

        // Assert - Should have 4 combinations (2 outer x 2 inner)
        outerResult.Success.Should().BeTrue();
        executedCombinations.Should().HaveCount(4);
        executedCombinations.Should().Contain("A-1");
        executedCombinations.Should().Contain("A-2");
        executedCombinations.Should().Contain("B-1");
        executedCombinations.Should().Contain("B-2");
    }

    [Fact]
    public async Task ForEachExecutor_WithConditionInsideForEach_ShouldFilterItems()
    {
        // Arrange - This tests condition evaluation inside a forEach loop
        var templateResolver = new TemplateResolver();
        var conditionEvaluator = new ConditionEvaluator(templateResolver);
        var executor = new ForEachExecutor(templateResolver);

        var items = new[]
        {
            new Dictionary<string, object> { ["name"] = "Alice", ["active"] = true },
            new Dictionary<string, object> { ["name"] = "Bob", ["active"] = false },
            new Dictionary<string, object> { ["name"] = "Charlie", ["active"] = true }
        };

        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["users"] = System.Text.Json.JsonSerializer.Serialize(items)
            }
        };

        var processedNames = new List<string>();

        // Act
        var result = await executor.ExecuteAsync(
            new ForEachSpec { Items = "{{input.users}}", ItemVar = "user" },
            context,
            async (ctx, item, index) =>
            {
                // Evaluate condition inside forEach
                var conditionResult = await conditionEvaluator.EvaluateAsync(
                    "{{forEach.user.active}} == true",
                    ctx);

                if (conditionResult.ShouldExecute)
                {
                    var name = await templateResolver.ResolveAsync("{{forEach.user.name}}", ctx);
                    processedNames.Add(name);
                }

                return new TaskExecutionResult { Success = true };
            });

        // Assert - Only active users should be processed
        result.Success.Should().BeTrue();
        processedNames.Should().HaveCount(2);
        processedNames.Should().Contain("Alice");
        processedNames.Should().Contain("Charlie");
        processedNames.Should().NotContain("Bob");
    }

    #endregion

    #region Helper Methods

    private WorkflowResource CreateDeeplyNestedWorkflow(int nestingDepth)
    {
        // Create a workflow that would require N levels of nested forEach
        // For validation testing - we use comments/markers to indicate intended nesting
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>()
            }
        };

        // Build nested structure via parent references
        WorkflowTaskStep? parentTask = null;
        for (int i = 0; i < nestingDepth; i++)
        {
            var task = new WorkflowTaskStep
            {
                Id = $"level-{i}",
                TaskRef = "process-task",
                ForEach = new ForEachSpec
                {
                    Items = i == 0 ? "{{input.items}}" : "{{forEach.item.children}}",
                    ItemVar = $"item{i}",
                    MaxConcurrency = 5
                }
            };

            // Mark parent relationship in task metadata
            if (parentTask != null)
            {
                // Use DependsOn to establish parent-child relationship for nested forEach
                task.DependsOn = new List<string> { parentTask.Id };
            }

            workflow.Spec.Tasks.Add(task);
            parentTask = task;
        }

        return workflow;
    }

    private Dictionary<string, WorkflowTaskResource> CreateStandardTasks()
    {
        return new Dictionary<string, WorkflowTaskResource>
        {
            ["process-task"] = new WorkflowTaskResource
            {
                Spec = new WorkflowTaskSpec { Type = "http" }
            }
        };
    }

    #endregion
}
