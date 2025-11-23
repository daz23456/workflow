using FluentAssertions;
using WorkflowCore.Models;

namespace WorkflowCore.Tests.Models;

public class ExecutionStatusTests
{
    [Fact]
    public void ExecutionStatus_ShouldHaveRunningValue()
    {
        // Arrange & Act
        var status = ExecutionStatus.Running;

        // Assert
        status.Should().Be(ExecutionStatus.Running);
        ((int)status).Should().Be(0);
    }

    [Fact]
    public void ExecutionStatus_ShouldHaveSucceededValue()
    {
        // Arrange & Act
        var status = ExecutionStatus.Succeeded;

        // Assert
        status.Should().Be(ExecutionStatus.Succeeded);
        ((int)status).Should().Be(1);
    }

    [Fact]
    public void ExecutionStatus_ShouldHaveFailedValue()
    {
        // Arrange & Act
        var status = ExecutionStatus.Failed;

        // Assert
        status.Should().Be(ExecutionStatus.Failed);
        ((int)status).Should().Be(2);
    }

    [Fact]
    public void ExecutionStatus_ShouldHaveCancelledValue()
    {
        // Arrange & Act
        var status = ExecutionStatus.Cancelled;

        // Assert
        status.Should().Be(ExecutionStatus.Cancelled);
        ((int)status).Should().Be(3);
    }

    [Fact]
    public void ExecutionStatus_ShouldHaveExactlyFourValues()
    {
        // Arrange & Act
        var values = Enum.GetValues(typeof(ExecutionStatus));

        // Assert
        values.Length.Should().Be(4);
    }
}
