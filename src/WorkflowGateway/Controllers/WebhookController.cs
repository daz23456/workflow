using System.Text.Json;
using Microsoft.AspNetCore.Mvc;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Services;

namespace WorkflowGateway.Controllers;

/// <summary>
/// Controller for receiving webhook callbacks and triggering workflows.
/// Webhooks allow external systems to trigger workflow execution via HTTP POST requests.
/// Supports HMAC-SHA256 signature validation for secure webhook delivery.
/// </summary>
/// <remarks>
/// Workflows can define webhook triggers in their specification with a unique path.
/// When a POST request is received at that path, the matching workflow is executed
/// with the webhook payload as input. Optional HMAC validation ensures authenticity.
/// </remarks>
[ApiController]
[Route("api/v1/webhooks")]
public class WebhookController : ControllerBase
{
    private readonly IWorkflowDiscoveryService _discoveryService;
    private readonly IWorkflowExecutionService _executionService;
    private readonly IHmacValidator _hmacValidator;
    private readonly ILogger<WebhookController> _logger;

    public WebhookController(
        IWorkflowDiscoveryService discoveryService,
        IWorkflowExecutionService executionService,
        IHmacValidator hmacValidator,
        ILogger<WebhookController> logger)
    {
        _discoveryService = discoveryService ?? throw new ArgumentNullException(nameof(discoveryService));
        _executionService = executionService ?? throw new ArgumentNullException(nameof(executionService));
        _hmacValidator = hmacValidator ?? throw new ArgumentNullException(nameof(hmacValidator));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <summary>
    /// Receives a webhook callback and triggers the matching workflow.
    /// The system finds a workflow with a webhook trigger matching the provided path
    /// and executes it with the payload as input.
    /// </summary>
    /// <param name="path">The webhook path (without leading slash). Must match a workflow's webhook trigger path.</param>
    /// <param name="payload">The JSON payload from the webhook. Made available as 'payload' in workflow input.</param>
    /// <returns>
    /// On success (200): Execution ID, workflow name, and success status.
    /// On not found (404): No workflow registered for the webhook path.
    /// On unauthorized (401): HMAC signature validation failed (when configured).
    /// On error (500): Internal server error during processing.
    /// </returns>
    /// <remarks>
    /// If the workflow's webhook trigger has a secretRef configured, the request must include
    /// an X-Webhook-Signature header with a valid HMAC-SHA256 signature of the request body.
    /// Input mapping can be configured to extract specific fields from the payload.
    /// </remarks>
    [HttpPost("{*path}")]
    [ProducesResponseType(typeof(WebhookSuccessResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(WebhookErrorResponse), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(WebhookErrorResponse), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(WebhookErrorResponse), StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> ReceiveWebhook(
        string path,
        [FromBody] JsonDocument payload)
    {
        try
        {
            // Normalize path (ensure leading slash)
            var normalizedPath = "/" + path.TrimStart('/');

            _logger.LogInformation("Received webhook at path: {Path}", normalizedPath);

            // Find workflow with matching webhook trigger
            var workflows = await _discoveryService.DiscoverWorkflowsAsync(null);
            var (matchingWorkflow, matchingTrigger) = FindMatchingWebhookTrigger(workflows, normalizedPath);

            if (matchingWorkflow == null || matchingTrigger == null)
            {
                _logger.LogWarning("No workflow found with webhook path: {Path}", normalizedPath);
                return NotFound(new WebhookErrorResponse
                {
                    Error = "NotFound",
                    Message = $"No workflow registered for webhook path: {normalizedPath}"
                });
            }

            // Validate HMAC signature if secretRef is configured
            if (!string.IsNullOrEmpty(matchingTrigger.SecretRef))
            {
                var signatureValidation = await ValidateSignatureAsync(matchingTrigger.SecretRef);
                if (!signatureValidation.IsValid)
                {
                    _logger.LogWarning("Webhook signature validation failed for path: {Path}", normalizedPath);
                    return Unauthorized(new WebhookErrorResponse
                    {
                        Error = "Unauthorized",
                        Message = signatureValidation.ErrorMessage
                    });
                }
            }

            // Build input from payload
            var input = BuildInputFromPayload(payload, matchingTrigger);

            // Execute the workflow
            _logger.LogInformation("Executing workflow {WorkflowName} from webhook trigger", matchingWorkflow.Metadata?.Name);

            var result = await _executionService.ExecuteAsync(matchingWorkflow, input, HttpContext.RequestAborted);

            return Ok(new WebhookSuccessResponse
            {
                ExecutionId = result.ExecutionId,
                WorkflowName = matchingWorkflow.Metadata?.Name,
                Success = result.Success
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing webhook at path: {Path}", path);
            return StatusCode(500, new WebhookErrorResponse
            {
                Error = "InternalServerError",
                Message = "An error occurred while processing the webhook"
            });
        }
    }

    private (WorkflowResource? Workflow, WebhookTriggerSpec? Trigger) FindMatchingWebhookTrigger(
        IEnumerable<WorkflowResource> workflows,
        string path)
    {
        foreach (var workflow in workflows)
        {
            if (workflow.Spec?.Triggers == null) continue;

            foreach (var trigger in workflow.Spec.Triggers)
            {
                if (trigger.Type != "webhook" || trigger is not WebhookTriggerSpec webhookTrigger)
                    continue;

                if (!trigger.Enabled)
                    continue;

                // Normalize both paths for comparison
                var triggerPath = "/" + webhookTrigger.Path.TrimStart('/');
                if (string.Equals(triggerPath, path, StringComparison.OrdinalIgnoreCase))
                {
                    return (workflow, webhookTrigger);
                }
            }
        }

        return (null, null);
    }

    private async Task<(bool IsValid, string? ErrorMessage)> ValidateSignatureAsync(string secretRef)
    {
        // Get signature from header
        var signature = Request.Headers["X-Webhook-Signature"].FirstOrDefault();
        if (string.IsNullOrEmpty(signature))
        {
            return (false, "Missing X-Webhook-Signature header");
        }

        // Get request body for validation
        Request.Body.Position = 0;
        using var reader = new StreamReader(Request.Body, leaveOpen: true);
        var body = await reader.ReadToEndAsync();
        Request.Body.Position = 0;

        // Get secret (in production, this would fetch from K8s Secret)
        // For now, use secretRef as the secret directly for testing
        var secret = secretRef;

        // Validate signature
        if (!_hmacValidator.ValidateSignature(body, signature, secret))
        {
            return (false, "Invalid signature");
        }

        return (true, null);
    }

    private Dictionary<string, object> BuildInputFromPayload(
        JsonDocument payload,
        WebhookTriggerSpec trigger)
    {
        var input = new Dictionary<string, object>();

        // Add entire payload as "payload" key
        input["payload"] = JsonSerializer.Deserialize<object>(payload.RootElement.GetRawText())!;

        // If input mapping is defined, apply it
        if (trigger.InputMapping != null)
        {
            foreach (var (key, jsonPath) in trigger.InputMapping)
            {
                // Simple JSON path support (just property names for now)
                if (jsonPath.StartsWith("$.payload."))
                {
                    var propertyName = jsonPath.Substring("$.payload.".Length);
                    if (payload.RootElement.TryGetProperty(propertyName, out var value))
                    {
                        input[key] = JsonSerializer.Deserialize<object>(value.GetRawText())!;
                    }
                }
            }
        }

        return input;
    }
}

/// <summary>
/// Response model for successful webhook execution.
/// </summary>
public class WebhookSuccessResponse
{
    public Guid ExecutionId { get; set; }
    public string? WorkflowName { get; set; }
    public bool Success { get; set; }
}

/// <summary>
/// Response model for webhook errors.
/// </summary>
public class WebhookErrorResponse
{
    public string? Error { get; set; }
    public string? Message { get; set; }
}
