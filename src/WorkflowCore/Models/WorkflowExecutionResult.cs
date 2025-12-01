using WorkflowCore.Services;

namespace WorkflowCore.Models;

public class WorkflowExecutionResult
{
    public bool Success { get; set; }
    public Dictionary<string, object>? Output { get; set; }
    public Dictionary<string, TaskExecutionResult> TaskResults { get; set; } = new();
    public List<string> Errors { get; set; } = new();
    public TimeSpan TotalDuration { get; set; }

    /// <summary>
    /// Time taken to build the execution graph. Used for performance monitoring.
    /// </summary>
    public TimeSpan GraphBuildDuration { get; set; }

    /// <summary>
    /// Detailed orchestration cost breakdown showing where time is spent
    /// </summary>
    public OrchestrationCostMetrics? OrchestrationCost { get; set; }

    /// <summary>
    /// Diagnostic information from graph building (dependency detection)
    /// </summary>
    public GraphBuildDiagnostics? GraphDiagnostics { get; set; }
}

/// <summary>
/// Detailed breakdown of orchestration overhead costs.
/// All durations exclude actual task execution time.
/// </summary>
public class OrchestrationCostMetrics
{
    /// <summary>
    /// When the workflow execution started (stopwatch started)
    /// </summary>
    public DateTime ExecutionStartedAt { get; set; }

    /// <summary>
    /// When the first task actually started executing
    /// </summary>
    public DateTime FirstTaskStartedAt { get; set; }

    /// <summary>
    /// When the last task finished executing
    /// </summary>
    public DateTime LastTaskCompletedAt { get; set; }

    /// <summary>
    /// When workflow execution completed (result returned)
    /// </summary>
    public DateTime ExecutionCompletedAt { get; set; }

    /// <summary>
    /// Time from execution start to first task start (graph build + setup)
    /// </summary>
    public TimeSpan SetupDuration => FirstTaskStartedAt - ExecutionStartedAt;

    /// <summary>
    /// Time from last task completion to execution complete (output mapping + cleanup)
    /// </summary>
    public TimeSpan TeardownDuration => ExecutionCompletedAt - LastTaskCompletedAt;

    /// <summary>
    /// Total time tasks were actually executing (sum of all task durations, accounting for parallelism)
    /// </summary>
    public TimeSpan TotalTaskExecutionTime { get; set; }

    /// <summary>
    /// Time spent scheduling between task batches (orchestration overhead)
    /// </summary>
    public TimeSpan SchedulingOverhead { get; set; }

    /// <summary>
    /// Total orchestration cost = Setup + Teardown + Scheduling
    /// This is the "tax" paid for orchestration, not including task execution
    /// </summary>
    public TimeSpan TotalOrchestrationCost => SetupDuration + TeardownDuration + SchedulingOverhead;

    /// <summary>
    /// What percentage of total execution time was orchestration overhead
    /// Lower is better. Ideal: < 5%
    /// </summary>
    public double OrchestrationCostPercentage { get; set; }

    /// <summary>
    /// Number of execution iterations (batches of parallel tasks)
    /// </summary>
    public int ExecutionIterations { get; set; }

    /// <summary>
    /// Per-iteration timing details for debugging scheduling issues
    /// </summary>
    public List<IterationTiming> IterationTimings { get; set; } = new();
}

/// <summary>
/// Timing details for a single iteration (batch of parallel tasks)
/// </summary>
public class IterationTiming
{
    /// <summary>
    /// Iteration number (1-based)
    /// </summary>
    public int Iteration { get; set; }

    /// <summary>
    /// When this iteration's ready-check started
    /// </summary>
    public DateTime StartedAt { get; set; }

    /// <summary>
    /// When all tasks in this iteration completed
    /// </summary>
    public DateTime CompletedAt { get; set; }

    /// <summary>
    /// Task IDs executed in this iteration
    /// </summary>
    public List<string> TaskIds { get; set; } = new();

    /// <summary>
    /// Time from previous iteration completion to this iteration start (scheduling delay)
    /// </summary>
    public TimeSpan SchedulingDelay { get; set; }
}
