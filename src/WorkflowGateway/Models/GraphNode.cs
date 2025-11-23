namespace WorkflowGateway.Models;

/// <summary>
/// Represents a node (task) in the workflow execution graph visualization.
/// </summary>
public class GraphNode
{
    /// <summary>
    /// The unique task identifier.
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// The task reference name from the workflow definition.
    /// </summary>
    public string TaskRef { get; set; } = string.Empty;

    /// <summary>
    /// The parallel execution level (0-based).
    /// Tasks at the same level can execute in parallel.
    /// </summary>
    public int Level { get; set; }
}
