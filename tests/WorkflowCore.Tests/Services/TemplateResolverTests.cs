using FluentAssertions;
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
}
