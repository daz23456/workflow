using FluentAssertions;
using Moq;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class WorkflowVersioningServiceTests
{
    private readonly Mock<IWorkflowVersionRepository> _mockVersionRepository;
    private readonly WorkflowVersioningService _service;

    public WorkflowVersioningServiceTests()
    {
        _mockVersionRepository = new Mock<IWorkflowVersionRepository>();
        _service = new WorkflowVersioningService(_mockVersionRepository.Object);
    }

    [Fact]
    public void CalculateVersionHash_WithIdenticalWorkflows_ShouldReturnSameHash()
    {
        // Arrange
        var workflow1 = CreateTestWorkflow("test-workflow");
        var workflow2 = CreateTestWorkflow("test-workflow");

        // Act
        var hash1 = _service.CalculateVersionHash(workflow1);
        var hash2 = _service.CalculateVersionHash(workflow2);

        // Assert
        hash1.Should().Be(hash2);
        hash1.Should().NotBeNullOrEmpty();
        hash1.Length.Should().Be(64); // SHA256 produces 64 hex characters
    }

    [Fact]
    public void CalculateVersionHash_WithDifferentWorkflows_ShouldReturnDifferentHashes()
    {
        // Arrange
        var workflow1 = CreateTestWorkflow("workflow1");
        var workflow2 = CreateTestWorkflow("workflow2");

        // Act
        var hash1 = _service.CalculateVersionHash(workflow1);
        var hash2 = _service.CalculateVersionHash(workflow2);

        // Assert
        hash1.Should().NotBe(hash2);
    }

    [Fact]
    public void CalculateVersionHash_WithModifiedTasks_ShouldReturnDifferentHash()
    {
        // Arrange
        var workflow1 = CreateTestWorkflow("test-workflow");
        var workflow2 = CreateTestWorkflow("test-workflow");
        workflow2.Spec.Tasks.Add(new WorkflowTaskStep { Id = "new-task", TaskRef = "new-task-ref" });

        // Act
        var hash1 = _service.CalculateVersionHash(workflow1);
        var hash2 = _service.CalculateVersionHash(workflow2);

        // Assert
        hash1.Should().NotBe(hash2);
    }

    [Fact]
    public async Task HasChangedAsync_WhenNoVersionExists_ShouldReturnTrue()
    {
        // Arrange
        var workflowName = "new-workflow";
        var currentHash = "abc123";

        _mockVersionRepository
            .Setup(r => r.GetLatestVersionAsync(workflowName))
            .ReturnsAsync((WorkflowVersion?)null);

        // Act
        var result = await _service.HasChangedAsync(workflowName, currentHash);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task HasChangedAsync_WhenHashMatches_ShouldReturnFalse()
    {
        // Arrange
        var workflowName = "existing-workflow";
        var currentHash = "abc123";

        _mockVersionRepository
            .Setup(r => r.GetLatestVersionAsync(workflowName))
            .ReturnsAsync(new WorkflowVersion
            {
                WorkflowName = workflowName,
                VersionHash = currentHash,
                CreatedAt = DateTime.UtcNow
            });

        // Act
        var result = await _service.HasChangedAsync(workflowName, currentHash);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task HasChangedAsync_WhenHashDiffers_ShouldReturnTrue()
    {
        // Arrange
        var workflowName = "existing-workflow";
        var currentHash = "newHash123";
        var oldHash = "oldHash456";

        _mockVersionRepository
            .Setup(r => r.GetLatestVersionAsync(workflowName))
            .ReturnsAsync(new WorkflowVersion
            {
                WorkflowName = workflowName,
                VersionHash = oldHash,
                CreatedAt = DateTime.UtcNow
            });

        // Act
        var result = await _service.HasChangedAsync(workflowName, currentHash);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task CreateVersionIfChangedAsync_WhenNoChanges_ShouldReturnFalseAndNotSave()
    {
        // Arrange
        var workflow = CreateTestWorkflow("test-workflow");
        var hash = _service.CalculateVersionHash(workflow);

        _mockVersionRepository
            .Setup(r => r.GetLatestVersionAsync(workflow.Metadata.Name))
            .ReturnsAsync(new WorkflowVersion
            {
                WorkflowName = workflow.Metadata.Name,
                VersionHash = hash,
                CreatedAt = DateTime.UtcNow
            });

        // Act
        var result = await _service.CreateVersionIfChangedAsync(workflow);

        // Assert
        result.Should().BeFalse();
        _mockVersionRepository.Verify(r => r.SaveVersionAsync(It.IsAny<WorkflowVersion>()), Times.Never);
    }

    [Fact]
    public async Task CreateVersionIfChangedAsync_WhenChanged_ShouldReturnTrueAndSaveVersion()
    {
        // Arrange
        var workflow = CreateTestWorkflow("test-workflow");
        var newHash = _service.CalculateVersionHash(workflow);

        _mockVersionRepository
            .Setup(r => r.GetLatestVersionAsync(workflow.Metadata.Name))
            .ReturnsAsync(new WorkflowVersion
            {
                WorkflowName = workflow.Metadata.Name,
                VersionHash = "oldHash",
                CreatedAt = DateTime.UtcNow
            });

        _mockVersionRepository
            .Setup(r => r.SaveVersionAsync(It.IsAny<WorkflowVersion>()))
            .ReturnsAsync((WorkflowVersion v) => v);

        // Act
        var result = await _service.CreateVersionIfChangedAsync(workflow);

        // Assert
        result.Should().BeTrue();
        _mockVersionRepository.Verify(r => r.SaveVersionAsync(
            It.Is<WorkflowVersion>(v =>
                v.WorkflowName == workflow.Metadata.Name &&
                v.VersionHash == newHash &&
                !string.IsNullOrEmpty(v.DefinitionSnapshot))),
            Times.Once);
    }

    [Fact]
    public async Task CreateVersionIfChangedAsync_WhenFirstVersion_ShouldReturnTrueAndSaveVersion()
    {
        // Arrange
        var workflow = CreateTestWorkflow("new-workflow");
        var hash = _service.CalculateVersionHash(workflow);

        _mockVersionRepository
            .Setup(r => r.GetLatestVersionAsync(workflow.Metadata.Name))
            .ReturnsAsync((WorkflowVersion?)null);

        _mockVersionRepository
            .Setup(r => r.SaveVersionAsync(It.IsAny<WorkflowVersion>()))
            .ReturnsAsync((WorkflowVersion v) => v);

        // Act
        var result = await _service.CreateVersionIfChangedAsync(workflow);

        // Assert
        result.Should().BeTrue();
        _mockVersionRepository.Verify(r => r.SaveVersionAsync(
            It.Is<WorkflowVersion>(v =>
                v.WorkflowName == workflow.Metadata.Name &&
                v.VersionHash == hash)),
            Times.Once);
    }

    [Fact]
    public void CalculateVersionHash_WithEmptyWorkflow_ShouldReturnConsistentHash()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "empty", Namespace = "default" },
            Spec = new WorkflowSpec()
        };

        // Act
        var hash1 = _service.CalculateVersionHash(workflow);
        var hash2 = _service.CalculateVersionHash(workflow);

        // Assert
        hash1.Should().Be(hash2);
        hash1.Should().NotBeNullOrEmpty();
    }

    private WorkflowResource CreateTestWorkflow(string name)
    {
        return new WorkflowResource
        {
            ApiVersion = "workflow.io/v1",
            Kind = "Workflow",
            Metadata = new ResourceMetadata
            {
                Name = name,
                Namespace = "default"
            },
            Spec = new WorkflowSpec
            {
                Input = new Dictionary<string, WorkflowInputParameter>
                {
                    ["userId"] = new WorkflowInputParameter { Type = "string", Required = true }
                },
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task1", TaskRef = "fetch-user" }
                }
            }
        };
    }
}
