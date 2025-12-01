using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

/// <summary>
/// TDD tests for optimized template resolution using raw JSON storage.
/// RED phase: These tests define the expected behavior before implementation.
/// </summary>
public class OptimizedTemplateResolverTests
{
    private readonly OptimizedTemplateResolver _resolver;
    private readonly OptimizedJsonStorage _storage;

    public OptimizedTemplateResolverTests()
    {
        _storage = new OptimizedJsonStorage();
        _resolver = new OptimizedTemplateResolver(_storage);
    }

    #region Passthrough Scenarios - Should use raw JSON directly

    [Fact]
    public async Task ResolveAsync_WithFullOutputPassthrough_ReturnsRawJson()
    {
        // Arrange - Raw JSON is stored without parsing
        var rawJson = """{"name":"John","age":30,"nested":{"city":"London"}}""";
        _storage.Store("fetch-user", rawJson);

        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>()
        };

        // Act - Request entire output
        var result = await _resolver.ResolveAsync("{{tasks.fetch-user.output}}", context);

        // Assert - Should return exact raw JSON (no deserialize/re-serialize)
        result.Should().Be(rawJson);
    }

    [Fact]
    public async Task ResolveAsync_WithLargePayloadPassthrough_ReturnsExactOriginal()
    {
        // Arrange - Large JSON with specific formatting
        var largeJson = GenerateLargeJson();
        _storage.Store("fetch-data", largeJson);

        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>()
        };

        // Act
        var result = await _resolver.ResolveAsync("{{tasks.fetch-data.output}}", context);

        // Assert - Must be exactly the same (byte-for-byte)
        result.Should().Be(largeJson);
    }

    #endregion

    #region Nested Access - Should navigate using JsonDocument

    [Fact]
    public async Task ResolveAsync_WithNestedPath_ReturnsValue()
    {
        // Arrange
        var json = """{"user":{"name":"John","address":{"city":"London","country":"UK"}}}""";
        _storage.Store("fetch-user", json);

        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>()
        };

        // Act
        var result = await _resolver.ResolveAsync("{{tasks.fetch-user.output.user.address.city}}", context);

        // Assert
        result.Should().Be("London");
    }

    [Fact]
    public async Task ResolveAsync_WithNumericValue_ReturnsNumberAsString()
    {
        // Arrange
        var json = """{"user":{"name":"John","age":30}}""";
        _storage.Store("fetch-user", json);

        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>()
        };

        // Act
        var result = await _resolver.ResolveAsync("{{tasks.fetch-user.output.user.age}}", context);

        // Assert
        result.Should().Be("30");
    }

    [Fact]
    public async Task ResolveAsync_WithBooleanValue_ReturnsBoolAsString()
    {
        // Arrange
        var json = """{"user":{"active":true}}""";
        _storage.Store("fetch-user", json);

        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>()
        };

        // Act
        var result = await _resolver.ResolveAsync("{{tasks.fetch-user.output.user.active}}", context);

        // Assert
        result.Should().Be("true");
    }

    [Fact]
    public async Task ResolveAsync_WithNestedObject_ReturnsObjectAsJson()
    {
        // Arrange
        var json = """{"data":{"inner":{"key":"value","count":5}}}""";
        _storage.Store("fetch-data", json);

        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>()
        };

        // Act
        var result = await _resolver.ResolveAsync("{{tasks.fetch-data.output.data.inner}}", context);

        // Assert
        result.Should().Be("""{"key":"value","count":5}""");
    }

    [Fact]
    public async Task ResolveAsync_WithArrayAccess_ReturnsArrayElement()
    {
        // Arrange
        var json = """{"items":["first","second","third"]}""";
        _storage.Store("fetch-items", json);

        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>()
        };

        // Act
        var result = await _resolver.ResolveAsync("{{tasks.fetch-items.output.items[1]}}", context);

        // Assert
        result.Should().Be("second");
    }

    [Fact]
    public async Task ResolveAsync_WithNestedArrayObjectAccess_ReturnsValue()
    {
        // Arrange
        var json = """{"results":[{"id":1,"name":"First"},{"id":2,"name":"Second"}]}""";
        _storage.Store("fetch-results", json);

        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>()
        };

        // Act
        var result = await _resolver.ResolveAsync("{{tasks.fetch-results.output.results[1].name}}", context);

        // Assert
        result.Should().Be("Second");
    }

    #endregion

    #region Input Resolution - Should still work normally

    [Fact]
    public async Task ResolveAsync_WithInputValue_ReturnsInputValue()
    {
        // Arrange
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["city"] = "Paris",
                ["count"] = 42
            }
        };

        // Act
        var cityResult = await _resolver.ResolveAsync("{{input.city}}", context);
        var countResult = await _resolver.ResolveAsync("{{input.count}}", context);

        // Assert
        cityResult.Should().Be("Paris");
        countResult.Should().Be("42");
    }

    [Fact]
    public async Task ResolveAsync_WithNestedInput_ReturnsNestedValue()
    {
        // Arrange
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["user"] = new Dictionary<string, object>
                {
                    ["name"] = "Alice",
                    ["email"] = "alice@example.com"
                }
            }
        };

        // Act - Using JsonElement navigation
        var result = await _resolver.ResolveAsync("The user is {{input.user}}", context);

        // Assert - Should serialize the nested object
        result.Should().Contain("Alice");
    }

    #endregion

    #region Mixed Templates - Multiple expressions in one string

    [Fact]
    public async Task ResolveAsync_WithMultipleExpressions_ResolvesAll()
    {
        // Arrange
        var json = """{"weather":{"temp":"15","condition":"cloudy"}}""";
        _storage.Store("fetch-weather", json);

        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>
            {
                ["city"] = "London"
            }
        };

        // Act
        var result = await _resolver.ResolveAsync(
            "Weather in {{input.city}}: {{tasks.fetch-weather.output.weather.temp}}°C, {{tasks.fetch-weather.output.weather.condition}}",
            context);

        // Assert
        result.Should().Be("Weather in London: 15°C, cloudy");
    }

    #endregion

    #region Root Array Indexing - output[N] syntax for array responses

    [Fact]
    public async Task ResolveAsync_WithRootArrayIndex_ReturnsElement()
    {
        // Arrange - HN API topstories.json returns array of story IDs
        var json = """[42547728,42547283,42546942,42545678]""";
        _storage.Store("get-top-stories", json);

        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>()
        };

        // Act - Use output[0] syntax to get first element
        var result = await _resolver.ResolveAsync("{{tasks.get-top-stories.output[0]}}", context);

        // Assert
        result.Should().Be("42547728");
    }

    [Fact]
    public async Task ResolveAsync_WithRootArrayIndex_ReturnsSecondElement()
    {
        // Arrange
        var json = """[42547728,42547283,42546942]""";
        _storage.Store("get-stories", json);

        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>()
        };

        // Act
        var result = await _resolver.ResolveAsync("{{tasks.get-stories.output[1]}}", context);

        // Assert
        result.Should().Be("42547283");
    }

    [Fact]
    public async Task ResolveAsync_WithRootArrayIndexAndNestedPath_ReturnsNestedValue()
    {
        // Arrange - Array of HN story objects
        var json = """[{"id":42547728,"title":"First Story","by":"author1"},{"id":42547283,"title":"Second Story","by":"author2"}]""";
        _storage.Store("get-stories", json);

        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>()
        };

        // Act - Get title of second story
        var result = await _resolver.ResolveAsync("{{tasks.get-stories.output[1].title}}", context);

        // Assert
        result.Should().Be("Second Story");
    }

    [Fact]
    public async Task ResolveAsync_WithRootArrayIndexReturningObject_ReturnsJsonString()
    {
        // Arrange
        var json = """[{"id":1,"title":"Story One"},{"id":2,"title":"Story Two"}]""";
        _storage.Store("get-stories", json);

        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>()
        };

        // Act - Get entire first object
        var result = await _resolver.ResolveAsync("{{tasks.get-stories.output[0]}}", context);

        // Assert
        result.Should().Be("""{"id":1,"title":"Story One"}""");
    }

    [Fact]
    public async Task ResolveAsync_WithMultipleRootArrayIndexes_ResolvesAll()
    {
        // Arrange - Simulates HN workflow: get IDs then fetch individual stories
        var idsJson = """[42547728,42547283,42546942]""";
        _storage.Store("get-ids", idsJson);

        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>()
        };

        // Act - Build a message using multiple array indexes
        var result = await _resolver.ResolveAsync(
            "First: {{tasks.get-ids.output[0]}}, Second: {{tasks.get-ids.output[1]}}, Third: {{tasks.get-ids.output[2]}}",
            context);

        // Assert
        result.Should().Be("First: 42547728, Second: 42547283, Third: 42546942");
    }

    [Fact]
    public async Task ResolveAsync_WithRootArrayIndexOutOfBounds_ThrowsException()
    {
        // Arrange
        var json = """[1,2,3]""";
        _storage.Store("get-items", json);

        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>()
        };

        // Act & Assert
        var action = async () => await _resolver.ResolveAsync("{{tasks.get-items.output[10]}}", context);
        await action.Should().ThrowAsync<Exception>()
            .WithMessage("*index*out of bounds*");
    }

    #endregion

    #region Error Handling

    [Fact]
    public async Task ResolveAsync_WithMissingTask_ThrowsException()
    {
        // Arrange
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>()
        };

        // Act & Assert
        var action = async () => await _resolver.ResolveAsync("{{tasks.nonexistent.output}}", context);
        await action.Should().ThrowAsync<TemplateResolutionException>()
            .WithMessage("*Task 'nonexistent'*not found*");
    }

    [Fact]
    public async Task ResolveAsync_WithInvalidPath_ThrowsException()
    {
        // Arrange
        var json = """{"name":"John"}""";
        _storage.Store("fetch-user", json);

        var context = new TemplateContext
        {
            Input = new Dictionary<string, object>()
        };

        // Act & Assert
        var action = async () => await _resolver.ResolveAsync("{{tasks.fetch-user.output.invalid.path}}", context);
        await action.Should().ThrowAsync<TemplateResolutionException>()
            .WithMessage("*'invalid'*not found*");
    }

    #endregion

    #region Helper Methods

    private static string GenerateLargeJson()
    {
        var items = new List<object>();
        for (int i = 0; i < 100; i++)
        {
            items.Add(new
            {
                id = i,
                name = $"Item {i}",
                data = new { value = i * 10 }
            });
        }
        return System.Text.Json.JsonSerializer.Serialize(new { items, total = 100 });
    }

    #endregion
}
