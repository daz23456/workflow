using FluentAssertions;
using WorkflowCore.Models;
using Xunit;

namespace WorkflowCore.Tests.Models;

/// <summary>
/// Tests for FieldUsageInfo model - detailed field usage information.
/// </summary>
public class FieldUsageInfoTests
{
    [Fact]
    public void Constructor_InitializesEmptyCollections()
    {
        // Act
        var info = new FieldUsageInfo();

        // Assert
        info.FieldName.Should().BeEmpty();
        info.FieldType.Should().Be(FieldType.Input);
        info.UsedByWorkflows.Should().BeEmpty();
    }

    [Fact]
    public void UsedByWorkflows_CanAddMultipleWorkflows()
    {
        // Arrange
        var info = new FieldUsageInfo
        {
            FieldName = "userId",
            FieldType = FieldType.Input
        };

        // Act
        info.UsedByWorkflows.Add("workflow-1");
        info.UsedByWorkflows.Add("workflow-2");
        info.UsedByWorkflows.Add("workflow-3");

        // Assert
        info.UsedByWorkflows.Should().HaveCount(3);
    }

    [Fact]
    public void UsageCount_ReturnsCorrectCount()
    {
        // Arrange
        var info = new FieldUsageInfo
        {
            FieldName = "email",
            FieldType = FieldType.Output
        };
        info.UsedByWorkflows.Add("workflow-a");
        info.UsedByWorkflows.Add("workflow-b");

        // Assert
        info.UsageCount.Should().Be(2);
    }

    [Fact]
    public void IsUnused_ReturnsTrue_WhenNoWorkflowsUseField()
    {
        // Arrange
        var info = new FieldUsageInfo
        {
            FieldName = "deprecatedField",
            FieldType = FieldType.Output
        };

        // Assert
        info.IsUnused.Should().BeTrue();
    }

    [Fact]
    public void IsUnused_ReturnsFalse_WhenWorkflowsUseField()
    {
        // Arrange
        var info = new FieldUsageInfo
        {
            FieldName = "name",
            FieldType = FieldType.Output
        };
        info.UsedByWorkflows.Add("some-workflow");

        // Assert
        info.IsUnused.Should().BeFalse();
    }

    [Fact]
    public void FieldType_CanBeInput()
    {
        // Arrange & Act
        var info = new FieldUsageInfo
        {
            FieldName = "userId",
            FieldType = FieldType.Input
        };

        // Assert
        info.FieldType.Should().Be(FieldType.Input);
    }

    [Fact]
    public void FieldType_CanBeOutput()
    {
        // Arrange & Act
        var info = new FieldUsageInfo
        {
            FieldName = "result",
            FieldType = FieldType.Output
        };

        // Assert
        info.FieldType.Should().Be(FieldType.Output);
    }
}
