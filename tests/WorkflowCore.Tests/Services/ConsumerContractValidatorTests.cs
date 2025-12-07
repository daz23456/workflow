using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

/// <summary>
/// Tests for ConsumerContractValidator service - validates contracts between workflows and tasks.
/// </summary>
public class ConsumerContractValidatorTests
{
    private readonly ConsumerContractValidator _validator;

    public ConsumerContractValidatorTests()
    {
        _validator = new ConsumerContractValidator();
    }

    [Fact]
    public void RegisterContract_StoresContract()
    {
        // Arrange
        var contract = new ConsumerContract
        {
            TaskName = "get-user",
            ConsumerWorkflow = "order-processing"
        };
        contract.RequiredOutputFields.Add("email");

        // Act
        _validator.RegisterContract(contract);
        var contracts = _validator.GetContractsForTask("get-user");

        // Assert
        contracts.Should().HaveCount(1);
        contracts[0].ConsumerWorkflow.Should().Be("order-processing");
    }

    [Fact]
    public void GetContractsForTask_ReturnsAllConsumers()
    {
        // Arrange
        var contract1 = new ConsumerContract
        {
            TaskName = "get-user",
            ConsumerWorkflow = "workflow-a"
        };
        contract1.RequiredOutputFields.Add("name");

        var contract2 = new ConsumerContract
        {
            TaskName = "get-user",
            ConsumerWorkflow = "workflow-b"
        };
        contract2.RequiredOutputFields.Add("email");

        _validator.RegisterContract(contract1);
        _validator.RegisterContract(contract2);

        // Act
        var contracts = _validator.GetContractsForTask("get-user");

        // Assert
        contracts.Should().HaveCount(2);
    }

    [Fact]
    public void ValidateTaskChange_PassesWhenNoBreakingChanges()
    {
        // Arrange
        var contract = new ConsumerContract
        {
            TaskName = "get-user",
            ConsumerWorkflow = "order-processing"
        };
        contract.RequiredOutputFields.Add("name");
        _validator.RegisterContract(contract);

        var availableFields = new HashSet<string> { "name", "email", "phone" };

        // Act
        var result = _validator.ValidateTaskChange("get-user", availableFields, FieldType.Output);

        // Assert
        result.IsValid.Should().BeTrue();
        result.BrokenContracts.Should().BeEmpty();
    }

    [Fact]
    public void ValidateTaskChange_FailsWhenRequiredFieldRemoved()
    {
        // Arrange
        var contract = new ConsumerContract
        {
            TaskName = "get-user",
            ConsumerWorkflow = "order-processing"
        };
        contract.RequiredOutputFields.Add("name");
        contract.RequiredOutputFields.Add("email");
        _validator.RegisterContract(contract);

        // email field is missing
        var availableFields = new HashSet<string> { "name" };

        // Act
        var result = _validator.ValidateTaskChange("get-user", availableFields, FieldType.Output);

        // Assert
        result.IsValid.Should().BeFalse();
        result.BrokenContracts.Should().HaveCount(1);
        result.MissingFields.Should().Contain("email");
    }

    [Fact]
    public void ValidateTaskChange_ReportsAllBrokenContracts()
    {
        // Arrange
        var contract1 = new ConsumerContract
        {
            TaskName = "get-user",
            ConsumerWorkflow = "workflow-a"
        };
        contract1.RequiredOutputFields.Add("email");

        var contract2 = new ConsumerContract
        {
            TaskName = "get-user",
            ConsumerWorkflow = "workflow-b"
        };
        contract2.RequiredOutputFields.Add("email");

        _validator.RegisterContract(contract1);
        _validator.RegisterContract(contract2);

        // email field is missing
        var availableFields = new HashSet<string> { "name" };

        // Act
        var result = _validator.ValidateTaskChange("get-user", availableFields, FieldType.Output);

        // Assert
        result.BrokenContracts.Should().HaveCount(2);
        result.AffectedWorkflows.Should().Contain(new[] { "workflow-a", "workflow-b" });
    }

    [Fact]
    public void GetRequiredFieldsForTask_ReturnsUnionOfAllContracts()
    {
        // Arrange
        var contract1 = new ConsumerContract
        {
            TaskName = "get-user",
            ConsumerWorkflow = "workflow-a"
        };
        contract1.RequiredOutputFields.Add("name");
        contract1.RequiredOutputFields.Add("email");

        var contract2 = new ConsumerContract
        {
            TaskName = "get-user",
            ConsumerWorkflow = "workflow-b"
        };
        contract2.RequiredOutputFields.Add("email");
        contract2.RequiredOutputFields.Add("phone");

        _validator.RegisterContract(contract1);
        _validator.RegisterContract(contract2);

        // Act
        var requiredFields = _validator.GetRequiredFieldsForTask("get-user", FieldType.Output);

        // Assert
        requiredFields.Should().HaveCount(3);
        requiredFields.Should().Contain(new[] { "name", "email", "phone" });
    }

    [Fact]
    public void RemoveContract_DeletesContractForWorkflow()
    {
        // Arrange
        var contract = new ConsumerContract
        {
            TaskName = "get-user",
            ConsumerWorkflow = "workflow-to-remove"
        };
        contract.RequiredOutputFields.Add("email");
        _validator.RegisterContract(contract);

        // Act
        _validator.RemoveContract("get-user", "workflow-to-remove");
        var contracts = _validator.GetContractsForTask("get-user");

        // Assert
        contracts.Should().BeEmpty();
    }
}
