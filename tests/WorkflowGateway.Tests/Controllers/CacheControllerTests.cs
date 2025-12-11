using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Controllers;
using WorkflowGateway.Models;
using Xunit;

namespace WorkflowGateway.Tests.Controllers;

public class CacheControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly Mock<ICacheStatsService> _mockCacheStatsService;

    public CacheControllerTests(WebApplicationFactory<Program> factory)
    {
        _mockCacheStatsService = new Mock<ICacheStatsService>();
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Remove existing registration
                var descriptor = services.SingleOrDefault(d =>
                    d.ServiceType == typeof(ICacheStatsService));
                if (descriptor != null)
                {
                    services.Remove(descriptor);
                }

                services.AddSingleton(_mockCacheStatsService.Object);
            });
        });
    }

    [Fact]
    public async Task GetCacheStats_ReturnsStats_WhenServiceAvailable()
    {
        // Arrange
        var expectedStats = new TaskCacheStats
        {
            TotalHits = 150,
            TotalMisses = 50,
            TotalEntries = 25,
            MemoryUsageBytes = 1024 * 1024,
            OldestEntryAge = TimeSpan.FromMinutes(90),
            RecentKeys = new List<CacheKeyStats>
            {
                new() { Key = "task:get-user|GET|/api/users/1|", Hits = 10, LastAccess = DateTime.UtcNow.AddMinutes(-2) },
                new() { Key = "task:validate|POST|/api/validate|abc123", Hits = 5, LastAccess = DateTime.UtcNow.AddMinutes(-5) }
            },
            GeneratedAt = DateTime.UtcNow
        };

        _mockCacheStatsService
            .Setup(s => s.GetStatsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedStats);

        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/api/v1/cache/stats");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<CacheStatsResponse>();
        Assert.NotNull(result);
        Assert.Equal(150, result.TotalHits);
        Assert.Equal(50, result.TotalMisses);
        Assert.Equal(0.75, result.HitRatio);
    }

    [Fact]
    public async Task InvalidateCache_ReturnsOk_WhenKeyInvalidated()
    {
        // Arrange
        var request = new InvalidateCacheRequest { Key = "task:get-user|GET|/api/users/1|" };

        _mockCacheStatsService
            .Setup(s => s.InvalidateKeyAsync(request.Key, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var client = _factory.CreateClient();

        // Act
        var response = await client.PostAsJsonAsync("/api/v1/cache/invalidate", request);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        _mockCacheStatsService.Verify(s => s.InvalidateKeyAsync(request.Key, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ClearCache_ReturnsOk_WhenCacheCleared()
    {
        // Arrange
        _mockCacheStatsService
            .Setup(s => s.ClearAllAsync(It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var client = _factory.CreateClient();

        // Act
        var response = await client.PostAsync("/api/v1/cache/clear", null);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        _mockCacheStatsService.Verify(s => s.ClearAllAsync(It.IsAny<CancellationToken>()), Times.Once);
    }
}
