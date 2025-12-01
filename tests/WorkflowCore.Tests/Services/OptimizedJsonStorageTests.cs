using FluentAssertions;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

/// <summary>
/// TDD tests for optimized JSON storage that avoids unnecessary deserialization.
/// RED phase: These tests define the expected behavior before implementation.
/// </summary>
public class OptimizedJsonStorageTests
{
    #region Passthrough Scenario - Return raw JSON string without re-serialization

    [Fact]
    public void GetRawJson_WhenJsonStored_ReturnsOriginalString()
    {
        // Arrange
        var storage = new OptimizedJsonStorage();
        var originalJson = """{"name":"John","age":30,"email":"john@example.com"}""";

        // Act
        storage.Store("task1", originalJson);
        var result = storage.GetRawJson("task1");

        // Assert - Should return exact same string (no parsing/re-serialization)
        result.Should().Be(originalJson);
    }

    [Fact]
    public void GetRawJson_WhenTaskNotFound_ReturnsNull()
    {
        // Arrange
        var storage = new OptimizedJsonStorage();

        // Act
        var result = storage.GetRawJson("nonexistent");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void GetRawJson_WithLargeJson_ReturnsExactOriginal()
    {
        // Arrange
        var storage = new OptimizedJsonStorage();
        var largeJson = GenerateLargeJson();

        // Act
        storage.Store("task1", largeJson);
        var result = storage.GetRawJson("task1");

        // Assert - Must return exact same string, not re-serialized version
        result.Should().Be(largeJson);
    }

    #endregion

    #region Nested Field Access - Navigate using JsonDocument without full deserialization

    [Fact]
    public void GetValue_WithSimplePath_ReturnsStringValue()
    {
        // Arrange
        var storage = new OptimizedJsonStorage();
        var json = """{"name":"John","age":30}""";
        storage.Store("task1", json);

        // Act
        var result = storage.GetValue("task1", "name");

        // Assert
        result.Should().Be("John");
    }

    [Fact]
    public void GetValue_WithNumericPath_ReturnsNumericValue()
    {
        // Arrange
        var storage = new OptimizedJsonStorage();
        var json = """{"name":"John","age":30}""";
        storage.Store("task1", json);

        // Act
        var result = storage.GetValue("task1", "age");

        // Assert
        result.Should().Be(30);
    }

    [Fact]
    public void GetValue_WithNestedPath_ReturnsNestedValue()
    {
        // Arrange
        var storage = new OptimizedJsonStorage();
        var json = """{"user":{"address":{"city":"London","country":"UK"}}}""";
        storage.Store("task1", json);

        // Act
        var result = storage.GetValue("task1", "user.address.city");

        // Assert
        result.Should().Be("London");
    }

    [Fact]
    public void GetValue_WithDeeplyNestedPath_ReturnsValue()
    {
        // Arrange
        var storage = new OptimizedJsonStorage();
        var json = """{"level1":{"level2":{"level3":{"level4":{"value":"deep"}}}}}""";
        storage.Store("task1", json);

        // Act
        var result = storage.GetValue("task1", "level1.level2.level3.level4.value");

        // Assert
        result.Should().Be("deep");
    }

    [Fact]
    public void GetValue_WithNestedObject_ReturnsJsonString()
    {
        // Arrange
        var storage = new OptimizedJsonStorage();
        var json = """{"user":{"name":"John","age":30}}""";
        storage.Store("task1", json);

        // Act
        var result = storage.GetValue("task1", "user");

        // Assert - Should return the nested object as JSON string
        result.Should().Be("""{"name":"John","age":30}""");
    }

    [Fact]
    public void GetValue_WithArrayPath_ReturnsArrayAsJson()
    {
        // Arrange
        var storage = new OptimizedJsonStorage();
        var json = """{"items":[1,2,3,4,5]}""";
        storage.Store("task1", json);

        // Act
        var result = storage.GetValue("task1", "items");

        // Assert
        result.Should().Be("[1,2,3,4,5]");
    }

    [Fact]
    public void GetValue_WithArrayIndex_ReturnsElementValue()
    {
        // Arrange
        var storage = new OptimizedJsonStorage();
        var json = """{"items":["first","second","third"]}""";
        storage.Store("task1", json);

        // Act
        var result = storage.GetValue("task1", "items[1]");

        // Assert
        result.Should().Be("second");
    }

    [Fact]
    public void GetValue_WithNestedArrayAccess_ReturnsValue()
    {
        // Arrange
        var storage = new OptimizedJsonStorage();
        var json = """{"data":{"results":[{"id":1,"name":"First"},{"id":2,"name":"Second"}]}}""";
        storage.Store("task1", json);

        // Act
        var result = storage.GetValue("task1", "data.results[0].name");

        // Assert
        result.Should().Be("First");
    }

    [Fact]
    public void GetValue_WhenPropertyNotFound_ThrowsKeyNotFoundException()
    {
        // Arrange
        var storage = new OptimizedJsonStorage();
        var json = """{"name":"John"}""";
        storage.Store("task1", json);

        // Act & Assert
        var action = () => storage.GetValue("task1", "nonexistent");
        action.Should().Throw<KeyNotFoundException>()
            .WithMessage("*'nonexistent'*not found*");
    }

    [Fact]
    public void GetValue_WhenTaskNotFound_ThrowsKeyNotFoundException()
    {
        // Arrange
        var storage = new OptimizedJsonStorage();

        // Act & Assert
        var action = () => storage.GetValue("nonexistent", "name");
        action.Should().Throw<KeyNotFoundException>()
            .WithMessage("*Task 'nonexistent'*not found*");
    }

    [Fact]
    public void GetValue_WithBooleanPath_ReturnsBooleanValue()
    {
        // Arrange
        var storage = new OptimizedJsonStorage();
        var json = """{"active":true,"verified":false}""";
        storage.Store("task1", json);

        // Act
        var activeResult = storage.GetValue("task1", "active");
        var verifiedResult = storage.GetValue("task1", "verified");

        // Assert
        activeResult.Should().Be(true);
        verifiedResult.Should().Be(false);
    }

    [Fact]
    public void GetValue_WithNullPath_ReturnsNull()
    {
        // Arrange
        var storage = new OptimizedJsonStorage();
        var json = """{"name":null}""";
        storage.Store("task1", json);

        // Act
        var result = storage.GetValue("task1", "name");

        // Assert
        result.Should().BeNull();
    }

    #endregion

    #region Empty Path - Should return full JSON

    [Fact]
    public void GetValue_WithEmptyPath_ReturnsFullJson()
    {
        // Arrange
        var storage = new OptimizedJsonStorage();
        var json = """{"name":"John","age":30}""";
        storage.Store("task1", json);

        // Act
        var result = storage.GetValue("task1", "");

        // Assert - Empty path should return full JSON (same as GetRawJson)
        result.Should().Be(json);
    }

    #endregion

    #region Clear and Remove

    [Fact]
    public void Clear_RemovesAllStoredData()
    {
        // Arrange
        var storage = new OptimizedJsonStorage();
        storage.Store("task1", """{"a":1}""");
        storage.Store("task2", """{"b":2}""");

        // Act
        storage.Clear();

        // Assert
        storage.GetRawJson("task1").Should().BeNull();
        storage.GetRawJson("task2").Should().BeNull();
    }

    [Fact]
    public void Remove_RemovesSpecificTask()
    {
        // Arrange
        var storage = new OptimizedJsonStorage();
        storage.Store("task1", """{"a":1}""");
        storage.Store("task2", """{"b":2}""");

        // Act
        storage.Remove("task1");

        // Assert
        storage.GetRawJson("task1").Should().BeNull();
        storage.GetRawJson("task2").Should().Be("""{"b":2}""");
    }

    #endregion

    #region Root Array Indexing - Access elements when JSON root is an array

    [Fact]
    public void GetValue_WithRootArrayIndex_ReturnsElement()
    {
        // Arrange - JSON root IS an array (like HN API topstories.json)
        var storage = new OptimizedJsonStorage();
        var json = """[42547728,42547283,42546942,42545678]""";
        storage.Store("task1", json);

        // Act
        var result = storage.GetValue("task1", "[0]");

        // Assert
        result.Should().Be(42547728L);
    }

    [Fact]
    public void GetValue_WithRootArrayIndex_ReturnsSecondElement()
    {
        // Arrange
        var storage = new OptimizedJsonStorage();
        var json = """[42547728,42547283,42546942]""";
        storage.Store("task1", json);

        // Act
        var result = storage.GetValue("task1", "[1]");

        // Assert
        result.Should().Be(42547283L);
    }

    [Fact]
    public void GetValue_WithRootArrayIndexAndNestedPath_ReturnsNestedValue()
    {
        // Arrange - Array of objects
        var storage = new OptimizedJsonStorage();
        var json = """[{"id":1,"title":"First Story"},{"id":2,"title":"Second Story"}]""";
        storage.Store("task1", json);

        // Act
        var result = storage.GetValue("task1", "[1].title");

        // Assert
        result.Should().Be("Second Story");
    }

    [Fact]
    public void GetValue_WithRootArrayIndexAndDeeplyNestedPath_ReturnsValue()
    {
        // Arrange
        var storage = new OptimizedJsonStorage();
        var json = """[{"data":{"user":{"name":"Alice"}}},{"data":{"user":{"name":"Bob"}}}]""";
        storage.Store("task1", json);

        // Act
        var result = storage.GetValue("task1", "[1].data.user.name");

        // Assert
        result.Should().Be("Bob");
    }

    [Fact]
    public void GetValue_WithRootArrayIndexOutOfBounds_ThrowsIndexOutOfRangeException()
    {
        // Arrange
        var storage = new OptimizedJsonStorage();
        var json = """[1,2,3]""";
        storage.Store("task1", json);

        // Act & Assert
        var action = () => storage.GetValue("task1", "[10]");
        action.Should().Throw<IndexOutOfRangeException>()
            .WithMessage("*index 10*out of bounds*");
    }

    [Fact]
    public void GetValue_WithRootArrayIndexOnNonArray_ThrowsInvalidOperationException()
    {
        // Arrange - JSON root is an object, not array
        var storage = new OptimizedJsonStorage();
        var json = """{"name":"John"}""";
        storage.Store("task1", json);

        // Act & Assert
        var action = () => storage.GetValue("task1", "[0]");
        action.Should().Throw<InvalidOperationException>()
            .WithMessage("*non-array*");
    }

    [Fact]
    public void GetValue_WithRootArrayReturnsObject_ReturnsJsonString()
    {
        // Arrange
        var storage = new OptimizedJsonStorage();
        var json = """[{"id":1,"title":"Story One"},{"id":2,"title":"Story Two"}]""";
        storage.Store("task1", json);

        // Act
        var result = storage.GetValue("task1", "[0]");

        // Assert - Should return object as JSON string
        result.Should().Be("""{"id":1,"title":"Story One"}""");
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
                description = $"This is a long description for item {i} with extra padding text",
                tags = new[] { "tag1", "tag2", "tag3" },
                metadata = new { created = DateTime.UtcNow.ToString("O"), count = i * 10 }
            });
        }
        return System.Text.Json.JsonSerializer.Serialize(new { items, total = 100 });
    }

    #endregion
}
