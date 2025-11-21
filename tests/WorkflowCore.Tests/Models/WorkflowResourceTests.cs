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
}
