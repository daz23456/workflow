namespace TestApiServer.Endpoints;

/// <summary>
/// Payment processing endpoints - process, refund, validate, auth/capture flow
/// </summary>
public static class PaymentEndpoints
{
    // In-memory payment store
    private static readonly Dictionary<string, PaymentDetails> _payments = new()
    {
        ["pay-101"] = new PaymentDetails { PaymentId = "pay-101", UserId = "1", Amount = 150.00m, Status = "completed", Method = "card", CreatedAt = DateTime.UtcNow.AddDays(-2) },
        ["pay-102"] = new PaymentDetails { PaymentId = "pay-102", UserId = "1", Amount = 300.00m, Status = "refunded", Method = "card", CreatedAt = DateTime.UtcNow.AddDays(-5) },
        ["pay-201"] = new PaymentDetails { PaymentId = "pay-201", UserId = "2", Amount = 99.99m, Status = "authorized", Method = "card", CreatedAt = DateTime.UtcNow.AddDays(-1) }
    };

    private static readonly Dictionary<string, PaymentMethodDetails> _paymentMethods = new()
    {
        ["pm-1001"] = new PaymentMethodDetails { Id = "pm-1001", UserId = "1", Type = "card", Last4 = "4242", Brand = "visa", ExpiryMonth = 12, ExpiryYear = 2025 },
        ["pm-1002"] = new PaymentMethodDetails { Id = "pm-1002", UserId = "1", Type = "card", Last4 = "5555", Brand = "mastercard", ExpiryMonth = 6, ExpiryYear = 2026 },
        ["pm-2001"] = new PaymentMethodDetails { Id = "pm-2001", UserId = "2", Type = "bank_account", Last4 = "6789", Brand = "ach", ExpiryMonth = 0, ExpiryYear = 0 }
    };

    private static readonly Dictionary<string, SubscriptionDetails> _subscriptions = new()
    {
        ["sub-101"] = new SubscriptionDetails { Id = "sub-101", UserId = "1", PlanId = "plan-pro", Status = "active", Amount = 29.99m, Interval = "monthly", CurrentPeriodEnd = DateTime.UtcNow.AddMonths(1) }
    };

    public static void MapPaymentEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/payments")
            .WithTags("Payments");

        // GET /api/payments/{id} - Get payment details
        group.MapGet("/{id}", (string id) =>
        {
            if (!_payments.TryGetValue(id, out var payment))
                return Results.NotFound(new { error = $"Payment {id} not found" });

            return Results.Ok(payment);
        })
            .WithName("GetPayment")
            .WithOpenApi();

        // GET /api/payments - List payments
        group.MapGet("/", (string? userId, string? status) =>
        {
            var payments = _payments.Values.AsEnumerable();
            if (!string.IsNullOrEmpty(userId))
                payments = payments.Where(p => p.UserId == userId);
            if (!string.IsNullOrEmpty(status))
                payments = payments.Where(p => p.Status.Equals(status, StringComparison.OrdinalIgnoreCase));

            return Results.Ok(new { payments = payments.ToArray() });
        })
            .WithName("ListPayments")
            .WithOpenApi();

        // POST /api/payments/refund - Refund a payment
        group.MapPost("/refund", (RefundPaymentRequest request) =>
        {
            if (!_payments.TryGetValue(request.PaymentId, out var payment))
                return Results.NotFound(new { error = $"Payment {request.PaymentId} not found" });

            if (payment.Status != "completed")
                return Results.BadRequest(new { error = "Can only refund completed payments" });

            var refundAmount = request.Amount ?? payment.Amount;
            if (refundAmount > payment.Amount)
                return Results.BadRequest(new { error = "Refund amount exceeds payment amount" });

            return Results.Ok(new
            {
                refundId = $"ref-{Guid.NewGuid():N}"[..12].ToUpper(),
                paymentId = payment.PaymentId,
                amount = refundAmount,
                status = "processed",
                processedAt = DateTime.UtcNow.ToString("O")
            });
        })
            .WithName("RefundPayment")
            .WithOpenApi();

        // POST /api/payments/validate-card - Validate card details
        group.MapPost("/validate-card", (ValidateCardRequest request) =>
        {
            // Simulate card validation
            var isValid = request.CardNumber.Length >= 13 &&
                          request.ExpiryMonth >= 1 && request.ExpiryMonth <= 12 &&
                          request.ExpiryYear >= DateTime.UtcNow.Year &&
                          request.Cvv.Length >= 3;

            if (!isValid)
            {
                return Results.BadRequest(new
                {
                    valid = false,
                    errors = new[] { "Invalid card details" }
                });
            }

            var brand = request.CardNumber[0] switch
            {
                '4' => "visa",
                '5' => "mastercard",
                '3' => "amex",
                _ => "unknown"
            };

            return Results.Ok(new
            {
                valid = true,
                brand,
                last4 = request.CardNumber[^4..],
                expiryMonth = request.ExpiryMonth,
                expiryYear = request.ExpiryYear
            });
        })
            .WithName("ValidateCard")
            .WithOpenApi();

