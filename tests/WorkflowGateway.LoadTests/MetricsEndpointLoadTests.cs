using NBomber.CSharp;
using NBomber.Http.CSharp;
using NBomber.Contracts;

namespace WorkflowGateway.LoadTests;

/// <summary>
/// Load tests for the metrics API endpoints.
/// Tests concurrent access patterns for the dashboard.
/// </summary>
public class MetricsEndpointLoadTests
{
    private const string BaseUrl = "http://localhost:5001/api/v1";

    /// <summary>
    /// Tests the system metrics endpoint under load.
    /// Target: P95 < 500ms under 100 concurrent users.
    /// </summary>
    [Fact]
    public void SystemMetrics_ShouldHandleConcurrentRequests()
    {
        using var httpClient = new HttpClient();

        var scenario = Scenario.Create("system_metrics", async context =>
        {
            var request = Http.CreateRequest("GET", $"{BaseUrl}/metrics/system?range=24h")
                .WithHeader("Accept", "application/json");

            var response = await Http.Send(httpClient, request);

            return response;
        })
        .WithoutWarmUp()
        .WithLoadSimulations(
            Simulation.Inject(
                rate: 100,
                interval: TimeSpan.FromSeconds(1),
                during: TimeSpan.FromSeconds(30)
            )
        );

        var stats = NBomberRunner
            .RegisterScenarios(scenario)
            .WithReportFolder("reports/load-tests")
            .WithReportFileName("metrics-system-load-test")
            .Run();

        // Assert P95 is under 500ms
        var scenarioStats = stats.ScenarioStats[0];
        Assert.True(scenarioStats.Ok.Latency.Percent95 < 500,
            $"P95 latency ({scenarioStats.Ok.Latency.Percent95}ms) exceeded 500ms target");

        // Assert error rate is under 1%
        var errorRate = (double)scenarioStats.Fail.Request.Count / scenarioStats.AllRequestCount * 100;
        Assert.True(errorRate < 1,
            $"Error rate ({errorRate:F2}%) exceeded 1% target");
    }

    /// <summary>
    /// Tests the workflow metrics endpoint under load.
    /// </summary>
    [Fact]
    public void WorkflowMetrics_ShouldHandleConcurrentRequests()
    {
        using var httpClient = new HttpClient();

        var scenario = Scenario.Create("workflow_metrics", async context =>
        {
            var request = Http.CreateRequest("GET", $"{BaseUrl}/metrics/workflows")
                .WithHeader("Accept", "application/json");

            var response = await Http.Send(httpClient, request);

            return response;
        })
        .WithoutWarmUp()
        .WithLoadSimulations(
            Simulation.Inject(
                rate: 50,
                interval: TimeSpan.FromSeconds(1),
                during: TimeSpan.FromSeconds(30)
            )
        );

        var stats = NBomberRunner
            .RegisterScenarios(scenario)
            .WithReportFolder("reports/load-tests")
            .WithReportFileName("metrics-workflows-load-test")
            .Run();

        var scenarioStats = stats.ScenarioStats[0];
        Assert.True(scenarioStats.Ok.Latency.Percent95 < 500,
            $"P95 latency ({scenarioStats.Ok.Latency.Percent95}ms) exceeded 500ms target");
    }

    /// <summary>
    /// Tests the slowest workflows endpoint under load.
    /// </summary>
    [Fact]
    public void SlowestWorkflows_ShouldHandleConcurrentRequests()
    {
        using var httpClient = new HttpClient();

        var scenario = Scenario.Create("slowest_workflows", async context =>
        {
            var request = Http.CreateRequest("GET", $"{BaseUrl}/metrics/slowest?limit=10")
                .WithHeader("Accept", "application/json");

            var response = await Http.Send(httpClient, request);

            return response;
        })
        .WithoutWarmUp()
        .WithLoadSimulations(
            Simulation.Inject(
                rate: 50,
                interval: TimeSpan.FromSeconds(1),
                during: TimeSpan.FromSeconds(30)
            )
        );

        var stats = NBomberRunner
            .RegisterScenarios(scenario)
            .WithReportFolder("reports/load-tests")
            .WithReportFileName("metrics-slowest-load-test")
            .Run();

        var scenarioStats = stats.ScenarioStats[0];
        Assert.True(scenarioStats.Ok.Latency.Percent95 < 500,
            $"P95 latency ({scenarioStats.Ok.Latency.Percent95}ms) exceeded 500ms target");
    }

    /// <summary>
    /// Simulates dashboard refresh pattern - multiple endpoints called in parallel.
    /// </summary>
    [Fact]
    public void DashboardRefresh_ShouldHandleConcurrentRequests()
    {
        using var httpClient = new HttpClient();

        // System metrics scenario
        var systemMetricsScenario = Scenario.Create("dashboard_system_metrics", async context =>
        {
            var request = Http.CreateRequest("GET", $"{BaseUrl}/metrics/system?range=24h")
                .WithHeader("Accept", "application/json");

            return await Http.Send(httpClient, request);
        })
        .WithoutWarmUp()
        .WithLoadSimulations(
            Simulation.Inject(
                rate: 30,
                interval: TimeSpan.FromSeconds(1),
                during: TimeSpan.FromSeconds(30)
            )
        );

        // Workflow metrics scenario
        var workflowMetricsScenario = Scenario.Create("dashboard_workflow_metrics", async context =>
        {
            var request = Http.CreateRequest("GET", $"{BaseUrl}/metrics/workflows")
                .WithHeader("Accept", "application/json");

            return await Http.Send(httpClient, request);
        })
        .WithoutWarmUp()
        .WithLoadSimulations(
            Simulation.Inject(
                rate: 30,
                interval: TimeSpan.FromSeconds(1),
                during: TimeSpan.FromSeconds(30)
            )
        );

        // Slowest workflows scenario
        var slowestScenario = Scenario.Create("dashboard_slowest", async context =>
        {
            var request = Http.CreateRequest("GET", $"{BaseUrl}/metrics/slowest?limit=10")
                .WithHeader("Accept", "application/json");

            return await Http.Send(httpClient, request);
        })
        .WithoutWarmUp()
        .WithLoadSimulations(
            Simulation.Inject(
                rate: 30,
                interval: TimeSpan.FromSeconds(1),
                during: TimeSpan.FromSeconds(30)
            )
        );

        var stats = NBomberRunner
            .RegisterScenarios(systemMetricsScenario, workflowMetricsScenario, slowestScenario)
            .WithReportFolder("reports/load-tests")
            .WithReportFileName("dashboard-refresh-load-test")
            .Run();

        // All scenarios should have P95 < 500ms
        foreach (var scenarioStats in stats.ScenarioStats)
        {
            Assert.True(scenarioStats.Ok.Latency.Percent95 < 500,
                $"Scenario '{scenarioStats.ScenarioName}' P95 latency ({scenarioStats.Ok.Latency.Percent95}ms) exceeded 500ms target");
        }
    }
}
