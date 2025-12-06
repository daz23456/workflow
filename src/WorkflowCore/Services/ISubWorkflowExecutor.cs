using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Interface for executing sub-workflows.
/// Stage 21.2: Sub-Workflow Execution
/// </summary>
public interface ISubWorkflowExecutor
{
    /// <summary>
    /// Execute a sub-workflow with context isolation.
    /// </summary>
    /// <param name="subWorkflow">The workflow to execute</param>
    /// <param name="availableTasks">Dictionary of available task definitions</param>
    /// <param name="availableWorkflows">Dictionary of available workflow definitions (for nested sub-workflows)</param>
    /// <param name="parentContext">The parent workflow's template context (for input resolution)</param>
    /// <param name="inputMappings">Input mappings from task step (templates to resolve)</param>
    /// <param name="timeout">Optional timeout string (e.g., "30s", "5m")</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Task execution result with sub-workflow output</returns>
    Task<TaskExecutionResult> ExecuteAsync(
        WorkflowResource subWorkflow,
        Dictionary<string, WorkflowTaskResource> availableTasks,
        Dictionary<string, WorkflowResource> availableWorkflows,
        TemplateContext parentContext,
        Dictionary<string, string> inputMappings,
        string? timeout,
        CancellationToken cancellationToken = default);
}
