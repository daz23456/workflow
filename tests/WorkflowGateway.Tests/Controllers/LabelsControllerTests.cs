using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;
using WorkflowGateway.Controllers;
using WorkflowGateway.Models;
using WorkflowGateway.Services;

namespace WorkflowGateway.Tests.Controllers;

/// <summary>
/// Tests for LabelsController - Stage 32.2
/// </summary>
public class LabelsControllerTests
{
    private readonly Mock<ILabelRepository> _labelRepositoryMock;
    private readonly Mock<IWorkflowDiscoveryService> _discoveryServiceMock;
    private readonly Mock<ILabelSyncService> _syncServiceMock;
    private readonly Mock<ILogger<LabelsController>> _loggerMock;
    private readonly LabelsController _controller;

    public LabelsControllerTests()
    {
        _labelRepositoryMock = new Mock<ILabelRepository>();
        _discoveryServiceMock = new Mock<IWorkflowDiscoveryService>();
        _syncServiceMock = new Mock<ILabelSyncService>();
        _loggerMock = new Mock<ILogger<LabelsController>>();

        _controller = new LabelsController(
            _labelRepositoryMock.Object,
            _discoveryServiceMock.Object,
            _syncServiceMock.Object,
            _loggerMock.Object);
    }

    #region GET /api/v1/labels

    [Fact]
    public async Task GetLabels_ReturnsAllLabels_WithCounts()
    {
        // Arrange
        var labelStats = new LabelStatistics
        {
            Tags = new List<TagStatistic>
            {
                new() { Value = "production", WorkflowCount = 5, TaskCount = 3 },
                new() { Value = "v2", WorkflowCount = 2, TaskCount = 1 }
            },
            Categories = new List<CategoryStatistic>
            {
                new() { Value = "orders", WorkflowCount = 4 },
                new() { Value = "payments", WorkflowCount = 3 }
            }
        };

        _labelRepositoryMock.Setup(x => x.GetAllLabelsAsync())
            .ReturnsAsync(labelStats);

        // Act
        var result = await _controller.GetLabels();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<LabelListResponse>().Subject;

        response.Tags.Should().HaveCount(2);
        response.Tags[0].Value.Should().Be("production");
        response.Tags[0].WorkflowCount.Should().Be(5);
        response.Tags[0].TaskCount.Should().Be(3);

        response.Categories.Should().HaveCount(2);
        response.Categories[0].Value.Should().Be("orders");
        response.Categories[0].WorkflowCount.Should().Be(4);
    }

    [Fact]
    public async Task GetLabels_WithEmptyLabels_ReturnsEmptyLists()
    {
        // Arrange
        var emptyStats = new LabelStatistics
        {
            Tags = new List<TagStatistic>(),
            Categories = new List<CategoryStatistic>()
        };

        _labelRepositoryMock.Setup(x => x.GetAllLabelsAsync())
            .ReturnsAsync(emptyStats);

        // Act
        var result = await _controller.GetLabels();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<LabelListResponse>().Subject;

        response.Tags.Should().BeEmpty();
        response.Categories.Should().BeEmpty();
    }

    #endregion

    #region GET /api/v1/labels/stats

    [Fact]
    public async Task GetLabelStats_ReturnsStatistics()
    {
        // Arrange
        var workflowLabels = new List<WorkflowLabelEntity>
        {
            new() { WorkflowName = "wf1", Tags = new List<string> { "tag1" }, Categories = new List<string> { "cat1" } },
            new() { WorkflowName = "wf2", Tags = new List<string> { "tag1", "tag2" }, Categories = new List<string>() }
        };

        var taskLabels = new List<TaskLabelEntity>
        {
            new() { TaskName = "task1", Tags = new List<string> { "tag1" }, Category = "http" }
        };

        _labelRepositoryMock.Setup(x => x.GetWorkflowsByTagsAsync(It.IsAny<IEnumerable<string>>(), false, null))
            .ReturnsAsync(workflowLabels);

        _labelRepositoryMock.Setup(x => x.GetTasksByTagsAsync(It.IsAny<IEnumerable<string>>(), false, null))
            .ReturnsAsync(taskLabels);

        _labelRepositoryMock.Setup(x => x.GetAllLabelsAsync())
            .ReturnsAsync(new LabelStatistics
            {
                Tags = new List<TagStatistic>
                {
                    new() { Value = "tag1", WorkflowCount = 2, TaskCount = 1 },
                    new() { Value = "tag2", WorkflowCount = 1, TaskCount = 0 }
                },
                Categories = new List<CategoryStatistic>
                {
                    new() { Value = "cat1", WorkflowCount = 1 }
                }
            });

        // Act
        var result = await _controller.GetLabelStats();

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<LabelStatsResponse>().Subject;

        response.TotalTags.Should().Be(2);
        response.TotalCategories.Should().Be(1);
        response.TopTags.Should().NotBeEmpty();
    }

