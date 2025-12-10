namespace WorkflowCore.Models;

/// <summary>
/// Result of a blast radius analysis showing all affected workflows and tasks
/// when a task is modified or replaced.
/// </summary>
public class BlastRadiusResult
{
    /// <summary>
    /// Name of the source task being analyzed.
    /// </summary>
    public string TaskName { get; set; } = string.Empty;

    /// <summary>
    /// Maximum depth that was analyzed.
    /// </summary>
    public int AnalysisDepth { get; set; }

    /// <summary>
    /// Whether the analysis was truncated because more levels exist beyond the max depth.
    /// </summary>
    public bool TruncatedAtDepth { get; set; }

    /// <summary>
    /// Total count of affected workflows across all depths.
    /// </summary>
    public int TotalAffectedWorkflows => AffectedWorkflows.Count;

    /// <summary>
    /// Total count of affected tasks across all depths (excluding source task).
    /// </summary>
    public int TotalAffectedTasks => AffectedTasks.Count;

    /// <summary>
    /// All affected workflow names (deduplicated).
    /// </summary>
    public List<string> AffectedWorkflows { get; set; } = new();

    /// <summary>
    /// All affected task names (deduplicated, excluding source task).
    /// </summary>
    public List<string> AffectedTasks { get; set; } = new();

    /// <summary>
    /// Breakdown of affected items by depth level.
    /// </summary>
    public List<BlastRadiusDepthLevel> ByDepth { get; set; } = new();

    /// <summary>
    /// Graph representation for visualization.
    /// </summary>
    public BlastRadiusGraph Graph { get; set; } = new();
}

/// <summary>
/// Affected items at a specific depth level.
/// </summary>
public class BlastRadiusDepthLevel
{
    /// <summary>
    /// The depth level (1 = direct, 2 = indirect, etc.).
    /// </summary>
    public int Depth { get; set; }

    /// <summary>
    /// Workflows discovered at this depth.
    /// </summary>
    public List<string> Workflows { get; set; } = new();

    /// <summary>
    /// Tasks discovered at this depth.
    /// </summary>
    public List<string> Tasks { get; set; } = new();
}

/// <summary>
/// Graph structure for visualizing blast radius.
/// </summary>
public class BlastRadiusGraph
{
    /// <summary>
    /// All nodes in the graph.
    /// </summary>
    public List<BlastRadiusNode> Nodes { get; set; } = new();

    /// <summary>
    /// All edges in the graph.
    /// </summary>
    public List<BlastRadiusEdge> Edges { get; set; } = new();
}

/// <summary>
/// A node in the blast radius graph.
/// </summary>
public class BlastRadiusNode
{
    /// <summary>
    /// Unique identifier for the node (e.g., "task:get-user" or "workflow:order-flow").
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Display name of the node.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Type of the node (Task or Workflow).
    /// </summary>
    public BlastRadiusNodeType Type { get; set; }

    /// <summary>
    /// Depth at which this node was discovered.
    /// </summary>
    public int Depth { get; set; }

    /// <summary>
    /// Whether this is the source task being analyzed.
    /// </summary>
    public bool IsSource { get; set; }
}

/// <summary>
/// Type of node in the blast radius graph.
/// </summary>
public enum BlastRadiusNodeType
{
    Task,
    Workflow
}

/// <summary>
/// An edge in the blast radius graph.
/// </summary>
public class BlastRadiusEdge
{
    /// <summary>
    /// Source node ID.
    /// </summary>
    public string Source { get; set; } = string.Empty;

    /// <summary>
    /// Target node ID.
    /// </summary>
    public string Target { get; set; } = string.Empty;

    /// <summary>
    /// Relationship type (e.g., "usedBy", "contains").
    /// </summary>
    public string Relationship { get; set; } = string.Empty;
}
