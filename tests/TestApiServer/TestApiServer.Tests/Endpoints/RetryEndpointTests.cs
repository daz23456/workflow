using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using TestApiServer.Tests.Infrastructure;

namespace TestApiServer.Tests.Endpoints;

[Collection("TestApiServer")]
public class RetryEndpointTests
{
    private readonly HttpClient _client;

    public RetryEndpointTests(TestApiServerFixture fixture)
    {
        _client = fixture.CreateClient();
    }

    [Fact]
    public async Task FailOnce_FirstCall_ShouldFail()
    {
        // Reset first
        await _client.PostAsJsonAsync("/api/retry/reset", new { key = "fail-once-test" });

        var response = await _client.PostAsJsonAsync("/api/retry/fail-once", new { key = "fail-once-test" });
        response.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
    }

    [Fact]
    public async Task FailOnce_SecondCall_ShouldSucceed()
    {
        var key = $"fail-once-{Guid.NewGuid():N}";

        // First call fails
        await _client.PostAsJsonAsync("/api/retry/fail-once", new { key });

        // Second call succeeds
        var response = await _client.PostAsJsonAsync("/api/retry/fail-once", new { key });
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("success").GetBoolean().Should().BeTrue();
        content.GetProperty("attempts").GetInt32().Should().Be(2);
    }

    [Fact]
    public async Task FailNTimes_ShouldFailNTimes()
    {
        var key = $"fail-n-{Guid.NewGuid():N}";

        // First 3 calls should fail
        for (int i = 0; i < 3; i++)
        {
            var response = await _client.PostAsJsonAsync("/api/retry/fail-n-times", new { failCount = 3, key });
            response.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        }

        // Fourth call should succeed
        var successResponse = await _client.PostAsJsonAsync("/api/retry/fail-n-times", new { failCount = 3, key });
        successResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task SlowResponse_ShouldDelayResponse()
    {
        var start = DateTime.UtcNow;
        var response = await _client.PostAsJsonAsync("/api/retry/slow", new { delayMs = 100 });
        var elapsed = DateTime.UtcNow - start;

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        elapsed.TotalMilliseconds.Should().BeGreaterThan(90);
    }

    [Fact]
    public async Task ResetCounters_ShouldResetAll()
    {
        var response = await _client.PostAsJsonAsync("/api/retry/reset", new { });
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("message").GetString().Should().Contain("reset");
    }

    [Fact]
    public async Task GetCounters_ShouldReturnCounters()
    {
        var response = await _client.GetAsync("/api/retry/counters");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.TryGetProperty("failCounters", out _).Should().BeTrue();
        content.TryGetProperty("callCounters", out _).Should().BeTrue();
    }

    [Fact]
    public async Task IntermittentFailure_WithZeroRate_ShouldAlwaysSucceed()
    {
        for (int i = 0; i < 5; i++)
        {
            var response = await _client.PostAsJsonAsync("/api/retry/intermittent", new { failureRate = 0.0 });
            response.StatusCode.Should().Be(HttpStatusCode.OK);
        }
    }

    [Fact]
    public async Task IntermittentFailure_WithFullRate_ShouldAlwaysFail()
    {
        var response = await _client.PostAsJsonAsync("/api/retry/intermittent", new { failureRate = 1.0 });
        response.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
    }

    [Fact]
    public async Task DegradedResponse_ShouldReturnDegraded()
    {
        var response = await _client.PostAsJsonAsync("/api/retry/degraded", new { delayMs = 100 });
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("degraded").GetBoolean().Should().BeTrue();
        content.GetProperty("latencyMs").GetInt32().Should().Be(100);
    }

    [Fact]
    public async Task ErrorSimulation_ShouldReturnSpecificError()
    {
        var response = await _client.PostAsJsonAsync("/api/retry/error/429", new
        {
            message = "Rate limit exceeded",
            title = "Too Many Requests"
        });
        response.StatusCode.Should().Be(HttpStatusCode.TooManyRequests);
    }

    [Fact]
    public async Task FlakyEndpoint_ShouldAlternate()
    {
        var key = $"flaky-{Guid.NewGuid():N}";

        // First call fails
        var response1 = await _client.PostAsJsonAsync("/api/retry/flaky", new { key });
        response1.StatusCode.Should().Be(HttpStatusCode.InternalServerError);

        // Second call succeeds
        var response2 = await _client.PostAsJsonAsync("/api/retry/flaky", new { key });
        response2.StatusCode.Should().Be(HttpStatusCode.OK);

        // Third call fails
        var response3 = await _client.PostAsJsonAsync("/api/retry/flaky", new { key });
        response3.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
    }
}
