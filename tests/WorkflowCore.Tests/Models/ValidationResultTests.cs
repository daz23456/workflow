using FluentAssertions;
using WorkflowCore.Models;
using Xunit;

namespace WorkflowCore.Tests.Models;

public class ValidationResultTests
{
    [Fact]
    public void ValidationResult_ShouldInitializeWithDefaultValues()
    {
        // Act
        var result = new ValidationResult();

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().NotBeNull();
        result.Errors.Should().BeEmpty();
    }

    [Fact]
    public void ValidationResult_ShouldAllowSettingProperties()
    {
        // Arrange
        var error = new ValidationError
        {
            TaskId = "task-1",
            Field = "userId",
            Message = "Required field missing",
            SuggestedFix = "Add userId to input"
        };

        // Act
        var result = new ValidationResult
        {
            IsValid = false,
            Errors = new List<ValidationError> { error }
        };

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().HaveCount(1);
        result.Errors[0].TaskId.Should().Be("task-1");
        result.Errors[0].Field.Should().Be("userId");
        result.Errors[0].Message.Should().Be("Required field missing");
        result.Errors[0].SuggestedFix.Should().Be("Add userId to input");
    }

    [Fact]
    public void ValidationError_ShouldInitializeWithDefaultValues()
    {
        // Act
        var error = new ValidationError();

        // Assert
        error.TaskId.Should().BeNull();
        error.Field.Should().BeNull();
        error.Message.Should().Be(string.Empty);
        error.SuggestedFix.Should().BeNull();
    }

    [Fact]
    public void ValidationResult_ShouldSupportMultipleErrors()
    {
        // Arrange
        var result = new ValidationResult
        {
            IsValid = false,
            Errors = new List<ValidationError>
            {
                new() { TaskId = "task-1", Field = "field1", Message = "Error 1" },
                new() { TaskId = "task-2", Field = "field2", Message = "Error 2" }
            }
        };

        // Act & Assert
        result.Errors.Should().HaveCount(2);
        result.Errors[0].TaskId.Should().Be("task-1");
        result.Errors[1].TaskId.Should().Be("task-2");
    }

    [Fact]
    public void ValidationResult_WithValidData_ShouldBeValid()
    {
        // Act
        var result = new ValidationResult
        {
            IsValid = true,
            Errors = new List<ValidationError>()
        };

        // Assert
        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }
}
