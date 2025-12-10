using System.Text.Json.Serialization;

namespace WorkflowGateway.Models;

/// <summary>
/// API response for blast radius analysis.
/// </summary>
public class BlastRadiusResponse
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
    /// Summary of affected items (flat format).
    /// </summary>
    public BlastRadiusSummary? Summary { get; set; }

    /// <summary>
    /// Graph representation for visualization.
    /// </summary>
    public BlastRadiusGraphResponse? Graph { get; set; }
}

/// <summary>
/// Summary of blast radius in flat format.
/// </summary>
public class BlastRadiusSummary
{
    /// <summary>
    /// Total count of affected workflows across all depths.
    /// </summary>
    public int TotalAffectedWorkflows { get; set; }

    /// <summary>
    /// Total count of affected tasks across all depths.
    /// </summary>
    public int TotalAffectedTasks { get; set; }

    /// <summary>
    /// All affected workflow names.
    /// </summary>
    public List<string> AffectedWorkflows { get; set; } = new();

    /// <summary>
    /// All affected task names.
    /// </summary>
    public List<string> AffectedTasks { get; set; } = new();

    /// <summary>
    /// Breakdown by depth level.
    /// </summary>
    public List<BlastRadiusDepthLevelResponse> ByDepth { get; set; } = new();
}

/// <summary>
/// Affected items at a specific depth level.
/// </summary>
public class BlastRadiusDepthLevelResponse
{
    /// <summary>
    /// The depth level.
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
/// Graph structure for blast radius visualization.
/// </summary>
public class BlastRadiusGraphResponse
{
    /// <summary>
    /// All nodes in the graph.
    /// </summary>
    public List<BlastRadiusNodeResponse> Nodes { get; set; } = new();

    /// <summary>
    /// All edges in the graph.
    /// </summary>
    public List<BlastRadiusEdgeResponse> Edges { get; set; } = new();
}

/// <summary>
/// A node in the blast radius graph.
/// </summary>
public class BlastRadiusNodeResponse
{
    /// <summary>
    /// Unique identifier for the node.
    /// </summary>
    public string Id { get; set; } = string.Empty;

    /// <summary>
    /// Display name of the node.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Type of the node (task or workflow).
    /// </summary>
    public string Type { get; set; } = string.Empty;

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
/// An edge in the blast radius graph.
/// </summary>
public class BlastRadiusEdgeResponse
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
    /// Relationship type (usedBy, contains).
    /// </summary>
    public string Relationship { get; set; } = string.Empty;
}
