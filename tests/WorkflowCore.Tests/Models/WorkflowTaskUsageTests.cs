using FluentAssertions;
using WorkflowCore.Models;
using Xunit;

namespace WorkflowCore.Tests.Models;

/// <summary>
/// Tests for WorkflowTaskUsage model - tracks field usage by workflows.
/// </summary>
public class WorkflowTaskUsageTests
{
    [Fact]
    public void Constructor_InitializesEmptyCollections()
    {
        // Act
        var usage = new WorkflowTaskUsage();

        // Assert
        usage.TaskName.Should().BeEmpty();
        usage.WorkflowName.Should().BeEmpty();
        usage.UsedInputFields.Should().BeEmpty();
        usage.UsedOutputFields.Should().BeEmpty();
    }

    [Fact]
    public void UsedInputFields_CanAddAndRetrieveFields()
    {
        // Arrange
        var usage = new WorkflowTaskUsage
        {
            TaskName = "get-user",
            WorkflowName = "user-profile-workflow"
        };

        // Act
        usage.UsedInputFields.Add("userId");
        usage.UsedInputFields.Add("includeDetails");

        // Assert
        usage.UsedInputFields.Should().HaveCount(2);
        usage.UsedInputFields.Should().Contain("userId");
        usage.UsedInputFields.Should().Contain("includeDetails");
    }

    [Fact]
    public void UsedOutputFields_CanAddAndRetrieveFields()
    {
        // Arrange
        var usage = new WorkflowTaskUsage
        {
            TaskName = "get-user",
            WorkflowName = "user-profile-workflow"
        };

        // Act
        usage.UsedOutputFields.Add("name");
        usage.UsedOutputFields.Add("email");
        usage.UsedOutputFields.Add("phone");

        // Assert
        usage.UsedOutputFields.Should().HaveCount(3);
        usage.UsedOutputFields.Should().Contain(new[] { "name", "email", "phone" });
    }

    [Fact]
    public void HasFieldUsage_ReturnsFalse_WhenNoFieldsUsed()
    {
        // Arrange
        var usage = new WorkflowTaskUsage
        {
            TaskName = "get-user",
            WorkflowName = "user-profile-workflow"
        };

        // Assert
        usage.HasFieldUsage.Should().BeFalse();
    }

    [Fact]
    public void HasFieldUsage_ReturnsTrue_WhenInputFieldsUsed()
    {
        // Arrange
        var usage = new WorkflowTaskUsage
        {
            TaskName = "get-user",
            WorkflowName = "user-profile-workflow"
        };
        usage.UsedInputFields.Add("userId");

        // Assert
        usage.HasFieldUsage.Should().BeTrue();
    }

    [Fact]
    public void HasFieldUsage_ReturnsTrue_WhenOutputFieldsUsed()
    {
        // Arrange
        var usage = new WorkflowTaskUsage
        {
            TaskName = "get-user",
            WorkflowName = "user-profile-workflow"
        };
        usage.UsedOutputFields.Add("name");

        // Assert
        usage.HasFieldUsage.Should().BeTrue();
    }

    [Fact]
    public void LastAnalyzed_DefaultsToUtcNow()
    {
        // Act
        var before = DateTime.UtcNow.AddSeconds(-1);
        var usage = new WorkflowTaskUsage();
        var after = DateTime.UtcNow.AddSeconds(1);

        // Assert
        usage.LastAnalyzed.Should().BeAfter(before);
        usage.LastAnalyzed.Should().BeBefore(after);
    }
}
