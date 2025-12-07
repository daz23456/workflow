using WorkflowCore.Models;

namespace WorkflowGateway.Models;

/// <summary>
/// Response model for contract verification.
/// </summary>
public class VerificationResponse
{
    /// <summary>
    /// Name of the scenario verified.
    /// </summary>
    public string ScenarioName { get; set; } = string.Empty;

    /// <summary>
    /// Whether the contract was verified successfully.
    /// </summary>
    public bool IsVerified { get; set; }

    /// <summary>
    /// Errors encountered during verification.
    /// </summary>
    public List<string> Errors { get; set; } = new();

    /// <summary>
    /// When the verification was performed.
    /// </summary>
    public DateTime VerifiedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Request model for recording an interaction.
/// </summary>
public class RecordInteractionRequest
{
    /// <summary>
    /// Name of the task.
    /// </summary>
    public string TaskName { get; set; } = string.Empty;

    /// <summary>
    /// Request body sent to the task.
    /// </summary>
    public string? RequestBody { get; set; }

    /// <summary>
    /// Response body received from the task.
    /// </summary>
    public string? ResponseBody { get; set; }

    /// <summary>
    /// HTTP status code received.
    /// </summary>
    public int StatusCode { get; set; }

    /// <summary>
    /// Environment where the interaction occurred.
    /// </summary>
    public string Environment { get; set; } = string.Empty;

    /// <summary>
    /// Headers from the response.
    /// </summary>
    public Dictionary<string, string>? Headers { get; set; }
}

/// <summary>
/// Response model for can-deploy check.
/// </summary>
public class CanDeployResponse
{
    /// <summary>
    /// Whether the deployment can proceed.
    /// </summary>
    public bool CanDeploy { get; set; }

    /// <summary>
    /// Reason if deployment cannot proceed.
    /// </summary>
    public string Reason { get; set; } = string.Empty;

    /// <summary>
    /// Task name checked.
    /// </summary>
    public string TaskName { get; set; } = string.Empty;

    /// <summary>
    /// Version being deployed.
    /// </summary>
    public string Version { get; set; } = string.Empty;

    /// <summary>
    /// Target environment.
    /// </summary>
    public string TargetEnvironment { get; set; } = string.Empty;
}

/// <summary>
/// Response model for deployment matrix.
/// </summary>
public class DeploymentMatrixResponse
{
    /// <summary>
    /// Task name.
    /// </summary>
    public string TaskName { get; set; } = string.Empty;

    /// <summary>
    /// Deployments across environments.
    /// </summary>
    public List<DeploymentInfo> Deployments { get; set; } = new();
}

/// <summary>
/// Information about a deployment.
/// </summary>
public class DeploymentInfo
{
    /// <summary>
    /// Environment name.
    /// </summary>
    public string Environment { get; set; } = string.Empty;

    /// <summary>
    /// Version deployed.
    /// </summary>
    public string Version { get; set; } = string.Empty;

    /// <summary>
    /// When deployed.
    /// </summary>
    public DateTime DeployedAt { get; set; }

    /// <summary>
    /// Whether the deployment is healthy.
    /// </summary>
    public bool IsHealthy { get; set; } = true;
}

/// <summary>
/// Response for recording an interaction.
/// </summary>
public class RecordInteractionResponse
{
    /// <summary>
    /// Interaction ID.
    /// </summary>
    public string InteractionId { get; set; } = string.Empty;

    /// <summary>
    /// Whether recording was successful.
    /// </summary>
    public bool Success { get; set; } = true;
}
