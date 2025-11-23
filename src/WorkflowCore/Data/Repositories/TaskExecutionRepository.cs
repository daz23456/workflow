using Microsoft.EntityFrameworkCore;
using WorkflowCore.Models;

namespace WorkflowCore.Data.Repositories;

/// <summary>
/// Repository for managing task execution records.
/// </summary>
public class TaskExecutionRepository : ITaskExecutionRepository
{
    private readonly WorkflowDbContext _context;

    public TaskExecutionRepository(WorkflowDbContext context)
    {
        _context = context;
    }

    /// <inheritdoc />
    public async Task<TaskExecutionRecord> SaveTaskExecutionAsync(TaskExecutionRecord record)
    {
        var existing = await _context.TaskExecutionRecords
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == record.Id);

        if (existing == null)
        {
            _context.TaskExecutionRecords.Add(record);
        }
        else
        {
            _context.TaskExecutionRecords.Update(record);
        }

        await _context.SaveChangesAsync();
        return record;
    }

    /// <inheritdoc />
    public async Task<List<TaskExecutionRecord>> GetTaskExecutionsForExecutionAsync(Guid executionId)
    {
        return await _context.TaskExecutionRecords
            .Where(t => t.ExecutionId == executionId)
            .OrderBy(t => t.StartedAt)
            .ToListAsync();
    }
}
