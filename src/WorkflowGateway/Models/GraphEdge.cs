namespace WorkflowGateway.Models;

/// <summary>
/// Represents a dependency edge in the workflow execution graph visualization.
/// The edge represents data flow direction: Source (prerequisite) → Target (dependent).
/// </summary>
public class GraphEdge
{
    /// <summary>
    /// The source task ID (prerequisite that must complete first).
    /// The arrow starts here in the visual graph.
    /// </summary>
    public string Source { get; set; } = string.Empty;

    /// <summary>
    /// The target task ID (dependent task that waits for the source).
    /// The arrow points here in the visual graph.
    /// </summary>
    public string Target { get; set; } = string.Empty;
}
