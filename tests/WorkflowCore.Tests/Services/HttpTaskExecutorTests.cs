using System.Net;
using FluentAssertions;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class HttpTaskExecutorTests
{
    private readonly Mock<ITemplateResolver> _templateResolverMock;
    private readonly Mock<ISchemaValidator> _schemaValidatorMock;
    private readonly Mock<IRetryPolicy> _retryPolicyMock;
    private readonly Mock<IHttpClientWrapper> _httpClientMock;
    private readonly IHttpTaskExecutor _executor;

    public HttpTaskExecutorTests()
    {
        _templateResolverMock = new Mock<ITemplateResolver>();
        _schemaValidatorMock = new Mock<ISchemaValidator>();
        _retryPolicyMock = new Mock<IRetryPolicy>();
        _httpClientMock = new Mock<IHttpClientWrapper>();

        _executor = new HttpTaskExecutor(
            _templateResolverMock.Object,
            _schemaValidatorMock.Object,
            _retryPolicyMock.Object,
            _httpClientMock.Object);
    }

    [Fact]
    public async Task ExecuteAsync_WithSuccessfulGetRequest_ShouldReturnSuccess()
    {
        // Arrange
        var taskSpec = new WorkflowTaskSpec
        {
            Type = "http",
            Request = new HttpRequestDefinition
            {
                Method = "GET",
                Url = "https://api.example.com/users/{{input.userId}}"
            },
            OutputSchema = new SchemaDefinition
            {
                Type = "object",
                Properties = new Dictionary<string, PropertyDefinition>
                {
                    ["id"] = new PropertyDefinition { Type = "string" }
                }
            }
        };

        var inputs = new Dictionary<string, object>
        {
            ["userId"] = "123"
        };

        var context = new TemplateContext { Input = inputs };
        var responseBody = "{\"id\":\"user-123\",\"name\":\"John\"}";

        _templateResolverMock.Setup(x => x.ResolveAsync(
            "https://api.example.com/users/{{input.userId}}", context))
            .ReturnsAsync("https://api.example.com/users/123");

        _httpClientMock.Setup(x => x.SendAsync(
            It.Is<HttpRequestMessage>(r => r.Method == HttpMethod.Get),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(responseBody)
            });

        _schemaValidatorMock.Setup(x => x.ValidateAsync(
            It.IsAny<SchemaDefinition>(), It.IsAny<object>()))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Output.Should().NotBeNull();
        result.Output.Should().ContainKey("id");
        result.RetryCount.Should().Be(0);
        result.Errors.Should().BeEmpty();
    }

    [Fact]
    public async Task ExecuteAsync_WithPostRequestAndBody_ShouldSendBodyInRequest()
    {
        // Arrange
        var taskSpec = new WorkflowTaskSpec
        {
            Type = "http",
            Request = new HttpRequestDefinition
            {
                Method = "POST",
                Url = "https://api.example.com/users",
                Body = "{\"name\":\"{{input.userName}}\"}"
            }
        };

        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["userName"] = "Alice" }
        };

        _templateResolverMock.Setup(x => x.ResolveAsync(It.IsAny<string>(), context))
            .Returns<string, TemplateContext>((template, _) =>
                Task.FromResult(template.Replace("{{input.userName}}", "Alice")));

        _httpClientMock.Setup(x => x.SendAsync(
            It.Is<HttpRequestMessage>(r =>
                r.Method == HttpMethod.Post &&
                r.Content != null),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.Created,
                Content = new StringContent("{\"id\":\"user-new\"}")
            });

        _schemaValidatorMock.Setup(x => x.ValidateAsync(
            It.IsAny<SchemaDefinition>(), It.IsAny<object>()))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        _httpClientMock.Verify(x => x.SendAsync(
            It.Is<HttpRequestMessage>(r => r.Content != null),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_WithCustomHeaders_ShouldIncludeHeadersInRequest()
    {
        // Arrange
        var taskSpec = new WorkflowTaskSpec
        {
            Type = "http",
            Request = new HttpRequestDefinition
            {
                Method = "GET",
                Url = "https://api.example.com/data",
                Headers = new Dictionary<string, string>
                {
                    ["Authorization"] = "Bearer {{input.token}}",
                    ["X-Custom-Header"] = "custom-value"
                }
            }
        };

        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["token"] = "abc123" }
        };

        _templateResolverMock.Setup(x => x.ResolveAsync(It.IsAny<string>(), context))
            .Returns<string, TemplateContext>((template, _) =>
                Task.FromResult(template.Replace("{{input.token}}", "abc123")));

        _httpClientMock.Setup(x => x.SendAsync(
            It.IsAny<HttpRequestMessage>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent("{}")
            });

        _schemaValidatorMock.Setup(x => x.ValidateAsync(
            It.IsAny<SchemaDefinition>(), It.IsAny<object>()))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        // Act
        await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        _httpClientMock.Verify(x => x.SendAsync(
            It.Is<HttpRequestMessage>(r =>
                r.Headers.Contains("Authorization") &&
                r.Headers.Contains("X-Custom-Header")),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_WithRetryableError_ShouldRetryAndSucceed()
    {
        // Arrange
        var taskSpec = new WorkflowTaskSpec
        {
            Type = "http",
            Request = new HttpRequestDefinition
            {
                Method = "GET",
                Url = "https://api.example.com/data"
            }
        };

        var context = new TemplateContext();
        var callCount = 0;

        _templateResolverMock.Setup(x => x.ResolveAsync(It.IsAny<string>(), context))
            .ReturnsAsync("https://api.example.com/data");

        _httpClientMock.Setup(x => x.SendAsync(
            It.IsAny<HttpRequestMessage>(),
            It.IsAny<CancellationToken>()))
            .Returns(() =>
            {
                callCount++;
                if (callCount < 3)
                {
                    throw new HttpRequestException("Temporary network error");
                }
                return Task.FromResult(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent("{}")
                });
            });

        _retryPolicyMock.Setup(x => x.ShouldRetry(
            It.IsAny<HttpRequestException>(), It.IsAny<int>()))
            .Returns(true);

        _retryPolicyMock.Setup(x => x.CalculateDelay(It.IsAny<int>()))
            .Returns(TimeSpan.FromMilliseconds(1)); // Fast retry for tests

        _schemaValidatorMock.Setup(x => x.ValidateAsync(
            It.IsAny<SchemaDefinition>(), It.IsAny<object>()))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.RetryCount.Should().Be(2); // Failed 2 times, succeeded on 3rd
        callCount.Should().Be(3);
    }

    [Fact]
    public async Task ExecuteAsync_WithMaxRetriesExceeded_ShouldReturnFailure()
    {
        // Arrange
        var taskSpec = new WorkflowTaskSpec
        {
            Type = "http",
            Request = new HttpRequestDefinition
            {
                Method = "GET",
                Url = "https://api.example.com/data"
            }
        };

        var context = new TemplateContext();
        var exception = new HttpRequestException("Network error");

        _templateResolverMock.Setup(x => x.ResolveAsync(It.IsAny<string>(), context))
            .ReturnsAsync("https://api.example.com/data");

        _httpClientMock.Setup(x => x.SendAsync(
            It.IsAny<HttpRequestMessage>(),
            It.IsAny<CancellationToken>()))
            .ThrowsAsync(exception);

        _retryPolicyMock.SetupSequence(x => x.ShouldRetry(exception, It.IsAny<int>()))
            .Returns(true)   // Retry attempt 1
            .Returns(true)   // Retry attempt 2
            .Returns(true)   // Retry attempt 3
            .Returns(false); // Max retries exceeded

        _retryPolicyMock.Setup(x => x.CalculateDelay(It.IsAny<int>()))
            .Returns(TimeSpan.FromMilliseconds(1));

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Errors.Should().NotBeEmpty();
        result.Errors.Should().Contain(e => e.Contains("Network error"));
    }

    [Fact]
    public async Task ExecuteAsync_WithInvalidResponseSchema_ShouldReturnFailure()
    {
        // Arrange
        var taskSpec = new WorkflowTaskSpec
        {
            Type = "http",
            Request = new HttpRequestDefinition
            {
                Method = "GET",
                Url = "https://api.example.com/data"
            },
            OutputSchema = new SchemaDefinition
            {
                Type = "object",
                Properties = new Dictionary<string, PropertyDefinition>
                {
                    ["id"] = new PropertyDefinition { Type = "string" }
                },
                Required = new List<string> { "id" }
            }
        };

        var context = new TemplateContext();

        _templateResolverMock.Setup(x => x.ResolveAsync(It.IsAny<string>(), context))
            .ReturnsAsync("https://api.example.com/data");

        _httpClientMock.Setup(x => x.SendAsync(
            It.IsAny<HttpRequestMessage>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent("{\"name\":\"John\"}") // Missing required 'id'
            });

        _schemaValidatorMock.Setup(x => x.ValidateAsync(
            It.IsAny<SchemaDefinition>(), It.IsAny<object>()))
            .ReturnsAsync(new ValidationResult
            {
                IsValid = false,
                Errors = new List<ValidationError>
                {
                    new ValidationError { Field = "id", Message = "Required field missing" }
                }
            });

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("schema validation failed"));
    }

    [Fact]
    public async Task ExecuteAsync_WithTimeout_ShouldRespectCancellationToken()
    {
        // Arrange
        var taskSpec = new WorkflowTaskSpec
        {
            Type = "http",
            Request = new HttpRequestDefinition
            {
                Method = "GET",
                Url = "https://api.example.com/slow"
            },
            Timeout = "5s"
        };

        var context = new TemplateContext();
        var cts = new CancellationTokenSource();
        cts.Cancel(); // Already cancelled

        _templateResolverMock.Setup(x => x.ResolveAsync(It.IsAny<string>(), context))
            .ReturnsAsync("https://api.example.com/slow");

        _httpClientMock.Setup(x => x.SendAsync(
            It.IsAny<HttpRequestMessage>(),
            It.IsAny<CancellationToken>()))
            .ThrowsAsync(new TaskCanceledException("Request timed out"));

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context, cts.Token);

        // Assert
        result.Success.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("cancelled") || e.Contains("timed out"));
    }
}
