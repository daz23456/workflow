using WorkflowCore.Models;

namespace WorkflowGateway.Models;

/// <summary>
/// Enhanced execution plan with graph visualization data and parallel group information.
/// </summary>
public class EnhancedExecutionPlan
{
    /// <summary>
    /// Graph nodes representing tasks in the workflow.
    /// </summary>
    public List<GraphNode> Nodes { get; set; } = new List<GraphNode>();

    /// <summary>
    /// Graph edges representing dependencies between tasks.
    /// </summary>
    public List<GraphEdge> Edges { get; set; } = new List<GraphEdge>();

    /// <summary>
    /// Parallel groups showing which tasks can execute concurrently.
    /// </summary>
    public List<ParallelGroup> ParallelGroups { get; set; } = new List<ParallelGroup>();

    /// <summary>
    /// Topological execution order of tasks.
    /// </summary>
    public List<string> ExecutionOrder { get; set; } = new List<string>();

    /// <summary>
    /// Validation result for the workflow.
    /// </summary>
    public ValidationResult ValidationResult { get; set; } = new ValidationResult { IsValid = true };

    /// <summary>
    /// Estimated total execution time in milliseconds (from historical data).
    /// Null if no historical data is available.
    /// </summary>
    public long? EstimatedDurationMs { get; set; }

    /// <summary>
    /// Template previews for each task, showing resolved input values and task output placeholders.
    /// Key: task ID, Value: dictionary of template expressions to resolved values.
    /// </summary>
    public Dictionary<string, Dictionary<string, string>> TemplatePreviews { get; set; } = new Dictionary<string, Dictionary<string, string>>();
}
