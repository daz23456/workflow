using FluentAssertions;
using WorkflowCore.Models;
using Xunit;

namespace WorkflowCore.Tests.Models;

/// <summary>
/// Tests for RecordedInteraction model - golden file testing.
/// </summary>
public class RecordedInteractionTests
{
    [Fact]
    public void RecordedInteraction_ShouldInitializeWithDefaults()
    {
        // Arrange & Act
        var interaction = new RecordedInteraction();

        // Assert
        interaction.TaskName.Should().BeEmpty();
        interaction.InteractionId.Should().BeEmpty();
        interaction.RequestBody.Should().BeNull();
        interaction.ResponseBody.Should().BeNull();
        interaction.StatusCode.Should().Be(0);
        interaction.RecordedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void RecordedInteraction_ShouldSetProperties()
    {
        // Arrange
        var recordedAt = DateTime.UtcNow;

        // Act
        var interaction = new RecordedInteraction
        {
            TaskName = "get-user",
            InteractionId = "int-001",
            RequestBody = "{ \"userId\": \"123\" }",
            ResponseBody = "{ \"name\": \"John\" }",
            StatusCode = 200,
            RecordedAt = recordedAt,
            Environment = "dev",
            Headers = new Dictionary<string, string>
            {
                ["Content-Type"] = "application/json"
            }
        };

        // Assert
        interaction.TaskName.Should().Be("get-user");
        interaction.InteractionId.Should().Be("int-001");
        interaction.RequestBody.Should().Be("{ \"userId\": \"123\" }");
        interaction.ResponseBody.Should().Be("{ \"name\": \"John\" }");
        interaction.StatusCode.Should().Be(200);
        interaction.RecordedAt.Should().Be(recordedAt);
        interaction.Environment.Should().Be("dev");
        interaction.Headers["Content-Type"].Should().Be("application/json");
    }

    [Fact]
    public void RecordedInteraction_IsSuccessful_ShouldReturnTrue_ForSuccessStatusCodes()
    {
        // Arrange & Act
        var interaction200 = new RecordedInteraction { StatusCode = 200 };
        var interaction201 = new RecordedInteraction { StatusCode = 201 };
        var interaction204 = new RecordedInteraction { StatusCode = 204 };

        // Assert
        interaction200.IsSuccessful.Should().BeTrue();
        interaction201.IsSuccessful.Should().BeTrue();
        interaction204.IsSuccessful.Should().BeTrue();
    }

    [Fact]
    public void RecordedInteraction_IsSuccessful_ShouldReturnFalse_ForErrorStatusCodes()
    {
        // Arrange & Act
        var interaction400 = new RecordedInteraction { StatusCode = 400 };
        var interaction404 = new RecordedInteraction { StatusCode = 404 };
        var interaction500 = new RecordedInteraction { StatusCode = 500 };

        // Assert
        interaction400.IsSuccessful.Should().BeFalse();
        interaction404.IsSuccessful.Should().BeFalse();
        interaction500.IsSuccessful.Should().BeFalse();
    }

    [Fact]
    public void RecordedInteraction_MatchesRequest_ShouldReturnTrue_WhenRequestBodiesMatch()
    {
        // Arrange
        var interaction = new RecordedInteraction
        {
            TaskName = "get-user",
            RequestBody = "{ \"userId\": \"123\" }"
        };

        // Act
        var matches = interaction.MatchesRequest("{ \"userId\": \"123\" }");

        // Assert
        matches.Should().BeTrue();
    }

    [Fact]
    public void RecordedInteraction_MatchesRequest_ShouldReturnFalse_WhenRequestBodiesDiffer()
    {
        // Arrange
        var interaction = new RecordedInteraction
        {
            TaskName = "get-user",
            RequestBody = "{ \"userId\": \"123\" }"
        };

        // Act
        var matches = interaction.MatchesRequest("{ \"userId\": \"456\" }");

        // Assert
        matches.Should().BeFalse();
    }

    [Fact]
    public void RecordedInteraction_HasResponseBody_ShouldReturnCorrectly()
    {
        // Arrange
        var withBody = new RecordedInteraction { ResponseBody = "{ \"data\": true }" };
        var withoutBody = new RecordedInteraction { ResponseBody = null };
        var emptyBody = new RecordedInteraction { ResponseBody = "" };

        // Assert
        withBody.HasResponseBody.Should().BeTrue();
        withoutBody.HasResponseBody.Should().BeFalse();
        emptyBody.HasResponseBody.Should().BeFalse();
    }
}
