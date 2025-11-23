using FluentAssertions;
using WorkflowCore.Models;

namespace WorkflowCore.Tests.Models;

public class WorkflowVersionTests
{
    [Fact]
    public void WorkflowVersion_ShouldInitializeWithDefaults()
    {
        // Arrange & Act
        var version = new WorkflowVersion();

        // Assert
        version.Id.Should().NotBeEmpty();
        version.WorkflowName.Should().BeNull();
        version.VersionHash.Should().BeNull();
        version.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(1));
        version.DefinitionSnapshot.Should().BeNull();
    }

    [Fact]
    public void WorkflowVersion_ShouldSetAllProperties()
    {
        // Arrange
        var id = Guid.NewGuid();
        var createdAt = DateTime.UtcNow.AddDays(-1);
        var hash = "abc123def456789";
        var yaml = @"apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: test-workflow";

        // Act
        var version = new WorkflowVersion
        {
            Id = id,
            WorkflowName = "test-workflow",
            VersionHash = hash,
            CreatedAt = createdAt,
            DefinitionSnapshot = yaml
        };

        // Assert
        version.Id.Should().Be(id);
        version.WorkflowName.Should().Be("test-workflow");
        version.VersionHash.Should().Be(hash);
        version.CreatedAt.Should().Be(createdAt);
        version.DefinitionSnapshot.Should().Be(yaml);
    }

    [Fact]
    public void WorkflowVersion_DefinitionSnapshot_ShouldStoreYamlContent()
    {
        // Arrange
        var yaml = @"apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: user-onboarding
spec:
  inputs:
    userId: string
  tasks:
    - id: fetch-user
      taskRef: http-get-task";

        // Act
        var version = new WorkflowVersion
        {
            WorkflowName = "user-onboarding",
            VersionHash = "hash123",
            DefinitionSnapshot = yaml
        };

        // Assert
        version.DefinitionSnapshot.Should().Be(yaml);
        version.DefinitionSnapshot.Should().Contain("user-onboarding");
        version.DefinitionSnapshot.Should().Contain("fetch-user");
    }

    [Fact]
    public void WorkflowVersion_ShouldHandleNullDefinitionSnapshot()
    {
        // Arrange & Act
        var version = new WorkflowVersion
        {
            WorkflowName = "test-workflow",
            VersionHash = "hash123",
            DefinitionSnapshot = null
        };

        // Assert
        version.DefinitionSnapshot.Should().BeNull();
    }

    [Fact]
    public void WorkflowVersion_VersionHash_ShouldAcceptSha256Hash()
    {
        // Arrange
        var sha256Hash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

        // Act
        var version = new WorkflowVersion
        {
            WorkflowName = "test-workflow",
            VersionHash = sha256Hash
        };

        // Assert
        version.VersionHash.Should().Be(sha256Hash);
        version.VersionHash.Should().HaveLength(64);
    }

    [Fact]
    public void WorkflowVersion_CreatedAt_ShouldUseUtc()
    {
        // Arrange & Act
        var version = new WorkflowVersion
        {
            WorkflowName = "test-workflow",
            VersionHash = "hash123"
        };

        // Assert
        version.CreatedAt.Kind.Should().Be(DateTimeKind.Utc);
    }
}
