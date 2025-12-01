using System.Text.Json.Serialization;

namespace WorkflowGateway.Models;

public class WorkflowExecutionResponse
{
    [JsonPropertyName("executionId")]
    public Guid ExecutionId { get; set; }

    [JsonPropertyName("workflowName")]
    public string WorkflowName { get; set; } = string.Empty;

    [JsonPropertyName("success")]
    public bool Success { get; set; }

    [JsonPropertyName("output")]
    public Dictionary<string, object>? Output { get; set; }

    [JsonPropertyName("executedTasks")]
    public List<string> ExecutedTasks { get; set; } = new();

    [JsonPropertyName("taskDetails")]
    public List<TaskExecutionDetail> TaskDetails { get; set; } = new();

    [JsonPropertyName("executionTimeMs")]
    public long ExecutionTimeMs { get; set; }

    /// <summary>
    /// Time taken to build the execution graph in milliseconds.
    /// </summary>
    [JsonPropertyName("graphBuildDurationMs")]
    public long GraphBuildDurationMs { get; set; }

    /// <summary>
    /// Detailed orchestration cost breakdown showing where time is spent outside of task execution.
    /// Useful for debugging performance issues and understanding orchestration overhead.
    /// </summary>
    [JsonPropertyName("orchestrationCost")]
    public OrchestrationCostResponse? OrchestrationCost { get; set; }

    /// <summary>
    /// Diagnostic information about dependency detection (for debugging dependency issues)
    /// </summary>
    [JsonPropertyName("graphDiagnostics")]
    public GraphDiagnosticsResponse? GraphDiagnostics { get; set; }

    [JsonPropertyName("error")]
    public string? Error { get; set; }
}

/// <summary>
/// Orchestration cost breakdown for API response
/// </summary>
public class OrchestrationCostResponse
{
    /// <summary>
    /// Time from execution start to first task start (graph build + setup) in microseconds
    /// </summary>
    [JsonPropertyName("setupDurationMicros")]
    public long SetupDurationMicros { get; set; }

    /// <summary>
    /// Time from last task completion to execution complete (output mapping + cleanup) in microseconds
    /// </summary>
    [JsonPropertyName("teardownDurationMicros")]
    public long TeardownDurationMicros { get; set; }

    /// <summary>
    /// Time spent scheduling between task batches in microseconds
    /// </summary>
    [JsonPropertyName("schedulingOverheadMicros")]
    public long SchedulingOverheadMicros { get; set; }

    /// <summary>
    /// Total orchestration cost (setup + teardown + scheduling) in microseconds
    /// </summary>
    [JsonPropertyName("totalOrchestrationCostMicros")]
    public long TotalOrchestrationCostMicros { get; set; }

    /// <summary>
    /// What percentage of total execution time was orchestration overhead.
    /// Lower is better. Ideal: less than 5%
    /// </summary>
    [JsonPropertyName("orchestrationCostPercentage")]
    public double OrchestrationCostPercentage { get; set; }

    /// <summary>
    /// Number of execution iterations (batches of parallel tasks)
    /// </summary>
    [JsonPropertyName("executionIterations")]
    public int ExecutionIterations { get; set; }

    /// <summary>
    /// Per-iteration timing details
    /// </summary>
    [JsonPropertyName("iterations")]
    public List<IterationTimingResponse>? Iterations { get; set; }
}

/// <summary>
/// Per-iteration timing for API response
/// </summary>
public class IterationTimingResponse
{
    [JsonPropertyName("iteration")]
    public int Iteration { get; set; }

    [JsonPropertyName("taskIds")]
    public List<string> TaskIds { get; set; } = new();

    /// <summary>
    /// Duration of this iteration (all tasks in batch) in microseconds
    /// </summary>
    [JsonPropertyName("durationMicros")]
    public long DurationMicros { get; set; }

    /// <summary>
    /// Scheduling delay before this iteration started (time from previous iteration end) in microseconds
    /// </summary>
    [JsonPropertyName("schedulingDelayMicros")]
    public long SchedulingDelayMicros { get; set; }
}

/// <summary>
/// Graph diagnostics for API response (debugging dependency issues)
/// </summary>
public class GraphDiagnosticsResponse
{
    [JsonPropertyName("tasks")]
    public List<TaskDependencyDiagnosticResponse> Tasks { get; set; } = new();
}

/// <summary>
/// Per-task dependency diagnostic for API response
/// </summary>
public class TaskDependencyDiagnosticResponse
{
    [JsonPropertyName("taskId")]
    public string TaskId { get; set; } = string.Empty;

    /// <summary>
    /// Dependencies explicitly declared via dependsOn
    /// </summary>
    [JsonPropertyName("explicitDependencies")]
    public List<string> ExplicitDependencies { get; set; } = new();

    /// <summary>
    /// Dependencies inferred from template expressions (e.g., {{tasks.X.output.Y}})
    /// </summary>
    [JsonPropertyName("implicitDependencies")]
    public List<string> ImplicitDependencies { get; set; } = new();
}
