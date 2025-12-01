using System.Text.Json;
using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services.Operations;
using Xunit;

namespace WorkflowCore.Tests.Services.Operations;

public class UppercaseOperationExecutorTests
{
    private readonly UppercaseOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_ConvertsSingleStringToUppercase()
    {
        var data = new[] { JsonSerializer.SerializeToElement("hello world") };
        var operation = new UppercaseOperation();

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().HaveCount(1);
        result[0].GetString().Should().Be("HELLO WORLD");
    }

    [Fact]
    public async Task Execute_ConvertsMultipleStringsToUppercase()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement("hello"),
            JsonSerializer.SerializeToElement("world")
        };
        var operation = new UppercaseOperation();

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().HaveCount(2);
        result[0].GetString().Should().Be("HELLO");
        result[1].GetString().Should().Be("WORLD");
    }

    [Fact]
    public async Task Execute_WithEmptyArray_ReturnsEmptyArray()
    {
        var data = Array.Empty<JsonElement>();
        var operation = new UppercaseOperation();

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().BeEmpty();
    }

    [Fact]
    public async Task Execute_PreservesNonStringValues()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement(123),
            JsonSerializer.SerializeToElement("hello")
        };
        var operation = new UppercaseOperation();

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().HaveCount(2);
        result[0].GetInt32().Should().Be(123);
        result[1].GetString().Should().Be("HELLO");
    }
}

public class LowercaseOperationExecutorTests
{
    private readonly LowercaseOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_ConvertsSingleStringToLowercase()
    {
        var data = new[] { JsonSerializer.SerializeToElement("HELLO WORLD") };
        var operation = new LowercaseOperation();

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().HaveCount(1);
        result[0].GetString().Should().Be("hello world");
    }

    [Fact]
    public async Task Execute_ConvertsMultipleStringsToLowercase()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement("HELLO"),
            JsonSerializer.SerializeToElement("WORLD")
        };
        var operation = new LowercaseOperation();

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().HaveCount(2);
        result[0].GetString().Should().Be("hello");
        result[1].GetString().Should().Be("world");
    }
}

public class TrimOperationExecutorTests
{
    private readonly TrimOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_TrimsWhitespaceFromStrings()
    {
        var data = new[] { JsonSerializer.SerializeToElement("  hello world  ") };
        var operation = new TrimOperation();

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().HaveCount(1);
        result[0].GetString().Should().Be("hello world");
    }

    [Fact]
    public async Task Execute_TrimsMultipleStrings()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement("\t\nhello\t"),
            JsonSerializer.SerializeToElement("  world\n\r")
        };
        var operation = new TrimOperation();

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().HaveCount(2);
        result[0].GetString().Should().Be("hello");
        result[1].GetString().Should().Be("world");
    }
}

public class SplitOperationExecutorTests
{
    private readonly SplitOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_SplitsByDelimiter()
    {
        var data = new[] { JsonSerializer.SerializeToElement("a,b,c") };
        var operation = new SplitOperation { Delimiter = "," };

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().HaveCount(1);
        var array = JsonSerializer.Deserialize<string[]>(result[0]);
        array.Should().Equal("a", "b", "c");
    }

    [Fact]
    public async Task Execute_SplitsByMultiCharDelimiter()
    {
        var data = new[] { JsonSerializer.SerializeToElement("one::two::three") };
        var operation = new SplitOperation { Delimiter = "::" };

        var result = await _executor.ExecuteAsync(operation, data);

        var array = JsonSerializer.Deserialize<string[]>(result[0]);
        array.Should().Equal("one", "two", "three");
    }

    [Fact]
    public async Task Execute_SplitsMultipleStrings()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement("a-b"),
            JsonSerializer.SerializeToElement("c-d-e")
        };
        var operation = new SplitOperation { Delimiter = "-" };

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().HaveCount(2);
        JsonSerializer.Deserialize<string[]>(result[0]).Should().Equal("a", "b");
        JsonSerializer.Deserialize<string[]>(result[1]).Should().Equal("c", "d", "e");
    }
}

public class ConcatOperationExecutorTests
{
    private readonly ConcatOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_JoinsArrayByDelimiter()
    {
        var data = new[] { JsonSerializer.SerializeToElement(new[] { "a", "b", "c" }) };
        var operation = new ConcatOperation { Delimiter = "," };

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().HaveCount(1);
        result[0].GetString().Should().Be("a,b,c");
    }

