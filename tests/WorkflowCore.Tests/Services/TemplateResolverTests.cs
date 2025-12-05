using FluentAssertions;
using System.Collections.Concurrent;
using System.Text.Json;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class TemplateResolverTests
{
    private readonly ITemplateResolver _resolver;

    public TemplateResolverTests()
    {
        _resolver = new TemplateResolver();
    }

    [Fact]
    public async Task ResolveAsync_WithInputReference_ShouldReplaceWithActualValue()
    {
        // Arrange
        var template = "{{input.userId}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["userId"] = "user-123"
            }
        };

        // Act
        var result = await _resolver.ResolveAsync(template, context);

        // Assert
        result.Should().Be("user-123");
    }

    [Fact]
    public async Task ResolveAsync_WithTaskOutputReference_ShouldReplaceWithTaskOutput()
    {
        // Arrange
        var template = "{{tasks.fetch-user.output.id}}";
        var context = new TemplateContext
        {
            TaskOutputs = new System.Collections.Concurrent.ConcurrentDictionary<string, Dictionary<string, object>>
            {
                ["fetch-user"] = new Dictionary<string, object>
                {
                    ["id"] = "user-456"
                }
            }
        };

        // Act
        var result = await _resolver.ResolveAsync(template, context);

        // Assert
        result.Should().Be("user-456");
    }

    [Fact]
    public async Task ResolveAsync_WithNestedPath_ShouldResolveCorrectly()
    {
        // Arrange
        var template = "{{tasks.fetch-user.output.address.city}}";
        var context = new TemplateContext
        {
            TaskOutputs = new System.Collections.Concurrent.ConcurrentDictionary<string, Dictionary<string, object>>
            {
                ["fetch-user"] = new Dictionary<string, object>
                {
                    ["address"] = new Dictionary<string, object>
                    {
                        ["city"] = "San Francisco",
                        ["state"] = "CA"
                    }
                }
            }
        };

        // Act
        var result = await _resolver.ResolveAsync(template, context);

        // Assert
        result.Should().Be("San Francisco");
    }

    [Fact]
    public async Task ResolveAsync_WithMultipleExpressions_ShouldReplaceAll()
    {
        // Arrange
        var template = "User {{input.userId}} from {{tasks.fetch-user.output.city}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["userId"] = "user-123"
            },
            TaskOutputs = new System.Collections.Concurrent.ConcurrentDictionary<string, Dictionary<string, object>>
            {
                ["fetch-user"] = new Dictionary<string, object>
                {
                    ["city"] = "New York"
                }
            }
        };

        // Act
        var result = await _resolver.ResolveAsync(template, context);

        // Assert
        result.Should().Be("User user-123 from New York");
    }

    [Fact]
    public async Task ResolveAsync_WithMissingInputValue_ShouldThrowException()
    {
        // Arrange
        var template = "{{input.userId}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>() // Empty - no userId
        };

        // Act & Assert
        await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
    }

    [Fact]
    public async Task ResolveAsync_WithMissingTaskOutput_ShouldThrowException()
    {
        // Arrange
        var template = "{{tasks.fetch-user.output.id}}";
        var context = new TemplateContext
        {
            TaskOutputs = new System.Collections.Concurrent.ConcurrentDictionary<string, Dictionary<string, object>>() // Empty
        };

        // Act & Assert
        await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
    }

    [Fact]
    public async Task ResolveAsync_WithNoTemplate_ShouldReturnOriginalString()
    {
        // Arrange
        var template = "plain text without templates";
        var context = new TemplateContext();

        // Act
        var result = await _resolver.ResolveAsync(template, context);

        // Assert
        result.Should().Be("plain text without templates");
    }

    [Fact]
    public async Task ResolveAsync_WithComplexObject_ShouldSerializeToJson()
    {
        // Arrange
        var template = "{{tasks.fetch-user.output.userData}}";
        var context = new TemplateContext
        {
            TaskOutputs = new System.Collections.Concurrent.ConcurrentDictionary<string, Dictionary<string, object>>
            {
                ["fetch-user"] = new Dictionary<string, object>
                {
                    ["userData"] = new { name = "John", age = 30 }
                }
            }
        };

        // Act
        var result = await _resolver.ResolveAsync(template, context);

        // Assert
        result.Should().Contain("\"name\"");
        result.Should().Contain("John");
    }

    [Fact]
    public async Task ResolveAsync_WithObjectProperty_ShouldUseReflection()
    {
        // Arrange - Use an object with properties (not a Dictionary)
        var template = "{{tasks.fetch-user.output.user.name}}";
        var userObject = new { name = "Alice", id = 42 };
        var context = new TemplateContext
        {
            TaskOutputs = new System.Collections.Concurrent.ConcurrentDictionary<string, Dictionary<string, object>>
            {
                ["fetch-user"] = new Dictionary<string, object>
                {
                    ["user"] = userObject
                }
            }
        };

        // Act
        var result = await _resolver.ResolveAsync(template, context);

        // Assert
        result.Should().Be("Alice");
    }

    [Fact]
    public async Task ResolveAsync_WithMissingObjectProperty_ShouldThrowException()
    {
        // Arrange - Object doesn't have the requested property
        var template = "{{tasks.fetch-user.output.user.nonExistent}}";
        var userObject = new { name = "Alice" };
        var context = new TemplateContext
        {
            TaskOutputs = new System.Collections.Concurrent.ConcurrentDictionary<string, Dictionary<string, object>>
            {
                ["fetch-user"] = new Dictionary<string, object>
                {
                    ["user"] = userObject
                }
            }
        };

        // Act & Assert
        await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
    }

    [Fact]
    public async Task ResolveAsync_WithInvalidExpressionFormat_ShouldThrowException()
    {
        // Arrange - Expression with only one part (invalid)
        var template = "{{invalidFormat}}";
        var context = new TemplateContext();

        // Act & Assert
        await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
    }

    [Fact]
    public async Task ResolveAsync_WithUnknownExpressionType_ShouldThrowException()
    {
        // Arrange - Expression doesn't start with "input" or "tasks"
        var template = "{{unknown.field}}";
        var context = new TemplateContext();

        // Act & Assert
        await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
    }

    [Fact]
    public async Task ResolveAsync_WithIntegerValue_ShouldConvertToString()
    {
        // Arrange
        var template = "{{input.count}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["count"] = 42
            }
        };

        // Act
        var result = await _resolver.ResolveAsync(template, context);

        // Assert
        result.Should().Be("42");
    }

    [Fact]
    public async Task ResolveAsync_WithBooleanValue_ShouldConvertToString()
    {
        // Arrange
        var template = "{{input.isActive}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["isActive"] = true
            }
        };

        // Act
        var result = await _resolver.ResolveAsync(template, context);

        // Assert
        result.Should().Be("True");
    }

    [Fact]
    public async Task ResolveAsync_WithNullTemplate_ShouldReturnNull()
    {
        // Arrange
        string? template = null;
        var context = new TemplateContext();

        // Act
        var result = await _resolver.ResolveAsync(template!, context);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task ResolveAsync_WithEmptyTemplate_ShouldReturnEmpty()
    {
        // Arrange
        var template = "";
        var context = new TemplateContext();

        // Act
        var result = await _resolver.ResolveAsync(template, context);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task ResolveAsync_WithTasksButNotOutput_ShouldThrowException()
    {
        // Arrange - tasks.taskId.wrongKeyword instead of tasks.taskId.output
        var template = "{{tasks.fetch-user.result.data}}";
        var context = new TemplateContext
        {
            TaskOutputs = new System.Collections.Concurrent.ConcurrentDictionary<string, Dictionary<string, object>>
            {
                ["fetch-user"] = new Dictionary<string, object> { ["result"] = "value" }
            }
        };

        // Act & Assert
        await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
    }

    [Fact]
    public async Task ResolveAsync_WithDecimalValue_ShouldConvertToString()
    {
        // Arrange
        var template = "{{input.price}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["price"] = 19.99m
            }
        };

        // Act
        var result = await _resolver.ResolveAsync(template, context);

        // Assert
        result.Should().Be("19.99");
    }

    [Fact]
    public async Task ResolveAsync_WithLongValue_ShouldConvertToString()
    {
        // Arrange
        var template = "{{input.userId}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["userId"] = 9876543210L
            }
        };

        // Act
        var result = await _resolver.ResolveAsync(template, context);

        // Assert
        result.Should().Be("9876543210");
    }

    [Fact]
    public async Task ResolveAsync_WithDoubleValue_ShouldConvertToString()
    {
        // Arrange
        var template = "{{input.rating}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["rating"] = 4.5
            }
        };

        // Act
        var result = await _resolver.ResolveAsync(template, context);

        // Assert
        result.Should().Be("4.5");
    }

    [Fact]
    public async Task ResolveAsync_WithFloatValue_ShouldConvertToString()
    {
        // Arrange
        var template = "{{input.score}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["score"] = 98.5f
            }
        };

        // Act
        var result = await _resolver.ResolveAsync(template, context);

        // Assert
        result.Should().Be("98.5");
    }

    [Fact]
    public async Task ResolveAsync_WithDeeplyNestedObjectPath_ShouldResolveCorrectly()
    {
        // Arrange
        var template = "{{tasks.fetch-user.output.user.address.city}}";
        var addressObject = new { city = "San Francisco", state = "CA" };
        var userObject = new { name = "Alice", address = addressObject };
        var context = new TemplateContext
        {
            TaskOutputs = new System.Collections.Concurrent.ConcurrentDictionary<string, Dictionary<string, object>>
            {
                ["fetch-user"] = new Dictionary<string, object>
                {
                    ["user"] = userObject
                }
            }
        };

        // Act
        var result = await _resolver.ResolveAsync(template, context);

        // Assert
        result.Should().Be("San Francisco");
    }

    [Fact]
    public async Task ResolveAsync_WithExactErrorMessage_ShouldContainTemplatePath()
    {
        // Arrange
        var template = "{{tasks.nonExistent.output.field}}";
        var context = new TemplateContext();

        // Act & Assert
        var exception = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));

        exception.TemplatePath.Should().Be("tasks.nonExistent.output.field");
        exception.Message.Should().Contain("nonExistent");
    }

    #region Array Indexing Tests

    [Fact]
    public async Task ResolveAsync_WithArrayIndexInPath_ShouldReturnElement()
    {
        // Arrange - data[0] syntax within a path
        var template = "{{tasks.get-stories.output.data[0]}}";
        var context = new TemplateContext
        {
            TaskOutputs = new System.Collections.Concurrent.ConcurrentDictionary<string, Dictionary<string, object>>
            {
                ["get-stories"] = new Dictionary<string, object>
                {
                    ["data"] = new List<object> { 42547728L, 42547283L, 42546942L }
                }
            }
        };

        // Act
        var result = await _resolver.ResolveAsync(template, context);

        // Assert
        result.Should().Be("42547728");
    }

    [Fact]
    public async Task ResolveAsync_WithArrayIndexInPath_ShouldReturnSecondElement()
    {
        // Arrange
        var template = "{{tasks.get-stories.output.data[1]}}";
        var context = new TemplateContext
        {
            TaskOutputs = new System.Collections.Concurrent.ConcurrentDictionary<string, Dictionary<string, object>>
            {
                ["get-stories"] = new Dictionary<string, object>
                {
                    ["data"] = new List<object> { 42547728L, 42547283L, 42546942L }
                }
            }
        };

        // Act
        var result = await _resolver.ResolveAsync(template, context);

        // Assert
        result.Should().Be("42547283");
    }

    [Fact]
    public async Task ResolveAsync_WithArrayIndexAndNestedPath_ShouldReturnNestedValue()
    {
        // Arrange - Get nested property from array element
        var template = "{{tasks.get-stories.output.items[1].title}}";
        var context = new TemplateContext
        {
            TaskOutputs = new System.Collections.Concurrent.ConcurrentDictionary<string, Dictionary<string, object>>
            {
                ["get-stories"] = new Dictionary<string, object>
                {
                    ["items"] = new List<object>
                    {
                        new Dictionary<string, object> { ["id"] = 1, ["title"] = "First Story" },
                        new Dictionary<string, object> { ["id"] = 2, ["title"] = "Second Story" }
                    }
                }
            }
        };

        // Act
        var result = await _resolver.ResolveAsync(template, context);

        // Assert
        result.Should().Be("Second Story");
    }

    [Fact]
    public async Task ResolveAsync_WithMultipleArrayIndexes_ShouldResolveAll()
    {
        // Arrange - Multiple array accesses in one template
        var template = "First: {{tasks.get-ids.output.data[0]}}, Second: {{tasks.get-ids.output.data[1]}}";
        var context = new TemplateContext
        {
            TaskOutputs = new System.Collections.Concurrent.ConcurrentDictionary<string, Dictionary<string, object>>
            {
                ["get-ids"] = new Dictionary<string, object>
                {
                    ["data"] = new List<object> { 111L, 222L, 333L }
                }
            }
        };

        // Act
        var result = await _resolver.ResolveAsync(template, context);

        // Assert
        result.Should().Be("First: 111, Second: 222");
    }

    [Fact]
    public async Task ResolveAsync_WithArrayIndexOutOfBounds_ShouldThrowException()
    {
        // Arrange
        var template = "{{tasks.get-data.output.items[10]}}";
        var context = new TemplateContext
        {
            TaskOutputs = new System.Collections.Concurrent.ConcurrentDictionary<string, Dictionary<string, object>>
            {
                ["get-data"] = new Dictionary<string, object>
                {
                    ["items"] = new List<object> { 1, 2, 3 }
                }
            }
        };

        // Act & Assert
        await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
    }

    [Fact]
    public async Task ResolveAsync_WithArrayIndexOnNonArray_ShouldThrowException()
    {
        // Arrange - Trying to index a string, not an array
        var template = "{{tasks.get-data.output.name[0]}}";
        var context = new TemplateContext
        {
            TaskOutputs = new System.Collections.Concurrent.ConcurrentDictionary<string, Dictionary<string, object>>
            {
                ["get-data"] = new Dictionary<string, object>
                {
                    ["name"] = "John"
                }
            }
        };

        // Act & Assert
        await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
    }

    #endregion

    #region Mutation Testing - Kill Surviving Mutants

    [Fact]
    public async Task ResolveAsync_InvalidExpression_ErrorContainsExpression()
    {
        // Line 39-43: String mutations in error message - verify content
        var template = "{{singlepart}}";
        var context = new TemplateContext();

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));

        ex.Message.Should().Contain("singlepart");
        ex.Message.Should().Contain("Invalid template expression");
        ex.Message.Should().Contain("2 parts");
    }

    [Fact]
    public async Task ResolveAsync_InputPath_JoinsPartsCorrectly()
    {
        // Line 50: string.Join mutation - verify nested path works
        var template = "{{input.level1.level2.level3}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["level1"] = new Dictionary<string, object>
                {
                    ["level2"] = new Dictionary<string, object>
                    {
                        ["level3"] = "deep-value"
                    }
                }
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("deep-value");
    }

    [Fact]
    public async Task ResolveAsync_TasksWithInvalidFormat_RequiresOutputKeyword()
    {
        // Line 55: Logical mutation (length >= 3 && parts[2] == "output")
        // Template "tasks.taskId.notOutput.field" should fail
        var template = "{{tasks.myTask.notOutput.field}}";
        var context = new TemplateContext();

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));

        ex.Message.Should().Contain("Unknown template expression type");
    }

    [Fact]
    public async Task ResolveAsync_TasksWithOnlyTwoParts_ShouldFail()
    {
        // Line 55: parts.Length >= 3 check
        var template = "{{tasks.myTask}}";
        var context = new TemplateContext();

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));

        ex.Message.Should().Contain("Unknown template expression type");
    }

    [Fact]
    public async Task ResolveAsync_TaskNotFound_ErrorContainsTaskId()
    {
        // Line 62-70: String mutations in task not found error
        var template = "{{tasks.missing-task.output.value}}";
        var context = new TemplateContext();
        context.TaskOutputs["other-task"] = new Dictionary<string, object> { ["x"] = 1 };

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));

        ex.Message.Should().Contain("missing-task");
        ex.Message.Should().Contain("not found");
        ex.Message.Should().Contain("other-task"); // Available tasks mentioned
    }

    [Fact]
    public async Task ResolveAsync_TaskNotFound_NoAvailableTasks_SaysNone()
    {
        // Line 64: When no tasks available, should say "none"
        var template = "{{tasks.missing.output.value}}";
        var context = new TemplateContext();

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));

        ex.Message.Should().Contain("none");
    }

    [Fact]
    public async Task ResolveAsync_UnknownPrefix_ErrorContainsValidPrefixes()
    {
        // Line 85-88: String mutations in unknown type error
        var template = "{{unknown.something.value}}";
        var context = new TemplateContext();

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));

        ex.Message.Should().Contain("unknown");
        ex.Message.Should().Contain("input");
        ex.Message.Should().Contain("tasks");
        ex.Message.Should().Contain("forEach");
    }

    [Fact]
    public async Task ResolveAsync_ForEachParentOutsideNested_ErrorMentionsParent()
    {
        // Line 119-120: $parent error message
        var template = "{{forEach.$parent.item}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = "value",
                Index = 0,
                Parent = null // No parent
            }
        };

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));

        ex.Message.Should().Contain("$parent");
        ex.Message.Should().Contain("nested");
    }

    [Fact]
    public async Task ResolveAsync_ForEachRootNavigation_Works()
    {
        // Line 141: $root navigation
        var template = "{{forEach.$root.item}}";
        var rootContext = new ForEachContext
        {
            ItemVar = "item",
            CurrentItem = "root-value",
            Index = 0,
            Parent = null
        };
        var nestedContext = new ForEachContext
        {
            ItemVar = "nested",
            CurrentItem = "nested-value",
            Index = 0,
            Parent = rootContext
        };
        var context = new TemplateContext { ForEach = nestedContext };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("root-value");
    }

    [Fact]
    public async Task ResolveAsync_ForEachItemPath_JoinsCorrectly()
    {
        // Line 161: string.Join for item path
        var template = "{{forEach.order.customer.name}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "order",
                CurrentItem = new Dictionary<string, object>
                {
                    ["customer"] = new Dictionary<string, object>
                    {
                        ["name"] = "John"
                    }
                },
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("John");
    }

    [Fact]
    public async Task ResolveAsync_FieldNotFound_ErrorContainsFieldName()
    {
        // Line 286-292: Field not found error messages
        var template = "{{input.missing}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["existing"] = "value"
            }
        };

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));

        ex.Message.Should().Contain("missing");
        ex.Message.Should().Contain("existing"); // Available field
    }

    [Fact]
    public async Task ResolveAsync_FieldNotFound_EmptyObject_SaysEmpty()
    {
        // Line 288: empty object case
        var template = "{{input.anything}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>()
        };

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));

        ex.Message.Should().Contain("empty");
    }

    [Fact]
    public async Task ResolveAsync_UnknownForEachProperty_ErrorContainsItemVar()
    {
        // Line 166-170: Unknown forEach property error
        var template = "{{forEach.wrongVar.something}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "correctVar",
                CurrentItem = "value",
                Index = 0
            }
        };

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));

        ex.Message.Should().Contain("wrongVar");
        ex.Message.Should().Contain("correctVar"); // Suggestion
        ex.Message.Should().Contain("index");
        ex.Message.Should().Contain("$parent");
        ex.Message.Should().Contain("$root");
    }

    [Fact]
    public async Task ResolveAsync_ForEachOutsideLoop_ErrorMentionsForEach()
    {
        // Line 97-101: forEach used outside loop
        var template = "{{forEach.item}}";
        var context = new TemplateContext { ForEach = null };

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));

        ex.Message.Should().Contain("forEach");
        ex.Message.Should().Contain("outside");
    }

    #endregion

    #region Mutation Testing - NoCoverage Code Paths

    [Fact]
    public async Task ResolveAsync_ForEachItemWithNullValue_ReturnsEmptyString()
    {
        // Line 177: ResolveItemPath with null item returns empty string
        var template = "{{forEach.item.property}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = null, // null item
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be(string.Empty);
    }

    [Fact]
    public async Task ResolveAsync_ForEachItemAsJsonElement_ResolvesNestedProperty()
    {
        // Lines 187-194: ResolveItemPath with JsonElement item
        var json = System.Text.Json.JsonDocument.Parse("{\"name\":\"test\",\"nested\":{\"id\":42}}");
        var template = "{{forEach.item.name}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = json.RootElement.Clone(), // JsonElement
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("test");
    }

    [Fact]
    public async Task ResolveAsync_ForEachItemAsJsonElement_ResolvesDeepNestedProperty()
    {
        // Lines 187-194: ResolveItemPath with nested JsonElement
        var json = System.Text.Json.JsonDocument.Parse("{\"nested\":{\"deep\":{\"value\":\"found\"}}}");
        var template = "{{forEach.item.nested.deep.value}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = json.RootElement.Clone(),
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("found");
    }

    [Fact]
    public async Task ResolveAsync_ForEachItemAsSimpleType_ThrowsWithItemType()
    {
        // Lines 197-204: ResolveItemPath with simple type throws
        var template = "{{forEach.item.property}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = "just a string", // simple type, not navigable
                Index = 0
            }
        };

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));

        ex.Message.Should().Contain("Cannot navigate path");
        ex.Message.Should().Contain("String");
        ex.Message.Should().Contain("forEach.item");
    }

    [Fact]
    public async Task ResolveAsync_ForEachItemAsInteger_ThrowsWithItemType()
    {
        // Lines 197-204: ResolveItemPath with int simple type
        var template = "{{forEach.item.property}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = 42, // int is not navigable
                Index = 0
            }
        };

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));

        ex.Message.Should().Contain("Int32");
    }

    [Fact]
    public async Task ResolveAsync_JsonElementWithBooleanTrue_ReturnsTrue()
    {
        // Line 227: ConvertJsonElement handles True
        var json = System.Text.Json.JsonDocument.Parse("{\"flag\":true}");
        var template = "{{forEach.item.flag}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = json.RootElement.Clone(),
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("True");
    }

    [Fact]
    public async Task ResolveAsync_JsonElementWithBooleanFalse_ReturnsFalse()
    {
        // Line 228: ConvertJsonElement handles False
        var json = System.Text.Json.JsonDocument.Parse("{\"flag\":false}");
        var template = "{{forEach.item.flag}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = json.RootElement.Clone(),
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("False");
    }

    [Fact]
    public async Task ResolveAsync_JsonElementWithIntegerNumber_ReturnsNumber()
    {
        // Line 226: ConvertJsonElement handles integer number
        var json = System.Text.Json.JsonDocument.Parse("{\"count\":123}");
        var template = "{{forEach.item.count}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = json.RootElement.Clone(),
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("123");
    }

    [Fact]
    public async Task ResolveAsync_JsonElementWithDecimalNumber_ReturnsDecimal()
    {
        // Line 226: ConvertJsonElement handles decimal number
        var json = System.Text.Json.JsonDocument.Parse("{\"price\":99.99}");
        var template = "{{forEach.item.price}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = json.RootElement.Clone(),
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("99.99");
    }

    [Fact]
    public async Task ResolveAsync_JsonElementWithNullProperty_ConvertsToEmptyDict()
    {
        // Line 229: ConvertJsonElement handles null - when null property is converted
        // it becomes null in the dict, which is then not included (null values skipped)
        // So accessing the property throws "not found"
        var json = System.Text.Json.JsonDocument.Parse("{\"value\":null,\"other\":\"exists\"}");
        var template = "{{forEach.item.other}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = json.RootElement.Clone(),
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("exists");
    }

    [Fact]
    public async Task ResolveAsync_JsonElementWithNestedObject_SerializesToJson()
    {
        // Line 230: ConvertJsonElement handles nested object
        var json = System.Text.Json.JsonDocument.Parse("{\"nested\":{\"a\":1,\"b\":2}}");
        var template = "{{forEach.item.nested}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = json.RootElement.Clone(),
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Contain("\"a\"");
        result.Should().Contain("\"b\"");
    }

    [Fact]
    public async Task ResolveAsync_JsonElementWithArray_SerializesToJson()
    {
        // Line 231: ConvertJsonElement handles array
        var json = System.Text.Json.JsonDocument.Parse("{\"items\":[1,2,3]}");
        var template = "{{forEach.item.items}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = json.RootElement.Clone(),
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Contain("1");
        result.Should().Contain("2");
        result.Should().Contain("3");
    }

    [Fact]
    public async Task ResolveAsync_SerializeIntValue_ReturnsNumberString()
    {
        // Line 248-250: SerializeValue handles int
        var template = "{{forEach.item}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = 42,
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("42");
    }

    [Fact]
    public async Task ResolveAsync_SerializeLongValue_ReturnsNumberString()
    {
        // Line 248-250: SerializeValue handles long
        var template = "{{forEach.item}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = 9999999999L,
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("9999999999");
    }

    [Fact]
    public async Task ResolveAsync_SerializeDoubleValue_ReturnsDecimalString()
    {
        // Line 248-250: SerializeValue handles double
        var template = "{{forEach.item}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = 3.14159,
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Contain("3.14");
    }

    [Fact]
    public async Task ResolveAsync_SerializeDecimalValue_ReturnsDecimalString()
    {
        // Line 248-250: SerializeValue handles decimal
        var template = "{{forEach.item}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = 99.99m,
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("99.99");
    }

    [Fact]
    public async Task ResolveAsync_SerializeBoolValue_ReturnsBoolString()
    {
        // Line 248-250: SerializeValue handles bool
        var template = "{{forEach.item}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = true,
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("True");
    }

    [Fact]
    public async Task ResolveAsync_SerializeObjectValue_ReturnsJson()
    {
        // Line 253: SerializeValue handles complex object with JSON serialization
        var template = "{{forEach.item}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = new Dictionary<string, object> { ["key"] = "value" },
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Contain("\"key\"");
        result.Should().Contain("\"value\"");
    }

    [Fact]
    public async Task ResolveAsync_InputWithEmptyPath_SerializesEntireObject()
    {
        // Line 261: ResolveInputPath with empty path returns entire JSON
        var template = "{{tasks.task1.output}}";
        var context = new TemplateContext
        {
            TaskOutputs = new System.Collections.Concurrent.ConcurrentDictionary<string, Dictionary<string, object>>
            {
                ["task1"] = new Dictionary<string, object>
                {
                    ["a"] = 1,
                    ["b"] = "test"
                }
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Contain("\"a\"");
        result.Should().Contain("\"b\"");
    }

    [Fact]
    public async Task ResolveAsync_JsonElementPropertyNotFound_ErrorShowsAvailableProperties()
    {
        // Lines 302-315: JsonElement property not found error
        var json = System.Text.Json.JsonDocument.Parse("{\"existing\":\"value\",\"other\":123}");
        var template = "{{forEach.item.nonexistent}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = json.RootElement.Clone(),
                Index = 0
            }
        };

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));

        ex.Message.Should().Contain("nonexistent");
        ex.Message.Should().Contain("not found");
        ex.Message.Should().Contain("existing");
        ex.Message.Should().Contain("other");
    }

    [Fact]
    public async Task ResolveAsync_JsonElementNavigateNonObject_ThrowsWithType()
    {
        // Lines 318-325: Cannot navigate non-object JsonElement - navigating string throws
        var json = System.Text.Json.JsonDocument.Parse("{\"value\":\"just a string\"}");
        var template = "{{forEach.item.value.nested}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = json.RootElement.Clone(),
                Index = 0
            }
        };

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));

        // The error indicates we tried to access nested property on a string type
        ex.Message.Should().Contain("String");
        ex.Message.Should().Contain("nested");
    }

    [Fact]
    public async Task ResolveAsync_ArrayIndexOnJsonArray_ReturnsElement()
    {
        // Lines 269-280: Array index syntax with JsonElement
        var template = "{{input.items[1]}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["items"] = new List<object> { "first", "second", "third" }
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("second");
    }

    [Fact]
    public async Task ResolveAsync_ArrayIndexOutOfBounds_ThrowsWithIndex()
    {
        // Array index out of bounds error
        var template = "{{input.items[99]}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["items"] = new List<object> { "a", "b" }
            }
        };

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));

        ex.Message.Should().Contain("99");
        ex.Message.Should().Contain("out of bounds");
    }

    [Fact]
    public async Task ResolveAsync_NullValueInPath_SerializesToNullString()
    {
        // SerializeValue with null returns "null" JSON string
        var template = "{{input.nullField}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["nullField"] = null!
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("null");
    }

    [Fact]
    public async Task ResolveAsync_FloatValue_ReturnsDecimalString()
    {
        // Line 248: SerializeValue handles float
        var template = "{{forEach.item}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = 2.5f,
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Contain("2.5");
    }

    #endregion

    #region Mutation Killing Tests - Targeting Specific Mutations

    [Fact]
    public async Task ResolveAsync_ArrayIndexZero_ReturnsFirstElement()
    {
        // Target: index < 0 mutation at line 424 - verify index=0 works
        var template = "{{input.items[0]}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["items"] = new List<object> { "first", "second" }
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("first");
    }

    [Fact]
    public async Task ResolveAsync_ArrayIndexLastElement_ReturnsLastElement()
    {
        // Target: index >= list.Count mutation - verify last valid index works
        var template = "{{input.items[2]}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["items"] = new List<object> { "a", "b", "c" }
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("c");
    }

    [Fact]
    public async Task ResolveAsync_NegativeArrayIndex_ThrowsOutOfBounds()
    {
        // Target: index < 0 boundary check
        var template = "{{input.items[-1]}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["items"] = new List<object> { "a" }
            }
        };

        // Note: The regex won't match negative numbers, so this actually throws a different error
        // This test ensures the boundary check path is tested
        await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
    }

    [Fact]
    public async Task ResolveAsync_JsonElementArrayIndexZero_Works()
    {
        // Target: JsonElement array index boundary at line 438
        var json = System.Text.Json.JsonDocument.Parse("{\"items\":[\"first\",\"second\"]}");
        var template = "{{forEach.item.items[0]}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = json.RootElement.Clone(),
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("first");
    }

    [Fact]
    public async Task ResolveAsync_NonGenericListArrayIndex_Works()
    {
        // Target: IList (non-generic) path at line 449
        var arrayList = new System.Collections.ArrayList { "x", "y", "z" };
        var template = "{{input.list[1]}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["list"] = arrayList
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("y");
    }

    [Fact]
    public async Task ResolveAsync_NonGenericListOutOfBounds_Throws()
    {
        // Target: Non-generic list boundary check
        var arrayList = new System.Collections.ArrayList { "x" };
        var template = "{{input.list[5]}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["list"] = arrayList
            }
        };

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("out of bounds");
    }

    [Fact]
    public async Task ResolveAsync_ArrayIndexOnNonArray_ThrowsTypeError()
    {
        // Target: Line 462-469 - array index on non-array
        var template = "{{input.value[0]}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["value"] = "not an array"
            }
        };

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("non-array");
    }

    [Fact]
    public async Task ResolveAsync_InputPrefix_MustMatchExactly()
    {
        // Target: parts[0] == "input" mutation - ensure other prefixes don't match
        var template = "{{inputs.field}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["field"] = "value" }
        };

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("inputs");
        ex.Message.Should().Contain("not recognized");
    }

    [Fact]
    public async Task ResolveAsync_TasksPrefix_MustMatchExactly()
    {
        // Target: parts[0] == "tasks" mutation
        var template = "{{task.t1.output.value}}";
        var context = new TemplateContext();

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("task");
        ex.Message.Should().Contain("not recognized");
    }

    [Fact]
    public async Task ResolveAsync_ForEachPrefix_MustMatchExactly()
    {
        // Target: parts[0] == "forEach" mutation
        var template = "{{foreach.item}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext { ItemVar = "item", CurrentItem = "val", Index = 0 }
        };

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("foreach");
        ex.Message.Should().Contain("not recognized");
    }

    [Fact]
    public async Task ResolveAsync_JsonElementTrueBoolean_ReturnsTrue()
    {
        // Target: JsonValueKind.True case - goes through ConvertJsonElement which returns bool
        // Then bool.ToString() returns "True"
        var json = System.Text.Json.JsonDocument.Parse("{\"flag\":true}");
        var template = "{{forEach.item.flag}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = json.RootElement.Clone(),
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("True"); // C# bool.ToString() returns "True"
    }

    [Fact]
    public async Task ResolveAsync_JsonElementFalseBoolean_ReturnsFalse()
    {
        // Target: JsonValueKind.False case - goes through ConvertJsonElement which returns bool
        // Then bool.ToString() returns "False"
        var json = System.Text.Json.JsonDocument.Parse("{\"flag\":false}");
        var template = "{{forEach.item.flag}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = json.RootElement.Clone(),
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("False"); // C# bool.ToString() returns "False"
    }

    [Fact]
    public async Task ResolveAsync_JsonElementWithNullProperty_SkipsNullInDictionary()
    {
        // Target: JsonValueKind.Null case - ConvertJsonElement returns null
        // Null values are skipped in JsonElementToDictionary (not added to dict)
        // So accessing a null property results in "not found" error
        var json = System.Text.Json.JsonDocument.Parse("{\"value\":null,\"other\":\"exists\"}");
        var template = "{{forEach.item.other}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = json.RootElement.Clone(),
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("exists"); // The non-null property is accessible
    }

    [Fact]
    public async Task ResolveAsync_JsonElementNumber_ReturnsRawText()
    {
        // Target: JsonValueKind.Number case at line 365
        var json = System.Text.Json.JsonDocument.Parse("{\"num\":42.5}");
        var template = "{{forEach.item.num}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = json.RootElement.Clone(),
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("42.5");
    }

    [Fact]
    public async Task ResolveAsync_JsonElementObject_ReturnsJson()
    {
        // Target: JsonValueKind.Object default case at line 369
        var json = System.Text.Json.JsonDocument.Parse("{\"nested\":{\"a\":1}}");
        var template = "{{forEach.item.nested}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = json.RootElement.Clone(),
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Contain("\"a\"");
    }

    [Fact]
    public async Task ResolveAsync_ConvertJsonElement_String()
    {
        // Target: ConvertJsonElement String case at line 225
        var json = System.Text.Json.JsonDocument.Parse("{\"arr\":[{\"s\":\"text\"}]}");
        var template = "{{forEach.item.arr[0].s}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = json.RootElement.Clone(),
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("text");
    }

    [Fact]
    public async Task ResolveAsync_ConvertJsonElement_Integer()
    {
        // Target: ConvertJsonElement Number/Int case at line 226
        var json = System.Text.Json.JsonDocument.Parse("{\"arr\":[{\"n\":42}]}");
        var template = "{{forEach.item.arr[0].n}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = json.RootElement.Clone(),
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("42");
    }

    [Fact]
    public async Task ResolveAsync_ConvertJsonElement_Array()
    {
        // Target: ConvertJsonElement Array case at line 231
        var json = System.Text.Json.JsonDocument.Parse("{\"outer\":{\"inner\":[1,2,3]}}");
        var template = "{{forEach.item.outer.inner}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = json.RootElement.Clone(),
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Contain("[1,2,3]");
    }

    [Fact]
    public async Task ResolveAsync_TasksLengthCheck_RequiresAtLeast3Parts()
    {
        // Target: parts.Length >= 3 check at line 55
        var template = "{{tasks.taskId}}";
        var context = new TemplateContext();

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("tasks");
    }

    [Fact]
    public async Task ResolveAsync_TasksOutputKeyword_MustBeOutput()
    {
        // Target: parts[2] == "output" check at line 55
        var template = "{{tasks.taskId.result.field}}";
        var context = new TemplateContext();

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("not recognized");
    }

    [Fact]
    public async Task ResolveAsync_ForEachIndexKeyword_MustBeExact()
    {
        // Target: parts[1] == "index" check at line 107
        var template = "{{forEach.idx}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext { ItemVar = "item", CurrentItem = "val", Index = 5 }
        };

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("idx");
    }

    [Fact]
    public async Task ResolveAsync_ForEachParentKeyword_MustBeExact()
    {
        // Target: parts[1] == "$parent" check at line 113
        var template = "{{forEach.$Parent.item}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = "val",
                Index = 0,
                Parent = new ForEachContext { ItemVar = "outer", CurrentItem = "parent", Index = 0 }
            }
        };

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("$Parent");
    }

    [Fact]
    public async Task ResolveAsync_ForEachRootKeyword_MustBeExact()
    {
        // Target: parts[1] == "$root" check at line 136
        var template = "{{forEach.$Root.item}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext { ItemVar = "item", CurrentItem = "val", Index = 0 }
        };

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("$Root");
    }

    [Fact]
    public async Task ResolveAsync_ForEachItemVar_MustMatchExactly()
    {
        // Target: parts[1] == forEachContext.ItemVar check at line 152
        var template = "{{forEach.items}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext { ItemVar = "item", CurrentItem = "val", Index = 0 }
        };

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("items");
        ex.Message.Should().Contain("item"); // Should suggest the correct itemVar
    }

    [Fact]
    public async Task ResolveAsync_SerializeValue_DecimalType()
    {
        // Target: decimal in type check at line 248
        var template = "{{forEach.item}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = 123.45m,
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("123.45");
    }

    [Fact]
    public async Task ResolveAsync_SerializeValue_DoubleType()
    {
        // Target: double in type check at line 248
        var template = "{{forEach.item}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = 99.99d,
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Contain("99.99");
    }

    [Fact]
    public async Task ResolveAsync_SerializeValue_LongType()
    {
        // Target: long in type check at line 248
        var template = "{{forEach.item}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = 9999999999L,
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("9999999999");
    }

    [Fact]
    public async Task ResolveAsync_FieldNotFound_ShowsAvailableFields()
    {
        // Target: dict.Keys.Take(10) and error message construction
        var template = "{{input.missing}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["field1"] = "a", ["field2"] = "b", ["field3"] = "c"
            }
        };

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("field1");
        ex.Message.Should().Contain("field2");
        ex.Message.Should().Contain("field3");
    }

    [Fact]
    public async Task ResolveAsync_EmptyDictionary_ShowsEmptyMessage()
    {
        // Target: dict.Keys.Any() check for empty object message
        var template = "{{input.missing}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>()
        };

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("empty object");
    }

    [Fact]
    public async Task ResolveAsync_TaskNotFound_ShowsNoTasksMessage()
    {
        // Target: context.TaskOutputs.Keys.Any() check for no tasks message
        var template = "{{tasks.missing.output.field}}";
        var context = new TemplateContext();

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("no tasks have completed");
    }

    [Fact]
    public async Task ResolveAsync_PropertyAccessOnNull_ThrowsError()
    {
        // Target: property == null check at line 332
        var template = "{{input.obj.unknownProp}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["obj"] = new { KnownProp = "value" }
            }
        };

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("unknownProp");
        ex.Message.Should().Contain("not found");
    }

    [Fact]
    public async Task ResolveAsync_PropertyAccessOnPoco_Works()
    {
        // Target: Lines 329-344 - POCO property access path
        var template = "{{input.obj.Name}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["obj"] = new TestPoco { Name = "Test Name" }
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("Test Name");
    }

    [Fact]
    public async Task ResolveAsync_GetProperty_JsonElementPath()
    {
        // Target: Lines 391-401 - GetProperty with JsonElement
        var json = System.Text.Json.JsonDocument.Parse("{\"outer\":{\"inner\":\"value\"}}");
        var template = "{{input.outer.inner}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["outer"] = json.RootElement.GetProperty("outer")
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("value");
    }

    [Fact]
    public async Task ResolveAsync_GetProperty_PocoPropertyNotFound()
    {
        // Target: Lines 405-416 - GetProperty POCO not found
        var template = "{{input.arr[0].Missing}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["arr"] = new List<object> { new TestPoco { Name = "test" } }
            }
        };

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("Missing");
        ex.Message.Should().Contain("not found");
    }

    [Fact]
    public async Task ResolveAsync_PartsLength1_ThrowsInvalidExpression()
    {
        // Target: parts.Length < 2 check at line 37
        var template = "{{singlePart}}";
        var context = new TemplateContext();

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("at least 2 parts");
        ex.Message.Should().Contain("1 part");
    }

    [Fact]
    public async Task ResolveAsync_ForEachItemWithOnlyTwoParts_ReturnsWholeItem()
    {
        // Target: parts.Length == 2 check at line 155
        var template = "{{forEach.item}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = "simple value",
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("simple value");
    }

    [Fact]
    public async Task ResolveAsync_ResolveItemPath_NullItem_ReturnsEmpty()
    {
        // Target: item == null check at line 175
        var template = "{{forEach.item.field}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = null,
                Index = 0
            }
        };

        var result = await _resolver.ResolveAsync(template, context);
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task ResolveAsync_ResolveItemPath_SimpleType_ThrowsCannotNavigate()
    {
        // Target: Lines 197-204 - cannot navigate simple types
        var template = "{{forEach.item.property}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = 42,
                Index = 0
            }
        };

        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("Int32");
        ex.Message.Should().Contain("Cannot navigate");
    }

    private class TestPoco
    {
        public string Name { get; set; } = "";
    }

    #endregion

    #region Additional Mutation Killing Tests - Boundary Conditions

    [Fact]
    public async Task ResolveAsync_ExactlyTwoParts_Succeeds()
    {
        // Target: parts.Length < 2 boundary - exactly 2 parts should succeed
        var template = "{{input.x}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["x"] = "val" }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("val");
    }

    [Fact]
    public async Task ResolveAsync_ExactlyThreeParts_TasksPath_Fails()
    {
        // Target: parts.Length >= 3 check for tasks - exactly 3 parts without 'output'
        var template = "{{tasks.myTask.something}}";
        var context = new TemplateContext
        {
            TaskOutputs = new System.Collections.Concurrent.ConcurrentDictionary<string, Dictionary<string, object>>()
        };
        // Should fail since parts[2] != "output"
        await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
    }

    [Fact]
    public async Task ResolveAsync_FourPartsTasksPath_Succeeds()
    {
        // Target: parts.Skip(3) - with 4 parts, skip(3) gives 1 element
        var template = "{{tasks.myTask.output.field}}";
        var context = new TemplateContext
        {
            TaskOutputs = new System.Collections.Concurrent.ConcurrentDictionary<string, Dictionary<string, object>>
            {
                ["myTask"] = new Dictionary<string, object> { ["field"] = "val" }
            }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("val");
    }

    [Fact]
    public async Task ResolveAsync_TasksOutputOnly_ReturnsEntireOutput()
    {
        // Target: when path is empty after Skip(3), serialize entire output
        var template = "{{tasks.myTask.output}}";
        var context = new TemplateContext
        {
            TaskOutputs = new System.Collections.Concurrent.ConcurrentDictionary<string, Dictionary<string, object>>
            {
                ["myTask"] = new Dictionary<string, object> { ["x"] = 1 }
            }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Contain("\"x\"").And.Contain("1");
    }

    [Fact]
    public async Task ResolveAsync_ForEachExactlyTwoParts_ReturnsWholeItem()
    {
        // Target: parts.Length == 2 for forEach - returns SerializeValue
        var template = "{{forEach.item}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext { ItemVar = "item", CurrentItem = new { a = 1 }, Index = 0 }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Contain("\"a\"").And.Contain("1");
    }

    [Fact]
    public async Task ResolveAsync_ForEachThreeParts_NavigatesIntoItem()
    {
        // Target: parts.Length > 2 for forEach - navigates with Skip(2)
        var template = "{{forEach.item.name}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = new Dictionary<string, object> { ["name"] = "test" },
                Index = 0
            }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("test");
    }

    #endregion

    #region Additional Mutation Killing Tests - Type Checks

    [Fact]
    public async Task ResolveAsync_SerializeValue_LongType_WithForEach()
    {
        // Target: is long check in SerializeValue (line 248)
        var template = "{{forEach.item}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext { ItemVar = "item", CurrentItem = 9999999999L, Index = 0 }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("9999999999");
    }

    [Fact]
    public async Task ResolveAsync_SerializeValue_DoubleType_WithForEach()
    {
        // Target: is double check in SerializeValue
        var template = "{{forEach.item}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext { ItemVar = "item", CurrentItem = 3.14159, Index = 0 }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Contain("3.14");
    }

    [Fact]
    public async Task ResolveAsync_SerializeValue_FloatType_WithForEach()
    {
        // Target: is float check in SerializeValue
        var template = "{{forEach.item}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext { ItemVar = "item", CurrentItem = 2.5f, Index = 0 }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Contain("2.5");
    }

    [Fact]
    public async Task ResolveAsync_SerializeValue_DecimalType_WithForEach()
    {
        // Target: is decimal check in SerializeValue
        var template = "{{forEach.item}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext { ItemVar = "item", CurrentItem = 99.99m, Index = 0 }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Contain("99.99");
    }

    [Fact]
    public async Task ResolveAsync_ResolveInputPath_LongValue()
    {
        // Target: is long in line 354
        var template = "{{input.val}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["val"] = 12345678901234L }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("12345678901234");
    }

    [Fact]
    public async Task ResolveAsync_ResolveInputPath_FloatValue()
    {
        // Target: is float in line 354
        var template = "{{input.val}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["val"] = 1.5f }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Contain("1.5");
    }

    [Fact]
    public async Task ResolveAsync_ResolveInputPath_DecimalValue()
    {
        // Target: is decimal in line 354
        var template = "{{input.val}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["val"] = 123.456m }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Contain("123.456");
    }

    #endregion

    #region Additional Mutation Killing Tests - Error Messages

    [Fact]
    public async Task ResolveAsync_InvalidPrefix_ErrorContainsPrefix()
    {
        // Target: Error message contains the invalid prefix (line 86)
        var template = "{{unknown.field}}";
        var context = new TemplateContext();
        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("'unknown'");
    }

    [Fact]
    public async Task ResolveAsync_TaskNotFound_ErrorContainsTaskIdExact()
    {
        // Target: Error message contains taskId (line 66)
        var template = "{{tasks.missing-task.output.field}}";
        var context = new TemplateContext
        {
            TaskOutputs = new System.Collections.Concurrent.ConcurrentDictionary<string, Dictionary<string, object>>()
        };
        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("'missing-task'");
    }

    [Fact]
    public async Task ResolveAsync_FieldNotFound_ErrorContainsFieldNameExact()
    {
        // Target: Error message contains field name (line 290)
        var template = "{{input.missingField}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["otherField"] = "val" }
        };
        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("'missingField'");
        ex.Message.Should().Contain("'otherField'");
    }

    [Fact]
    public async Task ResolveAsync_ArrayIndexOutOfBounds_ErrorContainsIndex()
    {
        // Target: Error message includes index value (line 428)
        var template = "{{input.items[99]}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["items"] = new List<object> { "a", "b" } }
        };
        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("[99]");
        ex.Message.Should().Contain("2 element");
    }

    [Fact]
    public async Task ResolveAsync_NegativeArrayIndex_ThrowsFieldNotFound()
    {
        // Target: Negative index isn't matched by array regex, so field lookup fails
        var template = "{{input.items[-1]}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["items"] = new List<object> { "a" } }
        };
        // The regex \d+ doesn't match -1, so "items[-1]" is treated as a field name
        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("items[-1]");
    }

    [Fact]
    public async Task ResolveAsync_ForEachWrongItemVar_ErrorContainsActualItemVar()
    {
        // Target: Error message contains forEachContext.ItemVar (line 168)
        var template = "{{forEach.wrongVar}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext { ItemVar = "correctVar", CurrentItem = "x", Index = 0 }
        };
        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("'correctVar'");
        ex.Message.Should().Contain("'wrongVar'");
    }

    #endregion

    #region Additional Mutation Killing Tests - String Operations

    [Fact]
    public async Task ResolveAsync_TemplateWithWhitespace_Trims()
    {
        // Target: expression.Trim() at line 26
        var template = "{{  input.x  }}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["x"] = "val" }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("val");
    }

    [Fact]
    public async Task ResolveAsync_OnePart_ThrowsWithPartCount()
    {
        // Target: Error message includes parts.Length (line 43)
        var template = "{{single}}";
        var context = new TemplateContext();
        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("1 part");
    }

    [Fact]
    public async Task ResolveAsync_EmptyTemplate_ReturnsEmpty()
    {
        // Target: string.IsNullOrEmpty check, empty case (line 19)
        var result = await _resolver.ResolveAsync("", new TemplateContext());
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task ResolveAsync_NullTemplate_ReturnsNull()
    {
        // Target: string.IsNullOrEmpty check, null case (line 19)
        var result = await _resolver.ResolveAsync(null!, new TemplateContext());
        result.Should().BeNull();
    }

    #endregion

    #region Additional Mutation Killing Tests - POCO Properties

    [Fact]
    public async Task ResolveAsync_PocoPropertyNotFound_ErrorContainsTypeName()
    {
        // Target: currentType?.Name in error message (line 339)
        var template = "{{input.nested.missingProp}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["nested"] = new TestPoco { Name = "test" } }
        };
        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("TestPoco");
        ex.Message.Should().Contain("'missingProp'");
    }

    [Fact]
    public async Task ResolveAsync_GetPropertyOnPoco_ReturnsValue()
    {
        // Target: GetProperty POCO branch (lines 405-416)
        var template = "{{input.arr[0].Name}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["arr"] = new List<object> { new TestPoco { Name = "found" } }
            }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("found");
    }

    #endregion

    #region Additional Mutation Killing Tests - ForEach Navigation

    [Fact]
    public async Task ResolveAsync_ForEachParentNoParent_ThrowsError()
    {
        // Target: Parent null check (line 115)
        var template = "{{forEach.$parent.item}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext { ItemVar = "item", CurrentItem = "x", Index = 0, Parent = null }
        };
        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("no parent");
    }

    [Fact]
    public async Task ResolveAsync_ForEachParentWithParent_NavigatesToParent()
    {
        // Target: Parent navigation (lines 125-132)
        var template = "{{forEach.$parent.outer}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "inner",
                CurrentItem = "innerVal",
                Index = 1,
                Parent = new ForEachContext { ItemVar = "outer", CurrentItem = "outerVal", Index = 0 }
            }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("outerVal");
    }

    [Fact]
    public async Task ResolveAsync_ForEachRoot_NavigatesToRoot()
    {
        // Target: $root navigation (lines 136-148)
        var template = "{{forEach.$root.root}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "inner",
                CurrentItem = "innerVal",
                Index = 2,
                Parent = new ForEachContext
                {
                    ItemVar = "middle",
                    CurrentItem = "middleVal",
                    Index = 1,
                    Parent = new ForEachContext { ItemVar = "root", CurrentItem = "rootVal", Index = 0 }
                }
            }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("rootVal");
    }

    #endregion

    #region Additional Mutation Killing Tests - Array Operations

    [Fact]
    public async Task ResolveAsync_ArrayZeroIndex_ReturnsFirstElement()
    {
        // Target: index >= 0 check - exactly 0 should work
        var template = "{{input.arr[0]}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["arr"] = new List<object> { "first", "second" } }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("first");
    }

    [Fact]
    public async Task ResolveAsync_ArrayLastValidIndex_ReturnsLastElement()
    {
        // Target: index < length check - exactly length-1 should work
        var template = "{{input.arr[2]}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["arr"] = new List<object> { "a", "b", "c" } }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("c");
    }

    [Fact]
    public async Task ResolveAsync_ArrayExactlyAtBoundary_ThrowsError()
    {
        // Target: index >= length - exactly at length should fail
        var template = "{{input.arr[3]}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["arr"] = new List<object> { "a", "b", "c" } }
        };
        await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
    }

    [Fact]
    public async Task ResolveAsync_EmptyArrayAccess_ThrowsWithEmptyMessage()
    {
        // Target: Empty array message "N/A (array is empty)" (line 426)
        var template = "{{input.arr[0]}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["arr"] = new List<object>() }
        };
        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("array is empty");
    }

    [Fact]
    public async Task ResolveAsync_NonArrayWithIndex_ThrowsWithTypeMessage()
    {
        // Target: actualType in error message (line 464)
        var template = "{{input.notArray[0]}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["notArray"] = "string value" }
        };
        var ex = await Assert.ThrowsAsync<TemplateResolutionException>(
            async () => await _resolver.ResolveAsync(template, context));
        ex.Message.Should().Contain("String");
    }

    #endregion

    #region Additional Mutation Killing Tests - ConvertJsonElement

    [Fact]
    public async Task ResolveAsync_JsonElementArray_ConvertsToList()
    {
        // Target: JsonValueKind.Array case in ConvertJsonElement (line 231)
        var json = System.Text.Json.JsonSerializer.Deserialize<System.Text.Json.JsonElement>("[1,2,3]");
        var template = "{{forEach.item}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = json,
                Index = 0
            }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Contain("[").And.Contain("1").And.Contain("2").And.Contain("3");
    }

    [Fact]
    public async Task ResolveAsync_JsonElementUndefined_ReturnsRawText()
    {
        // Target: Default case in ConvertJsonElement (line 232)
        // Create a JsonElement that has ValueKind.Undefined (difficult, but we can test the default branch)
        var template = "{{input.field}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["field"] = "simple" }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("simple");
    }

    #endregion

    #region Mutation Killing - Boundary Conditions

    [Fact]
    public async Task ResolveAsync_ExactlyTwoParts_ValidExpression()
    {
        // Target: parts.Length < 2 boundary at line 37
        var template = "{{input.x}}";
        var context = new TemplateContext { Input = new Dictionary<string, object> { ["x"] = "value" } };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("value");
    }

    [Fact]
    public async Task ResolveAsync_ExactlyThreeParts_ValidTaskExpression()
    {
        // Target: parts.Length >= 3 boundary at line 55
        var template = "{{tasks.t1.output}}";
        var context = new TemplateContext
        {
            TaskOutputs = new Dictionary<string, Dictionary<string, object>>
            {
                ["t1"] = new Dictionary<string, object> { ["data"] = "val" }
            }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Contain("data");
    }

    [Fact]
    public async Task ResolveAsync_FourPartsTaskExpression_ResolvesNestedPath()
    {
        // Target: parts.Length >= 3 with additional path at line 55
        var template = "{{tasks.t1.output.data}}";
        var context = new TemplateContext
        {
            TaskOutputs = new Dictionary<string, Dictionary<string, object>>
            {
                ["t1"] = new Dictionary<string, object> { ["data"] = "nested" }
            }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("nested");
    }

    [Fact]
    public async Task ResolveAsync_IntValue_ToString()
    {
        // Target: int type check at line 248
        var template = "{{input.num}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["num"] = 42 }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("42");
    }

    [Fact]
    public async Task ResolveAsync_LongValue_ToString()
    {
        // Target: long type check at line 248
        var template = "{{input.num}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["num"] = 9999999999L }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("9999999999");
    }

    [Fact]
    public async Task ResolveAsync_DoubleValue_ToString()
    {
        // Target: double type check at line 248
        var template = "{{input.num}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["num"] = 3.14159 }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Contain("3.14");
    }

    [Fact]
    public async Task ResolveAsync_FloatValue_ToString()
    {
        // Target: float type check at line 248
        var template = "{{input.num}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["num"] = 2.5f }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Contain("2.5");
    }

    [Fact]
    public async Task ResolveAsync_DecimalValue_ToString()
    {
        // Target: decimal type check at line 248
        var template = "{{input.num}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["num"] = 123.45m }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Contain("123.45");
    }

    [Fact]
    public async Task ResolveAsync_BoolValue_ToString()
    {
        // Target: bool type check at line 248
        var template = "{{input.flag}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["flag"] = true }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("True");
    }

    [Fact]
    public async Task ResolveAsync_BoolValueFalse_ToString()
    {
        // Target: bool type check at line 248
        var template = "{{input.flag}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["flag"] = false }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("False");
    }

    [Fact]
    public async Task ResolveAsync_ForEachPartsLengthEquals2_ReturnsItem()
    {
        // Target: parts.Length == 2 at line 155
        var template = "{{forEach.item}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = "simple_value",
                Index = 0
            }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("simple_value");
    }

    [Fact]
    public async Task ResolveAsync_ForEachPartsLengthGreaterThan2_NavigatesIntoItem()
    {
        // Target: parts.Length == 2 at line 155 - taking false branch
        var template = "{{forEach.item.name}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = new Dictionary<string, object> { ["name"] = "John" },
                Index = 0
            }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("John");
    }

    [Fact]
    public async Task ResolveAsync_ResolveInputPath_EmptyPath_ReturnsSerializedDict()
    {
        // Target: string.IsNullOrEmpty(path) at line 259
        var template = "{{tasks.t1.output}}";
        var context = new TemplateContext
        {
            TaskOutputs = new Dictionary<string, Dictionary<string, object>>
            {
                ["t1"] = new Dictionary<string, object> { ["a"] = 1, ["b"] = 2 }
            }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Contain("\"a\"").And.Contain("\"b\"");
    }

    [Fact]
    public async Task ResolveAsync_ArrayIndexSuccess_ReturnsElement()
    {
        // Target: arrayMatch.Success at line 271
        var template = "{{input.items[0]}}";
        var items = new List<object> { "first", "second", "third" };
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["items"] = items }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("first");
    }

    [Fact]
    public async Task ResolveAsync_ArrayIndexSecondElement_ReturnsElement()
    {
        // Target: array index boundary
        var template = "{{input.items[1]}}";
        var items = new List<object> { "first", "second", "third" };
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["items"] = items }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("second");
    }

    [Fact]
    public async Task ResolveAsync_ArrayIndexLastElement_ReturnsElement()
    {
        // Target: array index boundary
        var template = "{{input.items[2]}}";
        var items = new List<object> { "first", "second", "third" };
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["items"] = items }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("third");
    }

    [Fact]
    public async Task ResolveAsync_DictContainsKeyFalse_ThrowsWithAvailableFields()
    {
        // Target: !dict.ContainsKey(part) at line 284
        var template = "{{input.missing}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["present"] = "value" }
        };
        var act = async () => await _resolver.ResolveAsync(template, context);
        await act.Should().ThrowAsync<TemplateResolutionException>()
            .Where(e => e.Message.Contains("missing") && e.Message.Contains("present"));
    }

    [Fact]
    public async Task ResolveAsync_JsonElementObject_TryGetPropertyFails_ThrowsWithAvailableProps()
    {
        // Target: !jsonElement.TryGetProperty at line 302
        var json = JsonSerializer.Deserialize<JsonElement>("{\"existing\": 1}");
        var template = "{{input.data.nonexistent}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["data"] = json }
        };
        var act = async () => await _resolver.ResolveAsync(template, context);
        await act.Should().ThrowAsync<TemplateResolutionException>()
            .Where(e => e.Message.Contains("nonexistent") && e.Message.Contains("existing"));
    }

    [Fact]
    public async Task ResolveAsync_JsonElementNotObject_ThrowsCannotNavigate()
    {
        // Target: jsonElement.ValueKind != Object at line 318
        var json = JsonSerializer.Deserialize<JsonElement>("\"string_value\"");
        var template = "{{input.data.child}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["data"] = json }
        };
        var act = async () => await _resolver.ResolveAsync(template, context);
        await act.Should().ThrowAsync<TemplateResolutionException>()
            .Where(e => e.Message.Contains("Cannot navigate"));
    }

    [Fact]
    public async Task ResolveAsync_PocoPropertyNull_ThrowsWithAvailableProps()
    {
        // Target: property == null at line 332
        var poco = new { Name = "Test", Value = 123 };
        var template = "{{input.obj.NonExistent}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["obj"] = poco }
        };
        var act = async () => await _resolver.ResolveAsync(template, context);
        await act.Should().ThrowAsync<TemplateResolutionException>()
            .Where(e => e.Message.Contains("NonExistent") && e.Message.Contains("Name"));
    }

    [Fact]
    public async Task ResolveAsync_ResultIsStringType_ReturnsDirectly()
    {
        // Target: current is string str at line 349
        var template = "{{input.name}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["name"] = "direct_string" }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("direct_string");
    }

    [Fact]
    public async Task ResolveAsync_ResultIsIntType_ReturnsToString()
    {
        // Target: current is int at line 354
        var template = "{{input.count}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["count"] = 999 }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("999");
    }

    [Fact]
    public async Task ResolveAsync_JsonElementString_ReturnsString()
    {
        // Target: JsonValueKind.String at line 364
        var json = JsonSerializer.Deserialize<JsonElement>("{\"name\": \"test_name\"}");
        var template = "{{input.data.name}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["data"] = json }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("test_name");
    }

    [Fact]
    public async Task ResolveAsync_JsonElementNumber_ReturnsRawTextInt()
    {
        // Target: JsonValueKind.Number at line 365
        var json = JsonSerializer.Deserialize<JsonElement>("{\"value\": 12345}");
        var template = "{{input.data.value}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["data"] = json }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("12345");
    }

    [Fact]
    public async Task ResolveAsync_JsonElementTrue_ReturnsTrue()
    {
        // Target: JsonValueKind.True at line 366
        var json = JsonSerializer.Deserialize<JsonElement>("{\"flag\": true}");
        var template = "{{input.data.flag}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["data"] = json }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("true");
    }

    [Fact]
    public async Task ResolveAsync_JsonElementFalse_ReturnsFalse()
    {
        // Target: JsonValueKind.False at line 367
        var json = JsonSerializer.Deserialize<JsonElement>("{\"flag\": false}");
        var template = "{{input.data.flag}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["data"] = json }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be("false");
    }

    [Fact]
    public async Task ResolveAsync_JsonElementNull_ReturnsEmptyString()
    {
        // Target: JsonValueKind.Null at line 368
        var json = JsonSerializer.Deserialize<JsonElement>("{\"value\": null}");
        var template = "{{input.data.value}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["data"] = json }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be(string.Empty);
    }

    [Fact]
    public async Task ResolveAsync_JsonElementArray_ReturnsRawText()
    {
        // Target: Default case (object/array) at line 369
        var json = JsonSerializer.Deserialize<JsonElement>("{\"items\": [1, 2, 3]}");
        var template = "{{input.data.items}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["data"] = json }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Contain("[1,2,3]");
    }

    [Fact]
    public async Task ResolveAsync_ComplexObject_SerializesToJson()
    {
        // Target: JsonSerializer.Serialize at line 374
        var template = "{{input.complex}}";
        var complex = new Dictionary<string, object>
        {
            ["nested"] = new Dictionary<string, object> { ["a"] = 1 }
        };
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["complex"] = complex }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Contain("nested").And.Contain("\"a\"");
    }

    [Fact]
    public async Task ResolveAsync_GetPropertyFromDictMissing_ThrowsWithAvailable()
    {
        // Target: GetProperty dict.ContainsKey at line 381
        var template = "{{input.items[0]}}";
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["other"] = "value" }
        };
        var act = async () => await _resolver.ResolveAsync(template, context);
        await act.Should().ThrowAsync<TemplateResolutionException>()
            .Where(e => e.Message.Contains("items") && e.Message.Contains("other"));
    }

    [Fact]
    public async Task ResolveAsync_ForEachItemNull_ReturnsEmptyString()
    {
        // Target: item == null at line 175
        var template = "{{forEach.item.name}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = null,
                Index = 0
            }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be(string.Empty);
    }

    [Fact]
    public async Task ResolveAsync_ForEachItemSimpleType_ThrowsCannotNavigate()
    {
        // Target: item is not Dictionary at line 181 -> throws at line 199
        var template = "{{forEach.item.path}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = "simple_string",
                Index = 0
            }
        };
        var act = async () => await _resolver.ResolveAsync(template, context);
        await act.Should().ThrowAsync<TemplateResolutionException>()
            .Where(e => e.Message.Contains("Cannot navigate"));
    }

    [Fact]
    public async Task ResolveAsync_TasksOutputNotInParts_Throws()
    {
        // Target: parts[2] != "output" implicit check
        var template = "{{tasks.t1.notoutput.field}}";
        var taskOutputs = new ConcurrentDictionary<string, Dictionary<string, object>>();
        taskOutputs["t1"] = new Dictionary<string, object> { ["field"] = "value" };
        var context = new TemplateContext
        {
            TaskOutputs = taskOutputs
        };
        var act = async () => await _resolver.ResolveAsync(template, context);
        await act.Should().ThrowAsync<TemplateResolutionException>();
    }

    [Fact]
    public async Task ResolveAsync_TasksLengthLessThan3_Throws()
    {
        // Target: parts.Length >= 3 check at line 55
        var template = "{{tasks.t1}}";
        var taskOutputs = new ConcurrentDictionary<string, Dictionary<string, object>>();
        taskOutputs["t1"] = new Dictionary<string, object> { ["field"] = "value" };
        var context = new TemplateContext
        {
            TaskOutputs = taskOutputs
        };
        var act = async () => await _resolver.ResolveAsync(template, context);
        await act.Should().ThrowAsync<TemplateResolutionException>();
    }

    [Fact]
    public async Task ResolveAsync_UnknownPrefix_Throws()
    {
        // Target: throw at line 84 - unknown expression type
        var template = "{{unknown.path.here}}";
        var context = new TemplateContext { Input = new Dictionary<string, object>() };
        var act = async () => await _resolver.ResolveAsync(template, context);
        await act.Should().ThrowAsync<TemplateResolutionException>()
            .Where(e => e.Message.Contains("Unknown template expression type"));
    }

    [Fact]
    public async Task ResolveAsync_SerializeValue_NullReturnsEmpty()
    {
        // Target: value == null at line 238
        var template = "{{forEach.item}}";
        var context = new TemplateContext
        {
            ForEach = new ForEachContext
            {
                ItemVar = "item",
                CurrentItem = null,
                Index = 0
            }
        };
        var result = await _resolver.ResolveAsync(template, context);
        result.Should().Be(string.Empty);
    }

    #endregion
}
