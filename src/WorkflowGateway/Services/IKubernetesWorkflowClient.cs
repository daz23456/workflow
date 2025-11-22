using WorkflowCore.Models;

namespace WorkflowGateway.Services;

public interface IKubernetesWorkflowClient
{
    Task<List<WorkflowResource>> ListWorkflowsAsync(string @namespace, CancellationToken cancellationToken = default);
    Task<List<WorkflowTaskResource>> ListTasksAsync(string @namespace, CancellationToken cancellationToken = default);
}
