using System.Text;
using System.Text.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Controllers;
using WorkflowGateway.Models;
using WorkflowGateway.Services;
using Xunit;

namespace WorkflowGateway.Tests.Controllers;

/// <summary>
/// Tests for WebhookController - Stage 20.2: Webhook Triggers
/// </summary>
public class WebhookControllerTests
{
    private readonly Mock<IWorkflowDiscoveryService> _discoveryServiceMock;
    private readonly Mock<IWorkflowExecutionService> _executionServiceMock;
    private readonly Mock<IHmacValidator> _hmacValidatorMock;
    private readonly Mock<ILogger<WebhookController>> _loggerMock;
    private readonly WebhookController _controller;

    public WebhookControllerTests()
    {
        _discoveryServiceMock = new Mock<IWorkflowDiscoveryService>();
        _executionServiceMock = new Mock<IWorkflowExecutionService>();
        _hmacValidatorMock = new Mock<IHmacValidator>();
        _loggerMock = new Mock<ILogger<WebhookController>>();

        _controller = new WebhookController(
            _discoveryServiceMock.Object,
            _executionServiceMock.Object,
            _hmacValidatorMock.Object,
            _loggerMock.Object);

        // Setup default HTTP context
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
    }

    #region Path Matching Tests

    [Fact]
    public async Task ReceiveWebhook_WithMatchingPath_ShouldExecuteWorkflow()
    {
        // Arrange
        var webhook = CreateWebhookTriggerSpec("/hooks/order-created");
        var workflow = CreateWorkflowWithWebhookTrigger("order-workflow", webhook);
        var payload = JsonDocument.Parse("{\"orderId\": 123}");

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        _executionServiceMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResponse { Success = true, ExecutionId = Guid.NewGuid() });

        // Act
        var result = await _controller.ReceiveWebhook("hooks/order-created", payload);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        _executionServiceMock.Verify(
            x => x.ExecuteAsync(
                It.Is<WorkflowResource>(w => w.Metadata.Name == "order-workflow"),
                It.IsAny<Dictionary<string, object>>(),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task ReceiveWebhook_WithNoMatchingPath_ShouldReturn404()
    {
        // Arrange
        var webhook = CreateWebhookTriggerSpec("/hooks/order-created");
        var workflow = CreateWorkflowWithWebhookTrigger("order-workflow", webhook);
        var payload = JsonDocument.Parse("{}");

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        // Act
        var result = await _controller.ReceiveWebhook("hooks/unknown-path", payload);

        // Assert
        var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
        notFoundResult.Value.Should().BeAssignableTo<WebhookErrorResponse>();
    }

    [Fact]
    public async Task ReceiveWebhook_WithPathWithLeadingSlash_ShouldMatch()
    {
        // Arrange
        var webhook = CreateWebhookTriggerSpec("/hooks/test");
        var workflow = CreateWorkflowWithWebhookTrigger("test-workflow", webhook);
        var payload = JsonDocument.Parse("{}");

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        _executionServiceMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResponse { Success = true });

        // Act - Path without leading slash should still match
        var result = await _controller.ReceiveWebhook("hooks/test", payload);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
    }

    #endregion

    #region HMAC Validation Tests

    [Fact]
    public async Task ReceiveWebhook_WithValidSignature_ShouldExecuteWorkflow()
    {
        // Arrange
        var webhook = CreateWebhookTriggerSpec("/hooks/secure", secretRef: "my-secret");
        var workflow = CreateWorkflowWithWebhookTrigger("secure-workflow", webhook);
        var payload = JsonDocument.Parse("{\"data\": \"test\"}");

        SetupRequestWithSignature("sha256=validsig");
        SetupRequestBody("{\"data\": \"test\"}");

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        _hmacValidatorMock
            .Setup(x => x.ValidateSignature(It.IsAny<string>(), "sha256=validsig", It.IsAny<string>()))
            .Returns(true);

        _executionServiceMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResponse { Success = true });

        // Act
        var result = await _controller.ReceiveWebhook("hooks/secure", payload);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        _hmacValidatorMock.Verify(
            x => x.ValidateSignature(It.IsAny<string>(), "sha256=validsig", It.IsAny<string>()),
            Times.Once);
    }

