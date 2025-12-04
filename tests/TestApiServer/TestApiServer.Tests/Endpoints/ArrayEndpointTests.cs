using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using TestApiServer.Tests.Infrastructure;

namespace TestApiServer.Tests.Endpoints;

[Collection("TestApiServer")]
public class ArrayEndpointTests
{
    private readonly HttpClient _client;

    public ArrayEndpointTests(TestApiServerFixture fixture)
    {
        _client = fixture.CreateClient();
    }

    [Fact]
    public async Task GetStrings_ShouldReturnStringArray()
    {
        var response = await _client.GetAsync("/api/arrays/strings");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        var items = content.GetProperty("items");
        items.GetArrayLength().Should().Be(5);
        items[0].GetString().Should().Be("alpha");
    }

    [Fact]
    public async Task GetNumbers_ShouldReturnNumberArray()
    {
        var response = await _client.GetAsync("/api/arrays/numbers");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        var items = content.GetProperty("items");
        items.GetArrayLength().Should().Be(10);
        items[0].GetInt32().Should().Be(1);
        items[9].GetInt32().Should().Be(10);
    }

    [Fact]
    public async Task GetLarge1000_ShouldReturn1000Items()
    {
        var response = await _client.GetAsync("/api/arrays/large/1000");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("count").GetInt32().Should().Be(1000);
        content.GetProperty("items").GetArrayLength().Should().Be(1000);
    }

    [Fact]
    public async Task GetLarge10000_ShouldReturn10000Items()
    {
        var response = await _client.GetAsync("/api/arrays/large/10000");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("count").GetInt32().Should().Be(10000);
        content.GetProperty("items").GetArrayLength().Should().Be(10000);
    }

    [Fact]
    public async Task GetPaginated_DefaultParams_ShouldReturnFirstPage()
    {
        var response = await _client.GetAsync("/api/arrays/paginated");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("page").GetInt32().Should().Be(1);
        content.GetProperty("size").GetInt32().Should().Be(10);
        content.GetProperty("totalItems").GetInt32().Should().Be(100);
        content.GetProperty("totalPages").GetInt32().Should().Be(10);
        content.GetProperty("items").GetArrayLength().Should().Be(10);
    }

    [Fact]
    public async Task GetPaginated_SecondPage_ShouldReturnCorrectItems()
    {
        var response = await _client.GetAsync("/api/arrays/paginated?page=2&size=10");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("page").GetInt32().Should().Be(2);
        var items = content.GetProperty("items");
        items[0].GetProperty("id").GetInt32().Should().Be(11);
    }

    [Fact]
    public async Task GetPaginated_CustomSize_ShouldReturnCorrectPageCount()
    {
        var response = await _client.GetAsync("/api/arrays/paginated?page=1&size=25");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("size").GetInt32().Should().Be(25);
        content.GetProperty("totalPages").GetInt32().Should().Be(4);
        content.GetProperty("items").GetArrayLength().Should().Be(25);
    }
}
