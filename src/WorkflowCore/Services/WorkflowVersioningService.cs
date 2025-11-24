using System.Security.Cryptography;
using System.Text;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace WorkflowCore.Services;

/// <summary>
/// Service for managing workflow versioning and change detection using SHA256 hashing.
/// </summary>
public class WorkflowVersioningService : IWorkflowVersioningService
{
    private readonly IWorkflowVersionRepository _versionRepository;
    private readonly ISerializer _yamlSerializer;

    public WorkflowVersioningService(IWorkflowVersionRepository versionRepository)
    {
        _versionRepository = versionRepository ?? throw new ArgumentNullException(nameof(versionRepository));

        // Configure YAML serializer with camelCase naming to match Kubernetes conventions
        _yamlSerializer = new SerializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .Build();
    }

    /// <inheritdoc />
    public string CalculateVersionHash(WorkflowResource workflow)
    {
        if (workflow == null)
            throw new ArgumentNullException(nameof(workflow));

        // Serialize workflow to YAML
        var yaml = _yamlSerializer.Serialize(workflow);

        // Calculate SHA256 hash of YAML string
        using var sha256 = SHA256.Create();
        var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(yaml));

        // Convert to hex string
        return BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
    }

    /// <inheritdoc />
    public async Task<bool> HasChangedAsync(string workflowName, string currentHash)
    {
        if (string.IsNullOrWhiteSpace(workflowName))
            throw new ArgumentException("Workflow name cannot be null or empty", nameof(workflowName));

        if (string.IsNullOrWhiteSpace(currentHash))
            throw new ArgumentException("Current hash cannot be null or empty", nameof(currentHash));

        var latestVersion = await _versionRepository.GetLatestVersionAsync(workflowName);

        // If no version exists, workflow is considered changed (new)
        if (latestVersion == null)
            return true;

        // Compare hashes
        return latestVersion.VersionHash != currentHash;
    }

    /// <inheritdoc />
    public async Task<bool> CreateVersionIfChangedAsync(WorkflowResource workflow)
    {
        if (workflow == null)
            throw new ArgumentNullException(nameof(workflow));

        if (workflow.Metadata == null || string.IsNullOrWhiteSpace(workflow.Metadata.Name))
            throw new ArgumentException("Workflow metadata and name are required", nameof(workflow));

        // Calculate current hash
        var currentHash = CalculateVersionHash(workflow);

        // Check if workflow has changed
        var hasChanged = await HasChangedAsync(workflow.Metadata.Name, currentHash);

        if (!hasChanged)
            return false;

        // Create new version record
        var newVersion = new WorkflowVersion
        {
            WorkflowName = workflow.Metadata.Name,
            VersionHash = currentHash,
            CreatedAt = DateTime.UtcNow,
            DefinitionSnapshot = _yamlSerializer.Serialize(workflow)
        };

        await _versionRepository.SaveVersionAsync(newVersion);

        return true;
    }
}
