using FluentAssertions;
using System.Text.Json;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class TemplatePreviewServiceTests
{
    private readonly ITemplatePreviewService _previewService;

    public TemplatePreviewServiceTests()
    {
        _previewService = new TemplatePreviewService();
    }

    [Fact]
    public void PreviewTemplate_WithSimpleInputTemplate_ShouldResolveValue()
    {
        // Arrange
        var templateString = "{{input.userId}}";
        var input = JsonSerializer.Deserialize<JsonElement>("""{"userId": "user123"}""");

        // Act
        var result = _previewService.PreviewTemplate(templateString, input);

        // Assert
        result.Should().ContainKey("{{input.userId}}");
        result["{{input.userId}}"].Should().Be("user123");
    }

    [Fact]
    public void PreviewTemplate_WithNestedInputTemplate_ShouldResolveNestedValue()
    {
        // Arrange
        var templateString = "{{input.user.profile.email}}";
        var input = JsonSerializer.Deserialize<JsonElement>("""{"user": {"profile": {"email": "test@example.com"}}}""");

        // Act
        var result = _previewService.PreviewTemplate(templateString, input);

        // Assert
        result.Should().ContainKey("{{input.user.profile.email}}");
        result["{{input.user.profile.email}}"].Should().Be("test@example.com");
    }

    [Fact]
    public void PreviewTemplate_WithTaskOutputTemplate_ShouldReturnPlaceholder()
    {
        // Arrange
        var templateString = "{{tasks.fetch-user.output.data}}";
        var input = JsonSerializer.Deserialize<JsonElement>("""{}""");

        // Act
        var result = _previewService.PreviewTemplate(templateString, input);

        // Assert
        result.Should().ContainKey("{{tasks.fetch-user.output.data}}");
        result["{{tasks.fetch-user.output.data}}"].Should().Be("<will-resolve-from-fetch-user.output.data>");
    }

    [Fact]
    public void PreviewTemplate_WithMultipleTemplates_ShouldResolveAll()
    {
        // Arrange
        var templateString = "User {{input.userId}} will process {{tasks.step1.output.result}}";
        var input = JsonSerializer.Deserialize<JsonElement>("""{"userId": "user123"}""");

        // Act
        var result = _previewService.PreviewTemplate(templateString, input);

        // Assert
        result.Should().HaveCount(2);
        result["{{input.userId}}"].Should().Be("user123");
        result["{{tasks.step1.output.result}}"].Should().Be("<will-resolve-from-step1.output.result>");
    }

    [Fact]
    public void PreviewTemplate_WithMissingInputPath_ShouldReturnNull()
    {
        // Arrange
        var templateString = "{{input.nonexistent}}";
        var input = JsonSerializer.Deserialize<JsonElement>("""{"userId": "user123"}""");

        // Act
        var result = _previewService.PreviewTemplate(templateString, input);

        // Assert
        result.Should().ContainKey("{{input.nonexistent}}");
        result["{{input.nonexistent}}"].Should().Be("<null>");
    }

    [Fact]
    public void PreviewTemplate_WithNoTemplates_ShouldReturnEmptyDictionary()
    {
        // Arrange
        var templateString = "plain text with no templates";
        var input = JsonSerializer.Deserialize<JsonElement>("""{}""");

        // Act
        var result = _previewService.PreviewTemplate(templateString, input);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public void PreviewTemplate_WithComplexNestedPath_ShouldResolveCorrectly()
    {
        // Arrange
        var templateString = "{{input.data.items[0].name}}";
        var input = JsonSerializer.Deserialize<JsonElement>("""{"data": {"items": [{"name": "Item1"}]}}""");

        // Act
        var result = _previewService.PreviewTemplate(templateString, input);

        // Assert
        result.Should().ContainKey("{{input.data.items[0].name}}");
        result["{{input.data.items[0].name}}"].Should().Be("Item1");
    }

    [Fact]
    public void PreviewTemplate_WithEmptyInput_AndInputTemplate_ShouldReturnNull()
    {
        // Arrange
        var templateString = "{{input.userId}}";
        var input = JsonSerializer.Deserialize<JsonElement>("""{}""");

        // Act
        var result = _previewService.PreviewTemplate(templateString, input);

        // Assert
        result.Should().ContainKey("{{input.userId}}");
        result["{{input.userId}}"].Should().Be("<null>");
    }
}
