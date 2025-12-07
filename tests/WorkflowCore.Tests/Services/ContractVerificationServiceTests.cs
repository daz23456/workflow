using FluentAssertions;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

/// <summary>
/// Tests for ContractVerificationService - verifies task contracts.
/// </summary>
public class ContractVerificationServiceTests
{
    private readonly ContractVerificationService _service;
    private readonly Mock<IInteractionRecorder> _recorderMock;

    public ContractVerificationServiceTests()
    {
        _recorderMock = new Mock<IInteractionRecorder>();
        _service = new ContractVerificationService(_recorderMock.Object);
    }

    [Fact]
    public void RegisterScenario_ShouldStoreScenario()
    {
        // Arrange
        var scenario = new TaskTestScenario
        {
            TaskName = "get-user",
            ScenarioName = "user-exists",
            ProviderState = "A user exists"
        };

        // Act
        _service.RegisterScenario(scenario);
        var scenarios = _service.GetScenariosForTask("get-user");

        // Assert
        scenarios.Should().HaveCount(1);
        scenarios[0].ScenarioName.Should().Be("user-exists");
    }

    [Fact]
    public void RegisterScenario_ShouldReplaceExistingWithSameName()
    {
        // Arrange
        var scenario1 = new TaskTestScenario
        {
            TaskName = "get-user",
            ScenarioName = "user-exists",
            ProviderState = "Old state"
        };
        var scenario2 = new TaskTestScenario
        {
            TaskName = "get-user",
            ScenarioName = "user-exists",
            ProviderState = "New state"
        };

        // Act
        _service.RegisterScenario(scenario1);
        _service.RegisterScenario(scenario2);
        var scenarios = _service.GetScenariosForTask("get-user");

        // Assert
        scenarios.Should().HaveCount(1);
        scenarios[0].ProviderState.Should().Be("New state");
    }

    [Fact]
    public void VerifyContract_ShouldReturnSuccess_WhenResponseMatchesExpectation()
    {
        // Arrange
        var scenario = new TaskTestScenario
        {
            TaskName = "get-user",
            ScenarioName = "user-exists",
            ExpectedStatusCode = 200
        };
        _service.RegisterScenario(scenario);

        var interaction = new RecordedInteraction
        {
            TaskName = "get-user",
            StatusCode = 200,
            ResponseBody = "{ \"name\": \"John\" }"
        };
        _recorderMock.Setup(x => x.GetLatestInteraction("get-user"))
            .Returns(interaction);

        // Act
        var result = _service.VerifyContract("get-user", "user-exists");

        // Assert
        result.IsVerified.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }

    [Fact]
    public void VerifyContract_ShouldReturnFailure_WhenStatusCodeMismatch()
    {
        // Arrange
        var scenario = new TaskTestScenario
        {
            TaskName = "get-user",
            ScenarioName = "user-exists",
            ExpectedStatusCode = 200
        };
        _service.RegisterScenario(scenario);

        var interaction = new RecordedInteraction
        {
            TaskName = "get-user",
            StatusCode = 404,
            ResponseBody = "{ \"error\": \"Not found\" }"
        };
        _recorderMock.Setup(x => x.GetLatestInteraction("get-user"))
            .Returns(interaction);

        // Act
        var result = _service.VerifyContract("get-user", "user-exists");

        // Assert
        result.IsVerified.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("status code"));
    }

    [Fact]
    public void VerifyContract_ShouldReturnFailure_WhenScenarioNotFound()
    {
        // Act
        var result = _service.VerifyContract("get-user", "non-existent");

        // Assert
        result.IsVerified.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("Scenario not found"));
    }

    [Fact]
    public void VerifyAllContracts_ShouldVerifyAllScenarios()
    {
        // Arrange
        var scenario1 = new TaskTestScenario
        {
            TaskName = "get-user",
            ScenarioName = "user-exists",
            ExpectedStatusCode = 200
        };
        var scenario2 = new TaskTestScenario
        {
            TaskName = "get-user",
            ScenarioName = "user-not-found",
            ExpectedStatusCode = 404
        };
        _service.RegisterScenario(scenario1);
        _service.RegisterScenario(scenario2);

        var interaction = new RecordedInteraction
        {
            TaskName = "get-user",
            StatusCode = 200
        };
        _recorderMock.Setup(x => x.GetLatestInteraction("get-user"))
            .Returns(interaction);

        // Act
        var results = _service.VerifyAllContracts("get-user");

        // Assert
        results.Should().HaveCount(2);
        results.Should().ContainSingle(r => r.ScenarioName == "user-exists" && r.IsVerified);
        results.Should().ContainSingle(r => r.ScenarioName == "user-not-found" && !r.IsVerified);
    }

    [Fact]
    public void GetScenariosForTask_ShouldReturnEmpty_WhenNoScenarios()
    {
        // Act
        var scenarios = _service.GetScenariosForTask("unknown-task");

        // Assert
        scenarios.Should().BeEmpty();
    }
}
