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
            TaskOutputs = new Dictionary<string, Dictionary<string, object>>
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
            TaskOutputs = new Dictionary<string, Dictionary<string, object>>
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
            TaskOutputs = new Dictionary<string, Dictionary<string, object>>
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
            TaskOutputs = new Dictionary<string, Dictionary<string, object>>() // Empty
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
            TaskOutputs = new Dictionary<string, Dictionary<string, object>>
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
            TaskOutputs = new Dictionary<string, Dictionary<string, object>>
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
            TaskOutputs = new Dictionary<string, Dictionary<string, object>>
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
}
