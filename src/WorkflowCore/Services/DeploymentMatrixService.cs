using System.Collections.Concurrent;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Manages task deployment tracking across environments.
/// </summary>
public class DeploymentMatrixService : IDeploymentMatrixService
{
    private readonly ConcurrentDictionary<string, TaskDeploymentMatrix> _matrices = new();

    /// <inheritdoc />
    public void RecordDeployment(string taskName, string version, string environment)
    {
        var matrix = _matrices.GetOrAdd(taskName, name => new TaskDeploymentMatrix { TaskName = name });
        matrix.AddDeployment(environment, version, DateTime.UtcNow);
    }

    /// <inheritdoc />
    public TaskDeploymentMatrix? GetDeploymentMatrix(string taskName)
    {
        return _matrices.TryGetValue(taskName, out var matrix) ? matrix : null;
    }

    /// <inheritdoc />
    public CanDeployResult CanDeploy(string taskName, string version, string targetEnvironment, string? requiredPriorEnv)
    {
        var matrix = GetDeploymentMatrix(taskName);
        if (matrix == null)
        {
            return CanDeployResult.Failure($"No deployment matrix found for task: {taskName}");
        }

        // If no prior environment required, allow deployment
        if (string.IsNullOrEmpty(requiredPriorEnv))
        {
            return CanDeployResult.Success();
        }

        // Check if version is deployed to required prior environment
        if (!matrix.CanDeployTo(targetEnvironment, version, requiredPriorEnv))
        {
            var priorVersion = matrix.GetVersionInEnvironment(requiredPriorEnv);
            return CanDeployResult.Failure(
                $"Version {version} is not deployed to {requiredPriorEnv}. " +
                $"Current version in {requiredPriorEnv}: {priorVersion ?? "none"}");
        }

        return CanDeployResult.Success();
    }

    /// <inheritdoc />
    public IReadOnlyList<TaskDeploymentMatrix> GetAllDeployments()
    {
        return _matrices.Values.ToList();
    }

    /// <inheritdoc />
    public IReadOnlyList<TaskDeploymentMatrix> GetDeploymentsInEnvironment(string environment)
    {
        return _matrices.Values
            .Where(m => m.IsDeployedTo(environment))
            .ToList();
    }
}
