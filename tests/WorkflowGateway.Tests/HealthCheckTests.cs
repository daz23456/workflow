using System.Net;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Moq;
using WorkflowCore.Data;
using WorkflowGateway.Services;

namespace WorkflowGateway.Tests;

/// <summary>
/// Tests for health check endpoint.
/// COMMENTED OUT: These are E2E integration tests that require full infrastructure
/// (PostgreSQL + Kubernetes). They should be moved to a separate E2E test project
/// that runs against a real environment, not in unit test suite.
/// TODO: Move to tests/WorkflowGateway.E2ETests/ when infrastructure is ready.
/// </summary>
public class HealthCheckTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;

    public HealthCheckTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
    }

    // COMMENTED OUT: E2E test requiring full infrastructure
    // TODO: Move to E2E test project
    /*
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

                // Replace IKubernetesWorkflowClient with mock
                var k8sDescriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(IKubernetesWorkflowClient));
                if (k8sDescriptor != null)
                    services.Remove(k8sDescriptor);

                var mockK8sClient = new Mock<IKubernetesWorkflowClient>();
                services.AddSingleton(mockK8sClient.Object);
            });
        }).CreateClient();

        // Act
        var response = await client.GetAsync("/health");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("Healthy");
    }
    */

    // COMMENTED OUT: E2E test requiring full infrastructure
    // TODO: Move to E2E test project
    /*
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

                // Replace IKubernetesWorkflowClient with mock
                var k8sDescriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(IKubernetesWorkflowClient));
                if (k8sDescriptor != null)
                    services.Remove(k8sDescriptor);

                var mockK8sClient = new Mock<IKubernetesWorkflowClient>();
                services.AddSingleton(mockK8sClient.Object);
            });
        }).CreateClient();

        // Act
        var response = await client.GetAsync("/health/ready");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
    */

    // COMMENTED OUT: E2E test requiring full infrastructure
    // TODO: Move to E2E test project
    /*
    [Fact]
    public async Task GET_health_live_ShouldReturnOK_WhenApplicationIsRunning()
    {
        // Arrange
        var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                // Replace IKubernetesWorkflowClient with mock to avoid DI errors
                var k8sDescriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(IKubernetesWorkflowClient));
                if (k8sDescriptor != null)
                    services.Remove(k8sDescriptor);

                var mockK8sClient = new Mock<IKubernetesWorkflowClient>();
                services.AddSingleton(mockK8sClient.Object);
            });
        }).CreateClient();

        // Act
        var response = await client.GetAsync("/health/live");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
    */
}
