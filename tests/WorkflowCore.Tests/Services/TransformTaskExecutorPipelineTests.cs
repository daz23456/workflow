using System.Text.Json;
using FluentAssertions;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class TransformTaskExecutorPipelineTests
{
    private readonly Mock<IDataTransformer> _mockDataTransformer;
    private readonly ITransformExecutor _transformExecutor;
    private readonly TransformTaskExecutor _executor;

    public TransformTaskExecutorPipelineTests()
    {
        _mockDataTransformer = new Mock<IDataTransformer>();
        _transformExecutor = new TransformExecutor();
        _executor = new TransformTaskExecutor(_mockDataTransformer.Object, _transformExecutor);
    }

    [Fact]
    public async Task ExecuteAsync_WithPipeline_AppliesOperationsSequentially()
    {
        // Arrange: Limit to 2, then reverse
        var taskSpec = new WorkflowTaskSpec
        {
            Transform = new TransformDefinition
            {
                Input = "$.items",
                Pipeline = new List<TransformOperation>
                {
                    new LimitOperation { Count = 2 },
                    new ReverseOperation()
                }
            }
        };

        var items = new[] { 1, 2, 3, 4, 5 };
        var data = new { items };

        _mockDataTransformer
            .Setup(x => x.TransformAsync("$.items", It.IsAny<object>()))
            .ReturnsAsync(JsonSerializer.SerializeToElement(items));

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, data);

        // Assert
        result.Success.Should().BeTrue();
        result.Output.Should().ContainKey("result");

        var resultArray = ((JsonElement)result.Output!["result"]).EnumerateArray().Select(e => e.GetInt32()).ToArray();
        resultArray.Should().BeEquivalentTo(new[] { 2, 1 });
    }

    [Fact]
    public async Task ExecuteAsync_WithPipeline_HandlesRandomOneOperation()
    {
        var taskSpec = new WorkflowTaskSpec
        {
            Transform = new TransformDefinition
            {
                Input = "$.items",
                Pipeline = new List<TransformOperation>
                {
                    new RandomOneOperation { Seed = 42 }
                }
            }
        };

        var items = new[] { 1, 2, 3, 4, 5 };
        var data = new { items };

        _mockDataTransformer
            .Setup(x => x.TransformAsync("$.items", It.IsAny<object>()))
            .ReturnsAsync(JsonSerializer.SerializeToElement(items));

        var result = await _executor.ExecuteAsync(taskSpec, data);

        result.Success.Should().BeTrue();
        result.Output.Should().ContainKey("result");

        // Should return a single item from the array
        var resultArray = ((JsonElement)result.Output!["result"]).EnumerateArray().ToArray();
        resultArray.Should().HaveCount(1);
    }

    [Fact]
    public async Task ExecuteAsync_WithPipeline_HandlesMathOperations()
    {
        var taskSpec = new WorkflowTaskSpec
        {
            Transform = new TransformDefinition
            {
                Input = "$.values",
                Pipeline = new List<TransformOperation>
                {
                    new ScaleOperation { Factor = 2 },
                    new RoundOperation { Decimals = 0 }
                }
            }
        };

        var values = new[] { 1.5, 2.7, 3.2 };
        var data = new { values };

        _mockDataTransformer
            .Setup(x => x.TransformAsync("$.values", It.IsAny<object>()))
            .ReturnsAsync(JsonSerializer.SerializeToElement(values));

        var result = await _executor.ExecuteAsync(taskSpec, data);

        result.Success.Should().BeTrue();
        result.Output.Should().ContainKey("result");

        var resultArray = ((JsonElement)result.Output!["result"]).EnumerateArray().Select(e => e.GetDouble()).ToArray();
        resultArray.Should().BeEquivalentTo(new[] { 3.0, 5.0, 6.0 });
    }

    [Fact]
    public async Task ExecuteAsync_WithPipeline_HandlesStringOperations()
    {
        var taskSpec = new WorkflowTaskSpec
        {
            Transform = new TransformDefinition
            {
                Input = "$.names",
                Pipeline = new List<TransformOperation>
                {
                    new UppercaseOperation(),
                    new TrimOperation()
                }
            }
        };

        var names = new[] { "  alice  ", "  bob  " };
        var data = new { names };

        _mockDataTransformer
            .Setup(x => x.TransformAsync("$.names", It.IsAny<object>()))
            .ReturnsAsync(JsonSerializer.SerializeToElement(names));

        var result = await _executor.ExecuteAsync(taskSpec, data);

        result.Success.Should().BeTrue();
        result.Output.Should().ContainKey("result");

        var resultArray = ((JsonElement)result.Output!["result"]).EnumerateArray().Select(e => e.GetString()).ToArray();
        resultArray.Should().BeEquivalentTo(new[] { "ALICE", "BOB" });
    }

    [Fact]
    public async Task ExecuteAsync_WithPipeline_HandlesArrayOperations()
    {
        var taskSpec = new WorkflowTaskSpec
        {
            Transform = new TransformDefinition
            {
                Input = "$.numbers",
                Pipeline = new List<TransformOperation>
                {
                    new UniqueOperation(),
                    new ReverseOperation(),
                    new FirstOperation()
                }
            }
        };

        var numbers = new[] { 3, 1, 2, 1, 3, 2, 1 };
        var data = new { numbers };

        _mockDataTransformer
            .Setup(x => x.TransformAsync("$.numbers", It.IsAny<object>()))
            .ReturnsAsync(JsonSerializer.SerializeToElement(numbers));

        var result = await _executor.ExecuteAsync(taskSpec, data);

        result.Success.Should().BeTrue();
        result.Output.Should().ContainKey("result");

        // Unique: [3, 1, 2], Reverse: [2, 1, 3], First: [2]
        var resultArray = ((JsonElement)result.Output!["result"]).EnumerateArray().ToArray();
        resultArray.Should().HaveCount(1);
        resultArray[0].GetInt32().Should().Be(2);
    }

    [Fact]
    public async Task ExecuteAsync_WithEmptyPipeline_ReturnsInputData()
    {
        var taskSpec = new WorkflowTaskSpec
        {
            Transform = new TransformDefinition
            {
                Input = "$.data",
                Pipeline = new List<TransformOperation>()
            }
        };

        var inputData = new[] { 1, 2, 3 };
        var data = new { data = inputData };

        _mockDataTransformer
            .Setup(x => x.TransformAsync("$.data", It.IsAny<object>()))
            .ReturnsAsync(JsonSerializer.SerializeToElement(inputData));

        var result = await _executor.ExecuteAsync(taskSpec, data);

        result.Success.Should().BeTrue();
        result.Output.Should().ContainKey("result");

        var resultArray = ((JsonElement)result.Output!["result"]).EnumerateArray().Select(e => e.GetInt32()).ToArray();
        resultArray.Should().BeEquivalentTo(new[] { 1, 2, 3 });
    }

    [Fact]
    public async Task ExecuteAsync_WithPipelineAndNoInput_UsesRootData()
    {
        var taskSpec = new WorkflowTaskSpec
        {
            Transform = new TransformDefinition
            {
                Pipeline = new List<TransformOperation>
                {
                    new LimitOperation { Count = 2 }
                }
            }
        };

        var data = new[] { "a", "b", "c", "d" };

        _mockDataTransformer
            .Setup(x => x.TransformAsync("$", It.IsAny<object>()))
            .ReturnsAsync(JsonSerializer.SerializeToElement(data));

        var result = await _executor.ExecuteAsync(taskSpec, data);

        result.Success.Should().BeTrue();
        result.Output.Should().ContainKey("result");

        var resultArray = ((JsonElement)result.Output!["result"]).EnumerateArray().Select(e => e.GetString()).ToArray();
        resultArray.Should().BeEquivalentTo(new[] { "a", "b" });
    }

    [Fact]
    public async Task ExecuteAsync_PrefersPipelineOverJsonPath()
    {
        // When both Pipeline and JsonPath are provided, Pipeline takes precedence
        var taskSpec = new WorkflowTaskSpec
        {
            Transform = new TransformDefinition
            {
                Input = "$.items",
                JsonPath = "$.shouldBeIgnored",
                Pipeline = new List<TransformOperation>
                {
                    new ReverseOperation()
                }
            }
        };

        var items = new[] { 1, 2, 3 };
        var data = new { items };

        _mockDataTransformer
            .Setup(x => x.TransformAsync("$.items", It.IsAny<object>()))
            .ReturnsAsync(JsonSerializer.SerializeToElement(items));

        var result = await _executor.ExecuteAsync(taskSpec, data);

        result.Success.Should().BeTrue();
        result.Output.Should().ContainKey("result");

        var resultArray = ((JsonElement)result.Output!["result"]).EnumerateArray().Select(e => e.GetInt32()).ToArray();
        resultArray.Should().BeEquivalentTo(new[] { 3, 2, 1 });
    }
}
