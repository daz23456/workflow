using WorkflowCore.Models;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace WorkflowGateway.Services;

/// <summary>
/// Service for parsing workflow YAML definitions
/// </summary>
public interface IWorkflowYamlParser
{
    /// <summary>
    /// Parse a YAML string into a WorkflowResource
    /// </summary>
    /// <param name="yaml">YAML workflow definition</param>
    /// <returns>Parsed WorkflowResource</returns>
    /// <exception cref="YamlParseException">Thrown when YAML parsing fails</exception>
    WorkflowResource Parse(string yaml);
}

public class WorkflowYamlParser : IWorkflowYamlParser
{
    private readonly IDeserializer _deserializer;

    public WorkflowYamlParser()
    {
        _deserializer = new DeserializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .IgnoreUnmatchedProperties()
            .Build();
    }

    public WorkflowResource Parse(string yaml)
    {
        if (string.IsNullOrWhiteSpace(yaml))
        {
            throw new YamlParseException("YAML content cannot be empty");
        }

        try
        {
            var workflow = _deserializer.Deserialize<WorkflowResource>(yaml);

            if (workflow == null)
            {
                throw new YamlParseException("Failed to parse YAML into WorkflowResource");
            }

            // Validate required fields
            if (string.IsNullOrEmpty(workflow.Metadata?.Name))
            {
                throw new YamlParseException("Workflow metadata.name is required");
            }

            return workflow;
        }
        catch (YamlDotNet.Core.YamlException ex)
        {
            throw new YamlParseException($"Invalid YAML syntax: {ex.Message}", ex);
        }
    }
}

/// <summary>
/// Exception thrown when YAML parsing fails
/// </summary>
public class YamlParseException : Exception
{
    public YamlParseException(string message) : base(message) { }
    public YamlParseException(string message, Exception innerException) : base(message, innerException) { }
}
