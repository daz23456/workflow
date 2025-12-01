using FluentAssertions;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowOperator.Webhooks;
using Xunit;

namespace WorkflowOperator.Tests.Webhooks;

public class WorkflowTaskValidationWebhookTests
{
    private readonly Mock<ISchemaValidator> _schemaValidatorMock;
    private readonly WorkflowTaskValidationWebhook _webhook;

    public WorkflowTaskValidationWebhookTests()
    {
        _schemaValidatorMock = new Mock<ISchemaValidator>();
        _webhook = new WorkflowTaskValidationWebhook(_schemaValidatorMock.Object);
    }

    [Fact]
    public async Task ValidateAsync_WithValidTask_ShouldReturnAllowed()
    {
        // Arrange
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "fetch-user" },
            Spec = new WorkflowTaskSpec
            {
                Type = "http",
                InputSchema = new SchemaDefinition
                {
                    Type = "object",
                    Properties = new Dictionary<string, PropertyDefinition>
                    {
                        ["userId"] = new PropertyDefinition { Type = "string" }
                    }
                },
                Request = new HttpRequestDefinition
                {
                    Method = "GET",
                    Url = "https://api.example.com/users"
                }
            }
        };

        // Act
        var result = await _webhook.ValidateAsync(task);

        // Assert
        result.Allowed.Should().BeTrue();
        result.Message.Should().BeNull();
    }

    [Fact]
    public async Task ValidateAsync_WithMissingType_ShouldReturnDenied()
    {
        // Arrange
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "invalid-task" },
            Spec = new WorkflowTaskSpec { Type = "" } // Missing type
        };

        // Act
        var result = await _webhook.ValidateAsync(task);

        // Assert
        result.Allowed.Should().BeFalse();
        result.Message.Should().Contain("Task type is required");
    }

    [Fact]
    public async Task ValidateAsync_WithUnsupportedType_ShouldReturnDenied()
    {
        // Arrange
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "invalid-task" },
            Spec = new WorkflowTaskSpec { Type = "unsupported" }
        };

        // Act
        var result = await _webhook.ValidateAsync(task);

        // Assert
        result.Allowed.Should().BeFalse();
        result.Message.Should().Contain("Unsupported task type");
        result.Message.Should().Contain("Supported types: http, transform");
    }

    [Fact]
    public async Task ValidateAsync_WithDeprecatedFetchType_ShouldReturnDeniedWithMigrationMessage()
    {
        // Arrange
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "fetch-task" },
            Spec = new WorkflowTaskSpec
            {
                Type = "fetch",
                Request = new HttpRequestDefinition
                {
                    Method = "GET",
                    Url = "https://api.example.com"
                }
            }
        };

        // Act
        var result = await _webhook.ValidateAsync(task);

        // Assert
        result.Allowed.Should().BeFalse();
        result.Message.Should().Contain("'fetch' has been deprecated");
        result.Message.Should().Contain("use 'http' instead");
        result.Message.Should().Contain("change 'type: fetch' to 'type: http'");
    }

    [Fact]
    public async Task ValidateAsync_WithTransformType_ShouldReturnAllowed()
    {
        // Arrange
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "transform-task" },
            Spec = new WorkflowTaskSpec
            {
                Type = "transform",
                Transform = new TransformDefinition
                {
                    Query = "$.data[*]"
                }
            }
        };

        // Act
        var result = await _webhook.ValidateAsync(task);

        // Assert
        result.Allowed.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateAsync_WithHttpTaskMissingRequest_ShouldReturnDenied()
    {
        // Arrange
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "http-task" },
            Spec = new WorkflowTaskSpec
            {
                Type = "http",
                Request = null // Missing for http type
            }
        };

        // Act
        var result = await _webhook.ValidateAsync(task);

        // Assert
        result.Allowed.Should().BeFalse();
        result.Message.Should().Contain("HTTP tasks must have a request definition");
    }

    [Fact]
    public async Task ValidateAsync_WithHttpTaskInvalidMethod_ShouldReturnDenied()
    {
        // Arrange
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "http-task" },
            Spec = new WorkflowTaskSpec
            {
                Type = "http",
                Request = new HttpRequestDefinition
                {
                    Method = "INVALID",
                    Url = "https://api.example.com"
                }
            }
        };

        // Act
        var result = await _webhook.ValidateAsync(task);

        // Assert
        result.Allowed.Should().BeFalse();
        result.Message.Should().Contain("Invalid HTTP method");
        result.Message.Should().Contain("Allowed: GET, POST, PUT, DELETE, PATCH");
    }

    [Fact]
    public async Task ValidateAsync_WithHttpTaskMissingUrl_ShouldReturnDenied()
    {
        // Arrange
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "http-task" },
            Spec = new WorkflowTaskSpec
            {
                Type = "http",
                Request = new HttpRequestDefinition
                {
                    Method = "GET",
                    Url = "" // Missing URL
                }
            }
        };

        // Act
        var result = await _webhook.ValidateAsync(task);

        // Assert
        result.Allowed.Should().BeFalse();
        result.Message.Should().Contain("HTTP tasks must have a URL");
    }

    [Fact]
    public async Task ValidateAsync_WithNullUrl_ShouldReturnDenied()
    {
        // Arrange
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "http-task" },
            Spec = new WorkflowTaskSpec
            {
                Type = "http",
                Request = new HttpRequestDefinition
                {
                    Method = "GET",
                    Url = null! // Null URL
                }
            }
        };

        // Act
        var result = await _webhook.ValidateAsync(task);

        // Assert
        result.Allowed.Should().BeFalse();
        result.Message.Should().Contain("HTTP tasks must have a URL");
    }

    [Fact]
    public async Task ValidateAsync_WithWhitespaceUrl_ShouldReturnDenied()
    {
        // Arrange
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "http-task" },
            Spec = new WorkflowTaskSpec
            {
                Type = "http",
                Request = new HttpRequestDefinition
                {
                    Method = "GET",
                    Url = "   " // Whitespace only
                }
            }
        };

        // Act
        var result = await _webhook.ValidateAsync(task);

        // Assert
        result.Allowed.Should().BeFalse();
        result.Message.Should().Contain("HTTP tasks must have a URL");
    }

    [Fact]
    public async Task ValidateAsync_WithNullMethod_ShouldReturnDenied()
    {
        // Arrange
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "http-task" },
            Spec = new WorkflowTaskSpec
            {
                Type = "http",
                Request = new HttpRequestDefinition
                {
                    Method = null!, // Null method
                    Url = "https://api.example.com"
                }
            }
        };

        // Act
        var result = await _webhook.ValidateAsync(task);

        // Assert
        result.Allowed.Should().BeFalse();
        result.Message.Should().Contain("Invalid HTTP method");
    }

    [Fact]
    public async Task ValidateAsync_WithLowercaseMethod_ShouldReturnAllowed()
    {
        // Arrange
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "http-task" },
            Spec = new WorkflowTaskSpec
            {
                Type = "http",
                Request = new HttpRequestDefinition
                {
                    Method = "get", // Lowercase - should be normalized
                    Url = "https://api.example.com"
                }
            }
        };

        // Act
        var result = await _webhook.ValidateAsync(task);

        // Assert
        result.Allowed.Should().BeTrue();
    }

    [Theory]
    [InlineData("GET")]
    [InlineData("POST")]
    [InlineData("PUT")]
    [InlineData("DELETE")]
    [InlineData("PATCH")]
    public async Task ValidateAsync_WithAllAllowedMethods_ShouldReturnAllowed(string method)
    {
        // Arrange
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "http-task" },
            Spec = new WorkflowTaskSpec
            {
                Type = "http",
                Request = new HttpRequestDefinition
                {
                    Method = method,
                    Url = "https://api.example.com"
                }
            }
        };

        // Act
        var result = await _webhook.ValidateAsync(task);

        // Assert
        result.Allowed.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateAsync_WithWhitespaceType_ShouldReturnDenied()
    {
        // Arrange
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "task" },
            Spec = new WorkflowTaskSpec
            {
                Type = "   " // Whitespace
            }
        };

        // Act
        var result = await _webhook.ValidateAsync(task);

        // Assert
        result.Allowed.Should().BeFalse();
        result.Message.Should().Contain("Task type is required");
    }

    [Fact]
    public async Task ValidateAsync_WithNullType_ShouldReturnDenied()
    {
        // Arrange
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "task" },
            Spec = new WorkflowTaskSpec
            {
                Type = null! // Null type
            }
        };

        // Act
        var result = await _webhook.ValidateAsync(task);

        // Assert
        result.Allowed.Should().BeFalse();
        result.Message.Should().Contain("Task type is required");
    }

    [Fact]
    public async Task ValidateAsync_WithComplexInputSchema_ShouldReturnAllowed()
    {
        // Arrange
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "complex-task" },
            Spec = new WorkflowTaskSpec
            {
                Type = "http",
                InputSchema = new SchemaDefinition
                {
                    Type = "object",
                    Properties = new Dictionary<string, PropertyDefinition>
                    {
                        ["nested"] = new PropertyDefinition
                        {
                            Type = "object",
                            Properties = new Dictionary<string, PropertyDefinition>
                            {
                                ["deep"] = new PropertyDefinition { Type = "string" }
                            }
                        }
                    }
                },
                Request = new HttpRequestDefinition
                {
                    Method = "POST",
                    Url = "https://api.example.com"
                }
            }
        };

        // Act
        var result = await _webhook.ValidateAsync(task);

        // Assert
        result.Allowed.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateAsync_WithOutputSchema_ShouldReturnAllowed()
    {
        // Arrange
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "task-with-output" },
            Spec = new WorkflowTaskSpec
            {
                Type = "http",
                OutputSchema = new SchemaDefinition
                {
                    Type = "object",
                    Properties = new Dictionary<string, PropertyDefinition>
                    {
                        ["result"] = new PropertyDefinition { Type = "string" }
                    }
                },
                Request = new HttpRequestDefinition
                {
                    Method = "GET",
                    Url = "https://api.example.com"
                }
            }
        };

        // Act
        var result = await _webhook.ValidateAsync(task);

        // Assert
        result.Allowed.Should().BeTrue();
    }

    [Fact]
    public async Task ValidateAsync_WithHeadersAndBody_ShouldReturnAllowed()
    {
        // Arrange
        var task = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "full-request-task" },
            Spec = new WorkflowTaskSpec
            {
                Type = "http",
                Request = new HttpRequestDefinition
                {
                    Method = "POST",
                    Url = "https://api.example.com/resource",
                    Headers = new Dictionary<string, string>
                    {
                        ["Authorization"] = "Bearer {{input.token}}",
                        ["Content-Type"] = "application/json",
                        ["X-Custom-Header"] = "value"
                    },
                    Body = "{\"key\": \"{{input.value}}\"}"
                }
            }
        };

        // Act
        var result = await _webhook.ValidateAsync(task);

        // Assert
        result.Allowed.Should().BeTrue();
    }

    [Fact]
    public void Constructor_WithNullSchemaValidator_ShouldThrowArgumentNullException()
    {
        // Act
        Action act = () => new WorkflowTaskValidationWebhook(null!);

        // Assert
        act.Should().Throw<ArgumentNullException>()
            .WithMessage("*schemaValidator*");
    }

    [Fact]
    public void AdmissionResult_Allow_ShouldCreateAllowedResult()
    {
        // Act
        var result = AdmissionResult.Allow();

        // Assert
        result.Allowed.Should().BeTrue();
        result.Message.Should().BeNull();
    }

    [Fact]
    public void AdmissionResult_Deny_ShouldCreateDeniedResult()
    {
        // Arrange
        var message = "Test error message";

        // Act
        var result = AdmissionResult.Deny(message);

        // Assert
        result.Allowed.Should().BeFalse();
        result.Message.Should().Be(message);
    }
}
