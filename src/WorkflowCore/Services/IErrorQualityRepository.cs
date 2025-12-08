using WorkflowCore.Data;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Repository for storing and retrieving error quality analysis records.
/// </summary>
public interface IErrorQualityRepository
{
    /// <summary>
    /// Saves an error quality record to the database.
    /// </summary>
    Task<ErrorQualityRecord> SaveAsync(ErrorQualityRecord record, CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets error quality records for a specific task.
    /// </summary>
    Task<IReadOnlyList<ErrorQualityRecord>> GetByTaskAsync(
        string taskRef,
        int limit = 100,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets error quality records for a specific workflow.
    /// </summary>
    Task<IReadOnlyList<ErrorQualityRecord>> GetByWorkflowAsync(
        string workflowName,
        int limit = 100,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets error quality records for a specific execution.
    /// </summary>
    Task<IReadOnlyList<ErrorQualityRecord>> GetByExecutionAsync(
        Guid executionId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the average star rating for a task over a time period.
    /// </summary>
    Task<double?> GetAverageStarsForTaskAsync(
        string taskRef,
        DateTime? since = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets the average star rating for a workflow over a time period.
    /// </summary>
    Task<double?> GetAverageStarsForWorkflowAsync(
        string workflowName,
        DateTime? since = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Gets error quality trends (star ratings over time) for a workflow.
    /// </summary>
    Task<IReadOnlyList<ErrorQualityTrendPoint>> GetTrendsAsync(
        string workflowName,
        DateTime since,
        DateTime until,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// A single data point in error quality trends.
/// </summary>
public class ErrorQualityTrendPoint
{
    /// <summary>
    /// The date of this data point
    /// </summary>
    public DateTime Date { get; set; }

    /// <summary>
    /// Average star rating on this date
    /// </summary>
    public double AverageStars { get; set; }

    /// <summary>
    /// Number of error quality records analyzed on this date
    /// </summary>
    public int Count { get; set; }

    /// <summary>
    /// Breakdown of criteria met (percentage of records meeting each criterion)
    /// </summary>
    public Dictionary<string, double> CriteriaPercentages { get; set; } = new();
}
