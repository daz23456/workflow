using System.Text.Json;
using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services.Operations;
using Xunit;

namespace WorkflowCore.Tests.Services.Operations;

public class FirstOperationExecutorTests
{
    private readonly FirstOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_ReturnsFirstElement()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement(1),
            JsonSerializer.SerializeToElement(2),
            JsonSerializer.SerializeToElement(3)
        };
        var operation = new FirstOperation();

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().HaveCount(1);
        result[0].GetInt32().Should().Be(1);
    }

    [Fact]
    public async Task Execute_ReturnsEmpty_WhenArrayEmpty()
    {
        var data = Array.Empty<JsonElement>();
        var operation = new FirstOperation();

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().BeEmpty();
    }
}

public class LastOperationExecutorTests
{
    private readonly LastOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_ReturnsLastElement()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement(1),
            JsonSerializer.SerializeToElement(2),
            JsonSerializer.SerializeToElement(3)
        };
        var operation = new LastOperation();

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().HaveCount(1);
        result[0].GetInt32().Should().Be(3);
    }

    [Fact]
    public async Task Execute_ReturnsEmpty_WhenArrayEmpty()
    {
        var data = Array.Empty<JsonElement>();
        var operation = new LastOperation();

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().BeEmpty();
    }
}

public class NthOperationExecutorTests
{
    private readonly NthOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_ReturnsElementAtIndex()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement("a"),
            JsonSerializer.SerializeToElement("b"),
            JsonSerializer.SerializeToElement("c")
        };
        var operation = new NthOperation { Index = 1 };

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().HaveCount(1);
        result[0].GetString().Should().Be("b");
    }

    [Fact]
    public async Task Execute_ReturnsEmpty_WhenIndexOutOfBounds()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement("a"),
            JsonSerializer.SerializeToElement("b")
        };
        var operation = new NthOperation { Index = 5 };

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task Execute_ReturnsEmpty_WhenNegativeIndex()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement("a")
        };
        var operation = new NthOperation { Index = -1 };

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().BeEmpty();
    }
}

public class ReverseOperationExecutorTests
{
    private readonly ReverseOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_ReversesArray()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement(1),
            JsonSerializer.SerializeToElement(2),
            JsonSerializer.SerializeToElement(3)
        };
        var operation = new ReverseOperation();

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().HaveCount(3);
        result[0].GetInt32().Should().Be(3);
        result[1].GetInt32().Should().Be(2);
        result[2].GetInt32().Should().Be(1);
    }

    [Fact]
    public async Task Execute_ReturnsEmpty_WhenArrayEmpty()
    {
        var data = Array.Empty<JsonElement>();
        var operation = new ReverseOperation();

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().BeEmpty();
    }
}

public class UniqueOperationExecutorTests
{
    private readonly UniqueOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_RemovesDuplicateNumbers()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement(1),
            JsonSerializer.SerializeToElement(2),
            JsonSerializer.SerializeToElement(1),
            JsonSerializer.SerializeToElement(3),
            JsonSerializer.SerializeToElement(2)
        };
        var operation = new UniqueOperation();

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().HaveCount(3);
        result.Select(e => e.GetInt32()).Should().BeEquivalentTo(new[] { 1, 2, 3 });
    }

    [Fact]
    public async Task Execute_RemovesDuplicateStrings()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement("apple"),
            JsonSerializer.SerializeToElement("banana"),
            JsonSerializer.SerializeToElement("apple"),
            JsonSerializer.SerializeToElement("cherry")
        };
        var operation = new UniqueOperation();

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().HaveCount(3);
        result.Select(e => e.GetString()).Should().BeEquivalentTo(new[] { "apple", "banana", "cherry" });
    }

    [Fact]
    public async Task Execute_PreservesFirstOccurrence()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement(1),
            JsonSerializer.SerializeToElement(2),
            JsonSerializer.SerializeToElement(1)
        };
        var operation = new UniqueOperation();

        var result = await _executor.ExecuteAsync(operation, data);

        // Should preserve order of first occurrence
        result[0].GetInt32().Should().Be(1);
        result[1].GetInt32().Should().Be(2);
    }
}

