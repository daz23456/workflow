using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

/// <summary>
/// Tests for WorkflowRefResolver - parsing and resolving workflow references.
/// Stage 21.1: WorkflowRef Resolution
/// </summary>
public class WorkflowRefResolverTests
{
    private readonly IWorkflowRefResolver _resolver;

    public WorkflowRefResolverTests()
    {
        _resolver = new WorkflowRefResolver();
    }

    #region Parsing Tests

    [Fact]
    public void Parse_SimpleWorkflowName_ReturnsCorrectSpec()
    {
        // Arrange
        var workflowRef = "order-processing";

        // Act
        var result = _resolver.Parse(workflowRef);

        // Assert
        result.Name.Should().Be("order-processing");
        result.Version.Should().BeNull();
        result.Namespace.Should().BeNull();
    }

    [Fact]
    public void Parse_NameWithVersion_ReturnsCorrectSpec()
    {
        // Arrange
        var workflowRef = "order-processing@v2";

        // Act
        var result = _resolver.Parse(workflowRef);

        // Assert
        result.Name.Should().Be("order-processing");
        result.Version.Should().Be("v2");
        result.Namespace.Should().BeNull();
    }

    [Fact]
    public void Parse_NamespaceScoped_ReturnsCorrectSpec()
    {
        // Arrange
        var workflowRef = "billing/invoice-workflow";

        // Act
        var result = _resolver.Parse(workflowRef);

        // Assert
        result.Name.Should().Be("invoice-workflow");
        result.Namespace.Should().Be("billing");
        result.Version.Should().BeNull();
    }

    [Fact]
    public void Parse_NamespaceWithVersion_ReturnsCorrectSpec()
    {
        // Arrange
        var workflowRef = "billing/invoice-workflow@v3";

        // Act
        var result = _resolver.Parse(workflowRef);

        // Assert
        result.Name.Should().Be("invoice-workflow");
        result.Namespace.Should().Be("billing");
        result.Version.Should().Be("v3");
    }

