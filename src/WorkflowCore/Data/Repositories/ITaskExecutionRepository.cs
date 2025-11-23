using WorkflowCore.Models;

namespace WorkflowCore.Data.Repositories;

/// <summary>
/// Repository for managing task execution records.
/// </summary>
public interface ITaskExecutionRepository
{
    /// <summary>
    /// Saves a task execution record (insert or update).
    /// </summary>
    /// <param name="record">The task execution record to save.</param>
    /// <returns>The saved task execution record.</returns>
    Task<TaskExecutionRecord> SaveTaskExecutionAsync(TaskExecutionRecord record);

    /// <summary>
    /// Gets all task execution records for a specific workflow execution.
    /// Results are ordered by StartedAt ascending (execution order).
    /// </summary>
    /// <param name="executionId">The workflow execution ID.</param>
    /// <returns>List of task execution records for the execution.</returns>
    Task<List<TaskExecutionRecord>> GetTaskExecutionsForExecutionAsync(Guid executionId);
}
