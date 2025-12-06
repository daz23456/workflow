using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Parses and resolves workflow references.
/// Stage 21.1: WorkflowRef Resolution
/// </summary>
public class WorkflowRefResolver : IWorkflowRefResolver
{
    /// <inheritdoc />
    public WorkflowRefSpec Parse(string workflowRef)
    {
        ArgumentNullException.ThrowIfNull(workflowRef);

        if (string.IsNullOrWhiteSpace(workflowRef))
        {
            throw new ArgumentException("Workflow reference cannot be empty or whitespace.", nameof(workflowRef));
        }

        var spec = new WorkflowRefSpec();

        var remaining = workflowRef;

        // Parse version (everything after last @)
        var atIndex = remaining.LastIndexOf('@');
        if (atIndex > 0 && atIndex < remaining.Length - 1)
        {
            spec.Version = remaining[(atIndex + 1)..];
            remaining = remaining[..atIndex];
        }

        // Parse namespace (everything before first /)
        var slashIndex = remaining.IndexOf('/');
        if (slashIndex > 0)
        {
            spec.Namespace = remaining[..slashIndex];
            spec.Name = remaining[(slashIndex + 1)..];
        }
        else
        {
            spec.Name = remaining;
        }

        return spec;
    }

    /// <inheritdoc />
    public WorkflowResolutionResult Resolve(
        string workflowRef,
        Dictionary<string, WorkflowResource> availableWorkflows,
        string parentNamespace)
    {
        ArgumentNullException.ThrowIfNull(availableWorkflows);

        var spec = Parse(workflowRef);
        var targetNamespace = spec.Namespace ?? parentNamespace;

        // Try to find matching workflow
        WorkflowResource? matchedWorkflow = null;

        foreach (var (key, workflow) in availableWorkflows)
        {
            // Match by name and namespace
            if (workflow.Metadata.Name != spec.Name)
                continue;

            if (workflow.Metadata.Namespace != targetNamespace)
                continue;

            // Check version if specified
            if (spec.Version != null)
            {
                var workflowVersion = workflow.Metadata.Annotations?.GetValueOrDefault("workflow.io/version");
                if (workflowVersion != spec.Version)
                    continue;
            }

            matchedWorkflow = workflow;
            break;
        }

        if (matchedWorkflow == null)
        {
            if (spec.Version != null)
            {
                return WorkflowResolutionResult.Failure(
                    $"Workflow '{spec.Name}' with version '{spec.Version}' not found in namespace '{targetNamespace}'.");
            }

            return WorkflowResolutionResult.Failure(
                $"Workflow '{spec.Name}' not found in namespace '{targetNamespace}'.");
        }

        return WorkflowResolutionResult.Success(matchedWorkflow);
    }

    /// <inheritdoc />
    public TaskStepValidationResult ValidateTaskStep(WorkflowTaskStep taskStep)
    {
        var hasTaskRef = !string.IsNullOrEmpty(taskStep.TaskRef);
        var hasWorkflowRef = !string.IsNullOrEmpty(taskStep.WorkflowRef);
        var hasSwitch = taskStep.Switch != null;

        // Both taskRef and workflowRef specified - invalid
        if (hasTaskRef && hasWorkflowRef)
        {
            return TaskStepValidationResult.Invalid(
                $"Task '{taskStep.Id}': taskRef and workflowRef are mutually exclusive. Use one or the other.");
        }

        // Neither specified and no switch - invalid
        if (!hasTaskRef && !hasWorkflowRef && !hasSwitch)
        {
            return TaskStepValidationResult.Invalid(
                $"Task '{taskStep.Id}': must have either taskRef, workflowRef, or switch.");
        }

        return TaskStepValidationResult.Valid();
    }
}