    [Fact]
    public void Parse_NullWorkflowRef_ThrowsArgumentNullException()
    {
        // Arrange
        string? workflowRef = null;

        // Act
        var act = () => _resolver.Parse(workflowRef!);

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void Parse_EmptyWorkflowRef_ThrowsArgumentException()
    {
        // Arrange
        var workflowRef = "";

        // Act
        var act = () => _resolver.Parse(workflowRef);

        // Assert
        act.Should().Throw<ArgumentException>()
            .WithMessage("*cannot be empty*");
    }

    [Fact]
    public void Parse_WhitespaceOnlyWorkflowRef_ThrowsArgumentException()
    {
        // Arrange
        var workflowRef = "   ";

        // Act
        var act = () => _resolver.Parse(workflowRef);

        // Assert
        act.Should().Throw<ArgumentException>()
            .WithMessage("*cannot be empty*");
    }

    [Fact]
    public void Parse_MultipleAtSymbols_UsesLastAsVersion()
    {
        // Arrange - edge case with @ in name (unusual but handle gracefully)
        var workflowRef = "order@special@v2";

        // Act
        var result = _resolver.Parse(workflowRef);

        // Assert
        result.Name.Should().Be("order@special");
        result.Version.Should().Be("v2");
    }

    [Fact]
    public void Parse_MultipleSlashes_UsesFirstAsNamespace()
    {
        // Arrange - edge case with / in name
        var workflowRef = "team/sub/workflow-name";

        // Act
        var result = _resolver.Parse(workflowRef);

        // Assert
        result.Namespace.Should().Be("team");
        result.Name.Should().Be("sub/workflow-name");
    }

    #endregion

    #region Resolution Tests

    [Fact]
    public void Resolve_WorkflowByName_ReturnsMatchingWorkflow()
    {
        // Arrange
        var workflows = CreateWorkflowDictionary(
            ("order-processing", "default", null),
            ("notification", "default", null)
        );

        // Act
        var result = _resolver.Resolve("order-processing", workflows, "default");

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Workflow.Should().NotBeNull();
        result.Workflow!.Metadata.Name.Should().Be("order-processing");
    }

    [Fact]
    public void Resolve_NonExistentWorkflow_ReturnsFailure()
    {
        // Arrange
        var workflows = CreateWorkflowDictionary(
            ("order-processing", "default", null)
        );

        // Act
        var result = _resolver.Resolve("non-existent", workflows, "default");

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Should().Contain("not found");
        result.Workflow.Should().BeNull();
    }

    [Fact]
    public void Resolve_WorkflowByNameAndVersion_ReturnsMatchingVersion()
    {
        // Arrange
        var workflows = CreateWorkflowDictionary(
            ("order-processing", "default", "v1"),
            ("order-processing", "default", "v2")
        );

        // Act
        var result = _resolver.Resolve("order-processing@v2", workflows, "default");

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Workflow.Should().NotBeNull();
        result.Workflow!.Metadata.Name.Should().Be("order-processing");
        result.Workflow!.Metadata.Annotations?["workflow.io/version"].Should().Be("v2");
    }

    [Fact]
    public void Resolve_NonExistentVersion_ReturnsFailure()
    {
        // Arrange
        var workflows = CreateWorkflowDictionary(
            ("order-processing", "default", "v1")
        );

        // Act
        var result = _resolver.Resolve("order-processing@v3", workflows, "default");

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Should().Contain("version");
        result.Error.Should().Contain("v3");
    }

    [Fact]
    public void Resolve_WorkflowByNamespace_ReturnsMatchingNamespace()
    {
        // Arrange
        var workflows = CreateWorkflowDictionary(
            ("invoice-workflow", "billing", null),
            ("invoice-workflow", "sales", null)
        );

        // Act
        var result = _resolver.Resolve("billing/invoice-workflow", workflows, "default");

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Workflow.Should().NotBeNull();
        result.Workflow!.Metadata.Namespace.Should().Be("billing");
    }

    [Fact]
    public void Resolve_WithoutNamespace_UsesParentNamespace()
    {
        // Arrange
        var workflows = CreateWorkflowDictionary(
            ("order-processing", "production", null),
            ("order-processing", "staging", null)
        );

        // Act
        var result = _resolver.Resolve("order-processing", workflows, "production");

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Workflow!.Metadata.Namespace.Should().Be("production");
    }

    [Fact]
    public void Resolve_FullyQualifiedReference_IgnoresParentNamespace()
    {
        // Arrange
        var workflows = CreateWorkflowDictionary(
            ("workflow-a", "team-a", null),
            ("workflow-a", "team-b", null)
        );

        // Act - parent is team-a but we explicitly reference team-b
        var result = _resolver.Resolve("team-b/workflow-a", workflows, "team-a");

        // Assert
        result.IsSuccess.Should().BeTrue();
        result.Workflow!.Metadata.Namespace.Should().Be("team-b");
    }

    [Fact]
    public void Resolve_EmptyWorkflowsDictionary_ReturnsFailure()
    {
        // Arrange
        var workflows = new Dictionary<string, WorkflowResource>();

        // Act
        var result = _resolver.Resolve("any-workflow", workflows, "default");

        // Assert
        result.IsSuccess.Should().BeFalse();
        result.Error.Should().Contain("not found");
    }

    [Fact]
    public void Resolve_NullWorkflowsDictionary_ThrowsArgumentNullException()
    {
        // Arrange
        Dictionary<string, WorkflowResource>? workflows = null;

        // Act
        var act = () => _resolver.Resolve("workflow", workflows!, "default");

        // Assert
        act.Should().Throw<ArgumentNullException>();
    }

    #endregion

    #region Validation Tests

    [Fact]
    public void ValidateTaskStep_WithTaskRefOnly_ReturnsValid()
    {
        // Arrange
        var taskStep = new WorkflowTaskStep
        {
            Id = "task-1",
            TaskRef = "http-get"
        };

        // Act
        var result = _resolver.ValidateTaskStep(taskStep);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Error.Should().BeNull();
    }

    [Fact]
    public void ValidateTaskStep_WithWorkflowRefOnly_ReturnsValid()
    {
        // Arrange
        var taskStep = new WorkflowTaskStep
        {
            Id = "task-1",
            WorkflowRef = "sub-workflow"
        };

        // Act
        var result = _resolver.ValidateTaskStep(taskStep);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Error.Should().BeNull();
    }

    [Fact]
    public void ValidateTaskStep_WithBothTaskRefAndWorkflowRef_ReturnsInvalid()
    {
        // Arrange
        var taskStep = new WorkflowTaskStep
        {
            Id = "task-1",
            TaskRef = "http-get",
            WorkflowRef = "sub-workflow"
        };

        // Act
        var result = _resolver.ValidateTaskStep(taskStep);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Error.Should().Contain("mutually exclusive");
    }

    [Fact]
    public void ValidateTaskStep_WithNeitherTaskRefNorWorkflowRef_AndNoSwitch_ReturnsInvalid()
    {
        // Arrange
        var taskStep = new WorkflowTaskStep
        {
            Id = "task-1"
        };

        // Act
        var result = _resolver.ValidateTaskStep(taskStep);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Error.Should().Contain("must have either");
    }

    [Fact]
    public void ValidateTaskStep_WithSwitchAndNoTaskRef_ReturnsValid()
    {
        // Arrange - switch provides taskRef via cases
        var taskStep = new WorkflowTaskStep
        {
            Id = "task-1",
            Switch = new SwitchSpec
            {
                Value = "{{input.type}}",
                Cases = new List<SwitchCase>
                {
                    new() { Match = "a", TaskRef = "task-a" }
                }
            }
        };

        // Act
        var result = _resolver.ValidateTaskStep(taskStep);

        // Assert
        result.IsValid.Should().BeTrue();
    }

    #endregion

    #region Helper Methods

    private static Dictionary<string, WorkflowResource> CreateWorkflowDictionary(
        params (string name, string ns, string? version)[] workflows)
    {
        var dict = new Dictionary<string, WorkflowResource>();
        foreach (var (name, ns, version) in workflows)
        {
            var key = version != null ? $"{ns}/{name}@{version}" : $"{ns}/{name}";
            var workflow = new WorkflowResource
            {
                ApiVersion = "workflow.io/v1",
                Kind = "Workflow",
                Metadata = new ResourceMetadata
                {
                    Name = name,
                    Namespace = ns,
                    Annotations = version != null
                        ? new Dictionary<string, string> { ["workflow.io/version"] = version }
                        : null
                },
                Spec = new WorkflowSpec()
            };
            dict[key] = workflow;
        }
        return dict;
    }

    #endregion
}
