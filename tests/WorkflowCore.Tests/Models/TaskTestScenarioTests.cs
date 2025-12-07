using FluentAssertions;
using WorkflowCore.Models;
using Xunit;

namespace WorkflowCore.Tests.Models;

/// <summary>
/// Tests for TaskTestScenario model - provider state test scenarios.
/// </summary>
public class TaskTestScenarioTests
{
    [Fact]
    public void TaskTestScenario_ShouldInitializeWithDefaults()
    {
        // Arrange & Act
        var scenario = new TaskTestScenario();

        // Assert
        scenario.TaskName.Should().BeEmpty();
        scenario.ScenarioName.Should().BeEmpty();
        scenario.ProviderState.Should().BeEmpty();
        scenario.ExpectedStatusCode.Should().Be(200);
        scenario.ExpectedResponseSchema.Should().BeNull();
    }

    [Fact]
    public void TaskTestScenario_ShouldSetProperties()
    {
        // Arrange & Act
        var scenario = new TaskTestScenario
        {
            TaskName = "get-user",
            ScenarioName = "user-exists",
            ProviderState = "A user with ID 123 exists",
            ExpectedStatusCode = 200,
            ExpectedResponseSchema = "{ \"type\": \"object\" }",
            SampleInput = new Dictionary<string, object> { ["userId"] = "123" }
        };

        // Assert
        scenario.TaskName.Should().Be("get-user");
        scenario.ScenarioName.Should().Be("user-exists");
        scenario.ProviderState.Should().Be("A user with ID 123 exists");
        scenario.ExpectedStatusCode.Should().Be(200);
        scenario.SampleInput["userId"].Should().Be("123");
    }

    [Fact]
    public void TaskTestScenario_IsValid_ShouldReturnTrue_WhenRequiredFieldsSet()
    {
        // Arrange
        var scenario = new TaskTestScenario
        {
            TaskName = "get-user",
            ScenarioName = "user-exists",
            ProviderState = "A user exists"
        };

        // Act & Assert
        scenario.IsValid.Should().BeTrue();
    }

    [Fact]
    public void TaskTestScenario_IsValid_ShouldReturnFalse_WhenMissingTaskName()
    {
        // Arrange
        var scenario = new TaskTestScenario
        {
            ScenarioName = "user-exists",
            ProviderState = "A user exists"
        };

        // Act & Assert
        scenario.IsValid.Should().BeFalse();
    }

    [Fact]
    public void TaskTestScenario_IsValid_ShouldReturnFalse_WhenMissingScenarioName()
    {
        // Arrange
        var scenario = new TaskTestScenario
        {
            TaskName = "get-user",
            ProviderState = "A user exists"
        };

        // Act & Assert
        scenario.IsValid.Should().BeFalse();
    }

    [Fact]
    public void TaskTestScenario_ErrorScenarios_ShouldBeEmpty_ByDefault()
    {
        // Arrange & Act
        var scenario = new TaskTestScenario();

        // Assert
        scenario.ErrorScenarios.Should().NotBeNull();
        scenario.ErrorScenarios.Should().BeEmpty();
    }

    [Fact]
    public void TaskTestScenario_HasErrorScenarios_ShouldReturnTrue_WhenErrorsExist()
    {
        // Arrange
        var scenario = new TaskTestScenario();
        scenario.ErrorScenarios.Add(new ErrorScenario
        {
            StatusCode = 404,
            ErrorCode = "USER_NOT_FOUND",
            Description = "User does not exist"
        });

        // Act & Assert
        scenario.HasErrorScenarios.Should().BeTrue();
    }
}
