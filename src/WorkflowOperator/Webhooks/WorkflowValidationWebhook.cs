using WorkflowCore.Models;
using WorkflowCore.Services;

namespace WorkflowOperator.Webhooks;

public class WorkflowValidationWebhook
{
    private readonly ITemplateParser _templateParser;
    private readonly IExecutionGraphBuilder _graphBuilder;

    public WorkflowValidationWebhook(
        ITemplateParser templateParser,
        IExecutionGraphBuilder graphBuilder)
    {
        _templateParser = templateParser ?? throw new ArgumentNullException(nameof(templateParser));
        _graphBuilder = graphBuilder ?? throw new ArgumentNullException(nameof(graphBuilder));
    }

    public async Task<AdmissionResult> ValidateAsync(
        WorkflowResource workflow,
        List<WorkflowTaskResource> availableTasks)
    {
        // Validate workflow has tasks
        if (workflow.Spec.Tasks == null || workflow.Spec.Tasks.Count == 0)
        {
            return AdmissionResult.Deny("Workflow must have at least one task");
        }

        // Build task lookup
        var taskLookup = availableTasks.ToDictionary(t => t.Metadata.Name, t => t);

        // Validate all task references exist
        foreach (var step in workflow.Spec.Tasks)
        {
            if (!taskLookup.ContainsKey(step.TaskRef))
            {
                var availableTaskNames = string.Join(", ", taskLookup.Keys);
                return AdmissionResult.Deny(
                    $"Task reference '{step.TaskRef}' not found. Available tasks: {availableTaskNames}");
            }

            // Validate templates in inputs
            foreach (var (inputKey, inputTemplate) in step.Input)
            {
                var parseResult = _templateParser.Parse(inputTemplate);
                if (!parseResult.IsValid)
                {
                    var errors = string.Join("; ", parseResult.Errors);
                    return AdmissionResult.Deny(
                        $"Invalid template in task '{step.Id}', input '{inputKey}': {errors}");
                }
            }
        }

        // Validate execution graph (detect circular dependencies)
        var graphResult = _graphBuilder.Build(workflow);
        if (!graphResult.IsValid)
        {
            var errors = string.Join("; ", graphResult.Errors.Select(e => e.Message));
            return AdmissionResult.Deny($"Workflow validation failed: {errors}");
        }

        return await Task.FromResult(AdmissionResult.Allow());
    }
}