        // POST /api/payments/authorize - Authorize payment (hold funds)
        group.MapPost("/authorize", (AuthorizePaymentRequest request) =>
        {
            var paymentId = $"pay-{Guid.NewGuid():N}"[..10];
            var payment = new PaymentDetails
            {
                PaymentId = paymentId,
                UserId = request.UserId,
                Amount = request.Amount,
                Status = "authorized",
                Method = request.PaymentMethodId,
                AuthorizationCode = $"AUTH-{Guid.NewGuid():N}"[..12].ToUpper(),
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(7) // Authorization expires in 7 days
            };
            _payments[paymentId] = payment;

            return Results.Ok(new
            {
                paymentId,
                status = "authorized",
                authorizationCode = payment.AuthorizationCode,
                amount = request.Amount,
                expiresAt = payment.ExpiresAt?.ToString("O")
            });
        })
            .WithName("AuthorizePayment")
            .WithOpenApi();

        // POST /api/payments/capture - Capture authorized payment
        group.MapPost("/capture", (CapturePaymentRequest request) =>
        {
            if (!_payments.TryGetValue(request.PaymentId, out var payment))
                return Results.NotFound(new { error = $"Payment {request.PaymentId} not found" });

            if (payment.Status != "authorized")
                return Results.BadRequest(new { error = "Payment is not in authorized state" });

            if (payment.ExpiresAt < DateTime.UtcNow)
                return Results.BadRequest(new { error = "Authorization has expired" });

            var captureAmount = request.Amount ?? payment.Amount;
            if (captureAmount > payment.Amount)
                return Results.BadRequest(new { error = "Capture amount exceeds authorized amount" });

            payment.Status = "completed";
            payment.CapturedAmount = captureAmount;
            payment.CapturedAt = DateTime.UtcNow;

            return Results.Ok(new
            {
                paymentId = payment.PaymentId,
                status = "completed",
                capturedAmount = captureAmount,
                capturedAt = payment.CapturedAt?.ToString("O")
            });
        })
            .WithName("CapturePayment")
            .WithOpenApi();

        // POST /api/payments/void - Void authorization
        group.MapPost("/void", (VoidPaymentRequest request) =>
        {
            if (!_payments.TryGetValue(request.PaymentId, out var payment))
                return Results.NotFound(new { error = $"Payment {request.PaymentId} not found" });

            if (payment.Status != "authorized")
                return Results.BadRequest(new { error = "Can only void authorized payments" });

            payment.Status = "voided";
            payment.VoidedAt = DateTime.UtcNow;

            return Results.Ok(new
            {
                paymentId = payment.PaymentId,
                status = "voided",
                voidedAt = payment.VoidedAt?.ToString("O")
            });
        })
            .WithName("VoidPayment")
            .WithOpenApi();

        // GET /api/payments/methods - List payment methods
        group.MapGet("/methods", (string? userId) =>
        {
            var methods = _paymentMethods.Values.AsEnumerable();
            if (!string.IsNullOrEmpty(userId))
                methods = methods.Where(m => m.UserId == userId);

            return Results.Ok(new { paymentMethods = methods.ToArray() });
        })
            .WithName("ListPaymentMethods")
            .WithOpenApi();

        // POST /api/payments/methods - Add payment method
        group.MapPost("/methods", (AddPaymentMethodRequest request) =>
        {
            var methodId = $"pm-{Guid.NewGuid():N}"[..8];
            var method = new PaymentMethodDetails
            {
                Id = methodId,
                UserId = request.UserId,
                Type = request.Type,
                Last4 = request.Last4,
                Brand = request.Brand,
                ExpiryMonth = request.ExpiryMonth,
                ExpiryYear = request.ExpiryYear
            };
            _paymentMethods[methodId] = method;

            return Results.Created($"/api/payments/methods/{methodId}", method);
        })
            .WithName("AddPaymentMethod")
            .WithOpenApi();

        // DELETE /api/payments/methods/{id} - Remove payment method
        group.MapDelete("/methods/{id}", (string id) =>
        {
            if (!_paymentMethods.Remove(id))
                return Results.NotFound(new { error = $"Payment method {id} not found" });

            return Results.Ok(new { message = "Payment method removed", id });
        })
            .WithName("RemovePaymentMethod")
            .WithOpenApi();

        // POST /api/payments/subscription - Create subscription
        group.MapPost("/subscription", (CreateSubscriptionRequest request) =>
        {
            var subscriptionId = $"sub-{Guid.NewGuid():N}"[..8];
            var subscription = new SubscriptionDetails
            {
                Id = subscriptionId,
                UserId = request.UserId,
                PlanId = request.PlanId,
                Status = "active",
                Amount = request.Amount,
                Interval = request.Interval,
                CurrentPeriodStart = DateTime.UtcNow,
                CurrentPeriodEnd = request.Interval == "monthly"
                    ? DateTime.UtcNow.AddMonths(1)
                    : DateTime.UtcNow.AddYears(1)
            };
            _subscriptions[subscriptionId] = subscription;

            return Results.Created($"/api/payments/subscription/{subscriptionId}", subscription);
        })
            .WithName("CreateSubscription")
            .WithOpenApi();

