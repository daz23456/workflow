using FluentAssertions;
using WorkflowCore.Models;
using Xunit;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace WorkflowCore.Tests.Models;

public class WorkflowResourceTests
{
    [Fact]
    public void WorkflowResource_ShouldDeserializeFromYaml()
    {
        // Arrange
        var yaml = @"
apiVersion: workflows.example.com/v1
kind: Workflow
metadata:
  name: user-workflow
  namespace: default
spec:
  tasks:
    - id: fetch-user
      taskRef: fetch-user-task
      input:
        userId: '{{input.userId}}'
    - id: process-user
      taskRef: process-user-task
      input:
        user: '{{tasks.fetch-user.output.body}}'
";

        // Act
        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .Build();
        var resource = deserializer.Deserialize<WorkflowResource>(yaml);

        // Assert
        resource.Should().NotBeNull();
        resource.ApiVersion.Should().Be("workflows.example.com/v1");
        resource.Kind.Should().Be("Workflow");
        resource.Metadata.Name.Should().Be("user-workflow");
        resource.Spec.Tasks.Should().HaveCount(2);
        resource.Spec.Tasks[0].Id.Should().Be("fetch-user");
        resource.Spec.Tasks[0].TaskRef.Should().Be("fetch-user-task");
        resource.Spec.Tasks[1].Id.Should().Be("process-user");
        resource.Spec.Tasks[1].Input.Should().ContainKey("user");
    }

    [Fact]
    public void WorkflowResource_ShouldInitializeWithDefaultValues()
    {
        // Act
        var resource = new WorkflowResource();

        // Assert
        resource.ApiVersion.Should().Be(string.Empty);
        resource.Kind.Should().Be(string.Empty);
        resource.Metadata.Should().NotBeNull();
        resource.Spec.Should().NotBeNull();
        resource.Status.Should().BeNull();
    }

    [Fact]
    public void WorkflowSpec_ShouldInitializeWithDefaultValues()
    {
        // Act
        var spec = new WorkflowSpec();

        // Assert
        spec.Input.Should().NotBeNull();
        spec.Input.Should().BeEmpty();
        spec.Tasks.Should().NotBeNull();
        spec.Tasks.Should().BeEmpty();
        spec.Output.Should().BeNull();
    }

    [Fact]
    public void WorkflowInputParameter_ShouldInitializeWithDefaultValues()
    {
        // Act
        var param = new WorkflowInputParameter();

        // Assert
        param.Type.Should().Be(string.Empty);
        param.Required.Should().BeFalse();
        param.Description.Should().BeNull();
        param.Default.Should().BeNull();
    }

    [Fact]
    public void WorkflowInputParameter_ShouldAllowSettingAllProperties()
    {
        // Act
        var param = new WorkflowInputParameter
        {
            Type = "string",
            Required = true,
            Description = "User ID",
            Default = "default-value"
        };

        // Assert
        param.Type.Should().Be("string");
        param.Required.Should().BeTrue();
        param.Description.Should().Be("User ID");
        param.Default.Should().Be("default-value");
    }

    [Fact]
    public void WorkflowTaskStep_ShouldInitializeWithDefaultValues()
    {
        // Act
        var step = new WorkflowTaskStep();

        // Assert
        step.Id.Should().Be(string.Empty);
        step.TaskRef.Should().Be(string.Empty);
        step.Input.Should().NotBeNull();
        step.Input.Should().BeEmpty();
        step.Condition.Should().BeNull();
    }

    [Fact]
    public void WorkflowTaskStep_ShouldAllowSettingAllProperties()
    {
        // Act
        var step = new WorkflowTaskStep
        {
            Id = "fetch-user",
            TaskRef = "fetch-user-task",
            Input = new Dictionary<string, string> { ["userId"] = "{{input.userId}}" },
            Condition = "{{input.active}} == true"
        };

        // Assert
        step.Id.Should().Be("fetch-user");
        step.TaskRef.Should().Be("fetch-user-task");
        step.Input.Should().ContainKey("userId");
        step.Condition.Should().Be("{{input.active}} == true");
    }

    [Fact]
    public void WorkflowStatus_ShouldInitializeWithDefaultValues()
    {
        // Act
        var status = new WorkflowStatus();

        // Assert
        status.Phase.Should().Be("Pending");
        status.ExecutionCount.Should().Be(0);
        status.LastExecuted.Should().Be(default(DateTime));
        status.ValidationErrors.Should().NotBeNull();
        status.ValidationErrors.Should().BeEmpty();
    }

    [Fact]
    public void WorkflowStatus_ShouldAllowSettingAllProperties()
    {
        // Arrange
        var now = DateTime.UtcNow;

        // Act
        var status = new WorkflowStatus
        {
            Phase = "Ready",
            ExecutionCount = 42,
            LastExecuted = now,
            ValidationErrors = new List<string> { "Error 1" }
        };

        // Assert
        status.Phase.Should().Be("Ready");
        status.ExecutionCount.Should().Be(42);
        status.LastExecuted.Should().Be(now);
        status.ValidationErrors.Should().HaveCount(1);
    }
}
