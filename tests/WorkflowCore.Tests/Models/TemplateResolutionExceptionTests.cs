using FluentAssertions;
using WorkflowCore.Models;
using Xunit;

namespace WorkflowCore.Tests.Models;

public class TemplateResolutionExceptionTests
{
    [Fact]
    public void Constructor_WithMessageOnly_SetsMessageAndNullTemplatePath()
    {
        // Arrange
        var message = "Template resolution failed";

        // Act
        var exception = new TemplateResolutionException(message);

        // Assert
        exception.Message.Should().Be(message);
        exception.TemplatePath.Should().BeNull();
        exception.InnerException.Should().BeNull();
    }

    [Fact]
    public void Constructor_WithMessageAndTemplatePath_SetsBothProperties()
    {
        // Arrange
        var message = "Template resolution failed";
        var templatePath = "{{input.userId}}";

        // Act
        var exception = new TemplateResolutionException(message, templatePath);

        // Assert
        exception.Message.Should().Be(message);
        exception.TemplatePath.Should().Be(templatePath);
        exception.InnerException.Should().BeNull();
    }

    [Fact]
    public void Constructor_WithNullTemplatePath_AllowsNull()
    {
        // Arrange
        var message = "Template resolution failed";
        string? templatePath = null;

        // Act
        var exception = new TemplateResolutionException(message, templatePath);

        // Assert
        exception.Message.Should().Be(message);
        exception.TemplatePath.Should().BeNull();
    }

    [Fact]
    public void Constructor_WithInnerException_SetsAllProperties()
    {
        // Arrange
        var message = "Template resolution failed due to underlying error";
        var innerException = new InvalidOperationException("Underlying error");
        var templatePath = "{{tasks.step1.output.data}}";

        // Act
        var exception = new TemplateResolutionException(message, innerException, templatePath);

        // Assert
        exception.Message.Should().Be(message);
        exception.InnerException.Should().BeSameAs(innerException);
        exception.TemplatePath.Should().Be(templatePath);
    }

    [Fact]
    public void Constructor_WithInnerExceptionAndNullTemplatePath_AllowsNull()
    {
        // Arrange
        var message = "Template resolution failed";
        var innerException = new InvalidOperationException("Underlying error");
        string? templatePath = null;

        // Act
        var exception = new TemplateResolutionException(message, innerException, templatePath);

        // Assert
        exception.Message.Should().Be(message);
        exception.InnerException.Should().BeSameAs(innerException);
        exception.TemplatePath.Should().BeNull();
    }

    [Fact]
    public void Constructor_WithInnerException_PreservesStackTrace()
    {
        // Arrange
        var message = "Template resolution failed";
        var innerException = new InvalidOperationException("Underlying error");
        var templatePath = "{{input.data}}";

        // Act
        var exception = new TemplateResolutionException(message, innerException, templatePath);

        // Assert
        exception.InnerException.Should().NotBeNull();
        exception.InnerException!.Message.Should().Be("Underlying error");
        exception.InnerException.Should().BeOfType<InvalidOperationException>();
    }

    [Fact]
    public void Exception_CanBeThrown_AndCaught()
    {
        // Arrange
        var message = "Template resolution failed";
        var templatePath = "{{input.test}}";

        // Act
        Action act = () => throw new TemplateResolutionException(message, templatePath);

        // Assert
        act.Should().Throw<TemplateResolutionException>()
            .WithMessage(message)
            .And.TemplatePath.Should().Be(templatePath);
    }

    [Fact]
    public void Exception_WithInnerException_CanBeThrown_AndCaught()
    {
        // Arrange
        var message = "Template resolution failed";
        var innerException = new FormatException("Invalid format");
        var templatePath = "{{input.value}}";

        // Act
        Action act = () => throw new TemplateResolutionException(message, innerException, templatePath);

        // Assert
        act.Should().Throw<TemplateResolutionException>()
            .WithMessage(message)
            .WithInnerException<FormatException>();

        // Verify TemplatePath separately
        try
        {
            act();
        }
        catch (TemplateResolutionException ex)
        {
            ex.TemplatePath.Should().Be(templatePath);
        }
    }
}
