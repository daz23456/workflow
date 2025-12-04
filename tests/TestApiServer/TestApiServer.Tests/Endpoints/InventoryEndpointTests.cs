using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using TestApiServer.Tests.Infrastructure;

namespace TestApiServer.Tests.Endpoints;

[Collection("TestApiServer")]
public class InventoryEndpointTests
{
    private readonly HttpClient _client;

    public InventoryEndpointTests(TestApiServerFixture fixture)
    {
        _client = fixture.CreateClient();
    }

    [Fact]
    public async Task ListProducts_ShouldReturnProducts()
    {
        var response = await _client.GetAsync("/api/inventory/products");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("products").GetArrayLength().Should().Be(5);
    }

    [Fact]
    public async Task ListProducts_FilterByCategory_ShouldReturnFiltered()
    {
        var response = await _client.GetAsync("/api/inventory/products?category=widgets");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("products").GetArrayLength().Should().Be(1);
    }

    [Fact]
    public async Task ListProducts_FilterInStock_ShouldExcludeOutOfStock()
    {
        var response = await _client.GetAsync("/api/inventory/products?inStock=true");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("products").GetArrayLength().Should().Be(4); // Excludes prod-3 with stock=0
    }

    [Fact]
    public async Task GetProduct_ExistingProduct_ShouldReturnProduct()
    {
        var response = await _client.GetAsync("/api/inventory/products/prod-1");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("name").GetString().Should().Be("Widget A");
        content.GetProperty("price").GetDecimal().Should().Be(75.00m);
    }

    [Fact]
    public async Task GetStockLevel_ShouldReturnStockInfo()
    {
        var response = await _client.GetAsync("/api/inventory/stock/prod-1");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("totalStock").GetInt32().Should().Be(100);
        content.GetProperty("available").GetInt32().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task ReserveStock_SufficientStock_ShouldCreateReservation()
    {
        var response = await _client.PostAsJsonAsync("/api/inventory/reserve", new
        {
            productId = "prod-1",
            quantity = 5,
            orderId = "test-order",
            expirationMinutes = 10
        });
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("reservationId").GetString().Should().StartWith("res-");
        content.GetProperty("quantity").GetInt32().Should().Be(5);
    }

    [Fact]
    public async Task ReserveStock_InsufficientStock_ShouldReturnBadRequest()
    {
        var response = await _client.PostAsJsonAsync("/api/inventory/reserve", new
        {
            productId = "prod-3", // Has 0 stock
            quantity = 5
        });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("error").GetString().Should().Contain("Insufficient");
    }

    [Fact]
    public async Task GetPricing_BulkDiscount_ShouldApply10Percent()
    {
        var response = await _client.GetAsync("/api/inventory/pricing/prod-1?quantity=10");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("discount").GetString().Should().Contain("10");
        content.GetProperty("discountedUnitPrice").GetDecimal().Should().Be(67.50m); // 75 * 0.9
    }

    [Fact]
    public async Task BulkCheck_AllAvailable_ShouldReturnAllAvailable()
    {
        var response = await _client.PostAsJsonAsync("/api/inventory/bulk-check", new
        {
            items = new[]
            {
                new { productId = "prod-1", quantity = 5 },
                new { productId = "prod-2", quantity = 2 }
            }
        });
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("allAvailable").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task BulkCheck_SomeUnavailable_ShouldReturnFalse()
    {
        var response = await _client.PostAsJsonAsync("/api/inventory/bulk-check", new
        {
            items = new[]
            {
                new { productId = "prod-1", quantity = 5 },
                new { productId = "prod-3", quantity = 2 } // Out of stock
            }
        });
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("allAvailable").GetBoolean().Should().BeFalse();
    }
}
