namespace TestApiServer.Endpoints;

/// <summary>
/// Order lifecycle endpoints - create, update, fulfill, cancel, ship, invoice
/// </summary>
public static class OrderEndpoints
{
    // In-memory order store
    private static readonly Dictionary<string, OrderDetails> _orders = new()
    {
        ["ord-101"] = new OrderDetails { OrderId = "ord-101", UserId = "1", Status = "pending", Total = 150.00m, CreatedAt = DateTime.UtcNow.AddDays(-2) },
        ["ord-102"] = new OrderDetails { OrderId = "ord-102", UserId = "1", Status = "completed", Total = 300.00m, CreatedAt = DateTime.UtcNow.AddDays(-5) },
        ["ord-201"] = new OrderDetails { OrderId = "ord-201", UserId = "2", Status = "pending", Total = 99.99m, CreatedAt = DateTime.UtcNow.AddDays(-1) }
    };

    public static void MapOrderEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/orders")
            .WithTags("Orders");

        // GET /api/orders - List all orders
        group.MapGet("/", (string? status, string? userId) =>
        {
            var orders = _orders.Values.AsEnumerable();
            if (!string.IsNullOrEmpty(status))
                orders = orders.Where(o => o.Status.Equals(status, StringComparison.OrdinalIgnoreCase));
            if (!string.IsNullOrEmpty(userId))
                orders = orders.Where(o => o.UserId == userId);

            return Results.Ok(new { orders = orders.ToArray() });
        })
            .WithName("ListOrders")
            .WithOpenApi();

        // GET /api/orders/{id} - Get order details
        group.MapGet("/{id}", (string id) =>
        {
            if (!_orders.TryGetValue(id, out var order))
                return Results.NotFound(new { error = $"Order {id} not found" });

            return Results.Ok(order);
        })
            .WithName("GetOrder")
            .WithOpenApi();

        // POST /api/orders - Create new order
        group.MapPost("/", (CreateOrderRequest request) =>
        {
            var orderId = $"ord-{Guid.NewGuid():N}"[..10];
            var order = new OrderDetails
            {
                OrderId = orderId,
                UserId = request.UserId,
                Status = "created",
                Total = request.Items.Sum(i => i.Price * i.Quantity),
                Items = request.Items,
                CreatedAt = DateTime.UtcNow
            };
            _orders[orderId] = order;

            return Results.Created($"/api/orders/{orderId}", order);
        })
            .WithName("CreateOrder")
            .WithOpenApi();

        // PUT /api/orders/{id}/status - Update order status
        group.MapPut("/{id}/status", (string id, UpdateStatusRequest request) =>
        {
            if (!_orders.TryGetValue(id, out var order))
                return Results.NotFound(new { error = $"Order {id} not found" });

            var validTransitions = GetValidTransitions(order.Status);
            if (!validTransitions.Contains(request.Status.ToLowerInvariant()))
            {
                return Results.BadRequest(new
                {
                    error = $"Invalid status transition from {order.Status} to {request.Status}",
                    validTransitions
                });
            }

            order.Status = request.Status.ToLowerInvariant();
            order.UpdatedAt = DateTime.UtcNow;

            return Results.Ok(order);
        })
            .WithName("UpdateOrderStatus")
            .WithOpenApi();

        // POST /api/orders/{id}/fulfill - Mark order as fulfilled
        group.MapPost("/{id}/fulfill", (string id) =>
        {
            if (!_orders.TryGetValue(id, out var order))
                return Results.NotFound(new { error = $"Order {id} not found" });

            if (order.Status != "paid")
                return Results.BadRequest(new { error = "Order must be paid before fulfillment" });

            order.Status = "fulfilled";
            order.FulfilledAt = DateTime.UtcNow;

            return Results.Ok(new { message = "Order fulfilled", order });
        })
            .WithName("FulfillOrder")
            .WithOpenApi();

        // POST /api/orders/{id}/ship - Ship the order
        group.MapPost("/{id}/ship", (string id, ShipOrderRequest request) =>
        {
            if (!_orders.TryGetValue(id, out var order))
                return Results.NotFound(new { error = $"Order {id} not found" });

            if (order.Status != "fulfilled")
                return Results.BadRequest(new { error = "Order must be fulfilled before shipping" });

            order.Status = "shipped";
            order.ShippedAt = DateTime.UtcNow;
            order.TrackingNumber = request.TrackingNumber ?? $"TRK{Guid.NewGuid():N}"[..12].ToUpper();
            order.Carrier = request.Carrier ?? "Standard";

            return Results.Ok(new
            {
                message = "Order shipped",
                trackingNumber = order.TrackingNumber,
                carrier = order.Carrier,
                order
            });
        })
            .WithName("ShipOrder")
            .WithOpenApi();

