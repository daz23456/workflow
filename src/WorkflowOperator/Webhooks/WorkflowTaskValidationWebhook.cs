using WorkflowCore.Models;
using WorkflowCore.Services;

namespace WorkflowOperator.Webhooks;

public class WorkflowTaskValidationWebhook
{
    private readonly ISchemaValidator _schemaValidator;
    private static readonly HashSet<string> SupportedTypes = new() { "http" };
    private static readonly HashSet<string> AllowedHttpMethods = new() { "GET", "POST", "PUT", "DELETE", "PATCH" };

    public WorkflowTaskValidationWebhook(ISchemaValidator schemaValidator)
    {
        _schemaValidator = schemaValidator ?? throw new ArgumentNullException(nameof(schemaValidator));
    }

    public async Task<AdmissionResult> ValidateAsync(WorkflowTaskResource task)
    {
        // Validate task type
        if (string.IsNullOrWhiteSpace(task.Spec.Type))
        {
            return AdmissionResult.Deny("Task type is required");
        }

        if (!SupportedTypes.Contains(task.Spec.Type))
        {
            return AdmissionResult.Deny(
                $"Unsupported task type '{task.Spec.Type}'. Supported types: {string.Join(", ", SupportedTypes)}");
        }

        // Validate HTTP-specific requirements
        if (task.Spec.Type == "http")
        {
            if (task.Spec.Request == null)
            {
                return AdmissionResult.Deny("HTTP tasks must have a request definition");
            }

            if (string.IsNullOrWhiteSpace(task.Spec.Request.Url))
            {
                return AdmissionResult.Deny("HTTP tasks must have a URL");
            }

            if (!AllowedHttpMethods.Contains(task.Spec.Request.Method?.ToUpperInvariant() ?? ""))
            {
                return AdmissionResult.Deny(
                    $"Invalid HTTP method '{task.Spec.Request.Method}'. Allowed: {string.Join(", ", AllowedHttpMethods)}");
            }
        }

        return await Task.FromResult(AdmissionResult.Allow());
    }
}

public class AdmissionResult
{
    public bool Allowed { get; set; }
    public string? Message { get; set; }

    public static AdmissionResult Allow() => new() { Allowed = true };
    public static AdmissionResult Deny(string message) => new() { Allowed = false, Message = message };
}
