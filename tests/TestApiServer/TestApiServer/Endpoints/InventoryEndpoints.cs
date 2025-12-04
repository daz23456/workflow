namespace TestApiServer.Endpoints;

/// <summary>
/// Inventory management endpoints - catalog, stock, reservations, pricing
/// </summary>
public static class InventoryEndpoints
{
    // In-memory product catalog
    private static readonly Dictionary<string, ProductDetails> _products = new()
    {
        ["prod-1"] = new ProductDetails { Id = "prod-1", Name = "Widget A", Sku = "WGT-A-001", Price = 75.00m, Stock = 100, Category = "widgets" },
        ["prod-2"] = new ProductDetails { Id = "prod-2", Name = "Gadget B", Sku = "GDT-B-002", Price = 300.00m, Stock = 25, Category = "gadgets" },
        ["prod-3"] = new ProductDetails { Id = "prod-3", Name = "Gizmo C", Sku = "GZM-C-003", Price = 33.33m, Stock = 0, Category = "gizmos" },
        ["prod-4"] = new ProductDetails { Id = "prod-4", Name = "Device D", Sku = "DVC-D-004", Price = 199.99m, Stock = 50, Category = "devices" },
        ["prod-5"] = new ProductDetails { Id = "prod-5", Name = "Tool E", Sku = "TL-E-005", Price = 49.99m, Stock = 200, Category = "tools" }
    };

    private static readonly Dictionary<string, Reservation> _reservations = new();

    public static void MapInventoryEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/inventory")
            .WithTags("Inventory");

        // GET /api/inventory/products - List all products
        group.MapGet("/products", (string? category, bool? inStock) =>
        {
            var products = _products.Values.AsEnumerable();
            if (!string.IsNullOrEmpty(category))
                products = products.Where(p => p.Category.Equals(category, StringComparison.OrdinalIgnoreCase));
            if (inStock == true)
                products = products.Where(p => p.Stock > 0);

            return Results.Ok(new { products = products.ToArray() });
        })
            .WithName("ListProducts")
            .WithOpenApi();

        // GET /api/inventory/products/{id} - Get product details
        group.MapGet("/products/{id}", (string id) =>
        {
            if (!_products.TryGetValue(id, out var product))
                return Results.NotFound(new { error = $"Product {id} not found" });

            return Results.Ok(product);
        })
            .WithName("GetProduct")
            .WithOpenApi();

        // GET /api/inventory/stock/{id} - Get stock level
        group.MapGet("/stock/{id}", (string id) =>
        {
            if (!_products.TryGetValue(id, out var product))
                return Results.NotFound(new { error = $"Product {id} not found" });

            var reserved = _reservations.Values
                .Where(r => r.ProductId == id && r.ExpiresAt > DateTime.UtcNow)
                .Sum(r => r.Quantity);

            return Results.Ok(new
            {
                productId = id,
                totalStock = product.Stock,
                reserved,
                available = product.Stock - reserved,
                lastUpdated = DateTime.UtcNow.ToString("O")
            });
        })
            .WithName("GetStockLevel")
            .WithOpenApi();

        // POST /api/inventory/reserve - Reserve stock
        group.MapPost("/reserve", (ReserveStockRequest request) =>
        {
            if (!_products.TryGetValue(request.ProductId, out var product))
                return Results.NotFound(new { error = $"Product {request.ProductId} not found" });

            var currentReserved = _reservations.Values
                .Where(r => r.ProductId == request.ProductId && r.ExpiresAt > DateTime.UtcNow)
                .Sum(r => r.Quantity);

            var available = product.Stock - currentReserved;
            if (request.Quantity > available)
            {
                return Results.BadRequest(new
                {
                    error = "Insufficient stock",
                    requested = request.Quantity,
                    available
                });
            }

            var reservationId = $"res-{Guid.NewGuid():N}"[..12];
            var reservation = new Reservation
            {
                ReservationId = reservationId,
                ProductId = request.ProductId,
                Quantity = request.Quantity,
                OrderId = request.OrderId,
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddMinutes(request.ExpirationMinutes ?? 15)
            };
            _reservations[reservationId] = reservation;

            return Results.Ok(new
            {
                reservationId,
                productId = request.ProductId,
                quantity = request.Quantity,
                expiresAt = reservation.ExpiresAt.ToString("O")
            });
        })
            .WithName("ReserveStock")
            .WithOpenApi();

