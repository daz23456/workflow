using Microsoft.AspNetCore.Mvc;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Models;

namespace WorkflowGateway.Controllers;

/// <summary>
/// API controller for contract verification operations.
/// </summary>
[ApiController]
[Route("api/v1/contracts")]
public class ContractVerificationController : ControllerBase
{
    private readonly IContractVerificationService _verificationService;
    private readonly IInteractionRecorder _interactionRecorder;
    private readonly IDeploymentMatrixService _deploymentService;

    public ContractVerificationController(
        IContractVerificationService verificationService,
        IInteractionRecorder interactionRecorder,
        IDeploymentMatrixService deploymentService)
    {
        _verificationService = verificationService;
        _interactionRecorder = interactionRecorder;
        _deploymentService = deploymentService;
    }

    /// <summary>
    /// Verify a contract scenario for a task.
    /// </summary>
    /// <param name="taskName">Task name</param>
    /// <param name="scenarioName">Scenario name to verify</param>
    [HttpPost("verify")]
    public async Task<ActionResult<VerificationResponse>> VerifyContract(
        [FromQuery] string taskName,
        [FromQuery] string scenarioName)
    {
        var result = _verificationService.VerifyContract(taskName, scenarioName);

        var response = new VerificationResponse
        {
            ScenarioName = result.ScenarioName,
            IsVerified = result.IsVerified,
            Errors = result.Errors,
            VerifiedAt = result.VerifiedAt
        };

        return await Task.FromResult(Ok(response));
    }

    /// <summary>
    /// Record an interaction for golden file testing.
    /// </summary>
    [HttpPost("record")]
    public async Task<ActionResult<RecordInteractionResponse>> RecordInteraction(
        [FromBody] RecordInteractionRequest request)
    {
        var interaction = new RecordedInteraction
        {
            TaskName = request.TaskName,
            InteractionId = Guid.NewGuid().ToString(),
            RequestBody = request.RequestBody,
            ResponseBody = request.ResponseBody,
            StatusCode = request.StatusCode,
            Environment = request.Environment,
            Headers = request.Headers ?? new Dictionary<string, string>(),
            RecordedAt = DateTime.UtcNow
        };

        _interactionRecorder.RecordInteraction(interaction);

        return await Task.FromResult(Ok(new RecordInteractionResponse
        {
            InteractionId = interaction.InteractionId,
            Success = true
        }));
    }

    /// <summary>
    /// Check if a version can be deployed to an environment.
    /// </summary>
    [HttpGet("can-deploy")]
    public async Task<ActionResult<CanDeployResponse>> CanDeploy(
        [FromQuery] string taskName,
        [FromQuery] string version,
        [FromQuery] string targetEnv,
        [FromQuery] string? requiredPriorEnv = null)
    {
        var result = _deploymentService.CanDeploy(taskName, version, targetEnv, requiredPriorEnv);

        return await Task.FromResult(Ok(new CanDeployResponse
        {
            TaskName = taskName,
            Version = version,
            TargetEnvironment = targetEnv,
            CanDeploy = result.CanDeploy,
            Reason = result.Reason
        }));
    }

    /// <summary>
    /// Get deployment matrix for a task.
    /// </summary>
    [HttpGet("deployments/{taskName}")]
    public async Task<ActionResult<DeploymentMatrixResponse>> GetDeploymentMatrix(string taskName)
    {
        var matrix = _deploymentService.GetDeploymentMatrix(taskName);
        if (matrix == null)
        {
            return await Task.FromResult(NotFound(new { message = $"No deployment matrix found for task: {taskName}" }));
        }

        var response = new DeploymentMatrixResponse
        {
            TaskName = matrix.TaskName,
            Deployments = matrix.Deployments.Select(d => new DeploymentInfo
            {
                Environment = d.Environment,
                Version = d.Version,
                DeployedAt = d.DeployedAt,
                IsHealthy = d.IsHealthy
            }).ToList()
        };

        return await Task.FromResult(Ok(response));
    }

    /// <summary>
    /// Record a deployment to an environment.
    /// </summary>
    [HttpPost("deployments/{taskName}")]
    public async Task<ActionResult> RecordDeployment(
        string taskName,
        [FromQuery] string version,
        [FromQuery] string environment)
    {
        _deploymentService.RecordDeployment(taskName, version, environment);
        return await Task.FromResult(Ok(new { success = true, taskName, version, environment }));
    }
}
