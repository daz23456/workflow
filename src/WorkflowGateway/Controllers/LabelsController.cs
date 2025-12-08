using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;
using WorkflowGateway.Models;
using WorkflowGateway.Services;

namespace WorkflowGateway.Controllers;

/// <summary>
/// Controller for managing workflow and task labels (tags and categories).
/// Stage 32.2 - Backend Label API
/// </summary>
[ApiController]
[Route("api/v1")]
public class LabelsController : ControllerBase
{
    private readonly ILabelRepository _labelRepository;
    private readonly IWorkflowDiscoveryService _discoveryService;
    private readonly ILabelSyncService _syncService;
    private readonly ILogger<LabelsController> _logger;

    public LabelsController(
        ILabelRepository labelRepository,
        IWorkflowDiscoveryService discoveryService,
        ILabelSyncService syncService,
        ILogger<LabelsController> logger)
    {
        _labelRepository = labelRepository ?? throw new ArgumentNullException(nameof(labelRepository));
        _discoveryService = discoveryService ?? throw new ArgumentNullException(nameof(discoveryService));
        _syncService = syncService ?? throw new ArgumentNullException(nameof(syncService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Get all labels with usage counts.
    /// </summary>
    [HttpGet("labels")]
    [ProducesResponseType(typeof(LabelListResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLabels()
    {
        _logger.LogDebug("Getting all labels");

        var stats = await _labelRepository.GetAllLabelsAsync();

        var response = new LabelListResponse
        {
            Tags = stats.Tags.Select(t => new TagInfo
            {
                Value = t.Value,
                WorkflowCount = t.WorkflowCount,
                TaskCount = t.TaskCount
            }).ToList(),
            Categories = stats.Categories.Select(c => new CategoryInfo
            {
                Value = c.Value,
                WorkflowCount = c.WorkflowCount
            }).ToList()
        };

        return Ok(response);
    }

    /// <summary>
    /// Get label statistics and analytics.
    /// </summary>
    [HttpGet("labels/stats")]
    [ProducesResponseType(typeof(LabelStatsResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetLabelStats()
    {
        _logger.LogDebug("Getting label statistics");

        var allWorkflows = await _labelRepository.GetWorkflowsByTagsAsync(Array.Empty<string>(), false, null);
        var allTasks = await _labelRepository.GetTasksByTagsAsync(Array.Empty<string>(), false, null);
        var stats = await _labelRepository.GetAllLabelsAsync();

        var response = new LabelStatsResponse
        {
            TotalTags = stats.Tags.Count,
            TotalCategories = stats.Categories.Count,
            WorkflowsWithTags = allWorkflows.Count(w => w.Tags.Any()),
            WorkflowsWithCategories = allWorkflows.Count(w => w.Categories.Any()),
            TasksWithTags = allTasks.Count(t => t.Tags.Any()),
            TasksWithCategories = allTasks.Count(t => !string.IsNullOrEmpty(t.Category)),
            TopTags = stats.Tags.Take(10).Select(t => new TagInfo
            {
                Value = t.Value,
                WorkflowCount = t.WorkflowCount,
                TaskCount = t.TaskCount
            }).ToList(),
            TopCategories = stats.Categories.Take(10).Select(c => new CategoryInfo
            {
                Value = c.Value,
                WorkflowCount = c.WorkflowCount
            }).ToList()
        };

        return Ok(response);
    }

    /// <summary>
    /// Update labels for a specific workflow.
    /// </summary>
    [HttpPatch("workflows/{name}/labels")]
    [ProducesResponseType(typeof(UpdateLabelsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateWorkflowLabels(
        [FromRoute] string name,
        [FromBody] UpdateLabelsRequest request)
    {
        _logger.LogInformation("Updating labels for workflow: {WorkflowName}", name);

        // Find the workflow label entity
        var allLabels = await _labelRepository.GetWorkflowsByTagsAsync(Array.Empty<string>(), false, null);
        var existingLabel = allLabels.FirstOrDefault(l => l.WorkflowName == name);

        if (existingLabel == null)
        {
            return NotFound(new { error = $"Workflow '{name}' not found" });
        }

        // Apply tag changes
        var newTags = existingLabel.Tags.ToList();
        if (request.AddTags?.Any() == true)
        {
            newTags.AddRange(request.AddTags.Where(t => !newTags.Contains(t, StringComparer.OrdinalIgnoreCase)));
        }
        if (request.RemoveTags?.Any() == true)
        {
            newTags = newTags.Where(t => !request.RemoveTags.Contains(t, StringComparer.OrdinalIgnoreCase)).ToList();
        }

        // Apply category changes
        var newCategories = existingLabel.Categories.ToList();
        if (request.AddCategories?.Any() == true)
        {
            newCategories.AddRange(request.AddCategories.Where(c => !newCategories.Contains(c, StringComparer.OrdinalIgnoreCase)));
        }
        if (request.RemoveCategories?.Any() == true)
        {
            newCategories = newCategories.Where(c => !request.RemoveCategories.Contains(c, StringComparer.OrdinalIgnoreCase)).ToList();
        }

        // Update entity
        existingLabel.Tags = newTags;
        existingLabel.Categories = newCategories;
        existingLabel.SyncedAt = DateTime.UtcNow;

        await _labelRepository.SaveWorkflowLabelsAsync(existingLabel);

        return Ok(new UpdateLabelsResponse
        {
            Success = true,
            EntityName = name,
            CurrentTags = newTags,
            CurrentCategories = newCategories,
            Message = "Labels updated successfully"
        });
    }

    /// <summary>
    /// Update labels for a specific task.
    /// </summary>
    [HttpPatch("tasks/{name}/labels")]
    [ProducesResponseType(typeof(UpdateLabelsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateTaskLabels(
        [FromRoute] string name,
        [FromBody] UpdateLabelsRequest request)
    {
        _logger.LogInformation("Updating labels for task: {TaskName}", name);

        // Find the task label entity
        var allLabels = await _labelRepository.GetTasksByTagsAsync(Array.Empty<string>(), false, null);
        var existingLabel = allLabels.FirstOrDefault(l => l.TaskName == name);

        if (existingLabel == null)
        {
            return NotFound(new { error = $"Task '{name}' not found" });
        }

        // Apply tag changes
        var newTags = existingLabel.Tags.ToList();
        if (request.AddTags?.Any() == true)
        {
            newTags.AddRange(request.AddTags.Where(t => !newTags.Contains(t, StringComparer.OrdinalIgnoreCase)));
        }
        if (request.RemoveTags?.Any() == true)
        {
            newTags = newTags.Where(t => !request.RemoveTags.Contains(t, StringComparer.OrdinalIgnoreCase)).ToList();
        }

        // Update entity
        existingLabel.Tags = newTags;
        existingLabel.SyncedAt = DateTime.UtcNow;

        await _labelRepository.SaveTaskLabelsAsync(existingLabel);

        // Get category list (single category for tasks)
        var currentCategories = string.IsNullOrEmpty(existingLabel.Category)
            ? new List<string>()
            : new List<string> { existingLabel.Category };

        return Ok(new UpdateLabelsResponse
        {
            Success = true,
            EntityName = name,
            CurrentTags = newTags,
            CurrentCategories = currentCategories,
            Message = "Labels updated successfully"
        });
    }

    /// <summary>
    /// Bulk update labels for multiple workflows.
    /// </summary>
    [HttpPost("workflows/labels/bulk")]
    [ProducesResponseType(typeof(BulkLabelsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> BulkUpdateWorkflowLabels([FromBody] BulkLabelsRequest request)
    {
        _logger.LogInformation("Bulk updating labels for {Count} workflows", request.EntityNames?.Count ?? 0);

        // Validation
        if (request.EntityNames == null || !request.EntityNames.Any())
        {
            return BadRequest(new { error = "EntityNames is required and cannot be empty" });
        }

        if ((request.AddTags == null || !request.AddTags.Any()) &&
            (request.RemoveTags == null || !request.RemoveTags.Any()) &&
            (request.AddCategories == null || !request.AddCategories.Any()) &&
            (request.RemoveCategories == null || !request.RemoveCategories.Any()))
        {
            return BadRequest(new { error = "At least one operation (add/remove tags/categories) is required" });
        }

        var allLabels = await _labelRepository.GetWorkflowsByTagsAsync(Array.Empty<string>(), false, null);
        var changes = new List<BulkLabelChange>();

        foreach (var entityName in request.EntityNames)
        {
            var existingLabel = allLabels.FirstOrDefault(l => l.WorkflowName == entityName);
            if (existingLabel == null) continue;

            var change = new BulkLabelChange { Name = entityName };

            // Calculate tag changes
            if (request.AddTags?.Any() == true)
            {
                var toAdd = request.AddTags.Where(t => !existingLabel.Tags.Contains(t, StringComparer.OrdinalIgnoreCase)).ToList();
                change.AddedTags = toAdd;
                if (!request.DryRun) existingLabel.Tags.AddRange(toAdd);
            }
            if (request.RemoveTags?.Any() == true)
            {
                var toRemove = request.RemoveTags.Where(t => existingLabel.Tags.Contains(t, StringComparer.OrdinalIgnoreCase)).ToList();
                change.RemovedTags = toRemove;
                if (!request.DryRun) existingLabel.Tags = existingLabel.Tags.Where(t => !toRemove.Contains(t, StringComparer.OrdinalIgnoreCase)).ToList();
            }

            // Calculate category changes
            if (request.AddCategories?.Any() == true)
            {
                var toAdd = request.AddCategories.Where(c => !existingLabel.Categories.Contains(c, StringComparer.OrdinalIgnoreCase)).ToList();
                change.AddedCategories = toAdd;
                if (!request.DryRun) existingLabel.Categories.AddRange(toAdd);
            }
            if (request.RemoveCategories?.Any() == true)
            {
                var toRemove = request.RemoveCategories.Where(c => existingLabel.Categories.Contains(c, StringComparer.OrdinalIgnoreCase)).ToList();
                change.RemovedCategories = toRemove;
                if (!request.DryRun) existingLabel.Categories = existingLabel.Categories.Where(c => !toRemove.Contains(c, StringComparer.OrdinalIgnoreCase)).ToList();
            }

            changes.Add(change);

            if (!request.DryRun)
            {
                existingLabel.SyncedAt = DateTime.UtcNow;
                await _labelRepository.SaveWorkflowLabelsAsync(existingLabel);
            }
        }

        return Ok(new BulkLabelsResponse
        {
            Success = true,
            AffectedEntities = changes.Count,
            IsDryRun = request.DryRun,
            Changes = changes,
            Message = request.DryRun ? "Dry run completed - no changes saved" : "Bulk update completed"
        });
    }

    /// <summary>
    /// Bulk update labels for multiple tasks.
    /// </summary>
    [HttpPost("tasks/labels/bulk")]
    [ProducesResponseType(typeof(BulkLabelsResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> BulkUpdateTaskLabels([FromBody] BulkLabelsRequest request)
    {
        _logger.LogInformation("Bulk updating labels for {Count} tasks", request.EntityNames?.Count ?? 0);

        // Validation
        if (request.EntityNames == null || !request.EntityNames.Any())
        {
            return BadRequest(new { error = "EntityNames is required and cannot be empty" });
        }

        if ((request.AddTags == null || !request.AddTags.Any()) &&
            (request.RemoveTags == null || !request.RemoveTags.Any()))
        {
            return BadRequest(new { error = "At least one tag operation (add/remove) is required" });
        }

        var allLabels = await _labelRepository.GetTasksByTagsAsync(Array.Empty<string>(), false, null);
        var changes = new List<BulkLabelChange>();

        foreach (var entityName in request.EntityNames)
        {
            var existingLabel = allLabels.FirstOrDefault(l => l.TaskName == entityName);
            if (existingLabel == null) continue;

            var change = new BulkLabelChange { Name = entityName };

            // Calculate tag changes
            if (request.AddTags?.Any() == true)
            {
                var toAdd = request.AddTags.Where(t => !existingLabel.Tags.Contains(t, StringComparer.OrdinalIgnoreCase)).ToList();
                change.AddedTags = toAdd;
                if (!request.DryRun) existingLabel.Tags.AddRange(toAdd);
            }
            if (request.RemoveTags?.Any() == true)
            {
                var toRemove = request.RemoveTags.Where(t => existingLabel.Tags.Contains(t, StringComparer.OrdinalIgnoreCase)).ToList();
                change.RemovedTags = toRemove;
                if (!request.DryRun) existingLabel.Tags = existingLabel.Tags.Where(t => !toRemove.Contains(t, StringComparer.OrdinalIgnoreCase)).ToList();
            }

            changes.Add(change);

            if (!request.DryRun)
            {
                existingLabel.SyncedAt = DateTime.UtcNow;
                await _labelRepository.SaveTaskLabelsAsync(existingLabel);
            }
        }

        return Ok(new BulkLabelsResponse
        {
            Success = true,
            AffectedEntities = changes.Count,
            IsDryRun = request.DryRun,
            Changes = changes,
            Message = request.DryRun ? "Dry run completed - no changes saved" : "Bulk update completed"
        });
    }

    /// <summary>
    /// Get workflows filtered by tags.
    /// </summary>
    [HttpGet("workflows/by-tags")]
    [ProducesResponseType(typeof(List<WorkflowLabelEntity>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWorkflowsByTags(
        [FromQuery] string tags,
        [FromQuery] bool matchAllTags = false,
        [FromQuery] string? @namespace = null)
    {
        var tagList = tags.Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(t => t.Trim())
            .ToList();

        var results = await _labelRepository.GetWorkflowsByTagsAsync(tagList, matchAllTags, @namespace);
        return Ok(results);
    }

    /// <summary>
    /// Get workflows filtered by categories.
    /// </summary>
    [HttpGet("workflows/by-categories")]
    [ProducesResponseType(typeof(List<WorkflowLabelEntity>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetWorkflowsByCategories(
        [FromQuery] string categories,
        [FromQuery] string? @namespace = null)
    {
        var categoryList = categories.Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(c => c.Trim())
            .ToList();

        var results = await _labelRepository.GetWorkflowsByCategoriesAsync(categoryList, @namespace);
        return Ok(results);
    }

    /// <summary>
    /// Get tasks filtered by tags.
    /// </summary>
    [HttpGet("tasks/by-tags")]
    [ProducesResponseType(typeof(List<TaskLabelEntity>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTasksByTags(
        [FromQuery] string tags,
        [FromQuery] bool matchAllTags = false,
        [FromQuery] string? @namespace = null)
    {
        var tagList = tags.Split(',', StringSplitOptions.RemoveEmptyEntries)
            .Select(t => t.Trim())
            .ToList();

        var results = await _labelRepository.GetTasksByTagsAsync(tagList, matchAllTags, @namespace);
        return Ok(results);
    }

    /// <summary>
    /// Get tasks filtered by category.
    /// </summary>
    [HttpGet("tasks/by-category")]
    [ProducesResponseType(typeof(List<TaskLabelEntity>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetTasksByCategory(
        [FromQuery] string category,
        [FromQuery] string? @namespace = null)
    {
        var results = await _labelRepository.GetTasksByCategoryAsync(category, @namespace);
        return Ok(results);
    }
}
