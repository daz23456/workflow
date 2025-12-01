using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using WorkflowGateway.Controllers;
using WorkflowGateway.Models;
using WorkflowGateway.Services;
using Xunit;

namespace WorkflowGateway.Tests.Controllers;

public class TemplateControllerTests
{
    private readonly Mock<ITemplateDiscoveryService> _templateDiscoveryMock;
    private readonly TemplateController _controller;

    public TemplateControllerTests()
    {
        _templateDiscoveryMock = new Mock<ITemplateDiscoveryService>();
        _controller = new TemplateController(_templateDiscoveryMock.Object);
    }

    [Fact]
    public void Constructor_WithNullTemplateDiscoveryService_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => new TemplateController(null!));
    }

    [Fact]
    public async Task GetTemplates_ShouldReturnAllTemplates()
    {
        // Arrange
        var templates = new List<TemplateMetadata>
        {
            new TemplateMetadata
            {
                Name = "template-simple-fetch",
                Category = TemplateCategory.ApiComposition,
                Difficulty = TemplateDifficulty.Beginner,
                Description = "Simple API fetch"
            },
            new TemplateMetadata
            {
                Name = "template-parallel-fetch",
                Category = TemplateCategory.ApiComposition,
                Difficulty = TemplateDifficulty.Intermediate,
                Description = "Parallel API fetch"
            }
        };

        _templateDiscoveryMock
            .Setup(x => x.DiscoverTemplatesAsync(null, null, null))
            .ReturnsAsync(templates);

        // Act
        var result = await _controller.GetTemplates();

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as TemplateListResponse;

        response.Should().NotBeNull();
        response!.Templates.Should().HaveCount(2);
        response.TotalCount.Should().Be(2);
    }

    [Fact]
    public async Task GetTemplates_WithCategoryFilter_ShouldPassCategoryToService()
    {
        // Arrange
        var templates = new List<TemplateMetadata>
        {
            new TemplateMetadata
            {
                Name = "template-api",
                Category = TemplateCategory.ApiComposition,
                Difficulty = TemplateDifficulty.Beginner
            }
        };

        _templateDiscoveryMock
            .Setup(x => x.DiscoverTemplatesAsync(null, "api-composition", null))
            .ReturnsAsync(templates);

        // Act
        var result = await _controller.GetTemplates(category: "api-composition");

        // Assert
        _templateDiscoveryMock.Verify(x => x.DiscoverTemplatesAsync(null, "api-composition", null), Times.Once);
        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task GetTemplates_WithDifficultyFilter_ShouldPassDifficultyToService()
    {
        // Arrange
        var templates = new List<TemplateMetadata>
        {
            new TemplateMetadata
            {
                Name = "template-beginner",
                Category = TemplateCategory.ApiComposition,
                Difficulty = TemplateDifficulty.Beginner
            }
        };

        _templateDiscoveryMock
            .Setup(x => x.DiscoverTemplatesAsync(null, null, "beginner"))
            .ReturnsAsync(templates);

        // Act
        var result = await _controller.GetTemplates(difficulty: "beginner");

        // Assert
        _templateDiscoveryMock.Verify(x => x.DiscoverTemplatesAsync(null, null, "beginner"), Times.Once);
        result.Should().BeOfType<OkObjectResult>();
    }

    [Fact]
    public async Task GetTemplates_WithBothFilters_ShouldPassBothToService()
    {
        // Arrange
        var templates = new List<TemplateMetadata>();

        _templateDiscoveryMock
            .Setup(x => x.DiscoverTemplatesAsync(null, "data-processing", "advanced"))
            .ReturnsAsync(templates);

        // Act
        var result = await _controller.GetTemplates(category: "data-processing", difficulty: "advanced");

        // Assert
        _templateDiscoveryMock.Verify(x => x.DiscoverTemplatesAsync(null, "data-processing", "advanced"), Times.Once);
    }

    [Fact]
    public async Task GetTemplateDetail_WhenTemplateExists_ShouldReturnTemplateDetails()
    {
        // Arrange
        var template = new TemplateMetadata
        {
            Name = "template-simple-fetch",
            Category = TemplateCategory.ApiComposition,
            Difficulty = TemplateDifficulty.Beginner,
            Description = "Simple API fetch",
            Tags = new List<string> { "http", "api" },
            EstimatedSetupTime = 5,
            TaskCount = 1,
            HasParallelExecution = false,
            YamlDefinition = "apiVersion: workflow.example.com/v1\nkind: Workflow"
        };

        _templateDiscoveryMock
            .Setup(x => x.GetTemplateByNameAsync("template-simple-fetch", null))
            .ReturnsAsync(template);

        // Act
        var result = await _controller.GetTemplateDetail("template-simple-fetch");

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as TemplateDetailResponse;

        response.Should().NotBeNull();
        response!.Metadata.Name.Should().Be("template-simple-fetch");
        response.YamlDefinition.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task GetTemplateDetail_WhenTemplateNotFound_ShouldReturn404()
    {
        // Arrange
        _templateDiscoveryMock
            .Setup(x => x.GetTemplateByNameAsync("non-existent", null))
            .ReturnsAsync((TemplateMetadata?)null);

        // Act
        var result = await _controller.GetTemplateDetail("non-existent");

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task GetTemplates_ShouldMapTemplateMetadataToTemplateSummary()
    {
        // Arrange
        var templates = new List<TemplateMetadata>
        {
            new TemplateMetadata
            {
                Name = "template-1",
                Category = TemplateCategory.ApiComposition,
                Difficulty = TemplateDifficulty.Beginner,
                Description = "Test template",
                Tags = new List<string> { "http", "api" },
                EstimatedSetupTime = 5,
                TaskCount = 3,
                HasParallelExecution = true
            }
        };

        _templateDiscoveryMock
            .Setup(x => x.DiscoverTemplatesAsync(null, null, null))
            .ReturnsAsync(templates);

        // Act
        var result = await _controller.GetTemplates();

        // Assert
        var okResult = result as OkObjectResult;
        var response = okResult!.Value as TemplateListResponse;

        var summary = response!.Templates[0];
        summary.Name.Should().Be("template-1");
        summary.Category.Should().Be(TemplateCategory.ApiComposition);
        summary.Difficulty.Should().Be(TemplateDifficulty.Beginner);
        summary.Description.Should().Be("Test template");
        summary.Tags.Should().BeEquivalentTo(new[] { "http", "api" });
        summary.EstimatedSetupTime.Should().Be(5);
        summary.TaskCount.Should().Be(3);
        summary.HasParallelExecution.Should().BeTrue();
    }
}
