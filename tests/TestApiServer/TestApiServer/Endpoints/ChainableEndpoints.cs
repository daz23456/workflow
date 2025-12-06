namespace TestApiServer.Endpoints;

/// <summary>
/// Chainable domain endpoints - designed to chain together in workflows with transforms
/// User -> Orders -> Inventory -> Payments -> Notifications
/// </summary>
public static class ChainableEndpoints
{
    // In-memory data store for demo
    private static readonly Dictionary<string, User> _users = new()
    {
        ["1"] = new User { Id = "1", Name = "Alice Smith", Email = "alice@example.com", CreditLimit = 5000, Tier = "gold" },
        ["2"] = new User { Id = "2", Name = "Bob Jones", Email = "bob@example.com", CreditLimit = 2000, Tier = "silver" },
        ["3"] = new User { Id = "3", Name = "Charlie Brown", Email = "charlie@example.com", CreditLimit = 10000, Tier = "platinum" }
    };

    private static readonly Dictionary<string, List<Order>> _orders = new()
    {
        ["1"] = new List<Order>
        {
            new() { OrderId = "ord-101", Total = 150.00m, Status = "pending", Items = new[] { new OrderItem { ProductId = "prod-1", Quantity = 2, Price = 75.00m } } },
            new() { OrderId = "ord-102", Total = 300.00m, Status = "completed", Items = new[] { new OrderItem { ProductId = "prod-2", Quantity = 1, Price = 300.00m } } }
        },
        ["2"] = new List<Order>
        {
            new() { OrderId = "ord-201", Total = 99.99m, Status = "pending", Items = new[] { new OrderItem { ProductId = "prod-3", Quantity = 3, Price = 33.33m } } }
        },
        ["3"] = new List<Order>()
    };

    private static readonly Dictionary<string, Product> _products = new()
    {
        ["prod-1"] = new Product { Id = "prod-1", Name = "Widget A", Price = 75.00m, AvailableQuantity = 100 },
        ["prod-2"] = new Product { Id = "prod-2", Name = "Gadget B", Price = 300.00m, AvailableQuantity = 25 },
        ["prod-3"] = new Product { Id = "prod-3", Name = "Gizmo C", Price = 33.33m, AvailableQuantity = 0 },
        ["prod-4"] = new Product { Id = "prod-4", Name = "Device D", Price = 199.99m, AvailableQuantity = 50 }
    };

    public static void MapChainableEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api")
            .WithTags("Chainable");

        // 16. GET /api/users/{id}
        group.MapGet("/users/{id}", (string id) =>
        {
            if (!_users.TryGetValue(id, out var user))
                return Results.NotFound(new { error = $"User {id} not found" });

            return Results.Ok(user);
        })
            .WithName("GetUser")
            .Produces<User>()
            .Produces(StatusCodes.Status404NotFound)
            .WithOpenApi();

        // 17. GET /api/users/{id}/orders
        group.MapGet("/users/{id}/orders", (string id) =>
        {
            if (!_users.ContainsKey(id))
                return Results.NotFound(new { error = $"User {id} not found" });

            var orders = _orders.GetValueOrDefault(id, new List<Order>());
            return Results.Ok(new GetUserOrdersResponse { Orders = orders.ToArray() });
        })
            .WithName("GetUserOrders")
            .Produces<GetUserOrdersResponse>()
            .Produces(StatusCodes.Status404NotFound)
            .WithOpenApi();

        // 18. POST /api/inventory/check
        group.MapPost("/inventory/check", (InventoryCheckRequest request) =>
        {
            var available = new List<ProductAvailability>();
            var unavailable = new List<ProductAvailability>();

            foreach (var productId in request.ProductIds)
            {
                if (_products.TryGetValue(productId, out var product))
                {
                    var availability = new ProductAvailability
                    {
                        Id = product.Id,
                        Quantity = product.AvailableQuantity,
                        Price = product.Price
                    };

                    if (product.AvailableQuantity > 0)
                        available.Add(availability);
                    else
                        unavailable.Add(availability);
                }
            }

            return Results.Ok(new InventoryCheckResponse
            {
                Available = available.ToArray(),
                Unavailable = unavailable.ToArray()
            });
        })
            .WithName("CheckInventory")
            .Produces<InventoryCheckResponse>()
            .WithOpenApi();

