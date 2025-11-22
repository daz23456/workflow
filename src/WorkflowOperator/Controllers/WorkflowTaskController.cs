using WorkflowCore.Models;

namespace WorkflowOperator.Controllers;

public class WorkflowTaskController
{
    public async Task ReconcileAsync(WorkflowTaskResource entity)
    {
        // Initialize status if null
        if (entity.Status == null)
        {
            entity.Status = new WorkflowTaskStatus();
        }

        // Update last updated timestamp
        entity.Status.LastUpdated = DateTime.UtcNow;

        // Initialize usage count if this is a new resource (status was null)
        // Preserve existing count if status already existed

        await Task.CompletedTask;
    }

    public async Task DeletedAsync(WorkflowTaskResource entity)
    {
        // Log deletion event (in production, this would use ILogger)
        await Task.CompletedTask;
    }
}
