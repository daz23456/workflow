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
        var error = ErrorMessageBuilder.TypeMismatch(
            "fetch-orders",
            "input.userId",
            "string",
            "integer",
            "Use tasks.fetch-user.output.id instead of age");

        // Assert
        error.TaskId.Should().Be("fetch-orders");
        error.Field.Should().Be("input.userId");
        error.Message.Should().Contain("Type mismatch");
        error.SuggestedFix.Should().NotBeNull();
    }

    [Fact]
    public void MissingRequiredField_WithAvailableFields_ShouldIncludeSuggestion()
    {
        // Arrange
        var availableFields = new List<string> { "id", "email", "name" };

        // Act
        var error = ErrorMessageBuilder.MissingRequiredField(
            "task-1",
            "userId",
            availableFields);

        // Assert
        error.TaskId.Should().Be("task-1");
        error.Field.Should().Be("userId");
        error.Message.Should().Contain("Required field 'userId' is missing");
        error.SuggestedFix.Should().Contain("Available fields: id, email, name");
    }

    [Fact]
    public void CircularDependency_ShouldShowCyclePath()
    {
        // Arrange
        var cyclePath = new List<string> { "task-a", "task-b", "task-c", "task-a" };

        // Act
        var error = ErrorMessageBuilder.CircularDependency(
            "workflow-1",
            cyclePath);

        // Assert
        error.TaskId.Should().Be("workflow-1");
        error.Message.Should().Contain("task-a → task-b → task-c → task-a");
        error.SuggestedFix.Should().Contain("break the cycle");
    }

    [Fact]
    public void MissingRequiredField_WithNoSuggestions_ShouldShowAvailableFields()
    {
        // Arrange
        var availableFields = new List<string> { "name", "email", "age" };

        // Act
        var error = ErrorMessageBuilder.MissingRequiredField("task1", "invalidField", availableFields);

        // Assert
        error.TaskId.Should().Be("task1");
        error.Field.Should().Be("invalidField");
        error.Message.Should().Contain("Required field 'invalidField' is missing");
        error.SuggestedFix.Should().Contain("Available fields");
    }

    [Fact]
    public void MissingRequiredField_WithEmptyAvailableFields_ShouldNotCrash()
    {
        // Arrange
        var availableFields = new List<string>();

        // Act
        var error = ErrorMessageBuilder.MissingRequiredField("task1", "field1", availableFields);

        // Assert
        error.TaskId.Should().Be("task1");
        error.Field.Should().Be("field1");
        error.Message.Should().Contain("Required field 'field1' is missing");
    }
}
