using FluentAssertions;
using WorkflowCore.Models;
using Xunit;

namespace WorkflowCore.Tests.Models;

/// <summary>
/// Tests for TaskDeploymentMatrix model - environment tracking.
/// </summary>
public class TaskDeploymentMatrixTests
{
    [Fact]
    public void TaskDeploymentMatrix_ShouldInitializeWithDefaults()
    {
        // Arrange & Act
        var matrix = new TaskDeploymentMatrix();

        // Assert
        matrix.TaskName.Should().BeEmpty();
        matrix.Deployments.Should().NotBeNull();
        matrix.Deployments.Should().BeEmpty();
    }

    [Fact]
    public void TaskDeploymentMatrix_ShouldSetProperties()
    {
        // Arrange & Act
        var matrix = new TaskDeploymentMatrix
        {
            TaskName = "get-user",
            TaskVersion = "v2"
        };

        // Assert
        matrix.TaskName.Should().Be("get-user");
        matrix.TaskVersion.Should().Be("v2");
    }

    [Fact]
    public void TaskDeploymentMatrix_AddDeployment_ShouldTrackEnvironment()
    {
        // Arrange
        var matrix = new TaskDeploymentMatrix { TaskName = "get-user" };

        // Act
        matrix.AddDeployment("dev", "v1", DateTime.UtcNow);
        matrix.AddDeployment("staging", "v1", DateTime.UtcNow);

        // Assert
        matrix.Deployments.Should().HaveCount(2);
        matrix.IsDeployedTo("dev").Should().BeTrue();
        matrix.IsDeployedTo("staging").Should().BeTrue();
        matrix.IsDeployedTo("prod").Should().BeFalse();
    }

    [Fact]
    public void TaskDeploymentMatrix_GetVersionInEnvironment_ShouldReturnCorrectVersion()
    {
        // Arrange
        var matrix = new TaskDeploymentMatrix { TaskName = "get-user" };
        matrix.AddDeployment("dev", "v2", DateTime.UtcNow);
        matrix.AddDeployment("staging", "v1", DateTime.UtcNow);
        matrix.AddDeployment("prod", "v1", DateTime.UtcNow);

        // Act & Assert
        matrix.GetVersionInEnvironment("dev").Should().Be("v2");
        matrix.GetVersionInEnvironment("staging").Should().Be("v1");
        matrix.GetVersionInEnvironment("prod").Should().Be("v1");
        matrix.GetVersionInEnvironment("unknown").Should().BeNull();
    }

    [Fact]
    public void TaskDeploymentMatrix_CanDeployTo_ShouldReturnTrue_WhenVersionCompatible()
    {
        // Arrange
        var matrix = new TaskDeploymentMatrix { TaskName = "get-user" };
        matrix.AddDeployment("dev", "v2", DateTime.UtcNow);
        matrix.AddDeployment("staging", "v2", DateTime.UtcNow);

        // Act - can deploy v2 to prod since it's in staging
        var canDeploy = matrix.CanDeployTo("prod", "v2", requiredPriorEnvironment: "staging");

        // Assert
        canDeploy.Should().BeTrue();
    }

    [Fact]
    public void TaskDeploymentMatrix_CanDeployTo_ShouldReturnFalse_WhenVersionNotInPriorEnv()
    {
        // Arrange
        var matrix = new TaskDeploymentMatrix { TaskName = "get-user" };
        matrix.AddDeployment("dev", "v2", DateTime.UtcNow);
        matrix.AddDeployment("staging", "v1", DateTime.UtcNow); // staging still has v1

        // Act - cannot deploy v2 to prod since staging has v1
        var canDeploy = matrix.CanDeployTo("prod", "v2", requiredPriorEnvironment: "staging");

        // Assert
        canDeploy.Should().BeFalse();
    }

    [Fact]
    public void TaskDeploymentMatrix_UpdateDeployment_ShouldReplaceExistingVersion()
    {
        // Arrange
        var matrix = new TaskDeploymentMatrix { TaskName = "get-user" };
        matrix.AddDeployment("dev", "v1", DateTime.UtcNow.AddDays(-1));

        // Act
        matrix.AddDeployment("dev", "v2", DateTime.UtcNow);

        // Assert
        matrix.Deployments.Should().HaveCount(1);
        matrix.GetVersionInEnvironment("dev").Should().Be("v2");
    }

    [Fact]
    public void TaskDeploymentMatrix_GetEnvironmentsWithVersion_ShouldReturnCorrectEnvironments()
    {
        // Arrange
        var matrix = new TaskDeploymentMatrix { TaskName = "get-user" };
        matrix.AddDeployment("dev", "v2", DateTime.UtcNow);
        matrix.AddDeployment("staging", "v1", DateTime.UtcNow);
        matrix.AddDeployment("prod", "v1", DateTime.UtcNow);

        // Act
        var envsWithV1 = matrix.GetEnvironmentsWithVersion("v1");
        var envsWithV2 = matrix.GetEnvironmentsWithVersion("v2");

        // Assert
        envsWithV1.Should().BeEquivalentTo(new[] { "staging", "prod" });
        envsWithV2.Should().BeEquivalentTo(new[] { "dev" });
    }
}
