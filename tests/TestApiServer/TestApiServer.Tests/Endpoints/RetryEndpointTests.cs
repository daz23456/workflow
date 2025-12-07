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

    [Theory]
    [InlineData(400, HttpStatusCode.BadRequest, "Bad Request")]
    [InlineData(401, HttpStatusCode.Unauthorized, "Unauthorized")]
    [InlineData(403, HttpStatusCode.Forbidden, "Forbidden")]
    [InlineData(404, HttpStatusCode.NotFound, "Not Found")]
    [InlineData(408, HttpStatusCode.RequestTimeout, "Request Timeout")]
    [InlineData(429, HttpStatusCode.TooManyRequests, "Too Many Requests")]
    [InlineData(500, HttpStatusCode.InternalServerError, "Internal Server Error")]
    [InlineData(502, HttpStatusCode.BadGateway, "Bad Gateway")]
    [InlineData(503, HttpStatusCode.ServiceUnavailable, "Service Unavailable")]
    [InlineData(504, HttpStatusCode.GatewayTimeout, "Gateway Timeout")]
    public async Task ErrorSimulation_AllStatusCodes_ShouldReturnCorrectStatusCode(
        int statusCode,
        HttpStatusCode expectedStatus,
        string expectedTitle)
    {
        var response = await _client.PostAsJsonAsync($"/api/retry/error/{statusCode}", new { });
        response.StatusCode.Should().Be(expectedStatus);

        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain(expectedTitle);
    }

    [Fact]
    public async Task ErrorSimulation_WithCustomMessage_ShouldIncludeMessage()
    {
        var response = await _client.PostAsJsonAsync("/api/retry/error/500", new
        {
            message = "Custom error message",
            title = "Custom Title"
        });
        response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);

        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("Custom error message");
        content.Should().Contain("Custom Title");
    }

    [Fact]
    public async Task CircuitBreaker_ShouldFollowCircuitBreakerPattern()
    {
        var key = $"circuit-{Guid.NewGuid():N}";

        // First 2 calls fail (under threshold)
        for (int i = 0; i < 2; i++)
        {
            var response = await _client.PostAsJsonAsync("/api/retry/circuit-breaker", new
            {
                threshold = 2,
                cooldownCalls = 2,
                key
            });
            response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
        }

        // Next 2 calls fail with circuit open (503)
        for (int i = 0; i < 2; i++)
        {
            var response = await _client.PostAsJsonAsync("/api/retry/circuit-breaker", new
            {
                threshold = 2,
                cooldownCalls = 2,
                key
            });
            response.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
        }

        // After cooldown, should succeed
        var successResponse = await _client.PostAsJsonAsync("/api/retry/circuit-breaker", new
        {
            threshold = 2,
            cooldownCalls = 2,
            key
        });
        successResponse.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task DelayEndpoint_ShouldDelayResponse()
    {
        var start = DateTime.UtcNow;
        var response = await _client.GetAsync("/api/retry/delay/100");
        var elapsed = DateTime.UtcNow - start;

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        elapsed.TotalMilliseconds.Should().BeGreaterThan(90);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("actualDelayMs").GetInt32().Should().Be(100);
    }

    [Fact]
    public async Task DelayEndpoint_ShouldCapAt30Seconds()
    {
        // Request 60s but should be capped to 30s
        var response = await _client.GetAsync("/api/retry/delay/60000");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("requestedDelayMs").GetInt32().Should().Be(60000);
        content.GetProperty("actualDelayMs").GetInt32().Should().Be(30000);
    }

    [Fact]
    public async Task ResetCounters_WithKey_ShouldResetSpecificKey()
    {
        var key = $"reset-test-{Guid.NewGuid():N}";

        // Create some counter data
        await _client.PostAsJsonAsync("/api/retry/fail-once", new { key });

        // Reset specific key
        var response = await _client.PostAsJsonAsync("/api/retry/reset", new { key });
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("message").GetString().Should().Contain(key);
    }
}
