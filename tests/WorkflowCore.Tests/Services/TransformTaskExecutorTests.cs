using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;

namespace WorkflowCore.Tests.Services;

public class TransformTaskExecutorTests
{
    [Fact]
    public async Task ExecuteAsync_WithSimpleExtraction_ReturnsTransformedData()
    {
        // Arrange
        var transformer = new JsonPathTransformer();
        var executor = new TransformTaskExecutor(transformer);

        var taskSpec = new WorkflowTaskSpec
        {
            Type = "transform",
            Transform = new TransformDefinition
            {
                Query = "$.users[0].name"
            }
        };

        var inputData = new
        {
            users = new[]
            {
                new { id = 1, name = "Alice", age = 30 },
                new { id = 2, name = "Bob", age = 25 }
            }
        };

        // Act
        var result = await executor.ExecuteAsync(taskSpec, inputData);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.Output.Should().NotBeNull();
        result.Output.Should().ContainKey("result");
        result.Output!["result"].Should().Be("Alice");
        result.Errors.Should().BeEmpty();
    }

    [Fact]
    public async Task ExecuteAsync_WithArrayFiltering_ReturnsFilteredArray()
    {
        // Arrange
        var transformer = new JsonPathTransformer();
        var executor = new TransformTaskExecutor(transformer);

        var taskSpec = new WorkflowTaskSpec
        {
            Type = "transform",
            Transform = new TransformDefinition
            {
                Query = "$.users[?(@.age > 25)]"
            }
        };

        var inputData = new
        {
            users = new[]
            {
                new { name = "Alice", age = 30 },
                new { name = "Bob", age = 25 },
                new { name = "Charlie", age = 35 }
            }
        };

        // Act
        var result = await executor.ExecuteAsync(taskSpec, inputData);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.Output.Should().NotBeNull();
        result.Output.Should().ContainKey("result");
        var users = result.Output!["result"] as List<object>;
        users.Should().NotBeNull();
        users.Should().HaveCount(2); // Alice and Charlie
    }

    [Fact]
    public async Task ExecuteAsync_WithArrayProjection_ReturnsProjectedArray()
    {
        // Arrange
        var transformer = new JsonPathTransformer();
        var executor = new TransformTaskExecutor(transformer);

        var taskSpec = new WorkflowTaskSpec
        {
            Type = "transform",
            Transform = new TransformDefinition
            {
                Query = "$.users[*].name"
            }
        };

        var inputData = new
        {
            users = new[]
            {
                new { name = "Alice", age = 30 },
                new { name = "Bob", age = 25 },
                new { name = "Charlie", age = 35 }
            }
        };

        // Act
        var result = await executor.ExecuteAsync(taskSpec, inputData);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.Output.Should().NotBeNull();
        var names = result.Output!["result"] as List<object>;
        names.Should().NotBeNull();
        names.Should().HaveCount(3);
        names.Should().Contain("Alice");
        names.Should().Contain("Bob");
        names.Should().Contain("Charlie");
    }

    [Fact]
    public async Task ExecuteAsync_WithNestedExtraction_ReturnsNestedValue()
    {
        // Arrange
        var transformer = new JsonPathTransformer();
        var executor = new TransformTaskExecutor(transformer);

        var taskSpec = new WorkflowTaskSpec
        {
            Type = "transform",
            Transform = new TransformDefinition
            {
                Query = "$.user.address.city"
            }
        };

        var inputData = new
        {
            user = new
            {
                name = "Alice",
                address = new
                {
                    city = "New York",
                    zip = "10001"
                }
            }
        };

        // Act
        var result = await executor.ExecuteAsync(taskSpec, inputData);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.Output!["result"].Should().Be("New York");
    }

    [Fact]
    public async Task ExecuteAsync_WithNullTransform_ReturnsError()
    {
        // Arrange
        var transformer = new JsonPathTransformer();
        var executor = new TransformTaskExecutor(transformer);

        var taskSpec = new WorkflowTaskSpec
        {
            Type = "transform",
            Transform = null  // No transform definition
        };

        var inputData = new { data = "test" };

        // Act
        var result = await executor.ExecuteAsync(taskSpec, inputData);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Should().Contain("Transform definition is null");
    }

    [Fact]
    public async Task ExecuteAsync_WithInvalidQuery_ReturnsError()
    {
        // Arrange
        var transformer = new JsonPathTransformer();
        var executor = new TransformTaskExecutor(transformer);

        var taskSpec = new WorkflowTaskSpec
        {
            Type = "transform",
            Transform = new TransformDefinition
            {
                Query = "$.users[?(@.age > 25]"  // Invalid - missing closing parenthesis
            }
        };

        var inputData = new { users = new[] { new { age = 30 } } };

        // Act
        var result = await executor.ExecuteAsync(taskSpec, inputData);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Should().Contain("Transform execution failed");
    }
}
