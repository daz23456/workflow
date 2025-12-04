using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using TestApiServer.Tests.Infrastructure;

namespace TestApiServer.Tests.Endpoints;

[Collection("TestApiServer")]
public class ChainableEndpointTests
{
    private readonly HttpClient _client;

    public ChainableEndpointTests(TestApiServerFixture fixture)
    {
        _client = fixture.CreateClient();
    }

    [Fact]
    public async Task GetUser_ExistingUser_ShouldReturnUserDetails()
    {
        var response = await _client.GetAsync("/api/users/1");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("id").GetString().Should().Be("1");
        content.GetProperty("name").GetString().Should().Be("Alice Smith");
        content.GetProperty("email").GetString().Should().Be("alice@example.com");
        content.GetProperty("creditLimit").GetDecimal().Should().Be(5000);
        content.GetProperty("tier").GetString().Should().Be("gold");
    }

    [Fact]
    public async Task GetUser_NonExistingUser_ShouldReturn404()
    {
        var response = await _client.GetAsync("/api/users/999");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetUserOrders_ExistingUser_ShouldReturnOrders()
    {
        var response = await _client.GetAsync("/api/users/1/orders");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        var orders = content.GetProperty("orders");
        orders.GetArrayLength().Should().Be(2);

        var firstOrder = orders[0];
        firstOrder.GetProperty("orderId").GetString().Should().Be("ord-101");
        firstOrder.GetProperty("total").GetDecimal().Should().Be(150.00m);
        firstOrder.GetProperty("items").GetArrayLength().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task GetUserOrders_UserWithNoOrders_ShouldReturnEmptyArray()
    {
        var response = await _client.GetAsync("/api/users/3/orders");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("orders").GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task CheckInventory_AvailableProducts_ShouldReturnAvailable()
    {
        var response = await _client.PostAsJsonAsync("/api/inventory/check", new { productIds = new[] { "prod-1", "prod-2" } });
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("available").GetArrayLength().Should().Be(2);
        content.GetProperty("unavailable").GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task CheckInventory_UnavailableProducts_ShouldReturnUnavailable()
    {
        var response = await _client.PostAsJsonAsync("/api/inventory/check", new { productIds = new[] { "prod-3" } });
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("available").GetArrayLength().Should().Be(0);
        content.GetProperty("unavailable").GetArrayLength().Should().Be(1);
    }

    [Fact]
    public async Task CheckInventory_MixedProducts_ShouldCategorizeCorrectly()
    {
        var response = await _client.PostAsJsonAsync("/api/inventory/check", new { productIds = new[] { "prod-1", "prod-3" } });
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("available").GetArrayLength().Should().Be(1);
        content.GetProperty("unavailable").GetArrayLength().Should().Be(1);
    }

    [Fact]
    public async Task ProcessPayment_ValidPayment_ShouldReturnApproved()
    {
        var response = await _client.PostAsJsonAsync("/api/payments/process", new
        {
            userId = "1",
            amount = 100.00m,
            orderId = "ord-101"
        });
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("status").GetString().Should().Be("approved");
        content.GetProperty("transactionId").GetString().Should().StartWith("txn-");
    }

    [Fact]
    public async Task ProcessPayment_ExceedsCreditLimit_ShouldReturnBadRequest()
    {
        var response = await _client.PostAsJsonAsync("/api/payments/process", new
        {
            userId = "2",
            amount = 5000.00m, // User 2 has 2000 credit limit
            orderId = "ord-201"
        });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("error").GetString().Should().Contain("credit");
    }

    [Fact]
    public async Task ProcessPayment_NonExistingUser_ShouldReturn404()
    {
        var response = await _client.PostAsJsonAsync("/api/payments/process", new
        {
            userId = "999",
            amount = 100.00m,
            orderId = "ord-999"
        });
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task SendNotification_ValidUser_ShouldReturnSent()
    {
        var response = await _client.PostAsJsonAsync("/api/notifications/send", new
        {
            userId = "1",
            type = "order_confirmed",
            message = "Your order has been confirmed"
        });
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("sent").GetBoolean().Should().BeTrue();
        content.GetProperty("notificationId").GetString().Should().StartWith("notif-");
        content.GetProperty("recipient").GetString().Should().Be("alice@example.com");
    }

    [Fact]
    public async Task SendNotification_NonExistingUser_ShouldReturn404()
    {
        var response = await _client.PostAsJsonAsync("/api/notifications/send", new
        {
            userId = "999",
            type = "order_confirmed",
            message = "Your order has been confirmed"
        });
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    /// <summary>
    /// Tests a realistic workflow chain: Get User -> Check Credit -> Process Payment -> Send Notification
    /// </summary>
    [Fact]
    public async Task WorkflowChain_CompleteFlow_ShouldSucceed()
    {
        // Step 1: Get user
        var userResponse = await _client.GetAsync("/api/users/1");
        userResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var user = await userResponse.Content.ReadFromJsonAsync<JsonElement>();
        var creditLimit = user.GetProperty("creditLimit").GetDecimal();
        creditLimit.Should().BeGreaterThan(0);

        // Step 2: Get user orders
        var ordersResponse = await _client.GetAsync("/api/users/1/orders");
        ordersResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var ordersData = await ordersResponse.Content.ReadFromJsonAsync<JsonElement>();
        var orders = ordersData.GetProperty("orders");
        orders.GetArrayLength().Should().BeGreaterThan(0);

        var firstOrder = orders[0];
        var orderId = firstOrder.GetProperty("orderId").GetString();
        var total = firstOrder.GetProperty("total").GetDecimal();

        // Step 3: Process payment (if under credit limit)
        total.Should().BeLessThanOrEqualTo(creditLimit);
        var paymentResponse = await _client.PostAsJsonAsync("/api/payments/process", new
        {
            userId = "1",
            amount = total,
            orderId
        });
        paymentResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var payment = await paymentResponse.Content.ReadFromJsonAsync<JsonElement>();
        var transactionId = payment.GetProperty("transactionId").GetString();
        transactionId.Should().NotBeNullOrEmpty();

        // Step 4: Send notification
        var notifResponse = await _client.PostAsJsonAsync("/api/notifications/send", new
        {
            userId = "1",
            type = "payment_processed",
            message = $"Payment processed. Transaction: {transactionId}"
        });
        notifResponse.StatusCode.Should().Be(HttpStatusCode.OK);
        var notif = await notifResponse.Content.ReadFromJsonAsync<JsonElement>();
        notif.GetProperty("sent").GetBoolean().Should().BeTrue();
    }
}
