using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Detects cycles and enforces depth limits for sub-workflow execution.
/// Stage 21.3: Cycle Detection & Limits
/// </summary>
public class WorkflowCycleDetector : IWorkflowCycleDetector
{
    /// <summary>
    /// Check if a sub-workflow can be executed without causing a cycle or exceeding depth limits.
    /// </summary>
    public CycleDetectionResult CheckBeforeExecution(string workflowName, WorkflowCallStack callStack)
    {
        ArgumentException.ThrowIfNullOrEmpty(workflowName);
        ArgumentNullException.ThrowIfNull(callStack);

        // Check for cycle first
        if (callStack.Contains(workflowName))
        {
            var cyclePath = callStack.GetCyclePath(workflowName);
            return CycleDetectionResult.CycleDetected(cyclePath, workflowName);
        }

        // Check max depth (after adding this workflow, we'd be at CurrentDepth + 1)
        if (callStack.IsAtMaxDepth())
        {
            var path = callStack.GetPath();
            var fullPath = string.IsNullOrEmpty(path) ? workflowName : $"{path} → {workflowName}";
            return CycleDetectionResult.MaxDepthExceeded(callStack.MaxDepth, fullPath);
        }

        return CycleDetectionResult.Success();
    }
}
