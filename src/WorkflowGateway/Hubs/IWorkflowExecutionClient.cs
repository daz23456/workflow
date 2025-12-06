/**
 * Workflow Execution Client Interface
 *
 * Type-safe interface for SignalR client methods.
 */

using System.Threading.Tasks;
using WorkflowGateway.Models;

namespace WorkflowGateway.Hubs;

/// <summary>
/// Interface defining client-side methods that can be invoked from the server
/// </summary>
public interface IWorkflowExecutionClient
{
    /// <summary>
    /// Notifies client that a workflow execution has started
    /// </summary>
    Task WorkflowStarted(WorkflowStartedEvent workflowEvent);

    /// <summary>
    /// Notifies client that a task has started
    /// </summary>
    Task TaskStarted(TaskStartedEvent taskEvent);

    /// <summary>
    /// Notifies client that a task has completed
    /// </summary>
    Task TaskCompleted(TaskCompletedEvent taskEvent);

    /// <summary>
    /// Notifies client that a workflow has completed
    /// </summary>
    Task WorkflowCompleted(WorkflowCompletedEvent workflowEvent);

    /// <summary>
    /// Notifies client that a signal is flowing from one task to another.
    /// Used for neural visualization to animate data flow along edges.
    /// </summary>
    Task SignalFlow(SignalFlowEvent signalEvent);

    /// <summary>
    /// Notifies client that a performance anomaly was detected during execution.
    /// </summary>
    Task AnomalyDetected(AnomalyDetectedEvent anomalyEvent);
}
