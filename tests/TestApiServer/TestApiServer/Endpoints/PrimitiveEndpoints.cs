namespace TestApiServer.Endpoints;

/// <summary>
/// Primitive type endpoints - string, integer, decimal, boolean, guid, datetime, echo, null, dynamic, optional
/// </summary>
public static class PrimitiveEndpoints
{
    public static void MapPrimitiveEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/primitives")
            .WithTags("Primitives");

        // 1. GET /api/primitives/string
        group.MapGet("/string", () => Results.Ok(new { value = "hello" }))
            .WithName("GetString")
            .WithOpenApi();

        // 2. GET /api/primitives/integer
        group.MapGet("/integer", () => Results.Ok(new { value = 42 }))
            .WithName("GetInteger")
            .WithOpenApi();

        // 3. GET /api/primitives/decimal
        group.MapGet("/decimal", () => Results.Ok(new { value = 3.14159 }))
            .WithName("GetDecimal")
            .WithOpenApi();

        // 4. GET /api/primitives/boolean
        group.MapGet("/boolean", () => Results.Ok(new { value = true }))
            .WithName("GetBoolean")
            .WithOpenApi();

        // 5. GET /api/primitives/guid
        group.MapGet("/guid", () => Results.Ok(new { value = Guid.NewGuid().ToString() }))
            .WithName("GetGuid")
            .WithOpenApi();

        // 6. GET /api/primitives/datetime
        group.MapGet("/datetime", () => Results.Ok(new { value = DateTime.UtcNow.ToString("O") }))
            .WithName("GetDateTime")
            .WithOpenApi();

        // 7. POST /api/primitives/echo
        group.MapPost("/echo", (EchoRequest request) => Results.Ok(new
        {
            echo = request.Message,
            timestamp = DateTime.UtcNow.ToString("O")
        }))
            .WithName("PostEcho")
            .WithOpenApi();

        // 8. GET /api/primitives/null
        group.MapGet("/null", () => Results.Ok(new { value = (string?)null }))
            .WithName("GetNull")
            .WithOpenApi();

        // 9. GET /api/primitives/{type}
        group.MapGet("/{type}", (string type) =>
        {
            object? value = type.ToLowerInvariant() switch
            {
                "string" => "dynamic-hello",
                "integer" or "int" => 123,
                "decimal" or "double" => 2.71828,
                "boolean" or "bool" => false,
                "guid" => Guid.NewGuid().ToString(),
                "datetime" => DateTime.UtcNow.ToString("O"),
                _ => null
            };

            return value is null
                ? Results.NotFound(new { error = $"Unknown type: {type}" })
                : Results.Ok(new { type, value });
        })
            .WithName("GetDynamicType")
            .WithOpenApi();

        // 10. GET /api/primitives/optional
        group.MapGet("/optional", (string? value) => Results.Ok(new
        {
            value = value ?? "default",
            provided = value != null
        }))
            .WithName("GetOptional")
            .WithOpenApi();
    }
}

public record EchoRequest(string Message);
