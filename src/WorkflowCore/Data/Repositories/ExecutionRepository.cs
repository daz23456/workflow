using Microsoft.EntityFrameworkCore;
using WorkflowCore.Models;

namespace WorkflowCore.Data.Repositories;

/// <summary>
/// Repository for managing workflow execution records.
/// </summary>
public class ExecutionRepository : IExecutionRepository
{
    private readonly WorkflowDbContext _context;

    public ExecutionRepository(WorkflowDbContext context)
    {
        _context = context;
    }

    /// <inheritdoc />
    public async Task<ExecutionRecord> SaveExecutionAsync(ExecutionRecord record)
    {
        var existing = await _context.ExecutionRecords
            .AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == record.Id);

        if (existing == null)
        {
            _context.ExecutionRecords.Add(record);
        }
        else
        {
            _context.ExecutionRecords.Update(record);
        }

        await _context.SaveChangesAsync();
        return record;
    }

    /// <inheritdoc />
    public async Task<ExecutionRecord?> GetExecutionAsync(Guid id)
    {
        return await _context.ExecutionRecords
            .Include(e => e.TaskExecutionRecords)
            .FirstOrDefaultAsync(e => e.Id == id);
    }

    /// <inheritdoc />
    public async Task<List<ExecutionRecord>> ListExecutionsAsync(
        string? workflowName,
        ExecutionStatus? status,
        int skip,
        int take)
    {
        var query = _context.ExecutionRecords.AsQueryable();

        if (!string.IsNullOrEmpty(workflowName))
        {
            query = query.Where(e => e.WorkflowName == workflowName);
        }

        if (status.HasValue)
        {
            query = query.Where(e => e.Status == status.Value);
        }

        return await query
            .OrderByDescending(e => e.StartedAt)
            .Skip(skip)
            .Take(take)
            .ToListAsync();
    }
}
