using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using TestApiServer.Models;
using TestApiServer.Tests.Infrastructure;

namespace TestApiServer.Tests.Middleware;

[Collection("TestApiServer")]
public class ChaosMiddlewareTests
{
    private readonly HttpClient _client;

    public ChaosMiddlewareTests(TestApiServerFixture fixture)
    {
        _client = fixture.CreateClient();
    }

    [Fact]
    public async Task NormalMode_ShouldNotAffectRequests()
    {
        // Ensure normal mode
        await _client.PostAsync("/api/chaos/reset", null);

        var response = await _client.GetAsync("/api/primitives/string");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ChaosEndpoints_ShouldNotBeAffected()
    {
        // Set absolute failure mode
        await _client.PostAsync("/api/chaos/mode/AbsoluteFailure", null);

        // Chaos endpoints should still work
        var statusResponse = await _client.GetAsync("/api/chaos/status");
        statusResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Reset
        await _client.PostAsync("/api/chaos/reset", null);
    }

    [Fact]
    public async Task HealthEndpoint_ShouldNotBeAffected()
    {
        // Set absolute failure mode
        await _client.PostAsync("/api/chaos/mode/AbsoluteFailure", null);

        // Health endpoint should still work
        var healthResponse = await _client.GetAsync("/health");
        healthResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Reset
        await _client.PostAsync("/api/chaos/reset", null);
    }

    [Fact]
    public async Task BypassHeader_ShouldSkipChaos()
    {
        // Set absolute failure mode
        await _client.PostAsync("/api/chaos/mode/AbsoluteFailure", null);

        // Request with bypass header should succeed
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/primitives/string");
        request.Headers.Add("X-Chaos-Bypass", "true");
        var response = await _client.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        // Reset
        await _client.PostAsync("/api/chaos/reset", null);
    }

    [Fact]
    public async Task ForceFailHeader_ShouldInjectFailure()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/primitives/string");
        request.Headers.Add("X-Chaos-Force-Fail", "503");
        var response = await _client.SendAsync(request);

        response.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("error").GetString().Should().Contain("forced failure");
    }

    [Fact]
    public async Task AbsoluteFailureMode_ShouldFailAllRequests()
    {
        // Set absolute failure mode
        await _client.PostAsync("/api/chaos/mode/AbsoluteFailure", null);

        // Regular request should fail
        var response = await _client.GetAsync("/api/primitives/string");
        response.StatusCode.Should().BeOneOf(
            HttpStatusCode.InternalServerError,
            HttpStatusCode.BadGateway,
            HttpStatusCode.ServiceUnavailable,
            HttpStatusCode.GatewayTimeout
        );

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("error").GetString().Should().Contain("Chaos injection");

        // Reset
        await _client.PostAsync("/api/chaos/reset", null);
    }

    [Fact]
    public async Task Stats_ShouldTrackInjectedFailures()
    {
        // Reset stats
        await _client.PostAsync("/api/chaos/reset", null);

        // Get initial stats
        var initialStats = await _client.GetFromJsonAsync<JsonElement>("/api/chaos/stats");
        var initialFailures = initialStats.GetProperty("failuresInjected").GetInt32();

        // Force a failure
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/primitives/string");
        request.Headers.Add("X-Chaos-Force-Fail", "500");
        await _client.SendAsync(request);

        // Get updated stats
        var updatedStats = await _client.GetFromJsonAsync<JsonElement>("/api/chaos/stats");
        var updatedFailures = updatedStats.GetProperty("failuresInjected").GetInt32();

        updatedFailures.Should().BeGreaterThan(initialFailures);
    }

    [Fact]
    public async Task Stats_ShouldTrackTotalRequests()
    {
        // Reset stats
        await _client.PostAsync("/api/chaos/reset", null);

        // Make a request
        await _client.GetAsync("/api/primitives/string");

        // Get stats
        var stats = await _client.GetFromJsonAsync<JsonElement>("/api/chaos/stats");
        stats.GetProperty("totalRequests").GetInt32().Should().BeGreaterThan(0);
    }
}
