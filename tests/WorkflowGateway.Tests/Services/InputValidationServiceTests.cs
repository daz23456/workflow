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
    public void Constructor_WithNullSchemaValidator_ShouldThrowArgumentNullException()
    {
        // Act & Assert
        Assert.Throws<ArgumentNullException>(() => new InputValidationService(null!));
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

    [Fact]
    public async Task ValidateAsync_WithNullInputSpec_ShouldAllowAnyInput()
    {
        // Arrange - Tests line 27: workflow.Spec.Input == null
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Input = null // Null input schema
            }
        };

        var input = new Dictionary<string, object>
        {
            ["anything"] = "value"
        };

        // Act
        var result = await _service.ValidateAsync(workflow, input);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
        _schemaValidatorMock.Verify(
            x => x.ValidateAsync(It.IsAny<SchemaDefinition>(), It.IsAny<object>()),
            Times.Never); // Should not call validator when input is null
    }

    [Fact]
    public async Task ValidateAsync_WithOptionalParameter_ShouldNotRequireIt()
    {
        // Arrange - Tests line 58-61: if (param.Required) - false path
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Input = new Dictionary<string, WorkflowInputParameter>
                {
                    ["optionalField"] = new WorkflowInputParameter
                    {
                        Type = "string",
                        Required = false // Not required
                    }
                }
            }
        };

        var input = new Dictionary<string, object>(); // Missing optional field is OK

        _schemaValidatorMock
            .Setup(x => x.ValidateAsync(It.IsAny<SchemaDefinition>(), It.IsAny<object>()))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        // Act
        var result = await _service.ValidateAsync(workflow, input);

        // Assert
        result.IsValid.Should().BeTrue();
        _schemaValidatorMock.Verify(
            x => x.ValidateAsync(
                It.Is<SchemaDefinition>(s => s.Required.Count == 0), // No required fields
                It.IsAny<object>()),
            Times.Once);
    }

    [Fact]
    public async Task ValidateAsync_WithMixedRequiredAndOptional_ShouldOnlyRequireRequired()
    {
        // Arrange - Tests both paths of line 58-61
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Input = new Dictionary<string, WorkflowInputParameter>
                {
                    ["requiredField"] = new WorkflowInputParameter
                    {
                        Type = "string",
                        Required = true
                    },
                    ["optionalField"] = new WorkflowInputParameter
                    {
                        Type = "string",
                        Required = false
                    }
                }
            }
        };

        var input = new Dictionary<string, object>
        {
            ["requiredField"] = "value"
            // optionalField is missing but that's OK
        };

        _schemaValidatorMock
            .Setup(x => x.ValidateAsync(It.IsAny<SchemaDefinition>(), It.IsAny<object>()))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        // Act
        var result = await _service.ValidateAsync(workflow, input);

        // Assert
        _schemaValidatorMock.Verify(
            x => x.ValidateAsync(
                It.Is<SchemaDefinition>(s =>
                    s.Required.Count == 1 &&
                    s.Required.Contains("requiredField") &&
                    !s.Required.Contains("optionalField")),
                It.IsAny<object>()),
            Times.Once);
    }

    [Fact]
    public async Task ValidateAsync_WithParameterDescription_ShouldIncludeInSchema()
    {
        // Arrange - Tests line 55: Description = param.Description
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Input = new Dictionary<string, WorkflowInputParameter>
                {
                    ["documentedField"] = new WorkflowInputParameter
                    {
                        Type = "string",
                        Required = true,
                        Description = "This field is documented"
                    }
                }
            }
        };

        var input = new Dictionary<string, object>
        {
            ["documentedField"] = "value"
        };

        _schemaValidatorMock
            .Setup(x => x.ValidateAsync(It.IsAny<SchemaDefinition>(), It.IsAny<object>()))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        // Act
        await _service.ValidateAsync(workflow, input);

        // Assert
        _schemaValidatorMock.Verify(
            x => x.ValidateAsync(
                It.Is<SchemaDefinition>(s =>
                    s.Properties["documentedField"].Description == "This field is documented"),
                It.IsAny<object>()),
            Times.Once);
    }

    [Fact]
    public async Task ValidateAsync_WithParameterWithoutDescription_ShouldHaveNullDescription()
    {
        // Arrange - Tests line 55 with null Description
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Input = new Dictionary<string, WorkflowInputParameter>
                {
                    ["undocumentedField"] = new WorkflowInputParameter
                    {
                        Type = "string",
                        Required = true,
                        Description = null // No description
                    }
                }
            }
        };

        var input = new Dictionary<string, object>
        {
            ["undocumentedField"] = "value"
        };

        _schemaValidatorMock
            .Setup(x => x.ValidateAsync(It.IsAny<SchemaDefinition>(), It.IsAny<object>()))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        // Act
        await _service.ValidateAsync(workflow, input);

        // Assert
        _schemaValidatorMock.Verify(
            x => x.ValidateAsync(
                It.Is<SchemaDefinition>(s =>
                    s.Properties["undocumentedField"].Description == null),
                It.IsAny<object>()),
            Times.Once);
    }

    [Fact]
    public async Task ValidateAsync_ShouldCreateSchemaWithObjectType()
    {
        // Arrange - Tests line 45: Type = "object"
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Input = new Dictionary<string, WorkflowInputParameter>
                {
                    ["field"] = new WorkflowInputParameter { Type = "string" }
                }
            }
        };

        var input = new Dictionary<string, object> { ["field"] = "value" };

        _schemaValidatorMock
            .Setup(x => x.ValidateAsync(It.IsAny<SchemaDefinition>(), It.IsAny<object>()))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        // Act
        await _service.ValidateAsync(workflow, input);

        // Assert - Verify schema type is "object"
        _schemaValidatorMock.Verify(
            x => x.ValidateAsync(
                It.Is<SchemaDefinition>(s => s.Type == "object"),
                It.IsAny<object>()),
            Times.Once);
    }

    [Fact]
    public async Task ValidateAsync_WithMultipleParameters_ShouldIncludeAllInSchema()
    {
        // Arrange - Tests line 50: foreach loop with multiple iterations
        var workflow = new WorkflowResource
        {
            Spec = new WorkflowSpec
            {
                Input = new Dictionary<string, WorkflowInputParameter>
                {
                    ["field1"] = new WorkflowInputParameter { Type = "string", Required = true },
                    ["field2"] = new WorkflowInputParameter { Type = "integer", Required = false },
                    ["field3"] = new WorkflowInputParameter { Type = "boolean", Required = true }
                }
            }
        };

        var input = new Dictionary<string, object>
        {
            ["field1"] = "value",
            ["field3"] = true
        };

        _schemaValidatorMock
            .Setup(x => x.ValidateAsync(It.IsAny<SchemaDefinition>(), It.IsAny<object>()))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        // Act
        await _service.ValidateAsync(workflow, input);

        // Assert - Verify all fields are in schema
        _schemaValidatorMock.Verify(
            x => x.ValidateAsync(
                It.Is<SchemaDefinition>(s =>
                    s.Properties.Count == 3 &&
                    s.Properties.ContainsKey("field1") &&
                    s.Properties.ContainsKey("field2") &&
                    s.Properties.ContainsKey("field3") &&
                    s.Properties["field1"].Type == "string" &&
                    s.Properties["field2"].Type == "integer" &&
                    s.Properties["field3"].Type == "boolean" &&
                    s.Required.Count == 2 &&
                    s.Required.Contains("field1") &&
                    s.Required.Contains("field3")),
                It.IsAny<object>()),
            Times.Once);
    }
}
