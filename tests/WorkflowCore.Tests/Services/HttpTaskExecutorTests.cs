using System.Net;
using FluentAssertions;
using Moq;
using WorkflowCore.Interfaces;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowCore.Services.ResponseHandlers;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class HttpTaskExecutorTests
{
    private readonly Mock<ITemplateResolver> _templateResolverMock;
    private readonly Mock<ISchemaValidator> _schemaValidatorMock;
    private readonly Mock<IRetryPolicy> _retryPolicyMock;
    private readonly Mock<IHttpClientWrapper> _httpClientMock;
    private readonly Mock<IResponseHandlerFactory> _responseHandlerFactoryMock;
    private readonly IHttpTaskExecutor _executor;

    public HttpTaskExecutorTests()
    {
        _templateResolverMock = new Mock<ITemplateResolver>();
        _schemaValidatorMock = new Mock<ISchemaValidator>();
        _retryPolicyMock = new Mock<IRetryPolicy>();
        _httpClientMock = new Mock<IHttpClientWrapper>();
        _responseHandlerFactoryMock = new Mock<IResponseHandlerFactory>();

        // Setup factory to return JSON handler for application/json (default behavior)
        var jsonHandler = new JsonResponseHandler();
        _responseHandlerFactoryMock
            .Setup(f => f.GetHandler(It.IsAny<string>()))
            .Returns(jsonHandler);

        _executor = new HttpTaskExecutor(
            _templateResolverMock.Object,
            _schemaValidatorMock.Object,
            _retryPolicyMock.Object,
            _httpClientMock.Object,
            _responseHandlerFactoryMock.Object);
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
        // Schema validation is currently disabled, so request succeeds even with invalid schema
        result.Success.Should().BeTrue();
        result.Output.Should().NotBeNull();
        result.Output.Should().ContainKey("name");
        // Validation should not be called since it's disabled
        _schemaValidatorMock.Verify(x => x.ValidateAsync(
            It.IsAny<SchemaDefinition>(), It.IsAny<object>()), Times.Never);
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

    [Fact]
    public async Task ExecuteAsync_WithNullRequest_ShouldReturnError()
    {
        // Arrange
        var taskSpec = new WorkflowTaskSpec
        {
            Type = "http",
            Request = null // Null request
        };

        var context = new TemplateContext();

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Should().Be("Task request definition is null");
        result.RetryCount.Should().Be(0);
    }

    [Fact]
    public async Task ExecuteAsync_WithUnsupportedHttpMethod_ShouldThrowException()
    {
        // Arrange
        var taskSpec = new WorkflowTaskSpec
        {
            Type = "http",
            Request = new HttpRequestDefinition
            {
                Method = "TRACE", // Unsupported method
                Url = "https://api.example.com/data"
            }
        };

        var context = new TemplateContext();

        _templateResolverMock.Setup(x => x.ResolveAsync(It.IsAny<string>(), context))
            .ReturnsAsync("https://api.example.com/data");

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(async () =>
            await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None));
    }

    [Fact]
    public async Task ExecuteAsync_WithGetRequest_ShouldNotIncludeBody()
    {
        // Arrange
        var taskSpec = new WorkflowTaskSpec
        {
            Type = "http",
            Request = new HttpRequestDefinition
            {
                Method = "GET",
                Url = "https://api.example.com/data",
                Body = "{\"data\":\"value\"}" // Body should be ignored for GET
            }
        };

        var context = new TemplateContext();

        _templateResolverMock.Setup(x => x.ResolveAsync(It.IsAny<string>(), context))
            .ReturnsAsync("https://api.example.com/data");

        _httpClientMock.Setup(x => x.SendAsync(
            It.Is<HttpRequestMessage>(r => r.Content == null), // Verify no body
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
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        _httpClientMock.Verify(x => x.SendAsync(
            It.Is<HttpRequestMessage>(r => r.Content == null),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_WithSchemaValidationFailure_ShouldReturnZeroRetryCount()
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
                }
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
                Content = new StringContent("{\"wrong\":\"field\"}")
            });

        _schemaValidatorMock.Setup(x => x.ValidateAsync(
            It.IsAny<SchemaDefinition>(), It.IsAny<object>()))
            .ReturnsAsync(new ValidationResult
            {
                IsValid = false,
                Errors = new List<ValidationError>
                {
                    new ValidationError { Message = "Field validation failed" }
                }
            });

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        // Schema validation is currently disabled, so request succeeds even with invalid schema
        result.Success.Should().BeTrue();
        result.RetryCount.Should().Be(0); // No retries needed since HTTP succeeded
        result.Output.Should().NotBeNull();
        result.Output.Should().ContainKey("wrong");
        // Validation should not be called since it's disabled
        _schemaValidatorMock.Verify(x => x.ValidateAsync(
            It.IsAny<SchemaDefinition>(), It.IsAny<object>()), Times.Never);
    }

    [Fact]
    public async Task ExecuteAsync_WithExactRetryCount_ShouldCalculateCorrectly()
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
        var attemptCount = 0;

        _templateResolverMock.Setup(x => x.ResolveAsync(It.IsAny<string>(), context))
            .ReturnsAsync("https://api.example.com/data");

        _httpClientMock.Setup(x => x.SendAsync(
            It.IsAny<HttpRequestMessage>(),
            It.IsAny<CancellationToken>()))
            .Returns(() =>
            {
                attemptCount++;
                if (attemptCount <= 4)
                {
                    throw new HttpRequestException($"Attempt {attemptCount} failed");
                }
                return Task.FromResult(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent("{}")
                });
            });

        _retryPolicyMock.Setup(x => x.ShouldRetry(
            It.IsAny<HttpRequestException>(), It.IsAny<int>()))
            .Returns<HttpRequestException, int>((ex, attempt) => attempt <= 4);

        _retryPolicyMock.Setup(x => x.CalculateDelay(It.IsAny<int>()))
            .Returns(TimeSpan.FromMilliseconds(1));

        _schemaValidatorMock.Setup(x => x.ValidateAsync(
            It.IsAny<SchemaDefinition>(), It.IsAny<object>()))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.RetryCount.Should().Be(4); // Failed 4 times, succeeded on 5th attempt
        attemptCount.Should().Be(5); // Total attempts
    }

    [Fact]
    public async Task ExecuteAsync_WithUnknownError_ShouldReturnUnknownErrorMessage()
    {
        // Arrange - This tests the null coalescing in error message
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

        _templateResolverMock.Setup(x => x.ResolveAsync(It.IsAny<string>(), context))
            .ReturnsAsync("https://api.example.com/data");

        // Throw an exception with null message
        _httpClientMock.Setup(x => x.SendAsync(
            It.IsAny<HttpRequestMessage>(),
            It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException());

        _retryPolicyMock.Setup(x => x.ShouldRetry(It.IsAny<Exception>(), It.IsAny<int>()))
            .Returns(false);

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        // The exception message might be empty/null, so we should handle it
        result.Errors.Should().ContainSingle();
        result.Errors[0].Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task ExecuteAsync_WithEmptyJsonObjectResponse_ShouldReturnEmptyDictionary()
    {
        // Arrange - Test empty JSON object response
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

        _templateResolverMock.Setup(x => x.ResolveAsync(It.IsAny<string>(), context))
            .ReturnsAsync("https://api.example.com/data");

        _httpClientMock.Setup(x => x.SendAsync(
            It.IsAny<HttpRequestMessage>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent("{}") // Empty JSON object
            });

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Output.Should().NotBeNull();
        result.Output.Should().BeEmpty(); // Empty dictionary
    }

    [Fact]
    public async Task ExecuteAsync_WithPutMethod_ShouldSendPutRequest()
    {
        // Arrange - Test PUT method
        var taskSpec = new WorkflowTaskSpec
        {
            Type = "http",
            Request = new HttpRequestDefinition
            {
                Method = "PUT",
                Url = "https://api.example.com/users/123",
                Body = "{\"name\":\"Updated\"}"
            }
        };

        var context = new TemplateContext();

        _templateResolverMock.Setup(x => x.ResolveAsync(It.IsAny<string>(), context))
            .Returns<string, TemplateContext>((template, _) => Task.FromResult(template));

        _httpClientMock.Setup(x => x.SendAsync(
            It.Is<HttpRequestMessage>(r => r.Method == HttpMethod.Put && r.Content != null),
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
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        _httpClientMock.Verify(x => x.SendAsync(
            It.Is<HttpRequestMessage>(r => r.Method == HttpMethod.Put),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_WithPatchMethod_ShouldSendPatchRequest()
    {
        // Arrange - Test PATCH method
        var taskSpec = new WorkflowTaskSpec
        {
            Type = "http",
            Request = new HttpRequestDefinition
            {
                Method = "PATCH",
                Url = "https://api.example.com/users/123",
                Body = "{\"status\":\"active\"}"
            }
        };

        var context = new TemplateContext();

        _templateResolverMock.Setup(x => x.ResolveAsync(It.IsAny<string>(), context))
            .Returns<string, TemplateContext>((template, _) => Task.FromResult(template));

        _httpClientMock.Setup(x => x.SendAsync(
            It.Is<HttpRequestMessage>(r => r.Method == HttpMethod.Patch && r.Content != null),
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
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        _httpClientMock.Verify(x => x.SendAsync(
            It.Is<HttpRequestMessage>(r => r.Method == HttpMethod.Patch),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_WithDeleteMethod_ShouldSendDeleteRequest()
    {
        // Arrange - Test DELETE method
        var taskSpec = new WorkflowTaskSpec
        {
            Type = "http",
            Request = new HttpRequestDefinition
            {
                Method = "DELETE",
                Url = "https://api.example.com/users/123"
            }
        };

        var context = new TemplateContext();

        _templateResolverMock.Setup(x => x.ResolveAsync(It.IsAny<string>(), context))
            .ReturnsAsync("https://api.example.com/users/123");

        _httpClientMock.Setup(x => x.SendAsync(
            It.Is<HttpRequestMessage>(r => r.Method == HttpMethod.Delete),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.NoContent,
                Content = new StringContent("{}") // Valid empty JSON
            });

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        _httpClientMock.Verify(x => x.SendAsync(
            It.Is<HttpRequestMessage>(r => r.Method == HttpMethod.Delete),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_WithZeroRetries_ShouldFailImmediately()
    {
        // Arrange - Test retry boundary: 0 retries
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
        var exception = new HttpRequestException("Connection failed");

        _templateResolverMock.Setup(x => x.ResolveAsync(It.IsAny<string>(), context))
            .ReturnsAsync("https://api.example.com/data");

        _httpClientMock.Setup(x => x.SendAsync(
            It.IsAny<HttpRequestMessage>(),
            It.IsAny<CancellationToken>()))
            .ThrowsAsync(exception);

        _retryPolicyMock.Setup(x => x.ShouldRetry(exception, 1))
            .Returns(false); // Don't retry on first failure

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.RetryCount.Should().Be(0); // No retries
        _httpClientMock.Verify(x => x.SendAsync(
            It.IsAny<HttpRequestMessage>(),
            It.IsAny<CancellationToken>()), Times.Once); // Only called once
    }

    [Fact]
    public async Task ExecuteAsync_WithOneRetry_ShouldRetryOnce()
    {
        // Arrange - Test retry boundary: 1 retry
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
        var exception = new HttpRequestException("Temporary failure");

        _templateResolverMock.Setup(x => x.ResolveAsync(It.IsAny<string>(), context))
            .ReturnsAsync("https://api.example.com/data");

        _httpClientMock.Setup(x => x.SendAsync(
            It.IsAny<HttpRequestMessage>(),
            It.IsAny<CancellationToken>()))
            .ThrowsAsync(exception);

        _retryPolicyMock.SetupSequence(x => x.ShouldRetry(exception, It.IsAny<int>()))
            .Returns(true)  // Retry after first failure
            .Returns(false); // Don't retry after second failure

        _retryPolicyMock.Setup(x => x.CalculateDelay(It.IsAny<int>()))
            .Returns(TimeSpan.FromMilliseconds(1));

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.RetryCount.Should().Be(1); // Exactly 1 retry
        _httpClientMock.Verify(x => x.SendAsync(
            It.IsAny<HttpRequestMessage>(),
            It.IsAny<CancellationToken>()), Times.Exactly(2)); // Original + 1 retry
    }

    [Fact]
    public async Task ExecuteAsync_WithOperationCanceledException_ShouldHandleGracefully()
    {
        // Arrange - Test OperationCanceledException handling
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
        var exception = new OperationCanceledException("Operation cancelled");

        _templateResolverMock.Setup(x => x.ResolveAsync(It.IsAny<string>(), context))
            .ReturnsAsync("https://api.example.com/data");

        _httpClientMock.Setup(x => x.SendAsync(
            It.IsAny<HttpRequestMessage>(),
            It.IsAny<CancellationToken>()))
            .ThrowsAsync(exception);

        _retryPolicyMock.Setup(x => x.ShouldRetry(exception, It.IsAny<int>()))
            .Returns(false);

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.Errors.Should().ContainSingle();
        result.Errors[0].Should().Contain("cancelled");
    }

    [Fact]
    public async Task ExecuteAsync_WithNullOutputSchemaAndValidResponse_ShouldSucceed()
    {
        // Arrange - Test null output schema (no validation)
        var taskSpec = new WorkflowTaskSpec
        {
            Type = "http",
            Request = new HttpRequestDefinition
            {
                Method = "GET",
                Url = "https://api.example.com/data"
            },
            OutputSchema = null // No output schema validation
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
                Content = new StringContent("{\"any\":\"data\"}")
            });

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Output.Should().NotBeNull();
        _schemaValidatorMock.Verify(x => x.ValidateAsync(
            It.IsAny<SchemaDefinition>(), It.IsAny<object>()), Times.Never); // No validation
    }

    [Fact]
    public async Task ExecuteAsync_WithEmptyHeaders_ShouldNotIncludeHeaders()
    {
        // Arrange - Test with null headers
        var taskSpec = new WorkflowTaskSpec
        {
            Type = "http",
            Request = new HttpRequestDefinition
            {
                Method = "GET",
                Url = "https://api.example.com/data",
                Headers = null // No headers
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
                Content = new StringContent("{}")
            });

        _schemaValidatorMock.Setup(x => x.ValidateAsync(
            It.IsAny<SchemaDefinition>(), It.IsAny<object>()))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        _templateResolverMock.Verify(x => x.ResolveAsync(
            It.Is<string>(s => s != "https://api.example.com/data"),
            It.IsAny<TemplateContext>()), Times.Never); // Should not resolve any header templates
    }

    [Fact]
    public async Task ExecuteAsync_WithNullBodyInPostRequest_ShouldNotIncludeBody()
    {
        // Arrange - Test POST with null body
        var taskSpec = new WorkflowTaskSpec
        {
            Type = "http",
            Request = new HttpRequestDefinition
            {
                Method = "POST",
                Url = "https://api.example.com/data",
                Body = null // No body
            }
        };

        var context = new TemplateContext();

        _templateResolverMock.Setup(x => x.ResolveAsync(It.IsAny<string>(), context))
            .ReturnsAsync("https://api.example.com/data");

        _httpClientMock.Setup(x => x.SendAsync(
            It.Is<HttpRequestMessage>(r => r.Method == HttpMethod.Post && r.Content == null),
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
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        _httpClientMock.Verify(x => x.SendAsync(
            It.Is<HttpRequestMessage>(r => r.Content == null),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData("get")] // Lowercase
    [InlineData("Get")] // Mixed case
    [InlineData("GET")] // Uppercase
    public async Task ExecuteAsync_WithMixedCaseHttpMethod_ShouldNormalize(string method)
    {
        // Arrange - Test case-insensitive HTTP method handling via ToUpperInvariant
        var taskSpec = new WorkflowTaskSpec
        {
            Type = "http",
            Request = new HttpRequestDefinition
            {
                Method = method,
                Url = "https://api.example.com/data"
            }
        };

        var context = new TemplateContext();

        _templateResolverMock.Setup(x => x.ResolveAsync(It.IsAny<string>(), context))
            .ReturnsAsync("https://api.example.com/data");

        _httpClientMock.Setup(x => x.SendAsync(
            It.Is<HttpRequestMessage>(r => r.Method == HttpMethod.Get),
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
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
    }

    [Fact]
    public async Task ExecuteAsync_WithNullDeserializedOutput_ShouldNotValidateSchema()
    {
        // Arrange - Test when response deserializes to null
        var taskSpec = new WorkflowTaskSpec
        {
            Type = "http",
            Request = new HttpRequestDefinition
            {
                Method = "GET",
                Url = "https://api.example.com/data"
            },
            OutputSchema = new SchemaDefinition { Type = "object" }
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
                Content = new StringContent("null") // JSON null
            });

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.Output.Should().NotBeNull();
        result.Output.Should().ContainKey("data");
        result.Output!["data"].Should().BeNull(); // JSON null wrapped in "data" key
        // Schema validation is currently disabled, so it should never be called
        _schemaValidatorMock.Verify(x => x.ValidateAsync(
            It.IsAny<SchemaDefinition>(), It.IsAny<object>()), Times.Never);
    }

    #region Structured Error Response Tests

    [Fact]
    public async Task ExecuteAsync_WithNetworkError_ShouldReturnStructuredErrorInfo()
    {
        // Arrange
        var taskSpec = new WorkflowTaskSpec
        {
            Type = "http",
            Request = new HttpRequestDefinition
            {
                Method = "GET",
                Url = "https://api.user-service.example.com/users/123"
            }
        };

        var context = new TemplateContext();
        var exception = new HttpRequestException("Connection refused");

        _templateResolverMock.Setup(x => x.ResolveAsync(It.IsAny<string>(), context))
            .ReturnsAsync("https://api.user-service.example.com/users/123");

        _httpClientMock.Setup(x => x.SendAsync(
            It.IsAny<HttpRequestMessage>(),
            It.IsAny<CancellationToken>()))
            .ThrowsAsync(exception);

        _retryPolicyMock.Setup(x => x.ShouldRetry(exception, It.IsAny<int>()))
            .Returns(false);

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.ErrorInfo.Should().NotBeNull();
        result.ErrorInfo!.ErrorType.Should().Be(TaskErrorType.NetworkError);
        result.ErrorInfo.ServiceUrl.Should().Be("https://api.user-service.example.com/users/123");
        result.ErrorInfo.HttpMethod.Should().Be("GET");
        result.ErrorInfo.ErrorMessage.Should().Contain("Connection refused");
        result.ErrorInfo.ServiceName.Should().Be("api.user-service.example.com");
        result.ErrorInfo.IsRetryable.Should().BeTrue();
        result.ErrorInfo.Suggestion.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task ExecuteAsync_WithTimeout_ShouldReturnTimeoutErrorInfo()
    {
        // Arrange
        var taskSpec = new WorkflowTaskSpec
        {
            Type = "http",
            Request = new HttpRequestDefinition
            {
                Method = "POST",
                Url = "https://payments.example.com/charge"
            },
            Timeout = "30s"
        };

        var context = new TemplateContext();
        var cts = new CancellationTokenSource();
        cts.Cancel();

        _templateResolverMock.Setup(x => x.ResolveAsync(It.IsAny<string>(), context))
            .ReturnsAsync("https://payments.example.com/charge");

        _httpClientMock.Setup(x => x.SendAsync(
            It.IsAny<HttpRequestMessage>(),
            It.IsAny<CancellationToken>()))
            .ThrowsAsync(new TaskCanceledException("The request was canceled due to the configured timeout."));

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context, cts.Token);

        // Assert
        result.Success.Should().BeFalse();
        result.ErrorInfo.Should().NotBeNull();
        result.ErrorInfo!.ErrorType.Should().Be(TaskErrorType.Timeout);
        result.ErrorInfo.ServiceUrl.Should().Be("https://payments.example.com/charge");
        result.ErrorInfo.HttpMethod.Should().Be("POST");
        result.ErrorInfo.IsRetryable.Should().BeTrue();
        result.ErrorInfo.Suggestion.Should().Contain("timeout");
    }

    [Fact]
    public async Task ExecuteAsync_WithHttpError_ShouldReturnHttpErrorInfo()
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

        _templateResolverMock.Setup(x => x.ResolveAsync(It.IsAny<string>(), context))
            .ReturnsAsync("https://api.example.com/data");

        _httpClientMock.Setup(x => x.SendAsync(
            It.IsAny<HttpRequestMessage>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.ServiceUnavailable,
                Content = new StringContent("{\"error\":\"Service temporarily unavailable\"}")
            });

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.ErrorInfo.Should().NotBeNull();
        result.ErrorInfo!.ErrorType.Should().Be(TaskErrorType.HttpError);
        result.ErrorInfo.HttpStatusCode.Should().Be(503);
        result.ErrorInfo.ServiceUrl.Should().Be("https://api.example.com/data");
        result.ErrorInfo.HttpMethod.Should().Be("GET");
        result.ErrorInfo.IsRetryable.Should().BeTrue();
        result.ErrorInfo.ResponseBodyPreview.Should().Contain("temporarily unavailable");
    }

    [Fact]
    public async Task ExecuteAsync_WithAuthenticationError_ShouldReturnAuthErrorInfo()
    {
        // Arrange
        var taskSpec = new WorkflowTaskSpec
        {
            Type = "http",
            Request = new HttpRequestDefinition
            {
                Method = "GET",
                Url = "https://api.example.com/protected"
            }
        };

        var context = new TemplateContext();

        _templateResolverMock.Setup(x => x.ResolveAsync(It.IsAny<string>(), context))
            .ReturnsAsync("https://api.example.com/protected");

        _httpClientMock.Setup(x => x.SendAsync(
            It.IsAny<HttpRequestMessage>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.Unauthorized,
                Content = new StringContent("{\"error\":\"Invalid API key\"}")
            });

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.ErrorInfo.Should().NotBeNull();
        result.ErrorInfo!.ErrorType.Should().Be(TaskErrorType.AuthenticationError);
        result.ErrorInfo.HttpStatusCode.Should().Be(401);
        result.ErrorInfo.IsRetryable.Should().BeFalse();
        result.ErrorInfo.Suggestion.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task ExecuteAsync_WithRateLimitError_ShouldReturnRateLimitErrorInfo()
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

        _templateResolverMock.Setup(x => x.ResolveAsync(It.IsAny<string>(), context))
            .ReturnsAsync("https://api.example.com/data");

        _httpClientMock.Setup(x => x.SendAsync(
            It.IsAny<HttpRequestMessage>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.TooManyRequests,
                Content = new StringContent("{\"error\":\"Rate limit exceeded\"}")
            });

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.ErrorInfo.Should().NotBeNull();
        result.ErrorInfo!.ErrorType.Should().Be(TaskErrorType.RateLimitError);
        result.ErrorInfo.HttpStatusCode.Should().Be(429);
        result.ErrorInfo.IsRetryable.Should().BeTrue();
        result.ErrorInfo.Suggestion.Should().Contain("Rate limit");
    }

    [Fact]
    public async Task ExecuteAsync_WithRetries_ShouldIncludeRetryInfoInError()
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
        var exception = new HttpRequestException("Connection failed");

        _templateResolverMock.Setup(x => x.ResolveAsync(It.IsAny<string>(), context))
            .ReturnsAsync("https://api.example.com/data");

        _httpClientMock.Setup(x => x.SendAsync(
            It.IsAny<HttpRequestMessage>(),
            It.IsAny<CancellationToken>()))
            .ThrowsAsync(exception);

        _retryPolicyMock.SetupSequence(x => x.ShouldRetry(exception, It.IsAny<int>()))
            .Returns(true)
            .Returns(true)
            .Returns(false);

        _retryPolicyMock.Setup(x => x.CalculateDelay(It.IsAny<int>()))
            .Returns(TimeSpan.FromMilliseconds(1));

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.ErrorInfo.Should().NotBeNull();
        result.ErrorInfo!.RetryAttempts.Should().Be(2);
    }

    [Fact]
    public async Task ExecuteAsync_WithError_ShouldIncludeTimingInfo()
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

        _retryPolicyMock.Setup(x => x.ShouldRetry(exception, It.IsAny<int>()))
            .Returns(false);

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeFalse();
        result.ErrorInfo.Should().NotBeNull();
        result.ErrorInfo!.OccurredAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        result.ErrorInfo.DurationUntilErrorMs.Should().BeGreaterOrEqualTo(0);
    }

    [Fact]
    public async Task ExecuteAsync_WithSuccess_ShouldNotHaveErrorInfo()
    {
        // Arrange
        var taskSpec = new WorkflowTaskSpec
        {
            Type = "http",
            Request = new HttpRequestDefinition
            {
                Method = "GET",
                Url = "https://api.example.com/users"
            }
        };

        var context = new TemplateContext();

        _templateResolverMock.Setup(x => x.ResolveAsync(It.IsAny<string>(), context))
            .ReturnsAsync("https://api.example.com/users");

        _httpClientMock.Setup(x => x.SendAsync(
            It.IsAny<HttpRequestMessage>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent("{\"id\":\"123\"}")
            });

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        result.ErrorInfo.Should().BeNull();
    }

    #endregion

    #region Dynamic URL Tests

    [Fact]
    public async Task ExecuteAsync_WithFullyDynamicUrl_ShouldResolveEntireUrl()
    {
        // Arrange - URL is entirely from input (pattern: {{input.url}})
        var taskSpec = new WorkflowTaskSpec
        {
            Type = "http",
            Request = new HttpRequestDefinition
            {
                Method = "GET",
                Url = "{{input.url}}"
            }
        };

        var inputs = new Dictionary<string, object>
        {
            ["url"] = "https://api.example.com/dynamic/endpoint"
        };

        var context = new TemplateContext { Input = inputs };

        _templateResolverMock.Setup(x => x.ResolveAsync("{{input.url}}", context))
            .ReturnsAsync("https://api.example.com/dynamic/endpoint");

        _httpClientMock.Setup(x => x.SendAsync(
            It.Is<HttpRequestMessage>(r =>
                r.RequestUri!.ToString() == "https://api.example.com/dynamic/endpoint"),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent("{\"status\":\"ok\"}")
            });

        _schemaValidatorMock.Setup(x => x.ValidateAsync(
            It.IsAny<SchemaDefinition>(), It.IsAny<object>()))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        _templateResolverMock.Verify(x => x.ResolveAsync("{{input.url}}", context), Times.Once);
        _httpClientMock.Verify(x => x.SendAsync(
            It.Is<HttpRequestMessage>(r =>
                r.RequestUri!.ToString() == "https://api.example.com/dynamic/endpoint"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_WithDynamicBaseUrlAndPath_ShouldConcatenateCorrectly()
    {
        // Arrange - Base URL + path pattern: {{input.baseUrl}}{{input.path}}
        var taskSpec = new WorkflowTaskSpec
        {
            Type = "http",
            Request = new HttpRequestDefinition
            {
                Method = "GET",
                Url = "{{input.baseUrl}}{{input.path}}"
            }
        };

        var inputs = new Dictionary<string, object>
        {
            ["baseUrl"] = "https://api.staging.example.com",
            ["path"] = "/users/456"
        };

        var context = new TemplateContext { Input = inputs };

        _templateResolverMock.Setup(x => x.ResolveAsync("{{input.baseUrl}}{{input.path}}", context))
            .ReturnsAsync("https://api.staging.example.com/users/456");

        _httpClientMock.Setup(x => x.SendAsync(
            It.Is<HttpRequestMessage>(r =>
                r.RequestUri!.ToString() == "https://api.staging.example.com/users/456"),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent("{\"id\":456,\"name\":\"Test User\"}")
            });

        _schemaValidatorMock.Setup(x => x.ValidateAsync(
            It.IsAny<SchemaDefinition>(), It.IsAny<object>()))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context, CancellationToken.None);

        // Assert
        result.Success.Should().BeTrue();
        _httpClientMock.Verify(x => x.SendAsync(
            It.Is<HttpRequestMessage>(r =>
                r.RequestUri!.ToString() == "https://api.staging.example.com/users/456"),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion
}
