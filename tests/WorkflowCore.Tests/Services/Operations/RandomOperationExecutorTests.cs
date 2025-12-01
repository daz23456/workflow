using System.Text.Json;
using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services.Operations;
using Xunit;

namespace WorkflowCore.Tests.Services.Operations;

public class RandomOneOperationExecutorTests
{
    private readonly RandomOneOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_WithArray_ReturnsExactlyOneElement()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement(new { name = "Alice" }),
            JsonSerializer.SerializeToElement(new { name = "Bob" }),
            JsonSerializer.SerializeToElement(new { name = "Charlie" })
        };
        var operation = new RandomOneOperation();

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert
        result.Should().HaveCount(1);
    }

    [Fact]
    public async Task Execute_WithArray_ReturnsElementFromOriginalArray()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement("apple"),
            JsonSerializer.SerializeToElement("banana"),
            JsonSerializer.SerializeToElement("cherry")
        };
        var operation = new RandomOneOperation();

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert
        var resultValue = result[0].GetString();
        new[] { "apple", "banana", "cherry" }.Should().Contain(resultValue);
    }

    [Fact]
    public async Task Execute_WithEmptyArray_ReturnsEmptyArray()
    {
        // Arrange
        var data = Array.Empty<JsonElement>();
        var operation = new RandomOneOperation();

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task Execute_WithSingleElement_ReturnsThatElement()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement(new { id = 42 })
        };
        var operation = new RandomOneOperation();

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert
        result.Should().HaveCount(1);
        var element = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(result[0]);
        element!["id"].GetInt32().Should().Be(42);
    }

    [Fact]
    public async Task Execute_WithSeed_IsReproducible()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement("a"),
            JsonSerializer.SerializeToElement("b"),
            JsonSerializer.SerializeToElement("c"),
            JsonSerializer.SerializeToElement("d"),
            JsonSerializer.SerializeToElement("e")
        };
        var operation = new RandomOneOperation { Seed = 12345 };

        // Act
        var result1 = await _executor.ExecuteAsync(operation, data);

        // Reset with same seed
        var result2 = await _executor.ExecuteAsync(operation, data);

        // Assert - Same seed should give same result
        result1[0].GetString().Should().Be(result2[0].GetString());
    }
}

public class RandomNOperationExecutorTests
{
    private readonly RandomNOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_WithCount2_ReturnsTwoElements()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement("a"),
            JsonSerializer.SerializeToElement("b"),
            JsonSerializer.SerializeToElement("c"),
            JsonSerializer.SerializeToElement("d")
        };
        var operation = new RandomNOperation { Count = 2 };

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert
        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task Execute_ReturnsUniqueElements()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement(1),
            JsonSerializer.SerializeToElement(2),
            JsonSerializer.SerializeToElement(3),
            JsonSerializer.SerializeToElement(4),
            JsonSerializer.SerializeToElement(5)
        };
        var operation = new RandomNOperation { Count = 3 };

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert - All results should be unique
        var values = result.Select(r => r.GetInt32()).ToList();
        values.Should().OnlyHaveUniqueItems();
    }

    [Fact]
    public async Task Execute_CountExceedsArrayLength_ReturnsAllElements()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement("x"),
            JsonSerializer.SerializeToElement("y")
        };
        var operation = new RandomNOperation { Count = 5 };

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert
        result.Should().HaveCount(2); // Can't return more than available
    }

    [Fact]
    public async Task Execute_WithEmptyArray_ReturnsEmptyArray()
    {
        // Arrange
        var data = Array.Empty<JsonElement>();
        var operation = new RandomNOperation { Count = 3 };

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task Execute_CountZero_ReturnsEmptyArray()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement("a"),
            JsonSerializer.SerializeToElement("b")
        };
        var operation = new RandomNOperation { Count = 0 };

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task Execute_WithSeed_IsReproducible()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement(1),
            JsonSerializer.SerializeToElement(2),
            JsonSerializer.SerializeToElement(3),
            JsonSerializer.SerializeToElement(4),
            JsonSerializer.SerializeToElement(5)
        };
        var operation = new RandomNOperation { Count = 3, Seed = 54321 };

        // Act
        var result1 = await _executor.ExecuteAsync(operation, data);
        var result2 = await _executor.ExecuteAsync(operation, data);

        // Assert - Same seed should give same results
        var values1 = result1.Select(r => r.GetInt32()).ToList();
        var values2 = result2.Select(r => r.GetInt32()).ToList();
        values1.Should().BeEquivalentTo(values2);
    }

    [Fact]
    public async Task Execute_AllElementsFromOriginalArray()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement(10),
            JsonSerializer.SerializeToElement(20),
            JsonSerializer.SerializeToElement(30)
        };
        var operation = new RandomNOperation { Count = 2 };

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert
        var originalValues = data.Select(d => d.GetInt32()).ToHashSet();
        var resultValues = result.Select(r => r.GetInt32()).ToList();
        resultValues.All(v => originalValues.Contains(v)).Should().BeTrue();
    }
}

