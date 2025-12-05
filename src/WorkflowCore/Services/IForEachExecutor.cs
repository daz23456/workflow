using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Delegate for task execution during forEach iteration.
/// </summary>
/// <param name="context">Template context with forEach information</param>
/// <param name="item">Current item being processed</param>
/// <param name="index">Current index (0-based)</param>
/// <returns>Task execution result</returns>
public delegate Task<TaskExecutionResult> ForEachTaskExecutor(
    TemplateContext context,
    object? item,
    int index);

/// <summary>
/// Executes forEach iterations for workflow tasks.
/// </summary>
public interface IForEachExecutor
{
    /// <summary>
    /// Executes a forEach iteration over an array of items.
    /// </summary>
    /// <param name="forEachSpec">ForEach configuration specifying items and iteration settings</param>
    /// <param name="context">Template context for expression resolution</param>
    /// <param name="taskExecutor">Delegate to execute for each item</param>
    /// <returns>Aggregated result of all iterations</returns>
    Task<ForEachResult> ExecuteAsync(
        ForEachSpec? forEachSpec,
        TemplateContext context,
        ForEachTaskExecutor taskExecutor);
}
