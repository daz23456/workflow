using WorkflowCore.Models;

namespace WorkflowOperator.Controllers;

public class WorkflowController
{
    public async Task ReconcileAsync(WorkflowResource entity)
    {
        // Initialize status if null
        if (entity.Status == null)
        {
            entity.Status = new WorkflowStatus
            {
                Phase = "Ready",
                ExecutionCount = 0,
                LastExecuted = default
            };
        }
        else
        {
            // Preserve existing execution count and last executed
            // Just ensure phase is set appropriately
            if (string.IsNullOrEmpty(entity.Status.Phase))
            {
                entity.Status.Phase = "Ready";
            }
        }

        await Task.CompletedTask;
    }

    public async Task DeletedAsync(WorkflowResource entity)
    {
        // Log deletion event (in production, this would use ILogger)
        await Task.CompletedTask;
    }
}
