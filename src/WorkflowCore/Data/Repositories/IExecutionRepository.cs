using WorkflowCore.Models;

namespace WorkflowCore.Data.Repositories;

/// <summary>
/// Repository for managing workflow execution records.
/// </summary>
public interface IExecutionRepository
{
    /// <summary>
    /// Saves an execution record (insert or update).
    /// </summary>
    /// <param name="record">The execution record to save.</param>
    /// <returns>The saved execution record.</returns>
    Task<ExecutionRecord> SaveExecutionAsync(ExecutionRecord record);

    /// <summary>
    /// Gets an execution record by ID, including task execution records.
    /// </summary>
    /// <param name="id">The execution ID.</param>
    /// <returns>The execution record, or null if not found.</returns>
    Task<ExecutionRecord?> GetExecutionAsync(Guid id);

    /// <summary>
    /// Lists execution records with optional filtering and pagination.
    /// Results are ordered by StartedAt descending (most recent first).
    /// </summary>
    /// <param name="workflowName">Optional workflow name filter.</param>
    /// <param name="status">Optional status filter.</param>
    /// <param name="skip">Number of records to skip (for pagination).</param>
    /// <param name="take">Number of records to take (for pagination).</param>
    /// <returns>List of execution records matching the filters.</returns>
    Task<List<ExecutionRecord>> ListExecutionsAsync(
        string? workflowName,
        ExecutionStatus? status,
        int skip,
        int take);

    /// <summary>
    /// Gets average task durations from historical successful executions.
    /// Filters to the specified time window and only includes successful executions.
    /// </summary>
    /// <param name="workflowName">The workflow name to filter by.</param>
    /// <param name="daysBack">Number of days to look back (default: 30).</param>
    /// <returns>Dictionary mapping task reference name to average duration in milliseconds.</returns>
    Task<Dictionary<string, long>> GetAverageTaskDurationsAsync(string workflowName, int daysBack = 30);

    /// <summary>
    /// Gets execution history for a specific task across all workflows.
    /// Results are ordered by StartedAt descending (most recent first).
    /// </summary>
    /// <param name="taskName">The task reference name to filter by.</param>
    /// <param name="skip">Number of records to skip (for pagination).</param>
    /// <param name="take">Number of records to take (for pagination).</param>
    /// <returns>List of tuples containing execution record and task execution record.</returns>
    Task<List<(ExecutionRecord Execution, TaskExecutionRecord Task)>> GetTaskExecutionsAsync(
        string taskName,
        int skip,
        int take);

    /// <summary>
    /// Gets aggregate statistics for a specific task across all workflows.
    /// </summary>
    /// <param name="taskName">The task reference name to calculate statistics for.</param>
    /// <returns>Task statistics including total executions, average duration, success rate, and last execution time.</returns>
    Task<TaskStatistics?> GetTaskStatisticsAsync(string taskName);

    /// <summary>
    /// Gets duration trends for a workflow over time, grouped by date.
    /// Includes average, min, max, P50, P95 durations and execution counts.
    /// </summary>
    /// <param name="workflowName">The workflow name to analyze.</param>
    /// <param name="daysBack">Number of days to look back (default: 30, max: 90).</param>
    /// <returns>List of data points, one per day, ordered by date ascending.</returns>
    Task<List<DurationDataPoint>> GetWorkflowDurationTrendsAsync(string workflowName, int daysBack = 30);

    /// <summary>
    /// Gets duration trends for a task over time (across all workflows), grouped by date.
    /// Includes average, min, max, P50, P95 durations and execution counts.
    /// </summary>
    /// <param name="taskName">The task reference name to analyze.</param>
    /// <param name="daysBack">Number of days to look back (default: 30, max: 90).</param>
    /// <returns>List of data points, one per day, ordered by date ascending.</returns>
    Task<List<DurationDataPoint>> GetTaskDurationTrendsAsync(string taskName, int daysBack = 30);

    /// <summary>
    /// Gets aggregate statistics for a specific workflow.
    /// </summary>
    /// <param name="workflowName">The workflow name to calculate statistics for.</param>
    /// <returns>Workflow statistics including total executions, average duration, success rate, and last execution time.</returns>
    Task<WorkflowStatistics?> GetWorkflowStatisticsAsync(string workflowName);

    /// <summary>
    /// Gets aggregate statistics for all workflows in a single query.
    /// More efficient than calling GetWorkflowStatisticsAsync for each workflow.
    /// </summary>
    /// <returns>Dictionary mapping workflow name to its statistics.</returns>
    Task<Dictionary<string, WorkflowStatistics>> GetAllWorkflowStatisticsAsync();

    /// <summary>
    /// Gets aggregate statistics for all tasks in a single query.
    /// More efficient than calling GetTaskStatisticsAsync for each task.
    /// </summary>
    /// <returns>Dictionary mapping task name to its statistics.</returns>
    Task<Dictionary<string, TaskStatistics>> GetAllTaskStatisticsAsync();
}

/// <summary>
/// Statistics for a workflow.
/// </summary>
public class WorkflowStatistics
{
    /// <summary>
    /// Total number of workflow executions.
    /// </summary>
    public int TotalExecutions { get; set; }

    /// <summary>
    /// Average duration in milliseconds (only successful executions).
    /// </summary>
    public long AverageDurationMs { get; set; }

    /// <summary>
    /// Success rate as a percentage (0-100).
    /// </summary>
    public double SuccessRate { get; set; }

    /// <summary>
    /// Timestamp of the most recent execution, or null if never executed.
    /// </summary>
    public DateTime? LastExecuted { get; set; }
}

/// <summary>
/// Statistics for a task across all workflows.
/// </summary>
public class TaskStatistics
{
    /// <summary>
    /// Total number of task executions across all workflows.
    /// </summary>
    public int TotalExecutions { get; set; }

    /// <summary>
    /// Average duration in milliseconds (only successful executions).
    /// </summary>
    public long AverageDurationMs { get; set; }

    /// <summary>
    /// Success rate as a percentage (0-100).
    /// </summary>
    public double SuccessRate { get; set; }

    /// <summary>
    /// Timestamp of the most recent execution, or null if never executed.
    /// </summary>
    public DateTime? LastExecuted { get; set; }
}
