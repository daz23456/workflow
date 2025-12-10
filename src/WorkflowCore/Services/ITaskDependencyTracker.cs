using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Tracks which workflows depend on which tasks.
/// Used for impact analysis when task changes are detected.
/// </summary>
public interface ITaskDependencyTracker
{
    /// <summary>
    /// Register that a workflow depends on a task.
    /// </summary>
    void RegisterDependency(string taskName, string workflowName);

    /// <summary>
    /// Unregister a workflow's dependency on a task.
    /// </summary>
    void UnregisterDependency(string taskName, string workflowName);

    /// <summary>
    /// Get the dependency information for a task.
    /// </summary>
    TaskDependency? GetDependency(string taskName);

    /// <summary>
    /// Get all workflows that depend on a task.
    /// </summary>
    IReadOnlyList<string> GetAffectedWorkflows(string taskName);

    /// <summary>
    /// Register which fields a workflow uses from a task's output.
    /// </summary>
    void RegisterFieldUsage(string taskName, string workflowName, IEnumerable<string> fields);

    /// <summary>
    /// Get all workflows that use a specific field from a task's output.
    /// </summary>
    IReadOnlyList<string> GetWorkflowsUsingField(string taskName, string fieldName);

    /// <summary>
    /// Get all tasks used by a specific workflow.
    /// </summary>
    IReadOnlyList<string> GetTasksInWorkflow(string workflowName);
}
