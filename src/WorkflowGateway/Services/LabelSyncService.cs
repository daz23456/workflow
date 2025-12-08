using Microsoft.Extensions.Logging;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;

namespace WorkflowGateway.Services;

/// <summary>
/// Service that syncs workflow and task labels from Kubernetes to PostgreSQL.
/// Enables efficient GIN index queries on tags and categories.
/// </summary>
public interface ILabelSyncService
{
    /// <summary>
    /// Synchronizes all workflow and task labels from Kubernetes to PostgreSQL.
    /// </summary>
    Task SyncAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Implementation of ILabelSyncService.
/// </summary>
public class LabelSyncService : ILabelSyncService
{
    private readonly IWorkflowDiscoveryService _discoveryService;
    private readonly ILabelRepository _labelRepository;
    private readonly ILogger<LabelSyncService> _logger;

    public LabelSyncService(
        IWorkflowDiscoveryService discoveryService,
        ILabelRepository labelRepository,
        ILogger<LabelSyncService> logger)
    {
        _discoveryService = discoveryService ?? throw new ArgumentNullException(nameof(discoveryService));
        _labelRepository = labelRepository ?? throw new ArgumentNullException(nameof(labelRepository));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <inheritdoc />
    public async Task SyncAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Starting label sync from Kubernetes");

        try
        {
            // Get all workflows and tasks from Kubernetes
            var workflows = await _discoveryService.DiscoverWorkflowsAsync(null);
            var tasks = await _discoveryService.DiscoverTasksAsync(null);

            // Sync workflows
            await SyncWorkflowLabelsAsync(workflows, cancellationToken);

            // Sync tasks
            await SyncTaskLabelsAsync(tasks, cancellationToken);

            // Update usage statistics
            await _labelRepository.UpdateLabelUsageStatsAsync();

            _logger.LogInformation(
                "Label sync completed. Workflows: {WorkflowCount}, Tasks: {TaskCount}",
                workflows.Count, tasks.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during label sync");
            throw;
        }
    }

    private async Task SyncWorkflowLabelsAsync(
        List<WorkflowResource> workflows,
        CancellationToken cancellationToken)
    {
        // Get current labels in database
        var existingLabels = await _labelRepository.GetWorkflowsByTagsAsync(
            Array.Empty<string>(), matchAll: false);

        // Create set of current workflow keys from K8s
        var currentWorkflowKeys = workflows
            .Select(w => $"{w.Metadata.Namespace}/{w.Metadata.Name}")
            .ToHashSet();

        // Remove workflows that no longer exist in K8s
        foreach (var existing in existingLabels)
        {
            var key = $"{existing.Namespace}/{existing.WorkflowName}";
            if (!currentWorkflowKeys.Contains(key))
            {
                _logger.LogDebug("Removing deleted workflow labels: {Key}", key);
                await _labelRepository.DeleteWorkflowLabelsAsync(
                    existing.WorkflowName, existing.Namespace);
            }
        }

        // Update or create labels for current workflows
        foreach (var workflow in workflows)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var entity = new WorkflowLabelEntity
            {
                WorkflowName = workflow.Metadata.Name,
                Namespace = workflow.Metadata.Namespace ?? "default",
                Tags = workflow.Spec.Tags?.ToList() ?? new List<string>(),
                Categories = workflow.Spec.Categories?.ToList() ?? new List<string>(),
                SyncedAt = DateTime.UtcNow,
                VersionHash = ComputeHash(workflow)
            };

            await _labelRepository.SaveWorkflowLabelsAsync(entity);
        }
    }

    private async Task SyncTaskLabelsAsync(
        List<WorkflowTaskResource> tasks,
        CancellationToken cancellationToken)
    {
        // Get current labels in database
        var existingLabels = await _labelRepository.GetTasksByTagsAsync(
            Array.Empty<string>(), matchAll: false);

        // Create set of current task keys from K8s
        var currentTaskKeys = tasks
            .Select(t => $"{t.Metadata.Namespace}/{t.Metadata.Name}")
            .ToHashSet();

        // Remove tasks that no longer exist in K8s
        foreach (var existing in existingLabels)
        {
            var key = $"{existing.Namespace}/{existing.TaskName}";
            if (!currentTaskKeys.Contains(key))
            {
                _logger.LogDebug("Removing deleted task labels: {Key}", key);
                await _labelRepository.DeleteTaskLabelsAsync(
                    existing.TaskName, existing.Namespace);
            }
        }

        // Update or create labels for current tasks
        foreach (var task in tasks)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var entity = new TaskLabelEntity
            {
                TaskName = task.Metadata.Name,
                Namespace = task.Metadata.Namespace ?? "default",
                Category = task.Spec.Category,
                Tags = task.Spec.Tags?.ToList() ?? new List<string>(),
                SyncedAt = DateTime.UtcNow,
                VersionHash = ComputeHash(task)
            };

            await _labelRepository.SaveTaskLabelsAsync(entity);
        }
    }

    private static string ComputeHash(WorkflowResource workflow)
    {
        // Simple hash for change detection (can be made more robust)
        var content = $"{string.Join(",", workflow.Spec.Tags ?? new List<string>())}|" +
                      $"{string.Join(",", workflow.Spec.Categories ?? new List<string>())}";
        return content.GetHashCode().ToString("X8");
    }

    private static string ComputeHash(WorkflowTaskResource task)
    {
        var content = $"{task.Spec.Category}|" +
                      $"{string.Join(",", task.Spec.Tags ?? new List<string>())}";
        return content.GetHashCode().ToString("X8");
    }
}
