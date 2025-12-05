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

    [Fact]
    public void TypeMismatch_WithoutSuggestedFix_ShouldHaveNullSuggestion()
    {
        // Act
        var error = ErrorMessageBuilder.TypeMismatch(
            "task-id",
            "input.field",
            "string",
            "number");

        // Assert
        error.TaskId.Should().Be("task-id");
        error.Field.Should().Be("input.field");
        error.Message.Should().Be("Type mismatch: expected 'string', got 'number'");
        error.SuggestedFix.Should().BeNull();
    }

    [Fact]
    public void TypeMismatch_ShouldIncludeExpectedAndActualTypes()
    {
        // Act
        var error = ErrorMessageBuilder.TypeMismatch(
            "my-task",
            "data",
            "array",
            "object",
            "Convert to array first");

        // Assert
        error.Message.Should().Contain("array");
        error.Message.Should().Contain("object");
        error.Message.Should().Contain("expected");
        error.Message.Should().Contain("got");
    }

    [Fact]
    public void MissingRequiredField_WithNullAvailableFields_ShouldHaveNullSuggestion()
    {
        // Act
        var error = ErrorMessageBuilder.MissingRequiredField("task1", "userId", null);

        // Assert
        error.TaskId.Should().Be("task1");
        error.Field.Should().Be("userId");
        error.Message.Should().Be("Required field 'userId' is missing");
        error.SuggestedFix.Should().BeNull();
    }

    [Fact]
    public void InvalidTemplate_ShouldCreateErrorWithCorrectMessage()
    {
        // Act
        var error = ErrorMessageBuilder.InvalidTemplate(
            "process-data",
            "input.template",
            "{{invalid",
            "Unclosed bracket");

        // Assert
        error.TaskId.Should().Be("process-data");
        error.Field.Should().Be("input.template");
        error.Message.Should().Contain("Invalid template '{{invalid'");
        error.Message.Should().Contain("Unclosed bracket");
    }

    [Fact]
    public void InvalidTemplate_ShouldIncludeSyntaxHint()
    {
        // Act
        var error = ErrorMessageBuilder.InvalidTemplate(
            "task",
            "field",
            "bad",
            "reason");

        // Assert
        error.SuggestedFix.Should().Contain("{{input.field}}");
        error.SuggestedFix.Should().Contain("{{tasks.taskId.output.field}}");
    }

    [Fact]
    public void CircularDependency_ShouldUseArrowSeparator()
    {
        // Arrange
        var cycle = new List<string> { "a", "b", "a" };

        // Act
        var error = ErrorMessageBuilder.CircularDependency("wf", cycle);

        // Assert
        error.Message.Should().Contain("a → b → a");
    }

    [Fact]
    public void CircularDependency_ShouldSetTaskIdToWorkflowId()
    {
        // Arrange
        var cycle = new List<string> { "x", "y", "x" };

        // Act
        var error = ErrorMessageBuilder.CircularDependency("my-workflow", cycle);

        // Assert
        error.TaskId.Should().Be("my-workflow");
    }

    [Fact]
    public void CircularDependency_ShouldProvideSuggestedFix()
    {
        // Arrange
        var cycle = new List<string> { "task1", "task2", "task1" };

        // Act
        var error = ErrorMessageBuilder.CircularDependency("workflow", cycle);

        // Assert
        error.SuggestedFix.Should().NotBeNull();
        error.SuggestedFix.Should().Contain("break the cycle");
    }
}
