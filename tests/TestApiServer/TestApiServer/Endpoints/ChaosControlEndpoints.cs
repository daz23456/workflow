using TestApiServer.Models;
using TestApiServer.Services;

namespace TestApiServer.Endpoints;

/// <summary>
/// Chaos control endpoints - configure chaos modes and view stats
/// </summary>
public static class ChaosControlEndpoints
{
    public static void MapChaosControlEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/chaos")
            .WithTags("Chaos");

        // POST /api/chaos/configure - Set full configuration
        group.MapPost("/configure", (ChaosConfiguration config, IChaosService chaosService) =>
        {
            chaosService.Configure(config);
            return Results.Ok(new { message = "Chaos configuration updated", config });
        })
            .WithName("ConfigureChaos")
            .WithOpenApi();

        // GET /api/chaos/status - Get current configuration
        group.MapGet("/status", (IChaosService chaosService) =>
        {
            return Results.Ok(chaosService.Configuration);
        })
            .WithName("GetChaosStatus")
            .WithOpenApi();

        // POST /api/chaos/mode/{mode} - Quick mode switch
        group.MapPost("/mode/{mode}", (string mode, IChaosService chaosService) =>
        {
            if (!Enum.TryParse<ChaosMode>(mode, ignoreCase: true, out var chaosMode))
            {
                return Results.BadRequest(new
                {
                    error = $"Invalid mode: {mode}",
                    validModes = Enum.GetNames<ChaosMode>()
                });
            }

            chaosService.SetMode(chaosMode);
            return Results.Ok(new { message = $"Chaos mode set to {chaosMode}", mode = chaosMode.ToString() });
        })
            .WithName("SetChaosMode")
            .WithOpenApi();

        // POST /api/chaos/reset - Reset to normal
        group.MapPost("/reset", (IChaosService chaosService, IChaosStatsService statsService) =>
        {
            chaosService.Reset();
            statsService.Reset();
            return Results.Ok(new { message = "Chaos reset to normal mode, stats cleared" });
        })
            .WithName("ResetChaos")
            .WithOpenApi();

        // GET /api/chaos/stats - Get statistics
        group.MapGet("/stats", (IChaosStatsService statsService) =>
        {
            return Results.Ok(statsService.Stats);
        })
            .WithName("GetChaosStats")
            .WithOpenApi();
    }
}
