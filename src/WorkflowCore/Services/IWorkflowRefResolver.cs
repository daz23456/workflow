using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Interface for parsing and resolving workflow references.
/// Stage 21.1: WorkflowRef Resolution
/// </summary>
public interface IWorkflowRefResolver
{
    /// <summary>
    /// Parse a workflowRef string into a WorkflowRefSpec.
    /// </summary>
    /// <param name="workflowRef">The workflow reference string (e.g., "order-processing@v2")</param>
    /// <returns>Parsed specification with name, version, and namespace</returns>
    /// <exception cref="ArgumentNullException">If workflowRef is null</exception>
    /// <exception cref="ArgumentException">If workflowRef is empty or whitespace</exception>
    WorkflowRefSpec Parse(string workflowRef);

    /// <summary>
    /// Resolve a workflowRef to an actual WorkflowResource.
    /// </summary>
    /// <param name="workflowRef">The workflow reference string</param>
    /// <param name="availableWorkflows">Dictionary of available workflows</param>
    /// <param name="parentNamespace">The namespace of the parent workflow (used if not specified in ref)</param>
    /// <returns>Resolution result with the workflow or error</returns>
    WorkflowResolutionResult Resolve(
        string workflowRef,
        Dictionary<string, WorkflowResource> availableWorkflows,
        string parentNamespace);

    /// <summary>
    /// Validate a WorkflowTaskStep for taskRef/workflowRef mutual exclusivity.
    /// </summary>
    /// <param name="taskStep">The task step to validate</param>
    /// <returns>Validation result</returns>
    TaskStepValidationResult ValidateTaskStep(WorkflowTaskStep taskStep);
}
