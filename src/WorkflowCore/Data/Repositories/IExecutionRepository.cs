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
}
