using WorkflowCore.Models;
using WorkflowGateway.Models;

namespace WorkflowGateway.Services;

/// <summary>
/// Service for validating workflow input against its schema.
/// Stage 15: MCP Server for External Workflow Consumption
/// </summary>
public interface IWorkflowInputValidator
{
    /// <summary>
    /// Validates input data against a workflow's input schema.
    /// </summary>
    /// <param name="workflow">The workflow to validate against.</param>
    /// <param name="input">The input data to validate.</param>
    /// <returns>Validation result with missing/invalid inputs and suggested prompt.</returns>
    InputValidationResult ValidateInput(WorkflowResource workflow, Dictionary<string, object>? input);
}
