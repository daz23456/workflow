using Microsoft.EntityFrameworkCore;
using WorkflowCore.Models;

namespace WorkflowCore.Data.Repositories;

/// <summary>
/// Repository for managing workflow version records.
/// </summary>
public class WorkflowVersionRepository : IWorkflowVersionRepository
{
    private readonly WorkflowDbContext _context;

    public WorkflowVersionRepository(WorkflowDbContext context)
    {
        _context = context;
    }

    /// <inheritdoc />
    public async Task<WorkflowVersion> SaveVersionAsync(WorkflowVersion version)
    {
        _context.WorkflowVersions.Add(version);
        await _context.SaveChangesAsync();
        return version;
    }

    /// <inheritdoc />
    public async Task<List<WorkflowVersion>> GetVersionsAsync(string? workflowName)
    {
        return await _context.WorkflowVersions
            .Where(v => v.WorkflowName == workflowName)
            .OrderByDescending(v => v.CreatedAt)
            .ToListAsync();
    }

    /// <inheritdoc />
    public async Task<WorkflowVersion?> GetLatestVersionAsync(string? workflowName)
    {
        return await _context.WorkflowVersions
            .Where(v => v.WorkflowName == workflowName)
            .OrderByDescending(v => v.CreatedAt)
            .FirstOrDefaultAsync();
    }
}
