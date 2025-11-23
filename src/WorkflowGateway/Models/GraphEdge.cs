namespace WorkflowGateway.Models;

/// <summary>
/// Represents a dependency edge in the workflow execution graph visualization.
/// </summary>
public class GraphEdge
{
    /// <summary>
    /// The task that depends on another task (the dependent).
    /// </summary>
    public string From { get; set; } = string.Empty;

    /// <summary>
    /// The task being depended upon (the dependency).
    /// </summary>
    public string To { get; set; } = string.Empty;
}