    [Fact]
    public async Task ReceiveWebhook_WithInvalidSignature_ShouldReturn401()
    {
        // Arrange
        var webhook = CreateWebhookTriggerSpec("/hooks/secure", secretRef: "my-secret");
        var workflow = CreateWorkflowWithWebhookTrigger("secure-workflow", webhook);
        var payload = JsonDocument.Parse("{}");

        SetupRequestWithSignature("sha256=invalidsig");
        SetupRequestBody("{}");

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        _hmacValidatorMock
            .Setup(x => x.ValidateSignature(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns(false);

        // Act
        var result = await _controller.ReceiveWebhook("hooks/secure", payload);

        // Assert
        var unauthorizedResult = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
    }

    [Fact]
    public async Task ReceiveWebhook_WithMissingSignatureButSecretRequired_ShouldReturn401()
    {
        // Arrange
        var webhook = CreateWebhookTriggerSpec("/hooks/secure", secretRef: "my-secret");
        var workflow = CreateWorkflowWithWebhookTrigger("secure-workflow", webhook);
        var payload = JsonDocument.Parse("{}");

        // No signature header set
        SetupRequestBody("{}");

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        // Act
        var result = await _controller.ReceiveWebhook("hooks/secure", payload);

        // Assert
        var unauthorizedResult = result.Should().BeOfType<UnauthorizedObjectResult>().Subject;
    }

    [Fact]
    public async Task ReceiveWebhook_WithNoSecretRequired_ShouldSkipValidation()
    {
        // Arrange - No secretRef means no validation required
        var webhook = CreateWebhookTriggerSpec("/hooks/public", secretRef: null);
        var workflow = CreateWorkflowWithWebhookTrigger("public-workflow", webhook);
        var payload = JsonDocument.Parse("{}");

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        _executionServiceMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResponse { Success = true });

        // Act
        var result = await _controller.ReceiveWebhook("hooks/public", payload);

        // Assert
        result.Should().BeOfType<OkObjectResult>();
        _hmacValidatorMock.Verify(
            x => x.ValidateSignature(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()),
            Times.Never);
    }

    #endregion

    #region Payload Handling Tests

    [Fact]
    public async Task ReceiveWebhook_ShouldPassPayloadAsInput()
    {
        // Arrange
        var webhook = CreateWebhookTriggerSpec("/hooks/test");
        var workflow = CreateWorkflowWithWebhookTrigger("test-workflow", webhook);
        var payload = JsonDocument.Parse("{\"orderId\": 123, \"customer\": \"John\"}");

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        Dictionary<string, object>? capturedInput = null;
        _executionServiceMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .Callback<WorkflowResource, Dictionary<string, object>, CancellationToken>((w, input, c) => capturedInput = input)
            .ReturnsAsync(new WorkflowExecutionResponse { Success = true });

        // Act
        var result = await _controller.ReceiveWebhook("hooks/test", payload);

        // Assert
        capturedInput.Should().NotBeNull();
        capturedInput!.Should().ContainKey("payload");
    }

    #endregion

    #region Disabled Trigger Tests

    [Fact]
    public async Task ReceiveWebhook_WithDisabledTrigger_ShouldReturn404()
    {
        // Arrange
        var webhook = CreateWebhookTriggerSpec("/hooks/disabled", enabled: false);
        var workflow = CreateWorkflowWithWebhookTrigger("disabled-workflow", webhook);
        var payload = JsonDocument.Parse("{}");

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        // Act
        var result = await _controller.ReceiveWebhook("hooks/disabled", payload);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region Multiple Workflows Tests

    [Fact]
    public async Task ReceiveWebhook_WithMultipleMatchingWorkflows_ShouldExecuteFirst()
    {
        // Arrange - Two workflows with same path (edge case)
        var webhook1 = CreateWebhookTriggerSpec("/hooks/shared");
        var webhook2 = CreateWebhookTriggerSpec("/hooks/shared");
        var workflow1 = CreateWorkflowWithWebhookTrigger("workflow-1", webhook1);
        var workflow2 = CreateWorkflowWithWebhookTrigger("workflow-2", webhook2);
        var payload = JsonDocument.Parse("{}");

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow1, workflow2 });

        _executionServiceMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResponse { Success = true });

        // Act
        var result = await _controller.ReceiveWebhook("hooks/shared", payload);

        // Assert - Should execute at least one
        _executionServiceMock.Verify(
            x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()),
            Times.AtLeastOnce);
    }

    #endregion

    #region Error Handling Tests

    [Fact]
    public async Task ReceiveWebhook_WhenExecutionFails_ShouldReturn500()
    {
        // Arrange
        var webhook = CreateWebhookTriggerSpec("/hooks/failing");
        var workflow = CreateWorkflowWithWebhookTrigger("failing-workflow", webhook);
        var payload = JsonDocument.Parse("{}");

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        _executionServiceMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Execution failed"));

        // Act
        var result = await _controller.ReceiveWebhook("hooks/failing", payload);

        // Assert
        var objectResult = result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(500);
    }

    [Fact]
    public async Task ReceiveWebhook_WhenDiscoveryFails_ShouldReturn500()
    {
        // Arrange
        var payload = JsonDocument.Parse("{}");

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ThrowsAsync(new InvalidOperationException("Discovery failed"));

        // Act
        var result = await _controller.ReceiveWebhook("hooks/test", payload);

        // Assert
        var objectResult = result.Should().BeOfType<ObjectResult>().Subject;
        objectResult.StatusCode.Should().Be(500);
    }

    #endregion

    #region Response Tests

    [Fact]
    public async Task ReceiveWebhook_OnSuccess_ShouldReturnExecutionId()
    {
        // Arrange
        var executionId = Guid.NewGuid();
        var webhook = CreateWebhookTriggerSpec("/hooks/test");
        var workflow = CreateWorkflowWithWebhookTrigger("test-workflow", webhook);
        var payload = JsonDocument.Parse("{}");

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        _executionServiceMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResponse { Success = true, ExecutionId = executionId });

        // Act
        var result = await _controller.ReceiveWebhook("hooks/test", payload);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeAssignableTo<WebhookSuccessResponse>().Subject;
        response.ExecutionId.Should().Be(executionId);
    }

    #endregion

    #region Helper Methods

    private static WebhookTriggerSpec CreateWebhookTriggerSpec(
        string path,
        string? secretRef = null,
        bool enabled = true)
    {
        return new WebhookTriggerSpec
        {
            Type = "webhook",
            Path = path,
            SecretRef = secretRef,
            Enabled = enabled
        };
    }

    private static WorkflowResource CreateWorkflowWithWebhookTrigger(
        string name,
        WebhookTriggerSpec webhook)
    {
        return new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = name },
            Spec = new WorkflowSpec
            {
                Triggers = new List<TriggerSpec> { webhook }
            }
        };
    }

    private void SetupRequestWithSignature(string signature)
    {
        _controller.HttpContext.Request.Headers["X-Webhook-Signature"] = signature;
    }

    private void SetupRequestBody(string body)
    {
        _controller.HttpContext.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(body));
        _controller.HttpContext.Request.ContentLength = body.Length;
    }

    #endregion
}

