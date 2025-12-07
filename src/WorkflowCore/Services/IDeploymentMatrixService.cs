using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Interface for deployment matrix service.
/// </summary>
public interface IDeploymentMatrixService
{
    /// <summary>
    /// Record a deployment to an environment.
    /// </summary>
    void RecordDeployment(string taskName, string version, string environment);

    /// <summary>
    /// Get the deployment matrix for a task.
    /// </summary>
    TaskDeploymentMatrix? GetDeploymentMatrix(string taskName);

    /// <summary>
    /// Check if a version can be deployed to an environment.
    /// </summary>
    CanDeployResult CanDeploy(string taskName, string version, string targetEnvironment, string? requiredPriorEnv);

    /// <summary>
    /// Get all deployment matrices.
    /// </summary>
    IReadOnlyList<TaskDeploymentMatrix> GetAllDeployments();

    /// <summary>
    /// Get all deployments to a specific environment.
    /// </summary>
    IReadOnlyList<TaskDeploymentMatrix> GetDeploymentsInEnvironment(string environment);
}

/// <summary>
/// Result of a can-deploy check.
/// </summary>
public class CanDeployResult
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
    /// Create a successful result.
    /// </summary>
    public static CanDeployResult Success() => new() { CanDeploy = true };

    /// <summary>
    /// Create a failure result.
    /// </summary>
    public static CanDeployResult Failure(string reason) => new() { CanDeploy = false, Reason = reason };
}
