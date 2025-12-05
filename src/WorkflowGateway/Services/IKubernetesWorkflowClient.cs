using WorkflowCore.Models;

namespace WorkflowGateway.Services;

public interface IKubernetesWorkflowClient
{
    Task<List<WorkflowResource>> ListWorkflowsAsync(string @namespace, CancellationToken cancellationToken = default);
    Task<List<WorkflowTaskResource>> ListTasksAsync(string @namespace, CancellationToken cancellationToken = default);
    Task<List<WorkflowResource>> ListWorkflowsFromNamespacesAsync(IEnumerable<string> namespaces, CancellationToken cancellationToken = default);
    Task<List<WorkflowTaskResource>> ListTasksFromNamespacesAsync(IEnumerable<string> namespaces, CancellationToken cancellationToken = default);

    /// <summary>
    /// List all workflows across all namespaces (cluster-wide query)
    /// </summary>
    Task<List<WorkflowResource>> ListAllWorkflowsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// List all tasks across all namespaces (cluster-wide query)
    /// </summary>
    Task<List<WorkflowTaskResource>> ListAllTasksAsync(CancellationToken cancellationToken = default);
}
