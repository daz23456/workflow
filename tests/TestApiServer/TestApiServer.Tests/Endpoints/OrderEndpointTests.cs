using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using TestApiServer.Tests.Infrastructure;

namespace TestApiServer.Tests.Endpoints;

[Collection("TestApiServer")]
public class OrderEndpointTests
{
    private readonly HttpClient _client;

    public OrderEndpointTests(TestApiServerFixture fixture)
    {
        _client = fixture.CreateClient();
    }

    [Fact]
    public async Task ListOrders_ShouldReturnOrders()
    {
        var response = await _client.GetAsync("/api/orders");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("orders").GetArrayLength().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task GetOrder_ExistingOrder_ShouldReturnOrder()
    {
        var response = await _client.GetAsync("/api/orders/ord-101");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("orderId").GetString().Should().Be("ord-101");
    }

    [Fact]
    public async Task GetOrder_NonExistingOrder_ShouldReturn404()
    {
        var response = await _client.GetAsync("/api/orders/ord-999");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task CreateOrder_ShouldCreateNewOrder()
    {
        var response = await _client.PostAsJsonAsync("/api/orders", new
        {
            userId = "1",
            items = new[]
            {
                new { productId = "prod-1", name = "Widget", quantity = 2, price = 50.00 }
            }
        });
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("orderId").GetString().Should().StartWith("ord-");
        content.GetProperty("status").GetString().Should().Be("created");
    }

    [Fact]
    public async Task GetOrderInvoice_ShouldReturnInvoice()
    {
        var response = await _client.GetAsync("/api/orders/ord-101/invoice");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("invoiceId").GetString().Should().Be("INV-ord-101");
        content.GetProperty("subtotal").GetDecimal().Should().Be(150.00m);
    }

    [Fact]
    public async Task CalculateOrderTotal_ShouldIncludeTaxAndShipping()
    {
        var response = await _client.GetAsync("/api/orders/ord-101/calculate-total");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("subtotal").GetDecimal().Should().Be(150.00m);
        content.GetProperty("shipping").GetDecimal().Should().Be(9.99m);
        content.GetProperty("tax").GetDecimal().Should().Be(15.00m);
        content.GetProperty("total").GetDecimal().Should().Be(174.99m);
    }
}
