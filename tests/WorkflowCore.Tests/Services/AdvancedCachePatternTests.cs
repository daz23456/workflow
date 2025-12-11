using FluentAssertions;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Moq;
using WorkflowCore.Interfaces;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

/// <summary>
/// Tests for Stage 39.2: Advanced Cache Patterns
/// - Stale-while-revalidate
/// - Cache bypass conditions
/// - Enhanced cache options
/// </summary>
public class AdvancedCachePatternTests
{
    private readonly Mock<IHttpTaskExecutor> _mockInnerExecutor;
    private readonly Mock<ITaskCacheProvider> _mockCacheProvider;
    private readonly Mock<ILogger<CachedHttpTaskExecutor>> _mockLogger;
    private readonly CachedHttpTaskExecutor _executor;

    public AdvancedCachePatternTests()
    {
        _mockInnerExecutor = new Mock<IHttpTaskExecutor>();
        _mockCacheProvider = new Mock<ITaskCacheProvider>();
        _mockLogger = new Mock<ILogger<CachedHttpTaskExecutor>>();
        _executor = new CachedHttpTaskExecutor(
            _mockInnerExecutor.Object,
            _mockCacheProvider.Object,
            _mockLogger.Object);
    }

    #region Stale-While-Revalidate Tests

    [Fact]
    public async Task ExecuteAsync_WithStaleWhileRevalidate_ServesStaleDataImmediately()
    {
        // Arrange
        var taskSpec = CreateTaskSpec(cache: new TaskCacheOptions
        {
            Enabled = true,
            Ttl = "5m",
            StaleWhileRevalidate = true,
            StaleTtl = "10m"
        });
        var context = new TemplateContext();

        var staleResult = new TaskExecutionResult
        {
            Success = true,
            Output = new Dictionary<string, object> { ["data"] = "stale" }
        };

        var freshResult = new TaskExecutionResult
        {
            Success = true,
            Output = new Dictionary<string, object> { ["data"] = "fresh" }
        };

        // Cache has stale entry (past TTL but within StaleTTL)
        _mockCacheProvider.Setup(x => x.GetWithMetadataAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CacheEntryWithMetadata
            {
                Result = staleResult,
                CreatedAtUtc = DateTime.UtcNow.AddMinutes(-6), // Past 5m TTL
                IsStale = true
            });

        _mockInnerExecutor.Setup(x => x.ExecuteAsync(taskSpec, context, It.IsAny<CancellationToken>()))
            .ReturnsAsync(freshResult);

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context);

