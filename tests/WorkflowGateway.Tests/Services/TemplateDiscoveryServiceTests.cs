using FluentAssertions;
using Moq;
using WorkflowCore.Models;
using WorkflowGateway.Models;
using WorkflowGateway.Services;
using Xunit;

namespace WorkflowGateway.Tests.Services;

public class TemplateDiscoveryServiceTests
{
    private readonly Mock<IWorkflowDiscoveryService> _workflowDiscoveryMock;
    private readonly ITemplateDiscoveryService _service;

    public TemplateDiscoveryServiceTests()
    {
        _workflowDiscoveryMock = new Mock<IWorkflowDiscoveryService>();
        _service = new TemplateDiscoveryService(_workflowDiscoveryMock.Object);
    }

    [Fact]
    public async Task DiscoverTemplatesAsync_ShouldReturnOnlyWorkflowsMarkedAsTemplates()
    {
        // Arrange
        var workflows = new List<WorkflowResource>
        {
            CreateWorkflowWithTemplateAnnotation("template-simple-fetch", "api-composition", "beginner"),
            CreateRegularWorkflow("regular-workflow")
        };

        _workflowDiscoveryMock
            .Setup(x => x.DiscoverWorkflowsAsync(It.IsAny<string>()))
            .ReturnsAsync(workflows);

        // Act
        var result = await _service.DiscoverTemplatesAsync();

        // Assert
        result.Should().NotBeNull();
        result.Should().HaveCount(1);
        result[0].Name.Should().Be("template-simple-fetch");
    }

    [Fact]
    public async Task DiscoverTemplatesAsync_ShouldParseMetadataFromAnnotations()
    {
        // Arrange
        var workflow = CreateWorkflowWithTemplateAnnotation(
            name: "template-parallel-fetch",
            category: "api-composition",
            difficulty: "intermediate",
            tags: "parallel,http,api",
            estimatedTime: "10"
        );

        _workflowDiscoveryMock
            .Setup(x => x.DiscoverWorkflowsAsync(It.IsAny<string>()))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        // Act
        var result = await _service.DiscoverTemplatesAsync();

        // Assert
        result.Should().HaveCount(1);
        var template = result[0];
        template.Name.Should().Be("template-parallel-fetch");
        template.Category.Should().Be(TemplateCategory.ApiComposition);
        template.Difficulty.Should().Be(TemplateDifficulty.Intermediate);
        template.Tags.Should().BeEquivalentTo(new[] { "parallel", "http", "api" });
        template.EstimatedSetupTime.Should().Be(10);
    }

    [Fact]
    public async Task DiscoverTemplatesAsync_ShouldFilterByCategory()
    {
        // Arrange
        var workflows = new List<WorkflowResource>
        {
            CreateWorkflowWithTemplateAnnotation("template-api", "api-composition", "beginner"),
            CreateWorkflowWithTemplateAnnotation("template-data", "data-processing", "intermediate"),
            CreateWorkflowWithTemplateAnnotation("template-realtime", "real-time", "advanced")
        };

        _workflowDiscoveryMock
            .Setup(x => x.DiscoverWorkflowsAsync(It.IsAny<string>()))
            .ReturnsAsync(workflows);

        // Act
        var result = await _service.DiscoverTemplatesAsync(category: "api-composition");

        // Assert
        result.Should().HaveCount(1);
        result[0].Name.Should().Be("template-api");
        result[0].Category.Should().Be(TemplateCategory.ApiComposition);
    }

    [Fact]
    public async Task DiscoverTemplatesAsync_ShouldFilterByDifficulty()
    {
        // Arrange
        var workflows = new List<WorkflowResource>
        {
            CreateWorkflowWithTemplateAnnotation("template-easy", "api-composition", "beginner"),
            CreateWorkflowWithTemplateAnnotation("template-medium", "api-composition", "intermediate"),
            CreateWorkflowWithTemplateAnnotation("template-hard", "api-composition", "advanced")
        };

        _workflowDiscoveryMock
            .Setup(x => x.DiscoverWorkflowsAsync(It.IsAny<string>()))
            .ReturnsAsync(workflows);

        // Act
        var result = await _service.DiscoverTemplatesAsync(difficulty: "beginner");

        // Assert
        result.Should().HaveCount(1);
        result[0].Name.Should().Be("template-easy");
        result[0].Difficulty.Should().Be(TemplateDifficulty.Beginner);
    }

    [Fact]
    public async Task DiscoverTemplatesAsync_ShouldCombineCategoryAndDifficultyFilters()
    {
        // Arrange
        var workflows = new List<WorkflowResource>
        {
            CreateWorkflowWithTemplateAnnotation("template-api-easy", "api-composition", "beginner"),
            CreateWorkflowWithTemplateAnnotation("template-api-hard", "api-composition", "advanced"),
            CreateWorkflowWithTemplateAnnotation("template-data-easy", "data-processing", "beginner")
        };

        _workflowDiscoveryMock
            .Setup(x => x.DiscoverWorkflowsAsync(It.IsAny<string>()))
            .ReturnsAsync(workflows);

        // Act
        var result = await _service.DiscoverTemplatesAsync(category: "api-composition", difficulty: "beginner");

        // Assert
        result.Should().HaveCount(1);
        result[0].Name.Should().Be("template-api-easy");
    }

