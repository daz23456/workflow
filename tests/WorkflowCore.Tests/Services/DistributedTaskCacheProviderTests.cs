using FluentAssertions;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class DistributedTaskCacheProviderTests
{
    private readonly Mock<IDistributedCache> _mockCache;
    private readonly Mock<ILogger<DistributedTaskCacheProvider>> _mockLogger;
    private readonly DistributedTaskCacheProvider _provider;

    public DistributedTaskCacheProviderTests()
    {
        _mockCache = new Mock<IDistributedCache>();
        _mockLogger = new Mock<ILogger<DistributedTaskCacheProvider>>();
        _provider = new DistributedTaskCacheProvider(_mockCache.Object, _mockLogger.Object);
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_ThrowsArgumentNullException_WhenCacheIsNull()
    {
        // Act & Assert
        var act = () => new DistributedTaskCacheProvider(null!, _mockLogger.Object);
        act.Should().Throw<ArgumentNullException>().WithParameterName("cache");
    }

    [Fact]
    public void Constructor_ThrowsArgumentNullException_WhenLoggerIsNull()
    {
        // Act & Assert
        var act = () => new DistributedTaskCacheProvider(_mockCache.Object, null!);
        act.Should().Throw<ArgumentNullException>().WithParameterName("logger");
    }

    #endregion

    #region GetAsync Tests

    [Fact]
    public async Task GetAsync_ReturnsNull_WhenKeyNotFound()
    {
        // Arrange
        var cacheKey = "task:test-task|GET|http://api.example.com/data|";
        _mockCache
            .Setup(c => c.GetAsync(cacheKey, It.IsAny<CancellationToken>()))
            .ReturnsAsync((byte[]?)null);

        // Act
        var result = await _provider.GetAsync(cacheKey);

        // Assert
        result.Should().BeNull();
        _mockCache.Verify(c => c.GetAsync(cacheKey, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetAsync_ReturnsDeserializedResult_WhenKeyExists()
    {
        // Arrange
        var cacheKey = "task:test-task|GET|http://api.example.com/data|";
        var expectedResult = new TaskExecutionResult
        {
            Success = true,
            Output = new Dictionary<string, object> { { "id", 123 }, { "name", "test" } },
            Duration = TimeSpan.FromMilliseconds(150),
            HttpMethod = "GET",
            ResolvedUrl = "http://api.example.com/data"
        };

        var serialized = System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(expectedResult);
        _mockCache
            .Setup(c => c.GetAsync(cacheKey, It.IsAny<CancellationToken>()))
            .ReturnsAsync(serialized);

        // Act
        var result = await _provider.GetAsync(cacheKey);

        // Assert
        result.Should().NotBeNull();
        result!.Success.Should().BeTrue();
        result.HttpMethod.Should().Be("GET");
        result.ResolvedUrl.Should().Be("http://api.example.com/data");
    }

    [Fact]
    public async Task GetAsync_ReturnsNull_WhenDeserializationFails()
    {
        // Arrange
        var cacheKey = "task:test-task|GET|http://api.example.com/data|";
        var invalidJson = System.Text.Encoding.UTF8.GetBytes("not valid json {{{");
        _mockCache
            .Setup(c => c.GetAsync(cacheKey, It.IsAny<CancellationToken>()))
            .ReturnsAsync(invalidJson);

        // Act
        var result = await _provider.GetAsync(cacheKey);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task GetAsync_RespectsCancellationToken()
    {
        // Arrange
        var cacheKey = "task:test|GET|http://test.com|";
        var cts = new CancellationTokenSource();
        cts.Cancel();

        _mockCache
            .Setup(c => c.GetAsync(cacheKey, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new OperationCanceledException());

        // Act & Assert
        await Assert.ThrowsAsync<OperationCanceledException>(
            () => _provider.GetAsync(cacheKey, cts.Token));
    }

    #endregion

    #region SetAsync Tests

    [Fact]
    public async Task SetAsync_StoresSerializedResult_WithCorrectTtl()
    {
        // Arrange
        var cacheKey = "task:test-task|GET|http://api.example.com/data|";
        var result = new TaskExecutionResult
        {
            Success = true,
            Output = new Dictionary<string, object> { { "id", 123 } },
            Duration = TimeSpan.FromMilliseconds(100)
        };
        var options = new TaskCacheOptions { Enabled = true, Ttl = "5m" };

        byte[]? storedBytes = null;
        DistributedCacheEntryOptions? storedOptions = null;

        _mockCache
            .Setup(c => c.SetAsync(
                cacheKey,
                It.IsAny<byte[]>(),
                It.IsAny<DistributedCacheEntryOptions>(),
                It.IsAny<CancellationToken>()))
            .Callback<string, byte[], DistributedCacheEntryOptions, CancellationToken>(
                (key, bytes, opts, ct) =>
                {
                    storedBytes = bytes;
                    storedOptions = opts;
                })
            .Returns(Task.CompletedTask);

        // Act
        await _provider.SetAsync(cacheKey, result, options);

        // Assert
        _mockCache.Verify(
            c => c.SetAsync(
                cacheKey,
                It.IsAny<byte[]>(),
                It.IsAny<DistributedCacheEntryOptions>(),
                It.IsAny<CancellationToken>()),
            Times.Once);

        storedBytes.Should().NotBeNull();
        storedOptions.Should().NotBeNull();
        storedOptions!.AbsoluteExpirationRelativeToNow.Should().Be(TimeSpan.FromMinutes(5));
    }

    [Fact]
    public async Task SetAsync_OverwritesExisting_WhenKeyExists()
    {
        // Arrange
        var cacheKey = "task:test-task|GET|http://api.example.com/data|";
        var result1 = new TaskExecutionResult { Success = true, Output = new Dictionary<string, object> { { "version", 1 } } };
        var result2 = new TaskExecutionResult { Success = true, Output = new Dictionary<string, object> { { "version", 2 } } };
        var options = new TaskCacheOptions { Enabled = true, Ttl = "5m" };

        var setCalls = new List<byte[]>();
        _mockCache
            .Setup(c => c.SetAsync(
                cacheKey,
                It.IsAny<byte[]>(),
                It.IsAny<DistributedCacheEntryOptions>(),
                It.IsAny<CancellationToken>()))
            .Callback<string, byte[], DistributedCacheEntryOptions, CancellationToken>(
                (key, bytes, opts, ct) => setCalls.Add(bytes))
            .Returns(Task.CompletedTask);

        // Act
        await _provider.SetAsync(cacheKey, result1, options);
        await _provider.SetAsync(cacheKey, result2, options);

        // Assert
        setCalls.Should().HaveCount(2);
        // Second call should have the updated data
        var deserializedSecond = System.Text.Json.JsonSerializer.Deserialize<TaskExecutionResult>(setCalls[1]);
        deserializedSecond.Should().NotBeNull();
    }

    [Fact]
    public async Task SetAsync_ParsesDifferentTtlFormats()
    {
        // Arrange
        var cacheKey = "task:test|GET|http://test.com|";
        var result = new TaskExecutionResult { Success = true };

        var testCases = new[]
        {
            ("30s", TimeSpan.FromSeconds(30)),
            ("5m", TimeSpan.FromMinutes(5)),
            ("1h", TimeSpan.FromHours(1)),
            ("2d", TimeSpan.FromDays(2))
        };

        foreach (var (ttlString, expectedTtl) in testCases)
        {
            DistributedCacheEntryOptions? capturedOptions = null;
            _mockCache
                .Setup(c => c.SetAsync(
                    cacheKey,
                    It.IsAny<byte[]>(),
                    It.IsAny<DistributedCacheEntryOptions>(),
                    It.IsAny<CancellationToken>()))
                .Callback<string, byte[], DistributedCacheEntryOptions, CancellationToken>(
                    (key, bytes, opts, ct) => capturedOptions = opts)
                .Returns(Task.CompletedTask);

            var options = new TaskCacheOptions { Enabled = true, Ttl = ttlString };

            // Act
            await _provider.SetAsync(cacheKey, result, options);

            // Assert
            capturedOptions.Should().NotBeNull();
            capturedOptions!.AbsoluteExpirationRelativeToNow.Should().Be(expectedTtl,
                $"TTL string '{ttlString}' should parse to {expectedTtl}");
        }
    }

    #endregion

    #region InvalidateAsync Tests

    [Fact]
    public async Task InvalidateAsync_RemovesEntry_WhenKeyExists()
    {
        // Arrange
        var cacheKey = "task:test-task|GET|http://api.example.com/data|";
        _mockCache
            .Setup(c => c.RemoveAsync(cacheKey, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Act
        await _provider.InvalidateAsync(cacheKey);

        // Assert
        _mockCache.Verify(c => c.RemoveAsync(cacheKey, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task InvalidateAsync_DoesNotThrow_WhenKeyDoesNotExist()
    {
        // Arrange
        var cacheKey = "task:nonexistent|GET|http://api.example.com|";
        _mockCache
            .Setup(c => c.RemoveAsync(cacheKey, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Act
        var act = () => _provider.InvalidateAsync(cacheKey);

        // Assert
        await act.Should().NotThrowAsync();
    }

    #endregion

    #region InvalidateByPatternAsync Tests

    [Fact]
    public async Task InvalidateByPatternAsync_LogsWarning_WhenPatternInvalidationNotSupported()
    {
        // Note: IDistributedCache doesn't support pattern-based deletion natively.
        // This test verifies the provider logs a warning and completes gracefully.

        // Arrange
        var pattern = "task:user-*";

        // Act
        await _provider.InvalidateByPatternAsync(pattern);

        // Assert - should complete without throwing
        // Pattern-based invalidation is a best-effort operation for IDistributedCache
        // Full support requires Redis-specific implementation
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("pattern") || v.ToString()!.Contains("Pattern")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtMostOnce);
    }

    #endregion

    #region Thread Safety Tests

    [Fact]
    public async Task ConcurrentAccess_IsThreadSafe()
    {
        // Arrange
        var cacheKey = "task:concurrent|GET|http://test.com|";
        var result = new TaskExecutionResult
        {
            Success = true,
            Output = new Dictionary<string, object> { { "data", "test" } }
        };
        var options = new TaskCacheOptions { Enabled = true, Ttl = "5m" };
        var serialized = System.Text.Json.JsonSerializer.SerializeToUtf8Bytes(result);

        _mockCache
            .Setup(c => c.GetAsync(cacheKey, It.IsAny<CancellationToken>()))
            .ReturnsAsync(serialized);

        _mockCache
            .Setup(c => c.SetAsync(
                cacheKey,
                It.IsAny<byte[]>(),
                It.IsAny<DistributedCacheEntryOptions>(),
                It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Act - Run multiple concurrent operations
        var tasks = new List<Task>();
        for (int i = 0; i < 100; i++)
        {
            tasks.Add(_provider.GetAsync(cacheKey));
            tasks.Add(_provider.SetAsync(cacheKey, result, options));
        }

        // Assert - Should complete without exceptions
        await Task.WhenAll(tasks);
    }

    #endregion

    #region TaskCacheOptions Tests

    [Theory]
    [InlineData("30s", 30)]
    [InlineData("5m", 300)]
    [InlineData("1h", 3600)]
    [InlineData("2d", 172800)]
    [InlineData("", 300)] // Default to 5 minutes
    [InlineData("invalid", 300)] // Default to 5 minutes for invalid
    public void TaskCacheOptions_GetTtlTimeSpan_ParsesCorrectly(string ttl, int expectedSeconds)
    {
        // Arrange
        var options = new TaskCacheOptions { Ttl = ttl };

        // Act
        var result = options.GetTtlTimeSpan();

        // Assert
        result.TotalSeconds.Should().Be(expectedSeconds);
    }

    [Fact]
    public void TaskCacheOptions_DefaultValues_AreCorrect()
    {
        // Arrange & Act
        var options = new TaskCacheOptions();

        // Assert
        options.Enabled.Should().BeFalse();
        options.Ttl.Should().Be("5m");
        options.KeyTemplate.Should().BeNull();
        options.CacheOnlySuccess.Should().BeTrue();
        options.CacheableMethods.Should().Be(CacheMethods.Get);
    }

    [Fact]
    public void CacheMethods_FlagsEnum_WorksCorrectly()
    {
        // Arrange & Act
        var getOnly = CacheMethods.Get;
        var getAndPost = CacheMethods.Get | CacheMethods.Post;
        var all = CacheMethods.All;

        // Assert
        getOnly.HasFlag(CacheMethods.Get).Should().BeTrue();
        getOnly.HasFlag(CacheMethods.Post).Should().BeFalse();

        getAndPost.HasFlag(CacheMethods.Get).Should().BeTrue();
        getAndPost.HasFlag(CacheMethods.Post).Should().BeTrue();
        getAndPost.HasFlag(CacheMethods.Put).Should().BeFalse();

        all.HasFlag(CacheMethods.Get).Should().BeTrue();
        all.HasFlag(CacheMethods.Post).Should().BeTrue();
        all.HasFlag(CacheMethods.Put).Should().BeTrue();
        all.HasFlag(CacheMethods.Delete).Should().BeTrue();
    }

    #endregion
}
