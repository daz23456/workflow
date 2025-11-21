using FluentAssertions;
using WorkflowCore.Models;
using Xunit;

namespace WorkflowCore.Tests.Models;

public class ErrorMessageBuilderTests
{
    [Fact]
    public void TypeMismatch_ShouldCreateValidationError()
    {
        // Act
        var error = ErrorMessageBuilder.TypeMismatch("userId", "string", "integer");

        // Assert
        error.Should().Contain("userId");
        error.Should().Contain("type mismatch");
        error.Should().Contain("string");
        error.Should().Contain("integer");
    }

    [Fact]
    public void MissingRequiredField_WithAvailableFields_ShouldIncludeSuggestion()
    {
        // Arrange
        var availableFields = new List<string> { "username", "email", "userId" };

        // Act
        var error = ErrorMessageBuilder.MissingRequiredField("taskId", "userID", availableFields);

        // Assert
        error.Should().Contain("taskId");
        error.Should().Contain("userID");
        error.Should().Contain("missing");
        error.Should().Contain("suggestion");
        error.Should().Contain("userId"); // Should suggest similar field
    }

    [Fact]
    public void CircularDependency_ShouldShowCyclePath()
    {
        // Arrange
        var cyclePath = new List<string> { "task-a", "task-b", "task-c", "task-a" };

        // Act
        var error = ErrorMessageBuilder.CircularDependency(cyclePath);

        // Assert
        error.Should().Contain("Circular dependency");
        error.Should().Contain("task-a");
        error.Should().Contain("task-b");
        error.Should().Contain("task-c");
        error.Should().Contain("->");
    }

    [Fact]
    public void MissingRequiredField_WithNoSuggestions_ShouldShowAvailableFields()
    {
        // Arrange
        var availableFields = new List<string> { "name", "email", "age" };

        // Act
        var error = ErrorMessageBuilder.MissingRequiredField("task1", "invalidField", availableFields);

        // Assert
        error.Should().Contain("task1");
        error.Should().Contain("invalidField");
        error.Should().Contain("Available fields");
    }

    [Fact]
    public void MissingRequiredField_WithEmptyAvailableFields_ShouldNotCrash()
    {
        // Arrange
        var availableFields = new List<string>();

        // Act
        var error = ErrorMessageBuilder.MissingRequiredField("task1", "field1", availableFields);

        // Assert
        error.Should().Contain("task1");
        error.Should().Contain("field1");
        error.Should().NotBeNullOrEmpty();
    }
}