        // 19. POST /api/payments/process
        group.MapPost("/payments/process", (PaymentRequest request) =>
        {
            if (!_users.ContainsKey(request.UserId))
                return Results.NotFound(new { error = $"User {request.UserId} not found" });

            var user = _users[request.UserId];
            if (request.Amount > user.CreditLimit)
            {
                return Results.BadRequest(new PaymentErrorResponse
                {
                    Error = "Insufficient credit",
                    CreditLimit = user.CreditLimit,
                    RequestedAmount = request.Amount
                });
            }

            return Results.Ok(new PaymentResponse
            {
                TransactionId = $"txn-{Guid.NewGuid():N}",
                Status = "approved",
                Timestamp = DateTime.UtcNow.ToString("O")
            });
        })
            .WithName("ProcessPayment")
            .Produces<PaymentResponse>()
            .Produces<PaymentErrorResponse>(StatusCodes.Status400BadRequest)
            .Produces(StatusCodes.Status404NotFound)
            .WithOpenApi();

        // 20. POST /api/notifications/send
        group.MapPost("/notifications/send", (NotificationRequest request) =>
        {
            if (!_users.ContainsKey(request.UserId))
                return Results.NotFound(new { error = $"User {request.UserId} not found" });

            return Results.Ok(new SendNotificationResponse
            {
                NotificationId = $"notif-{Guid.NewGuid():N}",
                Sent = true,
                Channel = "email",
                Recipient = _users[request.UserId].Email
            });
        })
            .WithName("SendNotification")
            .Produces<SendNotificationResponse>()
            .Produces(StatusCodes.Status404NotFound)
            .WithOpenApi();
    }
}

// Models for chainable endpoints
public class User
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public decimal CreditLimit { get; set; }
    public string Tier { get; set; } = "";
}

public class Order
{
    public string OrderId { get; set; } = "";
    public decimal Total { get; set; }
    public string Status { get; set; } = "";
    public OrderItem[] Items { get; set; } = Array.Empty<OrderItem>();
}

public class OrderItem
{
    public string ProductId { get; set; } = "";
    public int Quantity { get; set; }
    public decimal Price { get; set; }
}

public class Product
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public decimal Price { get; set; }
    public int AvailableQuantity { get; set; }
}

public class ProductAvailability
{
    public string Id { get; set; } = "";
    public int Quantity { get; set; }
    public decimal Price { get; set; }
}

public record InventoryCheckRequest(string[] ProductIds);
public record PaymentRequest(string UserId, decimal Amount, string OrderId);
public record NotificationRequest(string UserId, string Type, string Message);

// Response models for OpenAPI documentation
public class GetUserOrdersResponse
{
    public Order[] Orders { get; set; } = Array.Empty<Order>();
}

public class InventoryCheckResponse
{
    public ProductAvailability[] Available { get; set; } = Array.Empty<ProductAvailability>();
    public ProductAvailability[] Unavailable { get; set; } = Array.Empty<ProductAvailability>();
}

public class PaymentResponse
{
    public string TransactionId { get; set; } = "";
    public string Status { get; set; } = "";
    public string Timestamp { get; set; } = "";
}

public class PaymentErrorResponse
{
    public string Error { get; set; } = "";
    public decimal CreditLimit { get; set; }
    public decimal RequestedAmount { get; set; }
}

public class SendNotificationResponse
{
    public string NotificationId { get; set; } = "";
    public bool Sent { get; set; }
    public string Channel { get; set; } = "";
    public string Recipient { get; set; } = "";
}
