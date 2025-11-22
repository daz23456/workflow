using FluentAssertions;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Services;
using Xunit;

namespace WorkflowGateway.Tests.Services;

public class InputValidationServiceTests
{
    private readonly Mock<ISchemaValidator> _schemaValidatorMock;
    private readonly IInputValidationService _service;

    public InputValidationServiceTests()
    {
        _schemaValidatorMock = new Mock<ISchemaValidator>();
        _service = new InputValidationService(_schemaValidatorMock.Object);
    }

    [Fact]
    public async Task ValidateAsync_WithValidInput_ShouldReturnSuccess()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Input = new Dictionary<string, WorkflowInputParameter>
                {
                    ["userId"] = new WorkflowInputParameter
                    {
                        Type = "string",
                        Required = true
                    }
                }
            }
        };

        var input = new Dictionary<string, object>
        {
            ["userId"] = "123"
        };

        _schemaValidatorMock
            .Setup(x => x.ValidateAsync(It.IsAny<SchemaDefinition>(), It.IsAny<object>()))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        // Act
        var result = await _service.ValidateAsync(workflow, input);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }

    [Fact]
    public async Task ValidateAsync_WithMissingRequiredField_ShouldReturnError()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Input = new Dictionary<string, WorkflowInputParameter>
                {
                    ["userId"] = new WorkflowInputParameter
                    {
                        Type = "string",
                        Required = true
                    }
                }
            }
        };

        var input = new Dictionary<string, object>(); // Missing userId

        _schemaValidatorMock
            .Setup(x => x.ValidateAsync(It.IsAny<SchemaDefinition>(), It.IsAny<object>()))
            .ReturnsAsync(new ValidationResult
            {
                IsValid = false,
                Errors = new List<ValidationError>
                {
                    new ValidationError
                    {
                        Field = "userId",
                        Message = "Required field 'userId' is missing"
                    }
                }
            });

        // Act
        var result = await _service.ValidateAsync(workflow, input);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Field.Should().Be("userId");
        result.Errors[0].Message.Should().Contain("Required");
    }

    [Fact]
    public async Task ValidateAsync_WithInvalidType_ShouldReturnError()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Input = new Dictionary<string, WorkflowInputParameter>
                {
                    ["age"] = new WorkflowInputParameter
                    {
                        Type = "integer",
                        Required = true
                    }
                }
            }
        };

        var input = new Dictionary<string, object>
        {
            ["age"] = "not a number" // Wrong type
        };

        _schemaValidatorMock
            .Setup(x => x.ValidateAsync(It.IsAny<SchemaDefinition>(), It.IsAny<object>()))
            .ReturnsAsync(new ValidationResult
            {
                IsValid = false,
                Errors = new List<ValidationError>
                {
                    new ValidationError
                    {
                        Field = "age",
                        Message = "Type mismatch: expected 'integer', got 'string'"
                    }
                }
            });

        // Act
        var result = await _service.ValidateAsync(workflow, input);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Field.Should().Be("age");
        result.Errors[0].Message.Should().Contain("Type mismatch");
    }

    [Fact]
    public async Task ValidateAsync_WithNoInputSchema_ShouldAllowAnyInput()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Input = new Dictionary<string, WorkflowInputParameter>() // Empty input schema
            }
        };

        var input = new Dictionary<string, object>
        {
            ["anything"] = "any value"
        };

        // Act
        var result = await _service.ValidateAsync(workflow, input);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
        _schemaValidatorMock.Verify(
            x => x.ValidateAsync(It.IsAny<SchemaDefinition>(), It.IsAny<object>()),
            Times.Never); // Should not call validator for empty schema
    }

    [Fact]
    public async Task ValidateAsync_ShouldUseSchemaValidator()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Input = new Dictionary<string, WorkflowInputParameter>
                {
                    ["name"] = new WorkflowInputParameter { Type = "string" }
                }
            }
        };

        var input = new Dictionary<string, object> { ["name"] = "test" };

        _schemaValidatorMock
            .Setup(x => x.ValidateAsync(It.IsAny<SchemaDefinition>(), It.IsAny<object>()))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        // Act
        await _service.ValidateAsync(workflow, input);

        // Assert
        _schemaValidatorMock.Verify(
            x => x.ValidateAsync(
                It.Is<SchemaDefinition>(s => s.Type == "object" && s.Properties.ContainsKey("name")),
                It.Is<object>(o => o == input)),
            Times.Once);
    }

    [Fact]
    public async Task ValidateAsync_ShouldReturnFieldLevelErrors()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Input = new Dictionary<string, WorkflowInputParameter>
                {
                    ["name"] = new WorkflowInputParameter { Type = "string", Required = true },
                    ["age"] = new WorkflowInputParameter { Type = "integer", Required = true },
                    ["email"] = new WorkflowInputParameter { Type = "string", Required = true }
                }
            }
        };

        var input = new Dictionary<string, object>
        {
            ["name"] = "John"
            // Missing age and email
        };

        _schemaValidatorMock
            .Setup(x => x.ValidateAsync(It.IsAny<SchemaDefinition>(), It.IsAny<object>()))
            .ReturnsAsync(new ValidationResult
            {
                IsValid = false,
                Errors = new List<ValidationError>
                {
                    new ValidationError { Field = "age", Message = "Required field missing" },
                    new ValidationError { Field = "email", Message = "Required field missing" }
                }
            });

        // Act
        var result = await _service.ValidateAsync(workflow, input);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().HaveCount(2);
        result.Errors.Should().Contain(e => e.Field == "age");
        result.Errors.Should().Contain(e => e.Field == "email");
    }
}
