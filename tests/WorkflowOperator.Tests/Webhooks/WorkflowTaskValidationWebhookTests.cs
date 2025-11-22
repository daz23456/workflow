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
        result.Message.Should().Contain("Supported types: http");
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
}
