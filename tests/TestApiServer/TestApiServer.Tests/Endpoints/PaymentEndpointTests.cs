using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using TestApiServer.Tests.Infrastructure;

namespace TestApiServer.Tests.Endpoints;

[Collection("TestApiServer")]
public class PaymentEndpointTests
{
    private readonly HttpClient _client;

    public PaymentEndpointTests(TestApiServerFixture fixture)
    {
        _client = fixture.CreateClient();
    }

    [Fact]
    public async Task GetPayment_ExistingPayment_ShouldReturnPayment()
    {
        var response = await _client.GetAsync("/api/payments/pay-101");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("paymentId").GetString().Should().Be("pay-101");
        content.GetProperty("status").GetString().Should().Be("completed");
    }

    [Fact]
    public async Task GetPayment_NonExisting_ShouldReturn404()
    {
        var response = await _client.GetAsync("/api/payments/pay-999");
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task ListPayments_ShouldReturnPayments()
    {
        var response = await _client.GetAsync("/api/payments");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("payments").GetArrayLength().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task ValidateCard_ValidCard_ShouldReturnValid()
    {
        var response = await _client.PostAsJsonAsync("/api/payments/validate-card", new
        {
            cardNumber = "4111111111111111",
            expiryMonth = 12,
            expiryYear = 2025,
            cvv = "123"
        });
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("valid").GetBoolean().Should().BeTrue();
        content.GetProperty("brand").GetString().Should().Be("visa");
        content.GetProperty("last4").GetString().Should().Be("1111");
    }

    [Fact]
    public async Task ValidateCard_InvalidCard_ShouldReturnInvalid()
    {
        var response = await _client.PostAsJsonAsync("/api/payments/validate-card", new
        {
            cardNumber = "123",
            expiryMonth = 13,
            expiryYear = 2020,
            cvv = "1"
        });
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task AuthorizePayment_ShouldAuthorize()
    {
        var response = await _client.PostAsJsonAsync("/api/payments/authorize", new
        {
            userId = "1",
            amount = 100.00m,
            paymentMethodId = "pm-1001"
        });
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("status").GetString().Should().Be("authorized");
        content.GetProperty("authorizationCode").GetString().Should().StartWith("AUTH-");
    }

    [Fact]
    public async Task CapturePayment_AuthorizedPayment_ShouldCapture()
    {
        // First authorize
        var authResponse = await _client.PostAsJsonAsync("/api/payments/authorize", new
        {
            userId = "1",
            amount = 50.00m,
            paymentMethodId = "pm-1001"
        });
        var authContent = await authResponse.Content.ReadFromJsonAsync<JsonElement>();
        var paymentId = authContent.GetProperty("paymentId").GetString();

        // Then capture
        var captureResponse = await _client.PostAsJsonAsync("/api/payments/capture", new
        {
            paymentId
        });
        captureResponse.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await captureResponse.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("status").GetString().Should().Be("completed");
    }

    [Fact]
    public async Task ListPaymentMethods_ShouldReturnMethods()
    {
        var response = await _client.GetAsync("/api/payments/methods?userId=1");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("paymentMethods").GetArrayLength().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task CreateSubscription_ShouldCreateSubscription()
    {
        var response = await _client.PostAsJsonAsync("/api/payments/subscription", new
        {
            userId = "1",
            planId = "plan-pro",
            amount = 29.99m,
            interval = "monthly"
        });
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("id").GetString().Should().StartWith("sub-");
        content.GetProperty("status").GetString().Should().Be("active");
    }

    [Fact]
    public async Task GetBalance_ShouldReturnBalance()
    {
        var response = await _client.GetAsync("/api/payments/balance?userId=1");
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("userId").GetString().Should().Be("1");
        content.TryGetProperty("available", out _).Should().BeTrue();
    }

    [Fact]
    public async Task Transfer_ShouldTransferFunds()
    {
        var response = await _client.PostAsJsonAsync("/api/payments/transfer", new
        {
            fromUserId = "1",
            toUserId = "2",
            amount = 25.00m
        });
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var content = await response.Content.ReadFromJsonAsync<JsonElement>();
        content.GetProperty("transferId").GetString().Should().StartWith("XFER-");
        content.GetProperty("status").GetString().Should().Be("completed");
    }
}
