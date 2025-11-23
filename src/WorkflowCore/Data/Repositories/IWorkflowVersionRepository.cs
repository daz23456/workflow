using WorkflowCore.Models;

namespace WorkflowCore.Data.Repositories;

/// <summary>
/// Repository for managing workflow version records.
/// </summary>
public interface IWorkflowVersionRepository
{
    /// <summary>
    /// Saves a workflow version record.
    /// </summary>
    /// <param name="version">The workflow version to save.</param>
    /// <returns>The saved workflow version.</returns>
    Task<WorkflowVersion> SaveVersionAsync(WorkflowVersion version);

    /// <summary>
    /// Gets all versions for a specific workflow, ordered by CreatedAt descending.
    /// </summary>
    /// <param name="workflowName">The workflow name (supports null).</param>
    /// <returns>List of workflow versions for the workflow.</returns>
    Task<List<WorkflowVersion>> GetVersionsAsync(string? workflowName);

    /// <summary>
    /// Gets the latest version for a specific workflow.
    /// </summary>
    /// <param name="workflowName">The workflow name (supports null).</param>
    /// <returns>The latest workflow version, or null if no versions exist.</returns>
    Task<WorkflowVersion?> GetLatestVersionAsync(string? workflowName);
}
