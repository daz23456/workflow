using System.Text.Json;
using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services.Operations;
using Xunit;

namespace WorkflowCore.Tests.Services.Operations;

public class RoundOperationExecutorTests
{
    private readonly RoundOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_RoundsToSpecifiedDecimals()
    {
        var data = new[] { JsonSerializer.SerializeToElement(3.14159) };
        var operation = new RoundOperation { Decimals = 2 };

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetDouble().Should().Be(3.14);
    }

    [Fact]
    public async Task Execute_RoundsMultipleNumbers()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement(3.14159),
            JsonSerializer.SerializeToElement(2.71828)
        };
        var operation = new RoundOperation { Decimals = 2 };

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetDouble().Should().Be(3.14);
        result[1].GetDouble().Should().Be(2.72);
    }

    [Fact]
    public async Task Execute_RoundsToInteger_WhenDecimalsZero()
    {
        var data = new[] { JsonSerializer.SerializeToElement(3.7) };
        var operation = new RoundOperation { Decimals = 0 };

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetDouble().Should().Be(4);
    }
}

public class FloorOperationExecutorTests
{
    private readonly FloorOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_FloorsNumbers()
    {
        var data = new[] { JsonSerializer.SerializeToElement(3.9) };
        var operation = new FloorOperation();

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetDouble().Should().Be(3);
    }

    [Fact]
    public async Task Execute_FloorsNegativeNumbers()
    {
        var data = new[] { JsonSerializer.SerializeToElement(-3.1) };
        var operation = new FloorOperation();

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetDouble().Should().Be(-4);
    }

    [Fact]
    public async Task Execute_FloorsMultipleNumbers()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement(3.9),
            JsonSerializer.SerializeToElement(5.1),
            JsonSerializer.SerializeToElement(7.5)
        };
        var operation = new FloorOperation();

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetDouble().Should().Be(3);
        result[1].GetDouble().Should().Be(5);
        result[2].GetDouble().Should().Be(7);
    }
}

public class CeilOperationExecutorTests
{
    private readonly CeilOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_CeilsNumbers()
    {
        var data = new[] { JsonSerializer.SerializeToElement(3.1) };
        var operation = new CeilOperation();

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetDouble().Should().Be(4);
    }

    [Fact]
    public async Task Execute_CeilsNegativeNumbers()
    {
        var data = new[] { JsonSerializer.SerializeToElement(-3.9) };
        var operation = new CeilOperation();

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetDouble().Should().Be(-3);
    }
}

public class AbsOperationExecutorTests
{
    private readonly AbsOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_ReturnsAbsoluteValue()
    {
        var data = new[] { JsonSerializer.SerializeToElement(-5.5) };
        var operation = new AbsOperation();

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetDouble().Should().Be(5.5);
    }

    [Fact]
    public async Task Execute_PreservesPositiveNumbers()
    {
        var data = new[] { JsonSerializer.SerializeToElement(5.5) };
        var operation = new AbsOperation();

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetDouble().Should().Be(5.5);
    }

    [Fact]
    public async Task Execute_AbsMultipleNumbers()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement(-10),
            JsonSerializer.SerializeToElement(20),
            JsonSerializer.SerializeToElement(-30)
        };
        var operation = new AbsOperation();

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetDouble().Should().Be(10);
        result[1].GetDouble().Should().Be(20);
        result[2].GetDouble().Should().Be(30);
    }
}

public class ClampOperationExecutorTests
{
    private readonly ClampOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_ClampsAboveMax()
    {
        var data = new[] { JsonSerializer.SerializeToElement(150) };
        var operation = new ClampOperation { Min = 0, Max = 100 };

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetDouble().Should().Be(100);
    }

    [Fact]
    public async Task Execute_ClampsBelowMin()
    {
        var data = new[] { JsonSerializer.SerializeToElement(-50) };
        var operation = new ClampOperation { Min = 0, Max = 100 };

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetDouble().Should().Be(0);
    }

    [Fact]
    public async Task Execute_PreservesValuesInRange()
    {
        var data = new[] { JsonSerializer.SerializeToElement(50) };
        var operation = new ClampOperation { Min = 0, Max = 100 };

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetDouble().Should().Be(50);
    }

    [Fact]
    public async Task Execute_ClampsMultipleNumbers()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement(-10),
            JsonSerializer.SerializeToElement(50),
            JsonSerializer.SerializeToElement(200)
        };
        var operation = new ClampOperation { Min = 0, Max = 100 };

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetDouble().Should().Be(0);
        result[1].GetDouble().Should().Be(50);
        result[2].GetDouble().Should().Be(100);
    }
}

public class ScaleOperationExecutorTests
{
    private readonly ScaleOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_ScalesByFactor()
    {
        var data = new[] { JsonSerializer.SerializeToElement(5) };
        var operation = new ScaleOperation { Factor = 2 };

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetDouble().Should().Be(10);
    }

    [Fact]
    public async Task Execute_ScalesByDecimalFactor()
    {
        var data = new[] { JsonSerializer.SerializeToElement(100) };
        var operation = new ScaleOperation { Factor = 0.5 };

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetDouble().Should().Be(50);
    }

    [Fact]
    public async Task Execute_ScalesMultipleNumbers()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement(1),
            JsonSerializer.SerializeToElement(2),
            JsonSerializer.SerializeToElement(3)
        };
        var operation = new ScaleOperation { Factor = 10 };

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetDouble().Should().Be(10);
        result[1].GetDouble().Should().Be(20);
        result[2].GetDouble().Should().Be(30);
    }
}

public class PercentageOperationExecutorTests
{
    private readonly PercentageOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_CalculatesPercentage()
    {
        var data = new[] { JsonSerializer.SerializeToElement(50) };
        var operation = new PercentageOperation { Total = 200 };

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetDouble().Should().Be(25);
    }

    [Fact]
    public async Task Execute_CalculatesHundredPercent()
    {
        var data = new[] { JsonSerializer.SerializeToElement(100) };
        var operation = new PercentageOperation { Total = 100 };

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetDouble().Should().Be(100);
    }

    [Fact]
    public async Task Execute_CalculatesMultiplePercentages()
    {
        var data = new[]
        {
            JsonSerializer.SerializeToElement(10),
            JsonSerializer.SerializeToElement(25),
            JsonSerializer.SerializeToElement(50)
        };
        var operation = new PercentageOperation { Total = 100 };

        var result = await _executor.ExecuteAsync(operation, data);

        result[0].GetDouble().Should().Be(10);
        result[1].GetDouble().Should().Be(25);
        result[2].GetDouble().Should().Be(50);
    }
}
