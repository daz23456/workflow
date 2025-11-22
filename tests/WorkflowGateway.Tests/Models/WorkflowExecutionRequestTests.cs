using System.Text.Json;
using FluentAssertions;
using WorkflowGateway.Models;
using Xunit;

namespace WorkflowGateway.Tests.Models;

public class WorkflowExecutionRequestTests
{
    [Fact]
    public void WorkflowExecutionRequest_ShouldSerializeAndDeserialize()
    {
        // Arrange
        var request = new WorkflowExecutionRequest
        {
            Input = new Dictionary<string, object>
            {
                ["userId"] = "123",
                ["orderId"] = "456"
            }
        };

        // Act
        var json = JsonSerializer.Serialize(request);
        var deserialized = JsonSerializer.Deserialize<WorkflowExecutionRequest>(json);

        // Assert
        deserialized.Should().NotBeNull();
        deserialized!.Input.Should().ContainKey("userId");
        deserialized.Input["userId"].ToString().Should().Be("123");
        deserialized.Input.Should().ContainKey("orderId");
        deserialized.Input["orderId"].ToString().Should().Be("456");
    }

    [Fact]
    public void WorkflowExecutionRequest_WithEmptyInput_ShouldSerialize()
    {
        // Arrange
        var request = new WorkflowExecutionRequest
        {
            Input = new Dictionary<string, object>()
        };

        // Act
        var json = JsonSerializer.Serialize(request);
        var deserialized = JsonSerializer.Deserialize<WorkflowExecutionRequest>(json);

        // Assert
        deserialized.Should().NotBeNull();
        deserialized!.Input.Should().BeEmpty();
    }
}