public class FlattenOperationExecutorTests
{
    private readonly FlattenOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_FlattensNestedArrays()
    {
        // Input: [[1, 2], [3, 4]]
        var innerArray1 = JsonSerializer.SerializeToElement(new[] { 1, 2 });
        var innerArray2 = JsonSerializer.SerializeToElement(new[] { 3, 4 });
        var data = new[] { innerArray1, innerArray2 };
        var operation = new FlattenOperation();

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().HaveCount(4);
        result[0].GetInt32().Should().Be(1);
        result[1].GetInt32().Should().Be(2);
        result[2].GetInt32().Should().Be(3);
        result[3].GetInt32().Should().Be(4);
    }

    [Fact]
    public async Task Execute_PreservesNonArrayElements()
    {
        // Input: [1, [2, 3], 4]
        var number1 = JsonSerializer.SerializeToElement(1);
        var innerArray = JsonSerializer.SerializeToElement(new[] { 2, 3 });
        var number4 = JsonSerializer.SerializeToElement(4);
        var data = new[] { number1, innerArray, number4 };
        var operation = new FlattenOperation();

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().HaveCount(4);
        result[0].GetInt32().Should().Be(1);
        result[1].GetInt32().Should().Be(2);
        result[2].GetInt32().Should().Be(3);
        result[3].GetInt32().Should().Be(4);
    }
}

public class ChunkOperationExecutorTests
{
    private readonly ChunkOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_ChunksIntoEqualSizes()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement(1),
            JsonSerializer.SerializeToElement(2),
            JsonSerializer.SerializeToElement(3),
            JsonSerializer.SerializeToElement(4)
        };
        var operation = new ChunkOperation { Size = 2 };

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().HaveCount(2);
        result[0].GetArrayLength().Should().Be(2);
        result[1].GetArrayLength().Should().Be(2);
    }

    [Fact]
    public async Task Execute_HandlesUnevenChunks()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement(1),
            JsonSerializer.SerializeToElement(2),
            JsonSerializer.SerializeToElement(3),
            JsonSerializer.SerializeToElement(4),
            JsonSerializer.SerializeToElement(5)
        };
        var operation = new ChunkOperation { Size = 2 };

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().HaveCount(3);
        result[0].GetArrayLength().Should().Be(2);
        result[1].GetArrayLength().Should().Be(2);
        result[2].GetArrayLength().Should().Be(1);
    }

    [Fact]
    public async Task Execute_ReturnsEmpty_WhenArrayEmpty()
    {
        var data = Array.Empty<JsonElement>();
        var operation = new ChunkOperation { Size = 2 };

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().BeEmpty();
    }
}

public class ZipOperationExecutorTests
{
    private readonly ZipOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_ZipsTwoArrays()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement(1),
            JsonSerializer.SerializeToElement(2),
            JsonSerializer.SerializeToElement(3)
        };
        var operation = new ZipOperation
        {
            WithArray = JsonSerializer.SerializeToElement(new[] { "a", "b", "c" })
        };

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().HaveCount(3);
        // Each result should be an array of [value, withValue]
        result[0].GetArrayLength().Should().Be(2);
        result[0][0].GetInt32().Should().Be(1);
        result[0][1].GetString().Should().Be("a");
    }

    [Fact]
    public async Task Execute_HandlesUnequalLengths()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement(1),
            JsonSerializer.SerializeToElement(2)
        };
        var operation = new ZipOperation
        {
            WithArray = JsonSerializer.SerializeToElement(new[] { "a", "b", "c", "d" })
        };

        var result = await _executor.ExecuteAsync(operation, data);

        // Should only zip up to the shorter array length
        result.Should().HaveCount(2);
    }
}
