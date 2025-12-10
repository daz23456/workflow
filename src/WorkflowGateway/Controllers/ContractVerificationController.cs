using Microsoft.AspNetCore.Mvc;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Models;

namespace WorkflowGateway.Controllers;

/// <summary>
/// Controller for contract verification and deployment coordination.
/// Provides PACT-like consumer-driven contract testing without a central broker,
/// enabling safe task updates by verifying backward compatibility.
/// </summary>
/// <remarks>
/// Part of Stage 16.8 - Contract Verification. Supports:
/// - Recording request/response interactions for golden file testing
/// - Verifying task implementations against recorded contracts
/// - Tracking deployment versions across environments
/// - Enforcing deployment gate policies (e.g., staging before production)
/// </remarks>
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
    /// Verify a task implementation against a recorded contract scenario.
    /// Replays the recorded request and compares the response to ensure
    /// the task still behaves as expected by consumers.
    /// </summary>
    /// <param name="taskName">Name of the task to verify.</param>
    /// <param name="scenarioName">Name of the contract scenario to test against.</param>
    /// <returns>
    /// Verification result including:
    /// - Whether verification passed
    /// - List of errors if verification failed
    /// - Timestamp of verification
    /// </returns>
    [HttpPost("verify")]
    [ProducesResponseType(typeof(VerificationResponse), StatusCodes.Status200OK)]
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
    /// Record a request/response interaction for golden file testing.
    /// Captured interactions serve as contract snapshots that can be
    /// replayed during verification to detect breaking changes.
    /// </summary>
    /// <param name="request">
    /// Interaction details including:
    /// - Task name
    /// - Request body sent
    /// - Response body received
    /// - HTTP status code
    /// - Environment (dev, staging, prod)
    /// - Optional headers
    /// </param>
    /// <returns>Unique interaction ID for future reference.</returns>
    [HttpPost("record")]
    [ProducesResponseType(typeof(RecordInteractionResponse), StatusCodes.Status200OK)]
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
    /// Check if a task version can be deployed to a target environment.
    /// Enforces deployment policies like requiring staging verification
    /// before production deployment.
    /// </summary>
    /// <param name="taskName">Name of the task to deploy.</param>
    /// <param name="version">Version being deployed.</param>
    /// <param name="targetEnv">Target environment (dev, staging, prod).</param>
    /// <param name="requiredPriorEnv">Optional: require deployment to this environment first.</param>
    /// <returns>
    /// Deployment check result including:
    /// - Whether deployment is allowed
    /// - Reason if blocked (e.g., "must deploy to staging first")
    /// </returns>
    [HttpGet("can-deploy")]
    [ProducesResponseType(typeof(CanDeployResponse), StatusCodes.Status200OK)]
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
    /// Get the deployment matrix showing all environments and versions for a task.
    /// Useful for tracking which version is deployed where and identifying
    /// version drift across environments.
    /// </summary>
    /// <param name="taskName">Name of the task to get deployment info for.</param>
    /// <returns>
    /// Deployment matrix including for each environment:
    /// - Currently deployed version
    /// - Deployment timestamp
    /// - Health status
    /// Returns 404 if no deployments recorded for the task.
    /// </returns>
    [HttpGet("deployments/{taskName}")]
    [ProducesResponseType(typeof(DeploymentMatrixResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
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
    /// Record a deployment event for tracking and policy enforcement.
    /// Call this from CI/CD pipelines after successful deployment to
    /// update the deployment matrix and enable deployment gates.
    /// </summary>
    /// <param name="taskName">Name of the deployed task.</param>
    /// <param name="version">Version that was deployed.</param>
    /// <param name="environment">Target environment (dev, staging, prod).</param>
    /// <returns>Confirmation of recorded deployment.</returns>
    [HttpPost("deployments/{taskName}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult> RecordDeployment(
        string taskName,
        [FromQuery] string version,
        [FromQuery] string environment)
    {
        _deploymentService.RecordDeployment(taskName, version, environment);
        return await Task.FromResult(Ok(new { success = true, taskName, version, environment }));
    }
}
