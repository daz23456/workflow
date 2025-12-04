namespace TestApiServer.Endpoints;

/// <summary>
/// Array endpoints - strings, numbers, large arrays, paginated
/// </summary>
public static class ArrayEndpoints
{
    public static void MapArrayEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/arrays")
            .WithTags("Arrays");

        // 11. GET /api/arrays/strings
        group.MapGet("/strings", () => Results.Ok(new { items = new[] { "alpha", "beta", "gamma", "delta", "epsilon" } }))
            .WithName("GetStrings")
            .WithOpenApi();

        // 12. GET /api/arrays/numbers
        group.MapGet("/numbers", () => Results.Ok(new { items = new[] { 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 } }))
            .WithName("GetNumbers")
            .WithOpenApi();

        // 13. GET /api/arrays/large/1000
        group.MapGet("/large/1000", () =>
        {
            var items = Enumerable.Range(1, 1000)
                .Select(i => new { id = i, name = $"Item {i}", value = i * 1.5 })
                .ToArray();
            return Results.Ok(new { items, count = items.Length });
        })
            .WithName("GetLarge1000")
            .WithOpenApi();

        // 14. GET /api/arrays/large/10000
        group.MapGet("/large/10000", () =>
        {
            var items = Enumerable.Range(1, 10000)
                .Select(i => new { id = i, name = $"Item {i}", value = i * 1.5 })
                .ToArray();
            return Results.Ok(new { items, count = items.Length });
        })
            .WithName("GetLarge10000")
            .WithOpenApi();

        // 15. GET /api/arrays/paginated
        group.MapGet("/paginated", (int page = 1, int size = 10) =>
        {
            var totalItems = 100;
            var items = Enumerable.Range((page - 1) * size + 1, Math.Min(size, totalItems - (page - 1) * size))
                .Select(i => new { id = i, name = $"Item {i}" })
                .ToArray();

            return Results.Ok(new
            {
                items,
                page,
                size,
                totalItems,
                totalPages = (int)Math.Ceiling((double)totalItems / size)
            });
        })
            .WithName("GetPaginated")
            .WithOpenApi();

        // GET /api/arrays/nested - Nested arrays
        group.MapGet("/nested", () => Results.Ok(new
        {
            categories = new[]
            {
                new { name = "Electronics", items = new[] { "Phone", "Laptop", "Tablet" } },
                new { name = "Clothing", items = new[] { "Shirt", "Pants", "Jacket" } },
                new { name = "Food", items = new[] { "Apple", "Bread", "Milk" } }
            }
        }))
            .WithName("GetNested")
            .WithOpenApi();

        // GET /api/arrays/mixed - Mixed types in array
        group.MapGet("/mixed", () => Results.Ok(new
        {
            items = new object[] { 1, "two", 3.0, true, new { nested = "object" } }
        }))
            .WithName("GetMixed")
            .WithOpenApi();

        // GET /api/arrays/objects - Array of complex objects
        group.MapGet("/objects", () => Results.Ok(new
        {
            users = new[]
            {
                new { id = 1, name = "Alice", roles = new[] { "admin", "user" }, settings = new { theme = "dark", notifications = true } },
                new { id = 2, name = "Bob", roles = new[] { "user" }, settings = new { theme = "light", notifications = false } },
                new { id = 3, name = "Charlie", roles = new[] { "user", "moderator" }, settings = new { theme = "auto", notifications = true } }
            }
        }))
            .WithName("GetObjects")
            .WithOpenApi();

        // GET /api/arrays/empty - Empty array
        group.MapGet("/empty", () => Results.Ok(new { items = Array.Empty<object>() }))
            .WithName("GetEmpty")
            .WithOpenApi();

        // POST /api/arrays/filter - Filter array by criteria
        group.MapPost("/filter", (FilterArrayRequest request) =>
        {
            var allItems = Enumerable.Range(1, 100)
                .Select(i => new { id = i, name = $"Item {i}", value = i * 10, category = i % 3 == 0 ? "A" : i % 3 == 1 ? "B" : "C" })
                .ToList();

            var filtered = allItems.AsEnumerable();
            if (request.MinValue.HasValue)
                filtered = filtered.Where(i => i.value >= request.MinValue.Value);
            if (request.MaxValue.HasValue)
                filtered = filtered.Where(i => i.value <= request.MaxValue.Value);
            if (!string.IsNullOrEmpty(request.Category))
                filtered = filtered.Where(i => i.category == request.Category);

            return Results.Ok(new { items = filtered.ToArray() });
        })
            .WithName("FilterArray")
            .WithOpenApi();

        // POST /api/arrays/transform - Transform array elements
        group.MapPost("/transform", (TransformArrayRequest request) =>
        {
            var transformed = request.Items.Select(item => new
            {
                original = item,
                uppercase = item.ToUpperInvariant(),
                length = item.Length,
                reversed = new string(item.Reverse().ToArray())
            }).ToArray();

            return Results.Ok(new { items = transformed });
        })
            .WithName("TransformArray")
            .WithOpenApi();
    }
}

public record FilterArrayRequest(int? MinValue, int? MaxValue, string? Category);
public record TransformArrayRequest(string[] Items);
