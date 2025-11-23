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
        result.Success.Should().BeFalse();
        result.RetryCount.Should().Be(0); // Should be 0 since HTTP succeeded, only validation failed
        result.Errors.Should().ContainSingle();
        result.Errors[0].Should().Contain("Response schema validation failed");
        result.Errors[0].Should().Contain("Field validation failed");
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
        result.Output.Should().BeNull();
        // Should not validate schema when output is null
        _schemaValidatorMock.Verify(x => x.ValidateAsync(
            It.IsAny<SchemaDefinition>(), It.IsAny<object>()), Times.Never);
    }
}