        // GET /api/payments/subscription/{id} - Get subscription
        group.MapGet("/subscription/{id}", (string id) =>
        {
            if (!_subscriptions.TryGetValue(id, out var subscription))
                return Results.NotFound(new { error = $"Subscription {id} not found" });

            return Results.Ok(subscription);
        })
            .WithName("GetSubscription")
            .WithOpenApi();

        // DELETE /api/payments/subscription/{id} - Cancel subscription
        group.MapDelete("/subscription/{id}", (string id) =>
        {
            if (!_subscriptions.TryGetValue(id, out var subscription))
                return Results.NotFound(new { error = $"Subscription {id} not found" });

            subscription.Status = "cancelled";
            subscription.CancelledAt = DateTime.UtcNow;

            return Results.Ok(new { message = "Subscription cancelled", subscription });
        })
            .WithName("CancelSubscription")
            .WithOpenApi();

        // GET /api/payments/transactions - List transactions
        group.MapGet("/transactions", (string? userId, DateTime? from, DateTime? to) =>
        {
            var payments = _payments.Values.AsEnumerable();
            if (!string.IsNullOrEmpty(userId))
                payments = payments.Where(p => p.UserId == userId);
            if (from.HasValue)
                payments = payments.Where(p => p.CreatedAt >= from.Value);
            if (to.HasValue)
                payments = payments.Where(p => p.CreatedAt <= to.Value);

            var transactions = payments.Select(p => new
            {
                transactionId = p.PaymentId,
                type = p.Status == "refunded" ? "refund" : "payment",
                amount = p.Amount,
                status = p.Status,
                createdAt = p.CreatedAt.ToString("O")
            }).ToArray();

            return Results.Ok(new { transactions });
        })
            .WithName("ListTransactions")
            .WithOpenApi();

        // GET /api/payments/balance - Get balance
        group.MapGet("/balance", (string userId) =>
        {
            var payments = _payments.Values.Where(p => p.UserId == userId);
            var completed = payments.Where(p => p.Status == "completed").Sum(p => p.Amount);
            var refunded = payments.Where(p => p.Status == "refunded").Sum(p => p.Amount);
            var authorized = payments.Where(p => p.Status == "authorized").Sum(p => p.Amount);

            return Results.Ok(new
            {
                userId,
                available = completed - refunded,
                pending = authorized,
                total = completed + authorized - refunded
            });
        })
            .WithName("GetBalance")
            .WithOpenApi();

        // POST /api/payments/transfer - Transfer funds
        group.MapPost("/transfer", (TransferRequest request) =>
        {
            var transferId = $"xfer-{Guid.NewGuid():N}"[..12].ToUpper();

            return Results.Ok(new
            {
                transferId,
                fromUserId = request.FromUserId,
                toUserId = request.ToUserId,
                amount = request.Amount,
                status = "completed",
                completedAt = DateTime.UtcNow.ToString("O")
            });
        })
            .WithName("TransferFunds")
            .WithOpenApi();
    }
}

// Payment models
public class PaymentDetails
{
    public string PaymentId { get; set; } = "";
    public string UserId { get; set; } = "";
    public decimal Amount { get; set; }
    public string Status { get; set; } = "";
    public string Method { get; set; } = "";
    public string? AuthorizationCode { get; set; }
    public decimal? CapturedAmount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime? CapturedAt { get; set; }
    public DateTime? VoidedAt { get; set; }
}

public class PaymentMethodDetails
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public string Type { get; set; } = "";
    public string Last4 { get; set; } = "";
    public string Brand { get; set; } = "";
    public int ExpiryMonth { get; set; }
    public int ExpiryYear { get; set; }
}

public class SubscriptionDetails
{
    public string Id { get; set; } = "";
    public string UserId { get; set; } = "";
    public string PlanId { get; set; } = "";
    public string Status { get; set; } = "";
    public decimal Amount { get; set; }
    public string Interval { get; set; } = "";
    public DateTime CurrentPeriodStart { get; set; }
    public DateTime CurrentPeriodEnd { get; set; }
    public DateTime? CancelledAt { get; set; }
}

public record RefundPaymentRequest(string PaymentId, decimal? Amount, string? Reason);
public record ValidateCardRequest(string CardNumber, int ExpiryMonth, int ExpiryYear, string Cvv);
public record AuthorizePaymentRequest(string UserId, decimal Amount, string PaymentMethodId);
public record CapturePaymentRequest(string PaymentId, decimal? Amount);
public record VoidPaymentRequest(string PaymentId);
public record AddPaymentMethodRequest(string UserId, string Type, string Last4, string Brand, int ExpiryMonth, int ExpiryYear);
public record CreateSubscriptionRequest(string UserId, string PlanId, decimal Amount, string Interval);
public record TransferRequest(string FromUserId, string ToUserId, decimal Amount);
