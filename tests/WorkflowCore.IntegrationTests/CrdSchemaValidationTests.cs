using FluentAssertions;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace WorkflowCore.IntegrationTests;

/// <summary>
/// Integration tests that validate the Kubernetes CRD schema matches C# models.
/// This prevents the scenario where C# models have properties that the CRD doesn't know about,
/// causing kubectl apply to fail with "unknown field" errors.
///
/// These tests were created after Stage 19 (Control Flow) was marked complete but the CRD
/// was never updated, causing kubectl apply to fail for condition/switch/forEach fields.
/// </summary>
public class CrdSchemaValidationTests
{
    private readonly string _crdPath;
    private readonly Dictionary<string, object> _crdContent;

    public CrdSchemaValidationTests()
    {
        // Navigate from test bin directory to deploy/crds/workflow-crd.yaml
        var testDir = Directory.GetCurrentDirectory();
        var projectRoot = Path.GetFullPath(Path.Combine(testDir, "..", "..", "..", "..", ".."));
        _crdPath = Path.Combine(projectRoot, "deploy", "crds", "workflow-crd.yaml");

        if (!File.Exists(_crdPath))
        {
            throw new FileNotFoundException($"CRD file not found at {_crdPath}");
        }

        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .Build();

        var yaml = File.ReadAllText(_crdPath);
        _crdContent = deserializer.Deserialize<Dictionary<string, object>>(yaml);
    }

    private Dictionary<string, object> GetTaskProperties()
    {
        // Navigate to spec.versions[0].schema.openAPIV3Schema.properties.spec.properties.tasks.items.properties
        var spec = (Dictionary<object, object>)_crdContent["spec"];
        var versions = (List<object>)spec["versions"];
        var v1 = (Dictionary<object, object>)versions[0];
        var schema = (Dictionary<object, object>)v1["schema"];
        var openApiSchema = (Dictionary<object, object>)schema["openAPIV3Schema"];
        var properties = (Dictionary<object, object>)openApiSchema["properties"];
        var specProps = (Dictionary<object, object>)properties["spec"];
        var specProperties = (Dictionary<object, object>)specProps["properties"];
        var tasks = (Dictionary<object, object>)specProperties["tasks"];
        var items = (Dictionary<object, object>)tasks["items"];
        var taskProperties = (Dictionary<object, object>)items["properties"];

        return taskProperties.ToDictionary(
            kvp => kvp.Key.ToString()!,
            kvp => kvp.Value!);
    }

    [Fact]
    public void CrdExists_AndCanBeParsed()
    {
        // Arrange & Act - done in constructor

        // Assert
        _crdContent.Should().NotBeNull();
        _crdContent.Should().ContainKey("apiVersion");
        _crdContent.Should().ContainKey("kind");
        _crdContent["kind"].Should().Be("CustomResourceDefinition");
    }

    [Fact]
    public void TaskSchema_ContainsAllBaseProperties()
    {
        // Arrange
        var taskProperties = GetTaskProperties();

        // Assert - these are from WorkflowTaskStep in C#
        taskProperties.Should().ContainKey("id", "WorkflowTaskStep.Id is required");
        taskProperties.Should().ContainKey("taskRef", "WorkflowTaskStep.TaskRef is required");
        taskProperties.Should().ContainKey("input", "WorkflowTaskStep.Input is optional but should be in schema");
        taskProperties.Should().ContainKey("dependsOn", "WorkflowTaskStep.DependsOn is optional but should be in schema");
        taskProperties.Should().ContainKey("timeout", "WorkflowTaskStep.Timeout is optional but should be in schema");
    }

    [Fact]
    public void TaskSchema_ContainsConditionProperty()
    {
        // Arrange
        var taskProperties = GetTaskProperties();

        // Assert - condition from ConditionSpec in C#
        taskProperties.Should().ContainKey("condition",
            "WorkflowTaskStep.Condition (ConditionSpec) must be in CRD - Stage 19 control flow");

        var condition = (Dictionary<object, object>)taskProperties["condition"];
        condition.Should().ContainKey("properties");

        var conditionProps = (Dictionary<object, object>)condition["properties"];
        conditionProps.Should().ContainKey("if",
            "ConditionSpec.If must be in CRD schema");
    }

