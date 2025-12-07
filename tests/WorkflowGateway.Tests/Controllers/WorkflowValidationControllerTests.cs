using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Controllers;
using WorkflowGateway.Models;
using WorkflowGateway.Services;
using Xunit;

namespace WorkflowGateway.Tests.Controllers;

public class WorkflowValidationControllerTests
{

    [Fact]
    public void ValidateInput_WithValidInput_ReturnsValid()
    {
        // Arrange
        var workflow = CreateTestWorkflow();
        var input = new Dictionary<string, object>
        {
            { "orderId", "123" },
            { "customerId", "456" }
        };

        var validator = new WorkflowInputValidator();

        // Act
        var result = validator.ValidateInput(workflow, input);

        // Assert
        result.Valid.Should().BeTrue();
        result.MissingInputs.Should().BeEmpty();
        result.InvalidInputs.Should().BeEmpty();
        result.SuggestedPrompt.Should().BeNull();
    }

    [Fact]
    public void ValidateInput_WithMissingRequiredInput_ReturnsMissingInputs()
    {
        // Arrange
        var workflow = CreateTestWorkflow();
        var input = new Dictionary<string, object>
        {
            { "orderId", "123" }
            // Missing customerId
        };

        var validator = new WorkflowInputValidator();

        // Act
        var result = validator.ValidateInput(workflow, input);

        // Assert
        result.Valid.Should().BeFalse();
        result.MissingInputs.Should().HaveCount(1);
        result.MissingInputs[0].Field.Should().Be("customerId");
        result.MissingInputs[0].Type.Should().Be("string");
        result.MissingInputs[0].Description.Should().Be("The customer identifier");
    }

    [Fact]
    public void ValidateInput_WithInvalidType_ReturnsInvalidInputs()
    {
        // Arrange
        var workflow = CreateTestWorkflowWithIntegerInput();
        var input = new Dictionary<string, object>
        {
            { "amount", "not-a-number" }
        };

        var validator = new WorkflowInputValidator();

        // Act
        var result = validator.ValidateInput(workflow, input);

        // Assert
        result.Valid.Should().BeFalse();
        result.InvalidInputs.Should().HaveCount(1);
        result.InvalidInputs[0].Field.Should().Be("amount");
        result.InvalidInputs[0].Error.Should().Contain("integer");
    }

    [Fact]
    public void ValidateInput_WithMissingInput_GeneratesSuggestedPrompt()
    {
        // Arrange
        var workflow = CreateTestWorkflow();
        var input = new Dictionary<string, object>();

        var validator = new WorkflowInputValidator();

        // Act
        var result = validator.ValidateInput(workflow, input);

        // Assert
        result.Valid.Should().BeFalse();
        result.SuggestedPrompt.Should().NotBeNullOrEmpty();
        result.SuggestedPrompt.Should().Contain("orderId");
        result.SuggestedPrompt.Should().Contain("customerId");
    }

    [Fact]
    public void ValidateInput_WithOptionalMissing_ReturnsValid()
    {
        // Arrange
        var workflow = CreateTestWorkflowWithOptionalInput();
        var input = new Dictionary<string, object>
        {
            { "requiredField", "value" }
            // Optional field is not provided
        };

        var validator = new WorkflowInputValidator();

        // Act
        var result = validator.ValidateInput(workflow, input);

        // Assert
        result.Valid.Should().BeTrue();
        result.MissingInputs.Should().BeEmpty();
    }

    [Fact]
    public void ValidateInput_WithEmptyWorkflowInput_ReturnsValid()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "no-input-workflow" },
            Spec = new WorkflowSpec
            {
                Description = "Workflow with no input",
                Input = new Dictionary<string, WorkflowInputParameter>()
            }
        };
        var input = new Dictionary<string, object>();

        var validator = new WorkflowInputValidator();

        // Act
        var result = validator.ValidateInput(workflow, input);

        // Assert
        result.Valid.Should().BeTrue();
    }

    [Fact]
    public void ValidateInput_WithNumberAsString_ValidatesCorrectly()
    {
        // Arrange
        var workflow = CreateTestWorkflowWithIntegerInput();
        var input = new Dictionary<string, object>
        {
            { "amount", 100 }
        };

        var validator = new WorkflowInputValidator();

        // Act
        var result = validator.ValidateInput(workflow, input);

        // Assert
        result.Valid.Should().BeTrue();
    }

    [Fact]
    public void ValidateInput_WithJsonElement_HandlesCorrectly()
    {
        // Arrange
        var workflow = CreateTestWorkflow();
        var jsonDoc = JsonDocument.Parse("{\"orderId\": \"123\", \"customerId\": \"456\"}");
        var input = new Dictionary<string, object>();
        foreach (var prop in jsonDoc.RootElement.EnumerateObject())
        {
            input[prop.Name] = prop.Value;
        }

        var validator = new WorkflowInputValidator();

        // Act
        var result = validator.ValidateInput(workflow, input);

        // Assert
        result.Valid.Should().BeTrue();
    }

    private static WorkflowResource CreateTestWorkflow()
    {
        return new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow" },
            Spec = new WorkflowSpec
            {
                Description = "Test workflow",
                Input = new Dictionary<string, WorkflowInputParameter>
                {
                    { "orderId", new WorkflowInputParameter { Type = "string", Required = true, Description = "The order identifier" } },
                    { "customerId", new WorkflowInputParameter { Type = "string", Required = true, Description = "The customer identifier" } }
                }
            }
        };
    }

    private static WorkflowResource CreateTestWorkflowWithIntegerInput()
    {
        return new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow-int" },
            Spec = new WorkflowSpec
            {
                Description = "Test workflow with integer",
                Input = new Dictionary<string, WorkflowInputParameter>
                {
                    { "amount", new WorkflowInputParameter { Type = "integer", Required = true, Description = "The amount" } }
                }
            }
        };
    }

    private static WorkflowResource CreateTestWorkflowWithOptionalInput()
    {
        return new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow-optional" },
            Spec = new WorkflowSpec
            {
                Description = "Test workflow with optional",
                Input = new Dictionary<string, WorkflowInputParameter>
                {
                    { "requiredField", new WorkflowInputParameter { Type = "string", Required = true, Description = "Required" } },
                    { "optionalField", new WorkflowInputParameter { Type = "string", Required = false, Description = "Optional" } }
                }
            }
        };
    }
}
