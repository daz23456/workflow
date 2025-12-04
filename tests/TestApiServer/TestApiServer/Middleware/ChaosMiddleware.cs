using TestApiServer.Services;

namespace TestApiServer.Middleware;

/// <summary>
/// Middleware that applies chaos engineering behaviors to incoming requests.
/// Supports random failures, delays, and various chaos modes for testing orchestrator resilience.
/// </summary>
public class ChaosMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ChaosMiddleware> _logger;

    public ChaosMiddleware(RequestDelegate next, ILogger<ChaosMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, IChaosService chaosService, IChaosStatsService statsService)
    {
        var path = context.Request.Path.Value ?? "";

        // Skip chaos for control endpoints
        if (path.StartsWith("/api/chaos") || path.StartsWith("/swagger") || path == "/health")
        {
            await _next(context);
            return;
        }

        // Record request
        statsService.RecordRequest();

        // Check for per-request overrides via headers
        if (context.Request.Headers.TryGetValue("X-Chaos-Bypass", out var bypass) && bypass == "true")
        {
            await _next(context);
            return;
        }

        // Handle forced failure header
        if (context.Request.Headers.TryGetValue("X-Chaos-Force-Fail", out var forceFail) &&
            int.TryParse(forceFail, out var forceStatusCode))
        {
            _logger.LogWarning("Chaos: Forced failure {StatusCode} for {Path}", forceStatusCode, path);
            statsService.RecordFailure(forceStatusCode, path);
            context.Response.StatusCode = forceStatusCode;
            await context.Response.WriteAsJsonAsync(new
            {
                error = "Chaos injection: forced failure",
                statusCode = forceStatusCode,
                path
            });
            return;
        }

        // Handle forced delay header
        if (context.Request.Headers.TryGetValue("X-Chaos-Force-Delay", out var forceDelay) &&
            int.TryParse(forceDelay, out var forceDelayMs))
        {
            _logger.LogWarning("Chaos: Forced delay {DelayMs}ms for {Path}", forceDelayMs, path);
            statsService.RecordDelay(forceDelayMs);
            await Task.Delay(forceDelayMs);
        }

        // Apply chaos based on configuration
        if (chaosService.ShouldDelay(path))
        {
            var delayMs = chaosService.GetDelayMs();
            if (delayMs > 0)
            {
                _logger.LogWarning("Chaos: Injecting delay {DelayMs}ms for {Path}", delayMs, path);
                statsService.RecordDelay(delayMs);
                await Task.Delay(delayMs);
            }
        }

        if (chaosService.ShouldFail(path))
        {
            var statusCode = chaosService.GetFailureStatusCode();
            _logger.LogWarning("Chaos: Injecting failure {StatusCode} for {Path}", statusCode, path);
            statsService.RecordFailure(statusCode, path);
            context.Response.StatusCode = statusCode;
            await context.Response.WriteAsJsonAsync(new
            {
                error = "Chaos injection: simulated failure",
                statusCode,
                path,
                mode = chaosService.Configuration.Mode.ToString()
            });
            return;
        }

        await _next(context);
    }
}

/// <summary>
/// Extension methods for adding ChaosMiddleware to the pipeline
/// </summary>
public static class ChaosMiddlewareExtensions
{
    public static IApplicationBuilder UseChaos(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<ChaosMiddleware>();
    }
}
