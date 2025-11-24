using WorkflowCore.Models;

namespace WorkflowGateway.Models;

/// <summary>
/// Detailed execution trace showing timing breakdown, dependency resolution, and parallel execution analysis.
/// </summary>
public class ExecutionTraceResponse
{
    /// <summary>
    /// Unique execution identifier.
    /// </summary>
    public Guid ExecutionId { get; set; }

    /// <summary>
    /// Name of the workflow that was executed.
    /// </summary>
    public string WorkflowName { get; set; } = string.Empty;

    /// <summary>
    /// When the workflow execution started (UTC).
    /// </summary>
    public DateTime StartedAt { get; set; }

    /// <summary>
    /// When the workflow execution completed (UTC).
    /// Null if still running.
    /// </summary>
    public DateTime? CompletedAt { get; set; }

    /// <summary>
    /// Total workflow execution duration in milliseconds.
    /// Null if still running.
    /// </summary>
    public long? TotalDurationMs { get; set; }

    /// <summary>
    /// Detailed timing breakdown for each task.
    /// </summary>
    public List<TaskTimingDetail> TaskTimings { get; set; } = new List<TaskTimingDetail>();

    /// <summary>
    /// Dependency resolution order showing which tasks blocked on which.
    /// </summary>
    public List<DependencyInfo> DependencyOrder { get; set; } = new List<DependencyInfo>();

    /// <summary>
    /// Planned parallel groups from execution graph (based on dependencies).
    /// </summary>
    public List<ParallelGroup> PlannedParallelGroups { get; set; } = new List<ParallelGroup>();

    /// <summary>
    /// Actual parallel execution detected from timing analysis (tasks that overlapped).
    /// </summary>
    public List<ActualParallelGroup> ActualParallelGroups { get; set; } = new List<ActualParallelGroup>();
}
