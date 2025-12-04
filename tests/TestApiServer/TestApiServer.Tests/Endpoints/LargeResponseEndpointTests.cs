using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using TestApiServer.Tests.Infrastructure;

namespace TestApiServer.Tests.Endpoints;

[Collection("TestApiServer")]
public class LargeResponseEndpointTests
{
    private readonly HttpClient _client;

    public LargeResponseEndpointTests(TestApiServerFixture fixture)
    {
        _client = fixture.CreateClient();
    }

    [Fact]
    public async Task GetLarge100KB_ShouldReturnApproximately100KB()
    {
        var response = await _client.GetAsync("/api/large/100kb");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("metadata").GetProperty("sizeBytes").GetInt32().Should().Be(100 * 1024);
        content.GetProperty("records").GetArrayLength().Should().BeGreaterThan(100);
    }

    [Fact]
    public async Task GetLarge500KB_ShouldReturnApproximately500KB()
    {
        var response = await _client.GetAsync("/api/large/500kb");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("metadata").GetProperty("sizeBytes").GetInt32().Should().Be(500 * 1024);
    }

    [Fact]
    public async Task GetLarge1MB_ShouldReturnApproximately1MB()
    {
        var response = await _client.GetAsync("/api/large/1mb");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("metadata").GetProperty("sizeBytes").GetInt32().Should().Be(1024 * 1024);
    }

    [Fact]
    public async Task GetLarge5MB_ShouldReturnApproximately5MB()
    {
        var response = await _client.GetAsync("/api/large/5mb");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("metadata").GetProperty("sizeBytes").GetInt32().Should().Be(5 * 1024 * 1024);
    }

    [Fact]
    public async Task GetLargeCustom_ValidSize_ShouldReturnRequestedSize()
    {
        var response = await _client.GetAsync("/api/large/custom?sizeKb=200");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("metadata").GetProperty("sizeBytes").GetInt32().Should().Be(200 * 1024);
    }

    [Fact]
    public async Task GetLargeCustom_TooSmall_ShouldReturnBadRequest()
    {
        var response = await _client.GetAsync("/api/large/custom?sizeKb=0");
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetLargeCustom_TooLarge_ShouldReturnBadRequest()
    {
        var response = await _client.GetAsync("/api/large/custom?sizeKb=20000");
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetLarge_ResponseStructure_ShouldHaveNestedData()
    {
        var response = await _client.GetAsync("/api/large/100kb");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();

        // Verify nested structure
        var firstRecord = content.GetProperty("records")[0];
        firstRecord.GetProperty("id").GetString().Should().NotBeNullOrEmpty();
        firstRecord.GetProperty("timestamp").GetString().Should().NotBeNullOrEmpty();

        var payload = firstRecord.GetProperty("payload");
        payload.GetProperty("field1").GetString().Should().NotBeNullOrEmpty();
        payload.GetProperty("field2").GetInt32().Should().BeGreaterThanOrEqualTo(0);

        var nested = payload.GetProperty("nested");
        nested.GetProperty("deep").GetProperty("data").GetString().Should().NotBeNullOrEmpty();
    }
}
