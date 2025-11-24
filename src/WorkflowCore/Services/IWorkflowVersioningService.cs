namespace WorkflowCore.Services;

/// <summary>
/// Service for managing workflow versioning and change detection.
/// Uses SHA256 hash of workflow YAML to detect changes.
/// </summary>
public interface IWorkflowVersioningService
{
    /// <summary>
    /// Calculates a SHA256 hash of the workflow definition for version tracking.
    /// Hash is based on the YAML serialization of the workflow resource.
    /// </summary>
    /// <param name="workflow">The workflow resource to hash.</param>
    /// <returns>SHA256 hash string (hex format).</returns>
    string CalculateVersionHash(WorkflowCore.Models.WorkflowResource workflow);

    /// <summary>
    /// Checks if the workflow has changed compared to the latest stored version.
    /// </summary>
    /// <param name="workflowName">The name of the workflow to check.</param>
    /// <param name="currentHash">The hash of the current workflow definition.</param>
    /// <returns>True if the workflow has changed (hash differs from latest version), false otherwise.</returns>
    Task<bool> HasChangedAsync(string workflowName, string currentHash);

    /// <summary>
    /// Creates a new version record if the workflow has changed.
    /// Compares current hash with latest version and saves if different.
    /// </summary>
    /// <param name="workflow">The workflow resource to version.</param>
    /// <returns>True if a new version was created, false if no changes detected.</returns>
    Task<bool> CreateVersionIfChangedAsync(WorkflowCore.Models.WorkflowResource workflow);
}
