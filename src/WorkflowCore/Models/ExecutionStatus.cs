namespace WorkflowCore.Models;

/// <summary>
/// Represents the execution status of a workflow.
/// </summary>
public enum ExecutionStatus
{
    /// <summary>
    /// The workflow is currently running.
    /// </summary>
    Running = 0,

    /// <summary>
    /// The workflow completed successfully.
    /// </summary>
    Succeeded = 1,

    /// <summary>
    /// The workflow failed during execution.
    /// </summary>
    Failed = 2,

    /// <summary>
    /// The workflow was cancelled before completion.
    /// </summary>
    Cancelled = 3
}
