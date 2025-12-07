namespace WorkflowCore.Models;

/// <summary>
/// Tracks task deployments across environments.
/// </summary>
public class TaskDeploymentMatrix
{
    /// <summary>
    /// Name of the task.
    /// </summary>
    public string TaskName { get; set; } = string.Empty;

    /// <summary>
    /// Current version of the task.
    /// </summary>
    public string TaskVersion { get; set; } = string.Empty;

    /// <summary>
    /// Deployments by environment.
    /// </summary>
    public List<EnvironmentDeployment> Deployments { get; set; } = new();

    /// <summary>
    /// Add or update a deployment record.
    /// </summary>
    public void AddDeployment(string environment, string version, DateTime deployedAt)
    {
        var existing = Deployments.FirstOrDefault(d => d.Environment == environment);
        if (existing != null)
        {
            existing.Version = version;
            existing.DeployedAt = deployedAt;
        }
        else
        {
            Deployments.Add(new EnvironmentDeployment
            {
                Environment = environment,
                Version = version,
                DeployedAt = deployedAt
            });
        }
    }

    /// <summary>
    /// Check if task is deployed to the specified environment.
    /// </summary>
    public bool IsDeployedTo(string environment)
    {
        return Deployments.Any(d => d.Environment == environment);
    }

    /// <summary>
    /// Get the version deployed to a specific environment.
    /// </summary>
    public string? GetVersionInEnvironment(string environment)
    {
        return Deployments.FirstOrDefault(d => d.Environment == environment)?.Version;
    }

    /// <summary>
    /// Check if a version can be deployed to an environment based on deployment gates.
    /// </summary>
    public bool CanDeployTo(string targetEnvironment, string version, string requiredPriorEnvironment)
    {
        var priorEnvVersion = GetVersionInEnvironment(requiredPriorEnvironment);
        return priorEnvVersion == version;
    }

    /// <summary>
    /// Get all environments that have a specific version deployed.
    /// </summary>
    public IReadOnlyList<string> GetEnvironmentsWithVersion(string version)
    {
        return Deployments
            .Where(d => d.Version == version)
            .Select(d => d.Environment)
            .ToList();
    }
}

/// <summary>
/// Represents a deployment to a specific environment.
/// </summary>
public class EnvironmentDeployment
{
    /// <summary>
    /// Environment name (dev, staging, prod).
    /// </summary>
    public string Environment { get; set; } = string.Empty;

    /// <summary>
    /// Version deployed to this environment.
    /// </summary>
    public string Version { get; set; } = string.Empty;

    /// <summary>
    /// When this version was deployed.
    /// </summary>
    public DateTime DeployedAt { get; set; }

    /// <summary>
    /// Whether the deployment is healthy.
    /// </summary>
    public bool IsHealthy { get; set; } = true;
}
