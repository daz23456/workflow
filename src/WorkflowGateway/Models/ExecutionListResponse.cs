namespace WorkflowGateway.Models;

/// <summary>
/// Response model for listing workflow executions with pagination support.
/// </summary>
public class ExecutionListResponse
{
    /// <summary>
    /// Name of the workflow these executions belong to.
    /// </summary>
    public string? WorkflowName { get; set; }

    /// <summary>
    /// List of execution summaries.
    /// </summary>
    public List<ExecutionSummary> Executions { get; set; } = new();

    /// <summary>
    /// Total number of executions matching the query (before pagination).
    /// </summary>
    public int TotalCount { get; set; }

    /// <summary>
    /// Number of executions skipped (pagination offset).
    /// </summary>
    public int Skip { get; set; }

    /// <summary>
    /// Number of executions to return (page size).
    /// </summary>
    public int Take { get; set; }
}
