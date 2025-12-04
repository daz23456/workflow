using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using TestApiServer.Models;
using TestApiServer.Tests.Infrastructure;

namespace TestApiServer.Tests.Endpoints;

[Collection("TestApiServer")]
public class ChaosEndpointTests
{
    private readonly HttpClient _client;

    public ChaosEndpointTests(TestApiServerFixture fixture)
    {
        _client = fixture.CreateClient();
    }

    [Fact]
    public async Task GetStatus_ShouldReturnCurrentConfiguration()
    {
        var response = await _client.GetAsync("/api/chaos/status");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("mode").GetInt32().Should().Be((int)ChaosMode.Normal);
    }

    [Fact]
    public async Task SetMode_ValidMode_ShouldUpdateConfiguration()
    {
        // Set to random-failure
        var setResponse = await _client.PostAsync("/api/chaos/mode/RandomFailure", null);
        setResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify
        var statusResponse = await _client.GetAsync("/api/chaos/status");
        var status = await statusResponse.Content.ReadFromJsonAsync<JsonElement>();
        status.GetProperty("mode").GetInt32().Should().Be((int)ChaosMode.RandomFailure);

        // Reset for other tests
        await _client.PostAsync("/api/chaos/reset", null);
    }

    [Fact]
    public async Task SetMode_InvalidMode_ShouldReturnBadRequest()
    {
        var response = await _client.PostAsync("/api/chaos/mode/InvalidMode", null);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("validModes").GetArrayLength().Should().Be(6); // All ChaosMode values
    }

    [Fact]
    public async Task Configure_ShouldUpdateFullConfiguration()
    {
        var config = new ChaosConfiguration
        {
            Mode = ChaosMode.RandomDelay,
            MinDelayMs = 100,
            MaxDelayMs = 500,
            FailureProbability = 0.5
        };

        var response = await _client.PostAsJsonAsync("/api/chaos/configure", config);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify
        var statusResponse = await _client.GetAsync("/api/chaos/status");
        var status = await statusResponse.Content.ReadFromJsonAsync<JsonElement>();
        status.GetProperty("mode").GetInt32().Should().Be((int)ChaosMode.RandomDelay);
        status.GetProperty("minDelayMs").GetInt32().Should().Be(100);
        status.GetProperty("maxDelayMs").GetInt32().Should().Be(500);

        // Reset
        await _client.PostAsync("/api/chaos/reset", null);
    }

    [Fact]
    public async Task Reset_ShouldReturnToNormalMode()
    {
        // First set a non-normal mode
        await _client.PostAsync("/api/chaos/mode/AbsoluteFailure", null);

        // Reset
        var resetResponse = await _client.PostAsync("/api/chaos/reset", null);
        resetResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        // Verify back to normal
        var statusResponse = await _client.GetAsync("/api/chaos/status");
        var status = await statusResponse.Content.ReadFromJsonAsync<JsonElement>();
        status.GetProperty("mode").GetInt32().Should().Be((int)ChaosMode.Normal);
    }

    [Fact]
    public async Task GetStats_ShouldReturnStatistics()
    {
        var response = await _client.GetAsync("/api/chaos/stats");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("totalRequests").GetInt32().Should().BeGreaterThanOrEqualTo(0);
        content.GetProperty("failuresInjected").GetInt32().Should().BeGreaterThanOrEqualTo(0);
        content.GetProperty("delaysInjected").GetInt32().Should().BeGreaterThanOrEqualTo(0);
    }

    [Fact]
    public async Task ChaosModeCaseInsensitive_ShouldWork()
    {
        var response = await _client.PostAsync("/api/chaos/mode/randomfailure", null);
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("mode").GetString().Should().Be("RandomFailure");

        // Reset
        await _client.PostAsync("/api/chaos/reset", null);
    }
}