public class ShuffleOperationExecutorTests
{
    private readonly ShuffleOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_PreservesAllElements()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement(1),
            JsonSerializer.SerializeToElement(2),
            JsonSerializer.SerializeToElement(3),
            JsonSerializer.SerializeToElement(4),
            JsonSerializer.SerializeToElement(5)
        };
        var operation = new ShuffleOperation();

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert
        result.Should().HaveCount(5);
        var resultValues = result.Select(r => r.GetInt32()).OrderBy(x => x).ToList();
        resultValues.Should().Equal(1, 2, 3, 4, 5);
    }

    [Fact]
    public async Task Execute_WithEmptyArray_ReturnsEmptyArray()
    {
        // Arrange
        var data = Array.Empty<JsonElement>();
        var operation = new ShuffleOperation();

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task Execute_WithSingleElement_ReturnsSingleElement()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement("only-one")
        };
        var operation = new ShuffleOperation();

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert
        result.Should().HaveCount(1);
        result[0].GetString().Should().Be("only-one");
    }

    [Fact]
    public async Task Execute_WithSeed_IsReproducible()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement("a"),
            JsonSerializer.SerializeToElement("b"),
            JsonSerializer.SerializeToElement("c"),
            JsonSerializer.SerializeToElement("d"),
            JsonSerializer.SerializeToElement("e")
        };
        var operation = new ShuffleOperation { Seed = 99999 };

        // Act
        var result1 = await _executor.ExecuteAsync(operation, data);
        var result2 = await _executor.ExecuteAsync(operation, data);

        // Assert - Same seed should give same order
        var values1 = result1.Select(r => r.GetString()).ToList();
        var values2 = result2.Select(r => r.GetString()).ToList();
        values1.Should().Equal(values2);
    }

    [Fact]
    public async Task Execute_ActuallyShuffles_WhenDataIsLarge()
    {
        // Arrange - Create 100 ordered elements
        var data = Enumerable.Range(0, 100)
            .Select(i => JsonSerializer.SerializeToElement(i))
            .ToArray();
        var operation = new ShuffleOperation();

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert - Very unlikely to remain in exact same order
        var resultValues = result.Select(r => r.GetInt32()).ToList();
        var originalOrder = Enumerable.Range(0, 100).ToList();
        resultValues.Should().NotEqual(originalOrder);
    }

    [Fact]
    public async Task Execute_PreservesComplexObjects()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement(new { id = 1, name = "Alice" }),
            JsonSerializer.SerializeToElement(new { id = 2, name = "Bob" }),
            JsonSerializer.SerializeToElement(new { id = 3, name = "Charlie" })
        };
        var operation = new ShuffleOperation { Seed = 42 };

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert - Objects should be preserved intact
        result.Should().HaveCount(3);
        var ids = result.Select(r => JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(r)!["id"].GetInt32())
            .OrderBy(x => x)
            .ToList();
        ids.Should().Equal(1, 2, 3);
    }
}