    [Fact]
    public async Task Execute_JoinsWithEmptyDelimiter()
    {
        var data = new[] { JsonSerializer.SerializeToElement(new[] { "hello", "world" }) };
        var operation = new ConcatOperation { Delimiter = "" };

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetString().Should().Be("helloworld");
    }

    [Fact]
    public async Task Execute_JoinsMultipleArrays()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement(new[] { "a", "b" }),
            JsonSerializer.SerializeToElement(new[] { "1", "2", "3" })
        };
        var operation = new ConcatOperation { Delimiter = "-" };

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().HaveCount(2);
        result[0].GetString().Should().Be("a-b");
        result[1].GetString().Should().Be("1-2-3");
    }
}

public class ReplaceOperationExecutorTests
{
    private readonly ReplaceOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_ReplacesSubstring()
    {
        var data = new[] { JsonSerializer.SerializeToElement("hello world") };
        var operation = new ReplaceOperation { OldValue = "world", NewValue = "there" };

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetString().Should().Be("hello there");
    }

    [Fact]
    public async Task Execute_ReplacesAllOccurrences()
    {
        var data = new[] { JsonSerializer.SerializeToElement("cat cat cat") };
        var operation = new ReplaceOperation { OldValue = "cat", NewValue = "dog" };

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetString().Should().Be("dog dog dog");
    }

    [Fact]
    public async Task Execute_ReplaceWithEmptyRemovesSubstring()
    {
        var data = new[] { JsonSerializer.SerializeToElement("hello world") };
        var operation = new ReplaceOperation { OldValue = " world", NewValue = "" };

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetString().Should().Be("hello");
    }
}

public class SubstringOperationExecutorTests
{
    private readonly SubstringOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_ExtractsSubstringWithStartAndLength()
    {
        var data = new[] { JsonSerializer.SerializeToElement("hello world") };
        var operation = new SubstringOperation { Start = 0, Length = 5 };

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetString().Should().Be("hello");
    }

    [Fact]
    public async Task Execute_ExtractsSubstringFromMiddle()
    {
        var data = new[] { JsonSerializer.SerializeToElement("hello world") };
        var operation = new SubstringOperation { Start = 6, Length = 5 };

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetString().Should().Be("world");
    }

    [Fact]
    public async Task Execute_ExtractsToEndIfLengthNotSpecified()
    {
        var data = new[] { JsonSerializer.SerializeToElement("hello world") };
        var operation = new SubstringOperation { Start = 6 };

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetString().Should().Be("world");
    }

    [Fact]
    public async Task Execute_TruncatesIfLengthExceedsBounds()
    {
        var data = new[] { JsonSerializer.SerializeToElement("hello") };
        var operation = new SubstringOperation { Start = 3, Length = 100 };

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetString().Should().Be("lo");
    }
}

public class TemplateOperationExecutorTests
{
    private readonly TemplateOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_InterpolatesPlaceholders()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement(new { name = "Alice", age = 30 })
        };
        var operation = new TemplateOperation { Template = "Hello, {name}! You are {age} years old." };

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetString().Should().Be("Hello, Alice! You are 30 years old.");
    }

    [Fact]
    public async Task Execute_InterpolatesNestedPlaceholders()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement(new { user = new { name = "Bob" } })
        };
        var operation = new TemplateOperation { Template = "User: {user.name}" };

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetString().Should().Be("User: Bob");
    }

    [Fact]
    public async Task Execute_HandlesMissingPlaceholders()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement(new { name = "Alice" })
        };
        var operation = new TemplateOperation { Template = "Hello, {name}! Email: {email}" };

        var result = await _executor.ExecuteAsync(operation, data);

        // Missing placeholders should remain as-is or be replaced with empty
        result[0].GetString().Should().Contain("Hello, Alice!");
    }

    [Fact]
    public async Task Execute_ProcessesMultipleObjects()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement(new { name = "Alice" }),
            JsonSerializer.SerializeToElement(new { name = "Bob" })
        };
        var operation = new TemplateOperation { Template = "Hello, {name}!" };

        var result = await _executor.ExecuteAsync(operation, data);

        result.Should().HaveCount(2);
        result[0].GetString().Should().Be("Hello, Alice!");
        result[1].GetString().Should().Be("Hello, Bob!");
    }
}
