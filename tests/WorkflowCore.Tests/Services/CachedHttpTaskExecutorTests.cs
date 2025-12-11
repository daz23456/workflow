using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using WorkflowCore.Interfaces;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class CachedHttpTaskExecutorTests
{
    private readonly Mock<IHttpTaskExecutor> _mockInner;
    private readonly Mock<ITaskCacheProvider> _mockCacheProvider;
    private readonly Mock<ILogger<CachedHttpTaskExecutor>> _mockLogger;
    private readonly CachedHttpTaskExecutor _executor;

    public CachedHttpTaskExecutorTests()
    {
        _mockInner = new Mock<IHttpTaskExecutor>();
        _mockCacheProvider = new Mock<ITaskCacheProvider>();
        _mockLogger = new Mock<ILogger<CachedHttpTaskExecutor>>();
        _executor = new CachedHttpTaskExecutor(
            _mockInner.Object,
            _mockCacheProvider.Object,
            _mockLogger.Object);
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_ThrowsArgumentNullException_WhenInnerIsNull()
    {
        // Act & Assert
        var act = () => new CachedHttpTaskExecutor(null!, _mockCacheProvider.Object, _mockLogger.Object);
        act.Should().Throw<ArgumentNullException>().WithParameterName("inner");
    }

    [Fact]
    public void Constructor_ThrowsArgumentNullException_WhenCacheProviderIsNull()
    {
        // Act & Assert
        var act = () => new CachedHttpTaskExecutor(_mockInner.Object, null!, _mockLogger.Object);
        act.Should().Throw<ArgumentNullException>().WithParameterName("cacheProvider");
    }

    [Fact]
    public void Constructor_ThrowsArgumentNullException_WhenLoggerIsNull()
    {
        // Act & Assert
        var act = () => new CachedHttpTaskExecutor(_mockInner.Object, _mockCacheProvider.Object, null!);
        act.Should().Throw<ArgumentNullException>().WithParameterName("logger");
    }

    #endregion

    #region ExecuteAsync Cache Hit Tests

    [Fact]
    public async Task ExecuteAsync_ReturnsCachedResult_OnCacheHit()
    {
        // Arrange
        var taskSpec = CreateTaskSpec(cacheEnabled: true);
        var context = CreateTemplateContext();
        var cachedResult = new TaskExecutionResult
        {
            Success = true,
            Output = new Dictionary<string, object> { { "cached", true } },
            HttpMethod = "GET",
            ResolvedUrl = "http://api.example.com/data"
        };

        _mockCacheProvider
            .Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(cachedResult);

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context);

        // Assert
        result.Should().BeSameAs(cachedResult);
        _mockInner.Verify(i => i.ExecuteAsync(
            It.IsAny<WorkflowTaskSpec>(),
            It.IsAny<TemplateContext>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    #endregion

    #region ExecuteAsync Cache Miss Tests

    [Fact]
    public async Task ExecuteAsync_CallsInnerAndCachesResult_OnCacheMiss()
    {
        // Arrange
        var taskSpec = CreateTaskSpec(cacheEnabled: true);
        var context = CreateTemplateContext();
        var httpResult = new TaskExecutionResult
        {
            Success = true,
            Output = new Dictionary<string, object> { { "fresh", true } },
            HttpMethod = "GET",
            ResolvedUrl = "http://api.example.com/data"
        };

        _mockCacheProvider
            .Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TaskExecutionResult?)null);

        _mockInner
            .Setup(i => i.ExecuteAsync(taskSpec, context, It.IsAny<CancellationToken>()))
            .ReturnsAsync(httpResult);

        _mockCacheProvider
            .Setup(c => c.SetAsync(
                It.IsAny<string>(),
                httpResult,
                It.IsAny<TaskCacheOptions>(),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context);

        // Assert
        result.Should().BeSameAs(httpResult);
        _mockInner.Verify(i => i.ExecuteAsync(taskSpec, context, It.IsAny<CancellationToken>()), Times.Once);
        _mockCacheProvider.Verify(c => c.SetAsync(
            It.IsAny<string>(),
            httpResult,
            It.IsAny<TaskCacheOptions>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_DoesNotCacheFailedResult_WhenCacheOnlySuccessIsTrue()
    {
        // Arrange
        var taskSpec = CreateTaskSpec(cacheEnabled: true, cacheOnlySuccess: true);
        var context = CreateTemplateContext();
        var failedResult = new TaskExecutionResult
        {
            Success = false,
            Errors = new List<string> { "HTTP 500" },
            HttpMethod = "GET"
        };

        _mockCacheProvider
            .Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TaskExecutionResult?)null);

        _mockInner
            .Setup(i => i.ExecuteAsync(taskSpec, context, It.IsAny<CancellationToken>()))
            .ReturnsAsync(failedResult);

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context);

        // Assert
        result.Should().BeSameAs(failedResult);
        _mockCacheProvider.Verify(c => c.SetAsync(
            It.IsAny<string>(),
            It.IsAny<TaskExecutionResult>(),
            It.IsAny<TaskCacheOptions>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    #endregion

    #region ExecuteAsync Disabled Cache Tests

    [Fact]
    public async Task ExecuteAsync_DoesNotCache_WhenCacheDisabled()
    {
        // Arrange
        var taskSpec = CreateTaskSpec(cacheEnabled: false);
        var context = CreateTemplateContext();
        var httpResult = new TaskExecutionResult
        {
            Success = true,
            Output = new Dictionary<string, object> { { "data", "test" } }
        };

        _mockInner
            .Setup(i => i.ExecuteAsync(taskSpec, context, It.IsAny<CancellationToken>()))
            .ReturnsAsync(httpResult);

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context);

        // Assert
        result.Should().BeSameAs(httpResult);
        _mockCacheProvider.Verify(c => c.GetAsync(
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()), Times.Never);
        _mockCacheProvider.Verify(c => c.SetAsync(
            It.IsAny<string>(),
            It.IsAny<TaskExecutionResult>(),
            It.IsAny<TaskCacheOptions>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ExecuteAsync_DoesNotCache_WhenCacheOptionsIsNull()
    {
        // Arrange
        var taskSpec = new WorkflowTaskSpec
        {
            Type = "http",
            Http = new HttpRequestDefinition { Method = "GET", Url = "http://test.com" }
            // Cache is null
        };
        var context = CreateTemplateContext();
        var httpResult = new TaskExecutionResult { Success = true };

        _mockInner
            .Setup(i => i.ExecuteAsync(taskSpec, context, It.IsAny<CancellationToken>()))
            .ReturnsAsync(httpResult);

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context);

        // Assert
        result.Should().BeSameAs(httpResult);
        _mockCacheProvider.Verify(c => c.GetAsync(
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    #endregion

    #region ExecuteAsync Non-Cacheable Method Tests

    [Fact]
    public async Task ExecuteAsync_DoesNotCache_NonGetRequests_ByDefault()
    {
        // Arrange
        var taskSpec = CreateTaskSpec(cacheEnabled: true, httpMethod: "POST");
        var context = CreateTemplateContext();
        var httpResult = new TaskExecutionResult
        {
            Success = true,
            Output = new Dictionary<string, object> { { "id", 123 } },
            HttpMethod = "POST"
        };

        _mockInner
            .Setup(i => i.ExecuteAsync(taskSpec, context, It.IsAny<CancellationToken>()))
            .ReturnsAsync(httpResult);

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context);

        // Assert
        result.Should().BeSameAs(httpResult);
        // Should NOT check cache for POST by default
        _mockCacheProvider.Verify(c => c.GetAsync(
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ExecuteAsync_CachesPostRequest_WhenExplicitlyConfigured()
    {
        // Arrange
        var taskSpec = CreateTaskSpec(
            cacheEnabled: true,
            httpMethod: "POST",
            cacheableMethods: CacheMethods.Get | CacheMethods.Post);
        var context = CreateTemplateContext();
        var httpResult = new TaskExecutionResult
        {
            Success = true,
            Output = new Dictionary<string, object> { { "id", 123 } },
            HttpMethod = "POST",
            ResolvedUrl = "http://api.example.com/data"
        };

        _mockCacheProvider
            .Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TaskExecutionResult?)null);

        _mockInner
            .Setup(i => i.ExecuteAsync(taskSpec, context, It.IsAny<CancellationToken>()))
            .ReturnsAsync(httpResult);

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context);

        // Assert
        _mockCacheProvider.Verify(c => c.GetAsync(
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()), Times.Once);
        _mockCacheProvider.Verify(c => c.SetAsync(
            It.IsAny<string>(),
            httpResult,
            It.IsAny<TaskCacheOptions>(),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region Cache Key Generation Tests

    [Theory]
    [InlineData("task-1", "GET", "http://api.example.com/data", null)]
    [InlineData("task-2", "POST", "http://api.example.com/create", "{\"name\":\"test\"}")]
    public void GenerateCacheKey_ProducesDeterministicKey(
        string taskRef,
        string httpMethod,
        string resolvedUrl,
        string? requestBody)
    {
        // Act
        var key1 = CachedHttpTaskExecutor.GenerateCacheKey(taskRef, httpMethod, resolvedUrl, requestBody);
        var key2 = CachedHttpTaskExecutor.GenerateCacheKey(taskRef, httpMethod, resolvedUrl, requestBody);

        // Assert
        key1.Should().Be(key2, "same inputs should produce same key");
        key1.Should().Contain(taskRef);
        key1.Should().Contain(httpMethod);
    }

    [Fact]
    public void GenerateCacheKey_ProducesDifferentKeys_ForDifferentInputs()
    {
        // Arrange
        var taskRef = "my-task";
        var method = "GET";
        var url1 = "http://api.example.com/users/1";
        var url2 = "http://api.example.com/users/2";

        // Act
        var key1 = CachedHttpTaskExecutor.GenerateCacheKey(taskRef, method, url1, null);
        var key2 = CachedHttpTaskExecutor.GenerateCacheKey(taskRef, method, url2, null);

        // Assert
        key1.Should().NotBe(key2, "different URLs should produce different keys");
    }

    [Fact]
    public void GenerateCacheKey_IncludesBodyHash_ForPostRequests()
    {
        // Arrange
        var taskRef = "my-task";
        var method = "POST";
        var url = "http://api.example.com/create";
        var body1 = "{\"name\":\"Alice\"}";
        var body2 = "{\"name\":\"Bob\"}";

        // Act
        var key1 = CachedHttpTaskExecutor.GenerateCacheKey(taskRef, method, url, body1);
        var key2 = CachedHttpTaskExecutor.GenerateCacheKey(taskRef, method, url, body2);

        // Assert
        key1.Should().NotBe(key2, "different bodies should produce different keys");
    }

    #endregion

    #region IsCacheableMethod Tests

    [Theory]
    [InlineData("GET", CacheMethods.Get, true)]
    [InlineData("get", CacheMethods.Get, true)]  // Case insensitive
    [InlineData("POST", CacheMethods.Get, false)]
    [InlineData("POST", CacheMethods.Post, true)]
    [InlineData("PUT", CacheMethods.Put, true)]
    [InlineData("DELETE", CacheMethods.Delete, true)]
    [InlineData("GET", CacheMethods.All, true)]
    [InlineData("POST", CacheMethods.All, true)]
    [InlineData("GET", CacheMethods.None, false)]
    [InlineData("GET", CacheMethods.Get | CacheMethods.Post, true)]
    [InlineData("POST", CacheMethods.Get | CacheMethods.Post, true)]
    [InlineData("PUT", CacheMethods.Get | CacheMethods.Post, false)]
    public void IsCacheableMethod_ReturnsCorrectResult(
        string httpMethod,
        CacheMethods cacheableMethods,
        bool expectedResult)
    {
        // Act
        var result = CachedHttpTaskExecutor.IsCacheableMethod(httpMethod, cacheableMethods);

        // Assert
        result.Should().Be(expectedResult);
    }

    #endregion

    #region Helper Methods

    private static WorkflowTaskSpec CreateTaskSpec(
        bool cacheEnabled = true,
        string httpMethod = "GET",
        bool cacheOnlySuccess = true,
        CacheMethods cacheableMethods = CacheMethods.Get)
    {
        return new WorkflowTaskSpec
        {
            Type = "http",
            Http = new HttpRequestDefinition
            {
                Method = httpMethod,
                Url = "http://api.example.com/data"
            },
            Cache = new TaskCacheOptions
            {
                Enabled = cacheEnabled,
                Ttl = "5m",
                CacheOnlySuccess = cacheOnlySuccess,
                CacheableMethods = cacheableMethods
            }
        };
    }

    private static TemplateContext CreateTemplateContext()
    {
        return new TemplateContext
        {
            Input = new Dictionary<string, object> { { "userId", 123 } }
        };
    }

    #endregion
}