    [Fact]
    public async Task DiscoverTemplatesAsync_ShouldCalculateTaskCount()
    {
        // Arrange
        var workflow = CreateWorkflowWithTemplateAnnotation("template-multi-task", "api-composition", "intermediate");
        workflow.Spec.Tasks = new List<WorkflowTaskStep>
        {
            new WorkflowTaskStep { Id = "task-1", TaskRef = "fetch-user" },
            new WorkflowTaskStep { Id = "task-2", TaskRef = "enrich-data" },
            new WorkflowTaskStep { Id = "task-3", TaskRef = "save-result" }
        };

        _workflowDiscoveryMock
            .Setup(x => x.DiscoverWorkflowsAsync(It.IsAny<string>()))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        // Act
        var result = await _service.DiscoverTemplatesAsync();

        // Assert
        result[0].TaskCount.Should().Be(3);
    }

    [Fact]
    public async Task DiscoverTemplatesAsync_ShouldDetectParallelExecution()
    {
        // Arrange
        var workflow = CreateWorkflowWithTemplateAnnotation("template-parallel", "api-composition", "intermediate");
        workflow.Spec.Tasks = new List<WorkflowTaskStep>
        {
            new WorkflowTaskStep { Id = "task-1", TaskRef = "fetch-user" },
            new WorkflowTaskStep { Id = "task-2", TaskRef = "fetch-orders" }, // No dependencies = parallel
            new WorkflowTaskStep { Id = "task-3", TaskRef = "merge", DependsOn = new List<string> { "task-1", "task-2" } }
        };

        _workflowDiscoveryMock
            .Setup(x => x.DiscoverWorkflowsAsync(It.IsAny<string>()))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        // Act
        var result = await _service.DiscoverTemplatesAsync();

        // Assert
        result[0].HasParallelExecution.Should().BeTrue();
    }

    [Fact]
    public async Task DiscoverTemplatesAsync_ShouldReturnSequentialForTasksWithAllDependencies()
    {
        // Arrange
        var workflow = CreateWorkflowWithTemplateAnnotation("template-sequential", "api-composition", "beginner");
        workflow.Spec.Tasks = new List<WorkflowTaskStep>
        {
            new WorkflowTaskStep { Id = "task-1", TaskRef = "fetch-user" },
            new WorkflowTaskStep { Id = "task-2", TaskRef = "enrich", DependsOn = new List<string> { "task-1" } },
            new WorkflowTaskStep { Id = "task-3", TaskRef = "save", DependsOn = new List<string> { "task-2" } }
        };

        _workflowDiscoveryMock
            .Setup(x => x.DiscoverWorkflowsAsync(It.IsAny<string>()))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        // Act
        var result = await _service.DiscoverTemplatesAsync();

        // Assert
        result[0].HasParallelExecution.Should().BeFalse();
    }

    [Fact]
    public async Task GetTemplateByNameAsync_ShouldReturnTemplateWhenFound()
    {
        // Arrange
        var workflow = CreateWorkflowWithTemplateAnnotation("template-simple", "api-composition", "beginner");

        _workflowDiscoveryMock
            .Setup(x => x.GetWorkflowByNameAsync("template-simple", It.IsAny<string>()))
            .ReturnsAsync(workflow);

        // Act
        var result = await _service.GetTemplateByNameAsync("template-simple");

        // Assert
        result.Should().NotBeNull();
        result!.Name.Should().Be("template-simple");
        result.Category.Should().Be(TemplateCategory.ApiComposition);
    }

    [Fact]
    public async Task GetTemplateByNameAsync_ShouldReturnNullWhenWorkflowNotFound()
    {
        // Arrange
        _workflowDiscoveryMock
            .Setup(x => x.GetWorkflowByNameAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync((WorkflowResource?)null);

        // Act
        var result = await _service.GetTemplateByNameAsync("non-existent");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetTemplateByNameAsync_ShouldReturnNullWhenWorkflowNotTemplate()
    {
        // Arrange
        var workflow = CreateRegularWorkflow("regular-workflow");

        _workflowDiscoveryMock
            .Setup(x => x.GetWorkflowByNameAsync("regular-workflow", It.IsAny<string>()))
            .ReturnsAsync(workflow);

        // Act
        var result = await _service.GetTemplateByNameAsync("regular-workflow");

        // Assert
        result.Should().BeNull();
    }

    // Helper methods
    private static WorkflowResource CreateWorkflowWithTemplateAnnotation(
        string name,
        string category,
        string difficulty,
        string tags = "",
        string estimatedTime = "5")
    {
        return new WorkflowResource
        {
            Metadata = new ResourceMetadata
            {
                Name = name,
                Namespace = "default",
                Annotations = new Dictionary<string, string>
                {
                    ["workflow.example.com/template"] = "true",
                    ["workflow.example.com/category"] = category,
                    ["workflow.example.com/difficulty"] = difficulty,
                    ["workflow.example.com/tags"] = tags,
                    ["workflow.example.com/estimatedTime"] = estimatedTime
                }
            },
            Spec = new WorkflowSpec
            {
                Description = $"Template: {name}",
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "example-task" }
                }
            }
        };
    }

    private static WorkflowResource CreateRegularWorkflow(string name)
    {
        return new WorkflowResource
        {
            Metadata = new ResourceMetadata
            {
                Name = name,
                Namespace = "default",
                Annotations = new Dictionary<string, string>() // No template annotation
            },
            Spec = new WorkflowSpec
            {
                Description = $"Regular workflow: {name}",
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "example-task" }
                }
            }
        };
    }
}
