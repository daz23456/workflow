using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using TestApiServer.Tests.Infrastructure;

namespace TestApiServer.Tests.Endpoints;

[Collection("TestApiServer")]
public class PrimitiveEndpointTests
{
    private readonly HttpClient _client;

    public PrimitiveEndpointTests(TestApiServerFixture fixture)
    {
        _client = fixture.CreateClient();
    }

    [Fact]
    public async Task Health_ShouldReturnHealthy()
    {
        var response = await _client.GetAsync("/health");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("status").GetString().Should().Be("healthy");
    }

    [Fact]
    public async Task GetString_ShouldReturnHello()
    {
        var response = await _client.GetAsync("/api/primitives/string");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("value").GetString().Should().Be("hello");
    }

    [Fact]
    public async Task GetInteger_ShouldReturn42()
    {
        var response = await _client.GetAsync("/api/primitives/integer");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("value").GetInt32().Should().Be(42);
    }

    [Fact]
    public async Task GetDecimal_ShouldReturnPi()
    {
        var response = await _client.GetAsync("/api/primitives/decimal");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("value").GetDouble().Should().BeApproximately(3.14159, 0.00001);
    }

    [Fact]
    public async Task GetBoolean_ShouldReturnTrue()
    {
        var response = await _client.GetAsync("/api/primitives/boolean");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("value").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task GetGuid_ShouldReturnValidGuid()
    {
        var response = await _client.GetAsync("/api/primitives/guid");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        var value = content.GetProperty("value").GetString();
        Guid.TryParse(value, out _).Should().BeTrue();
    }

    [Fact]
    public async Task GetDateTime_ShouldReturnIso8601()
    {
        var response = await _client.GetAsync("/api/primitives/datetime");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        var value = content.GetProperty("value").GetString();
        DateTime.TryParse(value, out _).Should().BeTrue();
    }

    [Fact]
    public async Task PostEcho_ShouldReturnEchoedMessage()
    {
        var response = await _client.PostAsJsonAsync("/api/primitives/echo", new { message = "test message" });
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("echo").GetString().Should().Be("test message");
        content.TryGetProperty("timestamp", out _).Should().BeTrue();
    }

    [Fact]
    public async Task GetNull_ShouldReturnNull()
    {
        var response = await _client.GetAsync("/api/primitives/null");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("value").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task GetDynamicType_Integer_ShouldReturnInteger()
    {
        var response = await _client.GetAsync("/api/primitives/integer");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        // The specific dynamic endpoint is for /api/primitives/{type}
        var dynamicResponse = await _client.GetAsync("/api/primitives/int");
        dynamicResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await dynamicResponse.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("type").GetString().Should().Be("int");
        content.GetProperty("value").GetInt32().Should().Be(123);
    }

    [Fact]
    public async Task GetDynamicType_UnknownType_ShouldReturn404()
    {
        var response = await _client.GetAsync("/api/primitives/unknown");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetOptional_WithValue_ShouldReturnProvided()
    {
        var response = await _client.GetAsync("/api/primitives/optional?value=custom");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("value").GetString().Should().Be("custom");
        content.GetProperty("provided").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task GetOptional_WithoutValue_ShouldReturnDefault()
    {
        var response = await _client.GetAsync("/api/primitives/optional");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("value").GetString().Should().Be("default");
        content.GetProperty("provided").GetBoolean().Should().BeFalse();
    }
}
