using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Analyzes workflow field usage patterns for impact analysis.
/// </summary>
public interface IFieldUsageAnalyzer
{
    /// <summary>
    /// Analyzes a workflow to extract field usage information.
    /// </summary>
    /// <param name="workflow">The workflow to analyze.</param>
    /// <returns>List of task usage records.</returns>
    IReadOnlyList<WorkflowTaskUsage> AnalyzeWorkflow(WorkflowResource workflow);

    /// <summary>
    /// Registers field usage for tracking.
    /// </summary>
    /// <param name="usage">The usage to register.</param>
    void RegisterUsage(WorkflowTaskUsage usage);

    /// <summary>
    /// Gets all registered usages for a task.
    /// </summary>
    /// <param name="taskName">Name of the task.</param>
    /// <returns>List of workflow usages for this task.</returns>
    IReadOnlyList<WorkflowTaskUsage> GetTaskUsage(string taskName);

    /// <summary>
    /// Gets usage information for a specific field.
    /// </summary>
    /// <param name="taskName">Name of the task.</param>
    /// <param name="fieldName">Name of the field.</param>
    /// <param name="fieldType">Type of field (input/output).</param>
    /// <returns>Field usage information.</returns>
    FieldUsageInfo GetFieldUsageInfo(string taskName, string fieldName, FieldType fieldType);

    /// <summary>
    /// Checks if removing a field would be safe (no workflows use it).
    /// </summary>
    /// <param name="taskName">Name of the task.</param>
    /// <param name="fieldName">Name of the field.</param>
    /// <param name="fieldType">Type of field (input/output).</param>
    /// <returns>True if the field can be safely removed.</returns>
    bool IsFieldRemovalSafe(string taskName, string fieldName, FieldType fieldType);

    /// <summary>
    /// Gets all field usage information for a task.
    /// </summary>
    /// <param name="taskName">Name of the task.</param>
    /// <returns>List of field usage info for all fields.</returns>
    IReadOnlyList<FieldUsageInfo> GetAllFieldUsage(string taskName);
}
