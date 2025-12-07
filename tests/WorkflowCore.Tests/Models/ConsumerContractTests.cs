using FluentAssertions;
using WorkflowCore.Models;
using Xunit;

namespace WorkflowCore.Tests.Models;

/// <summary>
/// Tests for ConsumerContract model - represents workflow's contract with a task.
/// </summary>
public class ConsumerContractTests
{
    [Fact]
    public void Constructor_InitializesEmptyCollections()
    {
        // Act
        var contract = new ConsumerContract();

        // Assert
        contract.TaskName.Should().BeEmpty();
        contract.ConsumerWorkflow.Should().BeEmpty();
        contract.RequiredInputFields.Should().BeEmpty();
        contract.RequiredOutputFields.Should().BeEmpty();
    }

    [Fact]
    public void RequiredInputFields_TracksFieldsNeededByWorkflow()
    {
        // Arrange
        var contract = new ConsumerContract
        {
            TaskName = "get-user",
            ConsumerWorkflow = "order-processing"
        };

        // Act
        contract.RequiredInputFields.Add("userId");

        // Assert
        contract.RequiredInputFields.Should().Contain("userId");
    }

    [Fact]
    public void RequiredOutputFields_TracksFieldsNeededByWorkflow()
    {
        // Arrange
        var contract = new ConsumerContract
        {
            TaskName = "get-user",
            ConsumerWorkflow = "order-processing"
        };

        // Act
        contract.RequiredOutputFields.Add("name");
        contract.RequiredOutputFields.Add("email");

        // Assert
        contract.RequiredOutputFields.Should().HaveCount(2);
        contract.RequiredOutputFields.Should().Contain(new[] { "name", "email" });
    }

    [Fact]
    public void IsValid_ReturnsTrue_WhenHasRequiredFields()
    {
        // Arrange
        var contract = new ConsumerContract
        {
            TaskName = "get-user",
            ConsumerWorkflow = "order-processing"
        };
        contract.RequiredOutputFields.Add("email");

        // Assert
        contract.IsValid.Should().BeTrue();
    }

    [Fact]
    public void IsValid_ReturnsFalse_WhenNoRequiredFields()
    {
        // Arrange
        var contract = new ConsumerContract
        {
            TaskName = "get-user",
            ConsumerWorkflow = "order-processing"
        };

        // Assert
        contract.IsValid.Should().BeFalse();
    }

    [Fact]
    public void TotalRequiredFields_ReturnsCombinedCount()
    {
        // Arrange
        var contract = new ConsumerContract
        {
            TaskName = "create-order",
            ConsumerWorkflow = "checkout-flow"
        };
        contract.RequiredInputFields.Add("userId");
        contract.RequiredInputFields.Add("items");
        contract.RequiredOutputFields.Add("orderId");

        // Assert
        contract.TotalRequiredFields.Should().Be(3);
    }

    [Fact]
    public void Version_DefaultsToOne()
    {
        // Act
        var contract = new ConsumerContract();

        // Assert
        contract.Version.Should().Be(1);
    }

    [Fact]
    public void CreatedAt_DefaultsToUtcNow()
    {
        // Act
        var before = DateTime.UtcNow.AddSeconds(-1);
        var contract = new ConsumerContract();
        var after = DateTime.UtcNow.AddSeconds(1);

        // Assert
        contract.CreatedAt.Should().BeAfter(before);
        contract.CreatedAt.Should().BeBefore(after);
    }
}