        // DELETE /api/inventory/reserve/{id} - Release reservation
        group.MapDelete("/reserve/{id}", (string id) =>
        {
            if (!_reservations.TryGetValue(id, out var reservation))
                return Results.NotFound(new { error = $"Reservation {id} not found" });

            _reservations.Remove(id);
            return Results.Ok(new { message = "Reservation released", reservationId = id });
        })
            .WithName("ReleaseReservation")
            .WithOpenApi();

        // POST /api/inventory/adjust - Adjust stock level
        group.MapPost("/adjust", (AdjustStockRequest request) =>
        {
            if (!_products.TryGetValue(request.ProductId, out var product))
                return Results.NotFound(new { error = $"Product {request.ProductId} not found" });

            var previousStock = product.Stock;
            product.Stock += request.Adjustment;
            if (product.Stock < 0) product.Stock = 0;

            return Results.Ok(new
            {
                productId = request.ProductId,
                previousStock,
                adjustment = request.Adjustment,
                newStock = product.Stock,
                reason = request.Reason ?? "Manual adjustment"
            });
        })
            .WithName("AdjustStock")
            .WithOpenApi();

        // GET /api/inventory/pricing/{id} - Get pricing with discounts
        group.MapGet("/pricing/{id}", (string id, int? quantity) =>
        {
            if (!_products.TryGetValue(id, out var product))
                return Results.NotFound(new { error = $"Product {id} not found" });

            var qty = quantity ?? 1;
            var unitPrice = product.Price;
            var discount = qty >= 10 ? 0.1m : qty >= 5 ? 0.05m : 0;
            var discountedPrice = unitPrice * (1 - discount);

            return Results.Ok(new
            {
                productId = id,
                unitPrice,
                quantity = qty,
                discount = discount * 100 + "%",
                discountedUnitPrice = discountedPrice,
                totalPrice = discountedPrice * qty
            });
        })
            .WithName("GetPricing")
            .WithOpenApi();

        // POST /api/inventory/bulk-check - Check availability for multiple products
        group.MapPost("/bulk-check", (BulkCheckRequest request) =>
        {
            var results = request.Items.Select(item =>
            {
                if (!_products.TryGetValue(item.ProductId, out var product))
                {
                    return new
                    {
                        productId = item.ProductId,
                        requested = item.Quantity,
                        available = 0,
                        canFulfill = false,
                        error = "Product not found"
                    };
                }

                var reserved = _reservations.Values
                    .Where(r => r.ProductId == item.ProductId && r.ExpiresAt > DateTime.UtcNow)
                    .Sum(r => r.Quantity);
                var available = product.Stock - reserved;

                return new
                {
                    productId = item.ProductId,
                    requested = item.Quantity,
                    available,
                    canFulfill = available >= item.Quantity,
                    error = (string?)null
                };
            }).ToArray();

            return Results.Ok(new
            {
                items = results,
                allAvailable = results.All(r => r.canFulfill)
            });
        })
            .WithName("BulkCheckAvailability")
            .WithOpenApi();
    }
}

// Models
public class ProductDetails
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Sku { get; set; } = "";
    public decimal Price { get; set; }
    public int Stock { get; set; }
    public string Category { get; set; } = "";
}

public class Reservation
{
    public string ReservationId { get; set; } = "";
    public string ProductId { get; set; } = "";
    public int Quantity { get; set; }
    public string? OrderId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
}

public record ReserveStockRequest(string ProductId, int Quantity, string? OrderId, int? ExpirationMinutes);
public record AdjustStockRequest(string ProductId, int Adjustment, string? Reason);
public record BulkCheckRequest(BulkCheckItem[] Items);
public record BulkCheckItem(string ProductId, int Quantity);