        // POST /api/orders/{id}/cancel - Cancel the order
        group.MapPost("/{id}/cancel", (string id, CancelOrderRequest? request) =>
        {
            if (!_orders.TryGetValue(id, out var order))
                return Results.NotFound(new { error = $"Order {id} not found" });

            if (order.Status is "shipped" or "completed")
                return Results.BadRequest(new { error = "Cannot cancel shipped or completed orders" });

            order.Status = "cancelled";
            order.CancelledAt = DateTime.UtcNow;
            order.CancellationReason = request?.Reason ?? "Customer request";

            return Results.Ok(new { message = "Order cancelled", order });
        })
            .WithName("CancelOrder")
            .WithOpenApi();

        // GET /api/orders/{id}/invoice - Get order invoice
        group.MapGet("/{id}/invoice", (string id) =>
        {
            if (!_orders.TryGetValue(id, out var order))
                return Results.NotFound(new { error = $"Order {id} not found" });

            return Results.Ok(new
            {
                invoiceId = $"INV-{order.OrderId}",
                orderId = order.OrderId,
                userId = order.UserId,
                items = order.Items ?? Array.Empty<OrderItemDetails>(),
                subtotal = order.Total,
                tax = order.Total * 0.1m,
                total = order.Total * 1.1m,
                generatedAt = DateTime.UtcNow.ToString("O")
            });
        })
            .WithName("GetOrderInvoice")
            .WithOpenApi();

        // POST /api/orders/{id}/refund - Refund the order
        group.MapPost("/{id}/refund", (string id, RefundRequest request) =>
        {
            if (!_orders.TryGetValue(id, out var order))
                return Results.NotFound(new { error = $"Order {id} not found" });

            if (order.Status is not ("completed" or "shipped"))
                return Results.BadRequest(new { error = "Can only refund completed or shipped orders" });

            var refundAmount = request.Amount ?? order.Total;
            if (refundAmount > order.Total)
                return Results.BadRequest(new { error = "Refund amount exceeds order total" });

            return Results.Ok(new
            {
                refundId = $"REF-{Guid.NewGuid():N}"[..12].ToUpper(),
                orderId = order.OrderId,
                amount = refundAmount,
                reason = request.Reason ?? "Customer request",
                status = "processed",
                processedAt = DateTime.UtcNow.ToString("O")
            });
        })
            .WithName("RefundOrder")
            .WithOpenApi();

        // GET /api/orders/{id}/calculate-total - Calculate order total with tax/shipping
        group.MapGet("/{id}/calculate-total", (string id, decimal? shippingRate, decimal? taxRate) =>
        {
            if (!_orders.TryGetValue(id, out var order))
                return Results.NotFound(new { error = $"Order {id} not found" });

            var subtotal = order.Total;
            var shipping = shippingRate ?? 9.99m;
            var tax = subtotal * (taxRate ?? 0.1m);
            var total = subtotal + shipping + tax;

            return Results.Ok(new
            {
                orderId = order.OrderId,
                subtotal,
                shipping,
                taxRate = taxRate ?? 0.1m,
                tax,
                total
            });
        })
            .WithName("CalculateOrderTotal")
            .WithOpenApi();
    }

    private static string[] GetValidTransitions(string currentStatus)
    {
        return currentStatus.ToLowerInvariant() switch
        {
            "created" => ["pending", "cancelled"],
            "pending" => ["paid", "cancelled"],
            "paid" => ["fulfilled", "cancelled"],
            "fulfilled" => ["shipped"],
            "shipped" => ["completed"],
            _ => []
        };
    }
}

// Request/Response models
public class OrderDetails
{
    public string OrderId { get; set; } = "";
    public string UserId { get; set; } = "";
    public string Status { get; set; } = "";
    public decimal Total { get; set; }
    public OrderItemDetails[]? Items { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime? FulfilledAt { get; set; }
    public DateTime? ShippedAt { get; set; }
    public DateTime? CancelledAt { get; set; }
    public string? TrackingNumber { get; set; }
    public string? Carrier { get; set; }
    public string? CancellationReason { get; set; }
}

public class OrderItemDetails
{
    public string ProductId { get; set; } = "";
    public string Name { get; set; } = "";
    public int Quantity { get; set; }
    public decimal Price { get; set; }
}

public record CreateOrderRequest(string UserId, OrderItemDetails[] Items);
public record UpdateStatusRequest(string Status);
public record ShipOrderRequest(string? TrackingNumber, string? Carrier);
public record CancelOrderRequest(string? Reason);
public record RefundRequest(decimal? Amount, string? Reason);
