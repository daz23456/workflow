using WorkflowCore.Models;

namespace WorkflowCore.Data.Repositories;

/// <summary>
/// Repository interface for label data operations.
/// Provides methods for querying and managing workflow and task labels.
/// </summary>
public interface ILabelRepository
{
    /// <summary>
    /// Gets workflows that match any or all of the specified tags.
    /// </summary>
    /// <param name="tags">The tags to filter by.</param>
    /// <param name="matchAll">If true, workflows must have ALL tags; if false, ANY tag matches.</param>
    /// <param name="namespace">Optional namespace filter.</param>
    /// <returns>List of matching workflow labels.</returns>
    Task<List<WorkflowLabelEntity>> GetWorkflowsByTagsAsync(
        IEnumerable<string> tags,
        bool matchAll = false,
        string? @namespace = null);

    /// <summary>
    /// Gets workflows that have any of the specified categories.
    /// </summary>
    /// <param name="categories">The categories to filter by.</param>
    /// <param name="namespace">Optional namespace filter.</param>
    /// <returns>List of matching workflow labels.</returns>
    Task<List<WorkflowLabelEntity>> GetWorkflowsByCategoriesAsync(
        IEnumerable<string> categories,
        string? @namespace = null);

    /// <summary>
    /// Gets tasks that match any or all of the specified tags.
    /// </summary>
    /// <param name="tags">The tags to filter by.</param>
    /// <param name="matchAll">If true, tasks must have ALL tags; if false, ANY tag matches.</param>
    /// <param name="namespace">Optional namespace filter.</param>
    /// <returns>List of matching task labels.</returns>
    Task<List<TaskLabelEntity>> GetTasksByTagsAsync(
        IEnumerable<string> tags,
        bool matchAll = false,
        string? @namespace = null);

    /// <summary>
    /// Gets tasks that have the specified category.
    /// </summary>
    /// <param name="category">The category to filter by.</param>
    /// <param name="namespace">Optional namespace filter.</param>
    /// <returns>List of matching task labels.</returns>
    Task<List<TaskLabelEntity>> GetTasksByCategoryAsync(
        string category,
        string? @namespace = null);

    /// <summary>
    /// Gets all unique labels with their usage counts.
    /// </summary>
    /// <returns>Label statistics including all tags and categories with counts.</returns>
    Task<LabelStatistics> GetAllLabelsAsync();

    /// <summary>
    /// Saves or updates workflow labels.
    /// Uses WorkflowName + Namespace as the unique key.
    /// </summary>
    /// <param name="labels">The workflow label entity to save.</param>
    /// <returns>The saved entity.</returns>
    Task<WorkflowLabelEntity> SaveWorkflowLabelsAsync(WorkflowLabelEntity labels);

    /// <summary>
    /// Saves or updates task labels.
    /// Uses TaskName + Namespace as the unique key.
    /// </summary>
    /// <param name="labels">The task label entity to save.</param>
    /// <returns>The saved entity.</returns>
    Task<TaskLabelEntity> SaveTaskLabelsAsync(TaskLabelEntity labels);

    /// <summary>
    /// Deletes workflow labels by workflow name and namespace.
    /// </summary>
    /// <param name="workflowName">The workflow name.</param>
    /// <param name="namespace">The namespace.</param>
    Task DeleteWorkflowLabelsAsync(string workflowName, string @namespace);

    /// <summary>
    /// Deletes task labels by task name and namespace.
    /// </summary>
    /// <param name="taskName">The task name.</param>
    /// <param name="namespace">The namespace.</param>
    Task DeleteTaskLabelsAsync(string taskName, string @namespace);

    /// <summary>
    /// Updates pre-computed label usage statistics.
    /// Should be called after bulk label changes.
    /// </summary>
    Task UpdateLabelUsageStatsAsync();
}
