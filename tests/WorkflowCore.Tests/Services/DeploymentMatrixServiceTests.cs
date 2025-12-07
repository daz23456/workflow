using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

/// <summary>
/// Tests for DeploymentMatrixService - manages deployment tracking.
/// </summary>
public class DeploymentMatrixServiceTests
{
    private readonly DeploymentMatrixService _service;

    public DeploymentMatrixServiceTests()
    {
        _service = new DeploymentMatrixService();
    }

    [Fact]
    public void RecordDeployment_ShouldCreateMatrixIfNotExists()
    {
        // Act
        _service.RecordDeployment("get-user", "v1", "dev");
        var matrix = _service.GetDeploymentMatrix("get-user");

        // Assert
        matrix.Should().NotBeNull();
        matrix!.TaskName.Should().Be("get-user");
        matrix.IsDeployedTo("dev").Should().BeTrue();
    }

    [Fact]
    public void RecordDeployment_ShouldUpdateExistingMatrix()
    {
        // Arrange
        _service.RecordDeployment("get-user", "v1", "dev");

        // Act
        _service.RecordDeployment("get-user", "v2", "dev");
        var matrix = _service.GetDeploymentMatrix("get-user");

        // Assert
        matrix!.GetVersionInEnvironment("dev").Should().Be("v2");
    }

    [Fact]
    public void CanDeploy_ShouldReturnTrue_WhenVersionInPriorEnvironment()
    {
        // Arrange
        _service.RecordDeployment("get-user", "v2", "dev");
        _service.RecordDeployment("get-user", "v2", "staging");

        // Act
        var result = _service.CanDeploy("get-user", "v2", "prod", requiredPriorEnv: "staging");

        // Assert
        result.CanDeploy.Should().BeTrue();
        result.Reason.Should().BeEmpty();
    }

    [Fact]
    public void CanDeploy_ShouldReturnFalse_WhenVersionNotInPriorEnvironment()
    {
        // Arrange
        _service.RecordDeployment("get-user", "v2", "dev");
        _service.RecordDeployment("get-user", "v1", "staging"); // staging has v1

        // Act
        var result = _service.CanDeploy("get-user", "v2", "prod", requiredPriorEnv: "staging");

        // Assert
        result.CanDeploy.Should().BeFalse();
        result.Reason.Should().Contain("not deployed to staging");
    }

    [Fact]
    public void CanDeploy_ShouldReturnFalse_WhenTaskNotFound()
    {
        // Act
        var result = _service.CanDeploy("unknown-task", "v1", "prod", requiredPriorEnv: "staging");

        // Assert
        result.CanDeploy.Should().BeFalse();
        result.Reason.Should().Contain("No deployment matrix found");
    }

    [Fact]
    public void GetAllDeployments_ShouldReturnAllTasks()
    {
        // Arrange
        _service.RecordDeployment("get-user", "v1", "dev");
        _service.RecordDeployment("create-order", "v1", "dev");

        // Act
        var all = _service.GetAllDeployments();

        // Assert
        all.Should().HaveCount(2);
        all.Select(m => m.TaskName).Should().Contain(new[] { "get-user", "create-order" });
    }

    [Fact]
    public void GetDeploymentsInEnvironment_ShouldFilterByEnvironment()
    {
        // Arrange
        _service.RecordDeployment("get-user", "v1", "dev");
        _service.RecordDeployment("get-user", "v1", "staging");
        _service.RecordDeployment("create-order", "v1", "dev");

        // Act
        var stagingDeployments = _service.GetDeploymentsInEnvironment("staging");

        // Assert
        stagingDeployments.Should().HaveCount(1);
        stagingDeployments[0].TaskName.Should().Be("get-user");
    }

    [Fact]
    public void CanDeploy_ShouldReturnTrue_WhenNoPriorEnvRequired()
    {
        // Arrange
        _service.RecordDeployment("get-user", "v1", "dev");

        // Act - no prior env requirement
        var result = _service.CanDeploy("get-user", "v1", "dev", requiredPriorEnv: null);

        // Assert
        result.CanDeploy.Should().BeTrue();
    }
}