        // Assert - Should return stale data immediately
        result.Output["data"].Should().Be("stale");
    }

    [Fact]
    public async Task ExecuteAsync_WithStaleWhileRevalidate_TriggersBackgroundRefresh()
    {
        // Arrange
        var taskSpec = CreateTaskSpec(cache: new TaskCacheOptions
        {
            Enabled = true,
            Ttl = "5m",
            StaleWhileRevalidate = true,
            StaleTtl = "10m"
        });
        var context = new TemplateContext();

        var staleResult = new TaskExecutionResult
        {
            Success = true,
            Output = new Dictionary<string, object> { ["data"] = "stale" }
        };

        var freshResult = new TaskExecutionResult
        {
            Success = true,
            Output = new Dictionary<string, object> { ["data"] = "fresh" }
        };

        _mockCacheProvider.Setup(x => x.GetWithMetadataAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CacheEntryWithMetadata
            {
                Result = staleResult,
                CreatedAtUtc = DateTime.UtcNow.AddMinutes(-6),
                IsStale = true
            });

        _mockInnerExecutor.Setup(x => x.ExecuteAsync(taskSpec, context, It.IsAny<CancellationToken>()))
            .ReturnsAsync(freshResult);

        // Act
        await _executor.ExecuteAsync(taskSpec, context);

        // Wait a bit for background refresh
        await Task.Delay(100);

        // Assert - Background refresh should have been triggered
        _mockInnerExecutor.Verify(x => x.ExecuteAsync(taskSpec, context, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_StaleWhileRevalidate_BeyondStaleTtl_ExecutesFresh()
    {
        // Arrange
        var taskSpec = CreateTaskSpec(cache: new TaskCacheOptions
        {
            Enabled = true,
            Ttl = "5m",
            StaleWhileRevalidate = true,
            StaleTtl = "10m"
        });
        var context = new TemplateContext();

        var freshResult = new TaskExecutionResult
        {
            Success = true,
            Output = new Dictionary<string, object> { ["data"] = "fresh" }
        };

        // Cache entry is beyond stale TTL (past 10 minutes)
        _mockCacheProvider.Setup(x => x.GetWithMetadataAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new CacheEntryWithMetadata
            {
                Result = null, // Entry is too stale, treated as miss
                CreatedAtUtc = DateTime.UtcNow.AddMinutes(-15),
                IsStale = true,
                IsBeyondStaleTtl = true
            });

        _mockInnerExecutor.Setup(x => x.ExecuteAsync(taskSpec, context, It.IsAny<CancellationToken>()))
            .ReturnsAsync(freshResult);

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context);

        // Assert - Should execute fresh (not serve expired stale data)
        result.Output["data"].Should().Be("fresh");
        _mockInnerExecutor.Verify(x => x.ExecuteAsync(taskSpec, context, It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region Cache Bypass Tests

    [Fact]
    public async Task ExecuteAsync_WithBypassWhen_BypassesCacheWhenConditionTrue()
    {
        // Arrange
        var taskSpec = CreateTaskSpec(cache: new TaskCacheOptions
        {
            Enabled = true,
            Ttl = "5m",
            BypassWhen = "{{input.forceRefresh}}"
        });
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["forceRefresh"] = true }
        };

        var freshResult = new TaskExecutionResult
        {
            Success = true,
            Output = new Dictionary<string, object> { ["data"] = "fresh" }
        };

        _mockInnerExecutor.Setup(x => x.ExecuteAsync(taskSpec, context, It.IsAny<CancellationToken>()))
            .ReturnsAsync(freshResult);

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context);

        // Assert - Cache should be bypassed
        _mockCacheProvider.Verify(x => x.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _mockCacheProvider.Verify(x => x.GetWithMetadataAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        result.Output["data"].Should().Be("fresh");
    }

    [Fact]
    public async Task ExecuteAsync_WithBypassWhen_UsesCacheWhenConditionFalse()
    {
        // Arrange
        var taskSpec = CreateTaskSpec(cache: new TaskCacheOptions
        {
            Enabled = true,
            Ttl = "5m",
            BypassWhen = "{{input.forceRefresh}}"
        });
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["forceRefresh"] = false }
        };

        var cachedResult = new TaskExecutionResult
        {
            Success = true,
            Output = new Dictionary<string, object> { ["data"] = "cached" }
        };

        _mockCacheProvider.Setup(x => x.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(cachedResult);

        // Act
        var result = await _executor.ExecuteAsync(taskSpec, context);

        // Assert - Cache should be used
        result.Output["data"].Should().Be("cached");
    }

    [Fact]
    public async Task ExecuteAsync_BypassWhen_DoesNotStoreInCache()
    {
        // Arrange
        var taskSpec = CreateTaskSpec(cache: new TaskCacheOptions
        {
            Enabled = true,
            Ttl = "5m",
            BypassWhen = "{{input.forceRefresh}}"
        });
        var context = new TemplateContext
        {
            Input = new Dictionary<string, object> { ["forceRefresh"] = true }
        };

        var freshResult = new TaskExecutionResult
        {
            Success = true,
            Output = new Dictionary<string, object> { ["data"] = "fresh" }
        };

        _mockInnerExecutor.Setup(x => x.ExecuteAsync(taskSpec, context, It.IsAny<CancellationToken>()))
            .ReturnsAsync(freshResult);

        // Act
        await _executor.ExecuteAsync(taskSpec, context);

        // Assert - Should NOT store result when bypassing
        _mockCacheProvider.Verify(x => x.SetAsync(It.IsAny<string>(), It.IsAny<TaskExecutionResult>(), It.IsAny<TaskCacheOptions>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    #endregion

    #region TaskCacheOptions Extended Tests

    [Fact]
    public void TaskCacheOptions_StaleTtl_DefaultsToTtl()
    {
        // Arrange
        var options = new TaskCacheOptions
        {
            Ttl = "5m"
        };

        // Act & Assert
        options.GetStaleTtlTimeSpan().Should().Be(options.GetTtlTimeSpan());
    }

    [Fact]
    public void TaskCacheOptions_StaleTtl_ParsesCorrectly()
    {
        // Arrange
        var options = new TaskCacheOptions
        {
            Ttl = "5m",
            StaleTtl = "15m"
        };

        // Act & Assert
        options.GetStaleTtlTimeSpan().Should().Be(TimeSpan.FromMinutes(15));
    }

    [Fact]
    public void TaskCacheOptions_StaleWhileRevalidate_DefaultsFalse()
    {
        // Arrange & Act
        var options = new TaskCacheOptions();

        // Assert
        options.StaleWhileRevalidate.Should().BeFalse();
    }

    [Fact]
    public void TaskCacheOptions_BypassWhen_DefaultsNull()
    {
        // Arrange & Act
        var options = new TaskCacheOptions();

        // Assert
        options.BypassWhen.Should().BeNull();
    }

    #endregion

    #region Helper Methods

    private static WorkflowTaskSpec CreateTaskSpec(TaskCacheOptions? cache = null)
    {
        return new WorkflowTaskSpec
        {
            Type = "test-type",
            Http = new HttpRequestDefinition
            {
                Url = "https://api.example.com/data",
                Method = "GET"
            },
            Cache = cache
        };
    }

    #endregion
}
