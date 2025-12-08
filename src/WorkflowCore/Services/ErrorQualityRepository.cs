using Microsoft.EntityFrameworkCore;
using WorkflowCore.Data;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// EF Core implementation of IErrorQualityRepository.
/// </summary>
public class ErrorQualityRepository : IErrorQualityRepository
{
    private readonly WorkflowDbContext _context;

    public ErrorQualityRepository(WorkflowDbContext context)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
    }

    /// <inheritdoc/>
    public async Task<ErrorQualityRecord> SaveAsync(
        ErrorQualityRecord record,
        CancellationToken cancellationToken = default)
    {
        if (record == null)
            throw new ArgumentNullException(nameof(record));

        _context.ErrorQualityRecords.Add(record);
        await _context.SaveChangesAsync(cancellationToken);
        return record;
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<ErrorQualityRecord>> GetByTaskAsync(
        string taskRef,
        int limit = 100,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(taskRef))
            throw new ArgumentException("Task reference cannot be empty", nameof(taskRef));

        return await _context.ErrorQualityRecords
            .Where(r => r.TaskRef == taskRef)
            .OrderByDescending(r => r.AnalyzedAt)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<ErrorQualityRecord>> GetByWorkflowAsync(
        string workflowName,
        int limit = 100,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(workflowName))
            throw new ArgumentException("Workflow name cannot be empty", nameof(workflowName));

        return await _context.ErrorQualityRecords
            .Where(r => r.WorkflowName == workflowName)
            .OrderByDescending(r => r.AnalyzedAt)
            .Take(limit)
            .ToListAsync(cancellationToken);
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<ErrorQualityRecord>> GetByExecutionAsync(
        Guid executionId,
        CancellationToken cancellationToken = default)
    {
        return await _context.ErrorQualityRecords
            .Where(r => r.ExecutionId == executionId)
            .OrderBy(r => r.AnalyzedAt)
            .ToListAsync(cancellationToken);
    }

    /// <inheritdoc/>
    public async Task<double?> GetAverageStarsForTaskAsync(
        string taskRef,
        DateTime? since = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(taskRef))
            throw new ArgumentException("Task reference cannot be empty", nameof(taskRef));

        var query = _context.ErrorQualityRecords
            .Where(r => r.TaskRef == taskRef);

        if (since.HasValue)
        {
            query = query.Where(r => r.AnalyzedAt >= since.Value);
        }

        var records = await query.Select(r => r.Stars).ToListAsync(cancellationToken);

        if (records.Count == 0)
            return null;

        return records.Average();
    }

    /// <inheritdoc/>
    public async Task<double?> GetAverageStarsForWorkflowAsync(
        string workflowName,
        DateTime? since = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(workflowName))
            throw new ArgumentException("Workflow name cannot be empty", nameof(workflowName));

        var query = _context.ErrorQualityRecords
            .Where(r => r.WorkflowName == workflowName);

        if (since.HasValue)
        {
            query = query.Where(r => r.AnalyzedAt >= since.Value);
        }

        var records = await query.Select(r => r.Stars).ToListAsync(cancellationToken);

        if (records.Count == 0)
            return null;

        return records.Average();
    }

    /// <inheritdoc/>
    public async Task<IReadOnlyList<ErrorQualityTrendPoint>> GetTrendsAsync(
        string workflowName,
        DateTime since,
        DateTime until,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(workflowName))
            throw new ArgumentException("Workflow name cannot be empty", nameof(workflowName));

        var records = await _context.ErrorQualityRecords
            .Where(r => r.WorkflowName == workflowName)
            .Where(r => r.AnalyzedAt >= since && r.AnalyzedAt <= until)
            .ToListAsync(cancellationToken);

        // Group by date and calculate aggregates
        var trends = records
            .GroupBy(r => r.AnalyzedAt.Date)
            .Select(g => new ErrorQualityTrendPoint
            {
                Date = g.Key,
                AverageStars = g.Average(r => r.Stars),
                Count = g.Count(),
                CriteriaPercentages = CalculateCriteriaPercentages(g.ToList())
            })
            .OrderBy(t => t.Date)
            .ToList();

        return trends;
    }

    private static Dictionary<string, double> CalculateCriteriaPercentages(List<ErrorQualityRecord> records)
    {
        if (records.Count == 0)
            return new Dictionary<string, double>();

        var result = new Dictionary<string, double>();
        var count = (double)records.Count;

        // Calculate percentage of records meeting each criterion
        result["HasMessage"] = records.Count(r =>
            ((ErrorQualityCriteria)r.CriteriaMet).HasFlag(ErrorQualityCriteria.HasMessage)) / count * 100;

        result["HasErrorCode"] = records.Count(r =>
            ((ErrorQualityCriteria)r.CriteriaMet).HasFlag(ErrorQualityCriteria.HasErrorCode)) / count * 100;

        result["AppropriateHttpStatus"] = records.Count(r =>
            ((ErrorQualityCriteria)r.CriteriaMet).HasFlag(ErrorQualityCriteria.AppropriateHttpStatus)) / count * 100;

        result["HasRequestId"] = records.Count(r =>
            ((ErrorQualityCriteria)r.CriteriaMet).HasFlag(ErrorQualityCriteria.HasRequestId)) / count * 100;

        result["HasActionableSuggestion"] = records.Count(r =>
            ((ErrorQualityCriteria)r.CriteriaMet).HasFlag(ErrorQualityCriteria.HasActionableSuggestion)) / count * 100;

        return result;
    }
}