    [Fact]
    public void TaskSchema_ContainsSwitchProperty()
    {
        // Arrange
        var taskProperties = GetTaskProperties();

        // Assert - switch from SwitchSpec in C#
        taskProperties.Should().ContainKey("switch",
            "WorkflowTaskStep.Switch (SwitchSpec) must be in CRD - Stage 19 control flow");

        var switchProp = (Dictionary<object, object>)taskProperties["switch"];
        switchProp.Should().ContainKey("properties");

        var switchProps = (Dictionary<object, object>)switchProp["properties"];
        switchProps.Should().ContainKey("value", "SwitchSpec.Value must be in CRD schema");
        switchProps.Should().ContainKey("cases", "SwitchSpec.Cases must be in CRD schema");
        switchProps.Should().ContainKey("default", "SwitchSpec.Default must be in CRD schema");
    }

    [Fact]
    public void TaskSchema_ContainsSwitchCaseProperties()
    {
        // Arrange
        var taskProperties = GetTaskProperties();
        var switchProp = (Dictionary<object, object>)taskProperties["switch"];
        var switchProps = (Dictionary<object, object>)switchProp["properties"];
        var cases = (Dictionary<object, object>)switchProps["cases"];
        var casesItems = (Dictionary<object, object>)cases["items"];
        var caseProps = (Dictionary<object, object>)casesItems["properties"];

        // Assert - SwitchCase properties
        caseProps.Should().ContainKey("match", "SwitchCase.Match must be in CRD schema");
        caseProps.Should().ContainKey("taskRef", "SwitchCase.TaskRef must be in CRD schema");
    }

    [Fact]
    public void TaskSchema_ContainsSwitchDefaultProperties()
    {
        // Arrange
        var taskProperties = GetTaskProperties();
        var switchProp = (Dictionary<object, object>)taskProperties["switch"];
        var switchProps = (Dictionary<object, object>)switchProp["properties"];
        var defaultProp = (Dictionary<object, object>)switchProps["default"];
        var defaultProps = (Dictionary<object, object>)defaultProp["properties"];

        // Assert - SwitchDefault properties
        defaultProps.Should().ContainKey("taskRef", "SwitchDefault.TaskRef must be in CRD schema");
    }

    [Fact]
    public void TaskSchema_ContainsForEachProperty()
    {
        // Arrange
        var taskProperties = GetTaskProperties();

        // Assert - forEach from ForEachSpec in C#
        taskProperties.Should().ContainKey("forEach",
            "WorkflowTaskStep.ForEach (ForEachSpec) must be in CRD - Stage 19 control flow");

        var forEach = (Dictionary<object, object>)taskProperties["forEach"];
        forEach.Should().ContainKey("properties");

        var forEachProps = (Dictionary<object, object>)forEach["properties"];
        forEachProps.Should().ContainKey("items", "ForEachSpec.Items must be in CRD schema");
        forEachProps.Should().ContainKey("itemVar", "ForEachSpec.ItemVar must be in CRD schema");
    }

    [Fact]
    public void TaskSchema_ForEach_ContainsParallelExecutionProperties()
    {
        // Arrange
        var taskProperties = GetTaskProperties();
        var forEach = (Dictionary<object, object>)taskProperties["forEach"];
        var forEachProps = (Dictionary<object, object>)forEach["properties"];

        // Assert - parallel execution properties (from CRD spec, not C# model ForEachSpec)
        // Note: The CRD has 'parallel' and 'maxConcurrency', while C# has 'maxParallel'
        // This test ensures the CRD-defined fields exist
        forEachProps.Should().ContainKey("parallel",
            "forEach.parallel should be in CRD for boolean parallel flag");
        forEachProps.Should().ContainKey("maxConcurrency",
            "forEach.maxConcurrency should be in CRD for parallel limit");
    }

    [Theory]
    [InlineData("id", "string")]
    [InlineData("taskRef", "string")]
    [InlineData("timeout", "string")]
    public void TaskSchema_PropertyTypes_AreCorrect(string propertyName, string expectedType)
    {
        // Arrange
        var taskProperties = GetTaskProperties();

        // Assert
        taskProperties.Should().ContainKey(propertyName);
        var property = (Dictionary<object, object>)taskProperties[propertyName];
        property["type"].Should().Be(expectedType);
    }

    [Fact]
    public void TaskSchema_DependsOn_IsArrayOfStrings()
    {
        // Arrange
        var taskProperties = GetTaskProperties();
        var dependsOn = (Dictionary<object, object>)taskProperties["dependsOn"];

        // Assert
        dependsOn["type"].Should().Be("array");
        var items = (Dictionary<object, object>)dependsOn["items"];
        items["type"].Should().Be("string");
    }
}
