using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

/// <summary>
/// Tests for InteractionRecorder service - records and retrieves interactions.
/// </summary>
public class InteractionRecorderTests
{
    private readonly InteractionRecorder _recorder;

    public InteractionRecorderTests()
    {
        _recorder = new InteractionRecorder();
    }

    [Fact]
    public void RecordInteraction_ShouldStoreInteraction()
    {
        // Arrange
        var interaction = new RecordedInteraction
        {
            TaskName = "get-user",
            InteractionId = "int-001",
            StatusCode = 200,
            ResponseBody = "{ \"name\": \"John\" }"
        };

        // Act
        _recorder.RecordInteraction(interaction);
        var retrieved = _recorder.GetLatestInteraction("get-user");

        // Assert
        retrieved.Should().NotBeNull();
        retrieved!.InteractionId.Should().Be("int-001");
    }

    [Fact]
    public void GetLatestInteraction_ShouldReturnMostRecent()
    {
        // Arrange
        var older = new RecordedInteraction
        {
            TaskName = "get-user",
            InteractionId = "int-001",
            RecordedAt = DateTime.UtcNow.AddMinutes(-5)
        };
        var newer = new RecordedInteraction
        {
            TaskName = "get-user",
            InteractionId = "int-002",
            RecordedAt = DateTime.UtcNow
        };

        // Act
        _recorder.RecordInteraction(older);
        _recorder.RecordInteraction(newer);
        var latest = _recorder.GetLatestInteraction("get-user");

        // Assert
        latest.Should().NotBeNull();
        latest!.InteractionId.Should().Be("int-002");
    }

    [Fact]
    public void GetLatestInteraction_ShouldReturnNull_WhenNoInteractions()
    {
        // Act
        var result = _recorder.GetLatestInteraction("unknown-task");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void GetAllInteractions_ShouldReturnAllForTask()
    {
        // Arrange
        var int1 = new RecordedInteraction
        {
            TaskName = "get-user",
            InteractionId = "int-001"
        };
        var int2 = new RecordedInteraction
        {
            TaskName = "get-user",
            InteractionId = "int-002"
        };
        var int3 = new RecordedInteraction
        {
            TaskName = "other-task",
            InteractionId = "int-003"
        };

        // Act
        _recorder.RecordInteraction(int1);
        _recorder.RecordInteraction(int2);
        _recorder.RecordInteraction(int3);
        var getUserInteractions = _recorder.GetAllInteractions("get-user");

        // Assert
        getUserInteractions.Should().HaveCount(2);
        getUserInteractions.Should().OnlyContain(i => i.TaskName == "get-user");
    }

    [Fact]
    public void GetInteractionsByEnvironment_ShouldFilterByEnvironment()
    {
        // Arrange
        var devInt = new RecordedInteraction
        {
            TaskName = "get-user",
            InteractionId = "int-001",
            Environment = "dev"
        };
        var prodInt = new RecordedInteraction
        {
            TaskName = "get-user",
            InteractionId = "int-002",
            Environment = "prod"
        };

        // Act
        _recorder.RecordInteraction(devInt);
        _recorder.RecordInteraction(prodInt);
        var devInteractions = _recorder.GetInteractionsByEnvironment("get-user", "dev");

        // Assert
        devInteractions.Should().HaveCount(1);
        devInteractions[0].Environment.Should().Be("dev");
    }

    [Fact]
    public void FindMatchingInteraction_ShouldFindByRequestBody()
    {
        // Arrange
        var interaction = new RecordedInteraction
        {
            TaskName = "get-user",
            InteractionId = "int-001",
            RequestBody = "{ \"userId\": \"123\" }",
            ResponseBody = "{ \"name\": \"John\" }"
        };
        _recorder.RecordInteraction(interaction);

        // Act
        var found = _recorder.FindMatchingInteraction("get-user", "{ \"userId\": \"123\" }");

        // Assert
        found.Should().NotBeNull();
        found!.ResponseBody.Should().Be("{ \"name\": \"John\" }");
    }

    [Fact]
    public void FindMatchingInteraction_ShouldReturnNull_WhenNoMatch()
    {
        // Arrange
        var interaction = new RecordedInteraction
        {
            TaskName = "get-user",
            InteractionId = "int-001",
            RequestBody = "{ \"userId\": \"123\" }"
        };
        _recorder.RecordInteraction(interaction);

        // Act
        var found = _recorder.FindMatchingInteraction("get-user", "{ \"userId\": \"456\" }");

        // Assert
        found.Should().BeNull();
    }

    [Fact]
    public void ClearInteractions_ShouldRemoveAllForTask()
    {
        // Arrange
        var int1 = new RecordedInteraction { TaskName = "get-user", InteractionId = "int-001" };
        var int2 = new RecordedInteraction { TaskName = "other-task", InteractionId = "int-002" };
        _recorder.RecordInteraction(int1);
        _recorder.RecordInteraction(int2);

        // Act
        _recorder.ClearInteractions("get-user");

        // Assert
        _recorder.GetAllInteractions("get-user").Should().BeEmpty();
        _recorder.GetAllInteractions("other-task").Should().HaveCount(1);
    }
}
