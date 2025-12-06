namespace WorkflowCore.Models;

/// <summary>
/// Tracks the call chain for sub-workflow execution to detect cycles and enforce depth limits.
/// Stage 21.3: Cycle Detection & Limits
/// </summary>
public class WorkflowCallStack
{
    private readonly Stack<string> _workflowNames = new();

    /// <summary>
    /// Maximum allowed nesting depth for sub-workflows.
    /// Default is 5.
    /// </summary>
    public int MaxDepth { get; set; } = 5;

    /// <summary>
    /// Current depth of the call stack.
    /// </summary>
    public int CurrentDepth => _workflowNames.Count;

    /// <summary>
    /// Gets the workflow names in the call stack (from bottom to top).
    /// </summary>
    public IReadOnlyList<string> WorkflowNames => _workflowNames.Reverse().ToList();

    /// <summary>
    /// Push a workflow onto the call stack.
    /// </summary>
    /// <param name="workflowName">The workflow name to push</param>
    public void Push(string workflowName)
    {
        ArgumentException.ThrowIfNullOrEmpty(workflowName);
        _workflowNames.Push(workflowName);
    }

    /// <summary>
    /// Pop a workflow from the call stack.
    /// </summary>
    /// <returns>The popped workflow name</returns>
    public string Pop()
    {
        if (_workflowNames.Count == 0)
        {
            throw new InvalidOperationException("Cannot pop from an empty call stack");
        }
        return _workflowNames.Pop();
    }

    /// <summary>
    /// Check if a workflow is already in the call stack (indicates a cycle).
    /// </summary>
    /// <param name="workflowName">The workflow name to check</param>
    /// <returns>True if the workflow is in the stack</returns>
    public bool Contains(string workflowName)
    {
        return _workflowNames.Contains(workflowName);
    }

    /// <summary>
    /// Check if adding another workflow would exceed the max depth.
    /// </summary>
    /// <returns>True if at or beyond max depth</returns>
    public bool IsAtMaxDepth()
    {
        return _workflowNames.Count >= MaxDepth;
    }

    /// <summary>
    /// Get the full path of the call stack as a string (e.g., "A → B → C").
    /// </summary>
    /// <returns>Path string</returns>
    public string GetPath()
    {
        if (_workflowNames.Count == 0)
        {
            return string.Empty;
        }
        return string.Join(" → ", _workflowNames.Reverse());
    }

    /// <summary>
    /// Get the cycle path including the workflow that would cause the cycle.
    /// </summary>
    /// <param name="cycleWorkflow">The workflow that would complete the cycle</param>
    /// <returns>Full cycle path (e.g., "A → B → A")</returns>
    public string GetCyclePath(string cycleWorkflow)
    {
        var path = GetPath();
        return string.IsNullOrEmpty(path) ? cycleWorkflow : $"{path} → {cycleWorkflow}";
    }

    /// <summary>
    /// Create a copy of this call stack for passing to sub-workflows.
    /// </summary>
    /// <returns>A new WorkflowCallStack with the same contents</returns>
    public WorkflowCallStack Clone()
    {
        var clone = new WorkflowCallStack { MaxDepth = this.MaxDepth };
        foreach (var name in _workflowNames.Reverse())
        {
            clone.Push(name);
        }
        return clone;
    }
}
