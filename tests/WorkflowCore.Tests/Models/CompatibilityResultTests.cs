using FluentAssertions;
using WorkflowCore.Models;
using Xunit;

namespace WorkflowCore.Tests.Models;

public class CompatibilityResultTests
{
    [Fact]
    public void CompatibilityResult_ShouldInitializeWithDefaultValues()
    {
        // Act
        var result = new CompatibilityResult();

        // Assert
        result.IsCompatible.Should().BeFalse();
        result.Errors.Should().NotBeNull();
        result.Errors.Should().BeEmpty();
    }

    [Fact]
    public void CompatibilityResult_ShouldAllowSettingProperties()
    {
        // Arrange
        var error = new CompatibilityError
        {
            Field = "userId",
            Message = "Type mismatch",
            SuggestedFix = "Use string instead of integer"
        };

        // Act
        var result = new CompatibilityResult
        {
            IsCompatible = false,
            Errors = new List<CompatibilityError> { error }
        };

        // Assert
        result.IsCompatible.Should().BeFalse();
        result.Errors.Should().HaveCount(1);
        result.Errors[0].Field.Should().Be("userId");
        result.Errors[0].Message.Should().Be("Type mismatch");
        result.Errors[0].SuggestedFix.Should().Be("Use string instead of integer");
    }

    [Fact]
    public void CompatibilityError_ShouldInitializeWithDefaultValues()
    {
        // Act
        var error = new CompatibilityError();

        // Assert
        error.Field.Should().BeNull();
        error.Message.Should().Be(string.Empty);
        error.SuggestedFix.Should().BeNull();
    }

    [Fact]
    public void CompatibilityResult_ShouldSupportMultipleErrors()
    {
        // Arrange
        var result = new CompatibilityResult
        {
            IsCompatible = false,
            Errors = new List<CompatibilityError>
            {
                new() { Field = "field1", Message = "Error 1" },
                new() { Field = "field2", Message = "Error 2" }
            }
        };

        // Act & Assert
        result.Errors.Should().HaveCount(2);
        result.Errors[0].Field.Should().Be("field1");
        result.Errors[1].Field.Should().Be("field2");
    }
}