    #endregion

    #region PATCH /api/v1/workflows/{name}/labels

    [Fact]
    public async Task UpdateWorkflowLabels_AddsTags_Successfully()
    {
        // Arrange
        var workflowName = "test-workflow";
        var request = new UpdateLabelsRequest
        {
            AddTags = new List<string> { "new-tag" }
        };

        var existingLabel = new WorkflowLabelEntity
        {
            WorkflowName = workflowName,
            Namespace = "default",
            Tags = new List<string> { "existing-tag" },
            Categories = new List<string>()
        };

        _labelRepositoryMock.Setup(x => x.GetWorkflowsByTagsAsync(It.IsAny<IEnumerable<string>>(), false, null))
            .ReturnsAsync(new List<WorkflowLabelEntity> { existingLabel });

        _labelRepositoryMock.Setup(x => x.SaveWorkflowLabelsAsync(It.IsAny<WorkflowLabelEntity>()))
            .ReturnsAsync((WorkflowLabelEntity e) => e);

        // Act
        var result = await _controller.UpdateWorkflowLabels(workflowName, request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<UpdateLabelsResponse>().Subject;

        response.Success.Should().BeTrue();
        response.EntityName.Should().Be(workflowName);
        response.CurrentTags.Should().Contain("existing-tag");
        response.CurrentTags.Should().Contain("new-tag");
    }

    [Fact]
    public async Task UpdateWorkflowLabels_RemovesTags_Successfully()
    {
        // Arrange
        var workflowName = "test-workflow";
        var request = new UpdateLabelsRequest
        {
            RemoveTags = new List<string> { "old-tag" }
        };

        var existingLabel = new WorkflowLabelEntity
        {
            WorkflowName = workflowName,
            Namespace = "default",
            Tags = new List<string> { "old-tag", "keep-tag" },
            Categories = new List<string>()
        };

        _labelRepositoryMock.Setup(x => x.GetWorkflowsByTagsAsync(It.IsAny<IEnumerable<string>>(), false, null))
            .ReturnsAsync(new List<WorkflowLabelEntity> { existingLabel });

        _labelRepositoryMock.Setup(x => x.SaveWorkflowLabelsAsync(It.IsAny<WorkflowLabelEntity>()))
            .ReturnsAsync((WorkflowLabelEntity e) => e);

        // Act
        var result = await _controller.UpdateWorkflowLabels(workflowName, request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<UpdateLabelsResponse>().Subject;

        response.Success.Should().BeTrue();
        response.CurrentTags.Should().NotContain("old-tag");
        response.CurrentTags.Should().Contain("keep-tag");
    }

    [Fact]
    public async Task UpdateWorkflowLabels_WorkflowNotFound_ReturnsNotFound()
    {
        // Arrange
        var workflowName = "non-existent";
        var request = new UpdateLabelsRequest { AddTags = new List<string> { "tag" } };

        _labelRepositoryMock.Setup(x => x.GetWorkflowsByTagsAsync(It.IsAny<IEnumerable<string>>(), false, null))
            .ReturnsAsync(new List<WorkflowLabelEntity>());

        // Act
        var result = await _controller.UpdateWorkflowLabels(workflowName, request);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task UpdateWorkflowLabels_AddsCategories_Successfully()
    {
        // Arrange
        var workflowName = "test-workflow";
        var request = new UpdateLabelsRequest
        {
            AddCategories = new List<string> { "orders" }
        };

        var existingLabel = new WorkflowLabelEntity
        {
            WorkflowName = workflowName,
            Namespace = "default",
            Tags = new List<string>(),
            Categories = new List<string>()
        };

        _labelRepositoryMock.Setup(x => x.GetWorkflowsByTagsAsync(It.IsAny<IEnumerable<string>>(), false, null))
            .ReturnsAsync(new List<WorkflowLabelEntity> { existingLabel });

        _labelRepositoryMock.Setup(x => x.SaveWorkflowLabelsAsync(It.IsAny<WorkflowLabelEntity>()))
            .ReturnsAsync((WorkflowLabelEntity e) => e);

        // Act
        var result = await _controller.UpdateWorkflowLabels(workflowName, request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<UpdateLabelsResponse>().Subject;

        response.Success.Should().BeTrue();
        response.CurrentCategories.Should().Contain("orders");
    }

    #endregion

    #region PATCH /api/v1/tasks/{name}/labels

    [Fact]
    public async Task UpdateTaskLabels_AddsTags_Successfully()
    {
        // Arrange
        var taskName = "test-task";
        var request = new UpdateLabelsRequest
        {
            AddTags = new List<string> { "new-tag" }
        };

        var existingLabel = new TaskLabelEntity
        {
            TaskName = taskName,
            Namespace = "default",
            Tags = new List<string> { "existing-tag" },
            Category = "http"
        };

        _labelRepositoryMock.Setup(x => x.GetTasksByTagsAsync(It.IsAny<IEnumerable<string>>(), false, null))
            .ReturnsAsync(new List<TaskLabelEntity> { existingLabel });

        _labelRepositoryMock.Setup(x => x.SaveTaskLabelsAsync(It.IsAny<TaskLabelEntity>()))
            .ReturnsAsync((TaskLabelEntity e) => e);

        // Act
        var result = await _controller.UpdateTaskLabels(taskName, request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<UpdateLabelsResponse>().Subject;

        response.Success.Should().BeTrue();
        response.EntityName.Should().Be(taskName);
        response.CurrentTags.Should().Contain("new-tag");
    }

    [Fact]
    public async Task UpdateTaskLabels_TaskNotFound_ReturnsNotFound()
    {
        // Arrange
        var taskName = "non-existent";
        var request = new UpdateLabelsRequest { AddTags = new List<string> { "tag" } };

        _labelRepositoryMock.Setup(x => x.GetTasksByTagsAsync(It.IsAny<IEnumerable<string>>(), false, null))
            .ReturnsAsync(new List<TaskLabelEntity>());

        // Act
        var result = await _controller.UpdateTaskLabels(taskName, request);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region POST /api/v1/workflows/labels/bulk

    [Fact]
    public async Task BulkUpdateWorkflowLabels_AddsTagsToMultiple_Successfully()
    {
        // Arrange
        var request = new BulkLabelsRequest
        {
            EntityNames = new List<string> { "wf1", "wf2" },
            AddTags = new List<string> { "bulk-tag" }
        };

        var existingLabels = new List<WorkflowLabelEntity>
        {
            new() { WorkflowName = "wf1", Tags = new List<string>(), Categories = new List<string>() },
            new() { WorkflowName = "wf2", Tags = new List<string>(), Categories = new List<string>() }
        };

        _labelRepositoryMock.Setup(x => x.GetWorkflowsByTagsAsync(It.IsAny<IEnumerable<string>>(), false, null))
            .ReturnsAsync(existingLabels);

        _labelRepositoryMock.Setup(x => x.SaveWorkflowLabelsAsync(It.IsAny<WorkflowLabelEntity>()))
            .ReturnsAsync((WorkflowLabelEntity e) => e);

        // Act
        var result = await _controller.BulkUpdateWorkflowLabels(request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<BulkLabelsResponse>().Subject;

        response.Success.Should().BeTrue();
        response.AffectedEntities.Should().Be(2);
        response.Changes.Should().HaveCount(2);
    }

    [Fact]
    public async Task BulkUpdateWorkflowLabels_DryRun_DoesNotSave()
    {
        // Arrange
        var request = new BulkLabelsRequest
        {
            EntityNames = new List<string> { "wf1" },
            AddTags = new List<string> { "bulk-tag" },
            DryRun = true
        };

        var existingLabels = new List<WorkflowLabelEntity>
        {
            new() { WorkflowName = "wf1", Tags = new List<string>(), Categories = new List<string>() }
        };

        _labelRepositoryMock.Setup(x => x.GetWorkflowsByTagsAsync(It.IsAny<IEnumerable<string>>(), false, null))
            .ReturnsAsync(existingLabels);

        // Act
        var result = await _controller.BulkUpdateWorkflowLabels(request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<BulkLabelsResponse>().Subject;

        response.Success.Should().BeTrue();
        response.IsDryRun.Should().BeTrue();
        response.Changes.Should().HaveCount(1);

        // Verify SaveWorkflowLabelsAsync was never called
        _labelRepositoryMock.Verify(x => x.SaveWorkflowLabelsAsync(It.IsAny<WorkflowLabelEntity>()), Times.Never);
    }

    [Fact]
    public async Task BulkUpdateWorkflowLabels_EmptyEntityNames_ReturnsBadRequest()
    {
        // Arrange
        var request = new BulkLabelsRequest
        {
            EntityNames = new List<string>(),
            AddTags = new List<string> { "tag" }
        };

        // Act
        var result = await _controller.BulkUpdateWorkflowLabels(request);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task BulkUpdateWorkflowLabels_NoOperations_ReturnsBadRequest()
    {
        // Arrange
        var request = new BulkLabelsRequest
        {
            EntityNames = new List<string> { "wf1" }
            // No add/remove operations specified
        };

        // Act
        var result = await _controller.BulkUpdateWorkflowLabels(request);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    #endregion

    #region POST /api/v1/tasks/labels/bulk

    [Fact]
    public async Task BulkUpdateTaskLabels_AddsTagsToMultiple_Successfully()
    {
        // Arrange
        var request = new BulkLabelsRequest
        {
            EntityNames = new List<string> { "task1", "task2" },
            AddTags = new List<string> { "bulk-tag" }
        };

        var existingLabels = new List<TaskLabelEntity>
        {
            new() { TaskName = "task1", Tags = new List<string>() },
            new() { TaskName = "task2", Tags = new List<string>() }
        };

        _labelRepositoryMock.Setup(x => x.GetTasksByTagsAsync(It.IsAny<IEnumerable<string>>(), false, null))
            .ReturnsAsync(existingLabels);

        _labelRepositoryMock.Setup(x => x.SaveTaskLabelsAsync(It.IsAny<TaskLabelEntity>()))
            .ReturnsAsync((TaskLabelEntity e) => e);

        // Act
        var result = await _controller.BulkUpdateTaskLabels(request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<BulkLabelsResponse>().Subject;

        response.Success.Should().BeTrue();
        response.AffectedEntities.Should().Be(2);
    }

    #endregion

    #region Extended workflow filtering tests

    [Fact]
    public async Task GetWorkflowsByTags_ReturnsMatchingWorkflows()
    {
        // Arrange
        var matchingLabels = new List<WorkflowLabelEntity>
        {
            new() { WorkflowName = "wf1", Tags = new List<string> { "production" } },
            new() { WorkflowName = "wf2", Tags = new List<string> { "production", "v2" } }
        };

        _labelRepositoryMock.Setup(x => x.GetWorkflowsByTagsAsync(
                It.Is<IEnumerable<string>>(t => t.Contains("production")),
                false,
                null))
            .ReturnsAsync(matchingLabels);

        // Act
        var result = await _controller.GetWorkflowsByTags(
            tags: "production",
            matchAllTags: false);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value as List<WorkflowLabelEntity>;
        response.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetWorkflowsByTags_WithMatchAll_ReturnsOnlyFullMatches()
    {
        // Arrange
        var matchingLabels = new List<WorkflowLabelEntity>
        {
            new() { WorkflowName = "wf2", Tags = new List<string> { "production", "v2" } }
        };

        _labelRepositoryMock.Setup(x => x.GetWorkflowsByTagsAsync(
                It.IsAny<IEnumerable<string>>(),
                true,
                null))
            .ReturnsAsync(matchingLabels);

        // Act
        var result = await _controller.GetWorkflowsByTags(
            tags: "production,v2",
            matchAllTags: true);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value as List<WorkflowLabelEntity>;
        response.Should().HaveCount(1);
        response![0].WorkflowName.Should().Be("wf2");
    }

    [Fact]
    public async Task GetWorkflowsByCategories_ReturnsMatchingWorkflows()
    {
        // Arrange
        var matchingLabels = new List<WorkflowLabelEntity>
        {
            new() { WorkflowName = "wf1", Categories = new List<string> { "orders" } }
        };

        _labelRepositoryMock.Setup(x => x.GetWorkflowsByCategoriesAsync(
                It.Is<IEnumerable<string>>(c => c.Contains("orders")),
                null))
            .ReturnsAsync(matchingLabels);

        // Act
        var result = await _controller.GetWorkflowsByCategories(categories: "orders");

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value as List<WorkflowLabelEntity>;
        response.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetTasksByTags_ReturnsMatchingTasks()
    {
        // Arrange
        var matchingLabels = new List<TaskLabelEntity>
        {
            new() { TaskName = "task1", Tags = new List<string> { "api" } }
        };

        _labelRepositoryMock.Setup(x => x.GetTasksByTagsAsync(
                It.Is<IEnumerable<string>>(t => t.Contains("api")),
                false,
                null))
            .ReturnsAsync(matchingLabels);

        // Act
        var result = await _controller.GetTasksByTags(tags: "api");

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value as List<TaskLabelEntity>;
        response.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetTasksByCategory_ReturnsMatchingTasks()
    {
        // Arrange
        var matchingLabels = new List<TaskLabelEntity>
        {
            new() { TaskName = "task1", Category = "http" }
        };

        _labelRepositoryMock.Setup(x => x.GetTasksByCategoryAsync("http", null))
            .ReturnsAsync(matchingLabels);

        // Act
        var result = await _controller.GetTasksByCategory(category: "http");

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value as List<TaskLabelEntity>;
        response.Should().HaveCount(1);
    }

    #endregion

    #region Namespace filtering tests

    [Fact]
    public async Task GetWorkflowsByTags_WithNamespace_FiltersCorrectly()
    {
        // Arrange
        var matchingLabels = new List<WorkflowLabelEntity>
        {
            new() { WorkflowName = "wf1", Namespace = "production", Tags = new List<string> { "tag1" } }
        };

        _labelRepositoryMock.Setup(x => x.GetWorkflowsByTagsAsync(
                It.IsAny<IEnumerable<string>>(),
                false,
                "production"))
            .ReturnsAsync(matchingLabels);

        // Act
        var result = await _controller.GetWorkflowsByTags(
            tags: "tag1",
            @namespace: "production");

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value as List<WorkflowLabelEntity>;
        response.Should().HaveCount(1);
        response![0].Namespace.Should().Be("production");
    }

    #endregion

    #region Additional edge case tests

    [Fact]
    public async Task UpdateWorkflowLabels_WithDuplicateTags_OnlyAddsOnce()
    {
        // Arrange
        var workflowName = "test-workflow";
        var request = new UpdateLabelsRequest
        {
            AddTags = new List<string> { "tag1", "tag1" } // Duplicate in request
        };

        var existingLabel = new WorkflowLabelEntity
        {
            WorkflowName = workflowName,
            Namespace = "default",
            Tags = new List<string> { "tag1" }, // Already has tag1
            Categories = new List<string>()
        };

        _labelRepositoryMock.Setup(x => x.GetWorkflowsByTagsAsync(It.IsAny<IEnumerable<string>>(), false, null))
            .ReturnsAsync(new List<WorkflowLabelEntity> { existingLabel });

        _labelRepositoryMock.Setup(x => x.SaveWorkflowLabelsAsync(It.IsAny<WorkflowLabelEntity>()))
            .ReturnsAsync((WorkflowLabelEntity e) => e);

        // Act
        var result = await _controller.UpdateWorkflowLabels(workflowName, request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<UpdateLabelsResponse>().Subject;

        response.Success.Should().BeTrue();
        response.CurrentTags.Count(t => t == "tag1").Should().Be(1); // Only one tag1
    }

    [Fact]
    public async Task BulkUpdateWorkflowLabels_RemovesAndAddsTags_InSameRequest()
    {
        // Arrange
        var request = new BulkLabelsRequest
        {
            EntityNames = new List<string> { "wf1" },
            AddTags = new List<string> { "new-tag" },
            RemoveTags = new List<string> { "old-tag" }
        };

        var existingLabels = new List<WorkflowLabelEntity>
        {
            new() { WorkflowName = "wf1", Tags = new List<string> { "old-tag" }, Categories = new List<string>() }
        };

        _labelRepositoryMock.Setup(x => x.GetWorkflowsByTagsAsync(It.IsAny<IEnumerable<string>>(), false, null))
            .ReturnsAsync(existingLabels);

        _labelRepositoryMock.Setup(x => x.SaveWorkflowLabelsAsync(It.IsAny<WorkflowLabelEntity>()))
            .ReturnsAsync((WorkflowLabelEntity e) => e);

        // Act
        var result = await _controller.BulkUpdateWorkflowLabels(request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<BulkLabelsResponse>().Subject;

        response.Success.Should().BeTrue();
        response.Changes[0].AddedTags.Should().Contain("new-tag");
        response.Changes[0].RemovedTags.Should().Contain("old-tag");
    }

    [Fact]
    public async Task BulkUpdateWorkflowLabels_PartialMatch_OnlyUpdatesExisting()
    {
        // Arrange
        var request = new BulkLabelsRequest
        {
            EntityNames = new List<string> { "wf1", "wf-not-exists" },
            AddTags = new List<string> { "tag" }
        };

        var existingLabels = new List<WorkflowLabelEntity>
        {
            new() { WorkflowName = "wf1", Tags = new List<string>(), Categories = new List<string>() }
            // wf-not-exists is not in the list
        };

        _labelRepositoryMock.Setup(x => x.GetWorkflowsByTagsAsync(It.IsAny<IEnumerable<string>>(), false, null))
            .ReturnsAsync(existingLabels);

        _labelRepositoryMock.Setup(x => x.SaveWorkflowLabelsAsync(It.IsAny<WorkflowLabelEntity>()))
            .ReturnsAsync((WorkflowLabelEntity e) => e);

        // Act
        var result = await _controller.BulkUpdateWorkflowLabels(request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<BulkLabelsResponse>().Subject;

        response.Success.Should().BeTrue();
        response.AffectedEntities.Should().Be(1); // Only wf1 was updated
    }

    [Fact]
    public async Task GetWorkflowsByTags_WithMultipleTags_ParsesCorrectly()
    {
        // Arrange
        var matchingLabels = new List<WorkflowLabelEntity>
        {
            new() { WorkflowName = "wf1", Tags = new List<string> { "tag1", "tag2", "tag3" } }
        };

        _labelRepositoryMock.Setup(x => x.GetWorkflowsByTagsAsync(
                It.Is<IEnumerable<string>>(t => t.Count() == 3),
                false,
                null))
            .ReturnsAsync(matchingLabels);

        // Act - comma-separated with spaces
        var result = await _controller.GetWorkflowsByTags(tags: "tag1, tag2, tag3");

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value as List<WorkflowLabelEntity>;
        response.Should().HaveCount(1);
    }

    [Fact]
    public async Task UpdateTaskLabels_RemovesTags_Successfully()
    {
        // Arrange
        var taskName = "test-task";
        var request = new UpdateLabelsRequest
        {
            RemoveTags = new List<string> { "old-tag" }
        };

        var existingLabel = new TaskLabelEntity
        {
            TaskName = taskName,
            Namespace = "default",
            Tags = new List<string> { "old-tag", "keep-tag" },
            Category = "http"
        };

        _labelRepositoryMock.Setup(x => x.GetTasksByTagsAsync(It.IsAny<IEnumerable<string>>(), false, null))
            .ReturnsAsync(new List<TaskLabelEntity> { existingLabel });

        _labelRepositoryMock.Setup(x => x.SaveTaskLabelsAsync(It.IsAny<TaskLabelEntity>()))
            .ReturnsAsync((TaskLabelEntity e) => e);

        // Act
        var result = await _controller.UpdateTaskLabels(taskName, request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<UpdateLabelsResponse>().Subject;

        response.Success.Should().BeTrue();
        response.CurrentTags.Should().NotContain("old-tag");
        response.CurrentTags.Should().Contain("keep-tag");
    }

    #endregion
}
