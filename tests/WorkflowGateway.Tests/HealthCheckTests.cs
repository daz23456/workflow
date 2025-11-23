using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using WorkflowCore.Data;

namespace WorkflowGateway.Tests;

/// <summary>
/// Tests for health check endpoint.
/// </summary>
public class HealthCheckTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public HealthCheckTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task GET_health_ShouldReturnOK_WhenDatabaseIsHealthy()
    {
        // Arrange
        var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Replace real database with InMemory for testing
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<WorkflowDbContext>));
                if (descriptor != null)
                    services.Remove(descriptor);

                services.AddDbContext<WorkflowDbContext>(options =>
                    options.UseInMemoryDatabase("HealthCheckTest"));
            });
        }).CreateClient();

        // Act
        var response = await client.GetAsync("/health");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("Healthy");
    }

    [Fact]
    public async Task GET_health_ready_ShouldReturnOK_WhenDatabaseConnectionWorks()
    {
        // Arrange
        var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Replace real database with InMemory for testing
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(DbContextOptions<WorkflowDbContext>));
                if (descriptor != null)
                    services.Remove(descriptor);

                services.AddDbContext<WorkflowDbContext>(options =>
                    options.UseInMemoryDatabase("ReadinessTest"));
            });
        }).CreateClient();

        // Act
        var response = await client.GetAsync("/health/ready");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GET_health_live_ShouldReturnOK_WhenApplicationIsRunning()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/health/live");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
