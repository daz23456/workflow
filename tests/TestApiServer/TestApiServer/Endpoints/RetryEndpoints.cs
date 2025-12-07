using TestApiServer.Services;

namespace TestApiServer.Endpoints;

/// <summary>
/// Retry testing endpoints - fail-once, fail-n-times, intermittent, slow responses
/// Uses IRetryCounterService for stateful retry patterns
/// </summary>
public static class RetryEndpoints
{
    public static void MapRetryEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/retry")
            .WithTags("Retry Testing");

        // POST /api/retry/fail-once - Fails first time, succeeds after
        group.MapPost("/fail-once", (FailOnceRequest? request, IRetryCounterService counterService) =>
        {
            var key = $"fail-once:{request?.Key ?? "default"}";
            var count = counterService.IncrementAndGet(key);

            if (count == 1)
            {
                return Results.Problem(
                    detail: "Service temporarily unavailable (first attempt)",
                    statusCode: 503,
                    title: "Service Unavailable"
                );
            }

            return Results.Ok(new
            {
                success = true,
                attempts = count,
                message = "Request succeeded on retry"
            });
        })
            .WithName("FailOnce")
            .WithOpenApi();

        // POST /api/retry/fail-n-times - Fails N times, then succeeds
        group.MapPost("/fail-n-times", (FailNTimesRequest request, IRetryCounterService counterService) =>
        {
            var key = $"fail-n:{request.Key ?? "default"}";
            var count = counterService.IncrementAndGet(key);

            if (count <= request.FailCount)
            {
                return Results.Problem(
                    detail: $"Service unavailable (attempt {count} of {request.FailCount})",
                    statusCode: 503,
                    title: "Service Unavailable"
                );
            }

            return Results.Ok(new
            {
                success = true,
                attempts = count,
                configuredFailures = request.FailCount,
                message = $"Request succeeded after {request.FailCount} failures"
            });
        })
            .WithName("FailNTimes")
            .WithOpenApi();

        // POST /api/retry/intermittent - Fails randomly based on failure rate
        group.MapPost("/intermittent", (IntermittentRequest request) =>
        {
            var random = new Random();
            var failureRate = request.FailureRate;

            if (random.NextDouble() < failureRate)
            {
                return Results.Problem(
                    detail: $"Random failure (failure rate: {failureRate:P0})",
                    statusCode: 503,
                    title: "Service Unavailable"
                );
            }

            return Results.Ok(new
            {
                success = true,
                configuredFailureRate = failureRate,
                message = "Request succeeded"
            });
        })
            .WithName("IntermittentFailure")
            .WithOpenApi();

        // POST /api/retry/slow - Slow response (configurable delay)
        group.MapPost("/slow", async (SlowRequest request) =>
        {
            await Task.Delay(request.DelayMs);

            return Results.Ok(new
            {
                success = true,
                delayMs = request.DelayMs,
                completedAt = DateTime.UtcNow.ToString("O")
            });
        })
            .WithName("SlowResponse")
            .WithOpenApi();

        // GET /api/retry/delay/{ms} - Simple slow response with delay in path (for easy workflow testing)
        group.MapGet("/delay/{ms:int}", async (int ms) =>
        {
            var delayMs = Math.Min(ms, 30000); // Cap at 30s to prevent abuse
            await Task.Delay(delayMs);

            return Results.Ok(new
            {
                success = true,
                requestedDelayMs = ms,
                actualDelayMs = delayMs,
                completedAt = DateTime.UtcNow.ToString("O"),
                message = "Slow response completed"
            });
        })
            .WithName("DelayedResponse")
            .WithOpenApi();

        // POST /api/retry/timeout - Times out (never responds in time)
        group.MapPost("/timeout", async (TimeoutRequest? request) =>
        {
            var delayMs = request?.DelayMs ?? 60000; // Default 60 seconds
            await Task.Delay(delayMs);

            return Results.Ok(new
            {
                success = true,
                message = "This should have timed out"
            });
        })
            .WithName("TimeoutSimulation")
            .WithOpenApi();

        // POST /api/retry/reset - Reset all counters
        group.MapPost("/reset", (ResetCountersRequest? request, IRetryCounterService counterService) =>
        {
            if (string.IsNullOrEmpty(request?.Key))
            {
                counterService.ResetAll();
                return Results.Ok(new { message = "All counters reset" });
            }

            // Reset counters for this key (both fail-once and fail-n variants)
            counterService.Reset($"fail-once:{request.Key}");
            counterService.Reset($"fail-n:{request.Key}");
            counterService.Reset($"circuit:{request.Key}");
            counterService.Reset($"flaky:{request.Key}");
            return Results.Ok(new { message = $"Counter '{request.Key}' reset" });
        })
            .WithName("ResetRetryCounters")
            .WithOpenApi();

        // GET /api/retry/counters - Get current counter values
        group.MapGet("/counters", (IRetryCounterService counterService) =>
        {
            var allCounters = counterService.GetAllCounters();

            // Group by type for better readability
            var failOnce = allCounters.Where(kv => kv.Key.StartsWith("fail-once:")).ToDictionary(kv => kv.Key, kv => kv.Value);
            var failN = allCounters.Where(kv => kv.Key.StartsWith("fail-n:")).ToDictionary(kv => kv.Key, kv => kv.Value);
            var circuit = allCounters.Where(kv => kv.Key.StartsWith("circuit:")).ToDictionary(kv => kv.Key, kv => kv.Value);
            var flaky = allCounters.Where(kv => kv.Key.StartsWith("flaky:")).ToDictionary(kv => kv.Key, kv => kv.Value);

            return Results.Ok(new
            {
                failCounters = failOnce.Concat(failN).ToDictionary(kv => kv.Key, kv => kv.Value),
                callCounters = circuit.Concat(flaky).ToDictionary(kv => kv.Key, kv => kv.Value),
                total = allCounters
            });
        })
            .WithName("GetRetryCounters")
            .WithOpenApi();

        // POST /api/retry/circuit-breaker - Simulates circuit breaker pattern
        group.MapPost("/circuit-breaker", (CircuitBreakerRequest request, IRetryCounterService counterService) =>
        {
            var key = $"circuit:{request.Key ?? "default"}";
            var count = counterService.IncrementAndGet(key);

            // After threshold failures, "open" the circuit for cooldown period
            if (count > request.Threshold && count <= request.Threshold + request.CooldownCalls)
            {
                return Results.Problem(
                    detail: $"Circuit breaker OPEN (call {count}, cooling down for {request.CooldownCalls} more calls)",
                    statusCode: 503,
                    title: "Circuit Open"
                );
            }

            // First threshold calls fail
            if (count <= request.Threshold)
            {
                return Results.Problem(
                    detail: $"Service error (call {count} of {request.Threshold} until circuit opens)",
                    statusCode: 500,
                    title: "Internal Server Error"
                );
            }

            // After cooldown, succeed
            return Results.Ok(new
            {
                success = true,
                calls = count,
                threshold = request.Threshold,
                cooldownCalls = request.CooldownCalls,
                message = "Circuit breaker recovered, request succeeded"
            });
        })
            .WithName("CircuitBreakerSimulation")
            .WithOpenApi();

        // POST /api/retry/error/{statusCode} - Return specific HTTP error status
        group.MapPost("/error/{statusCode:int}", (int statusCode, ErrorSimulationRequest? request) =>
        {
            return Results.Problem(
                detail: request?.Message ?? $"Simulated {statusCode} error",
                statusCode: statusCode,
                title: request?.Title ?? GetErrorTitle(statusCode)
            );
        })
            .WithName("ErrorSimulation")
            .WithOpenApi();

        // POST /api/retry/degraded - Returns success but with degraded performance indicator
        group.MapPost("/degraded", async (DegradedRequest? request) =>
        {
            var delay = request?.DelayMs ?? 500;
            await Task.Delay(delay);

            return Results.Ok(new
            {
                success = true,
                degraded = true,
                latencyMs = delay,
                message = "Service responding in degraded mode"
            });
        })
            .WithName("DegradedResponse")
            .WithOpenApi();

        // POST /api/retry/flaky - Alternates between success and failure
        group.MapPost("/flaky", (FlakyRequest? request, IRetryCounterService counterService) =>
        {
            var key = $"flaky:{request?.Key ?? "default"}";
            var count = counterService.IncrementAndGet(key);

            // Odd calls fail, even calls succeed
            if (count % 2 == 1)
            {
                return Results.Problem(
                    detail: $"Flaky failure (call {count})",
                    statusCode: 500,
                    title: "Flaky Error"
                );
            }

            return Results.Ok(new
            {
                success = true,
                attempt = count,
                message = "Flaky endpoint succeeded on this attempt"
            });
        })
            .WithName("FlakyEndpoint")
            .WithOpenApi();
    }

    /// <summary>
    /// Gets the standard HTTP error title for a status code
    /// </summary>
    private static string GetErrorTitle(int statusCode) => statusCode switch
    {
        400 => "Bad Request",
        401 => "Unauthorized",
        403 => "Forbidden",
        404 => "Not Found",
        408 => "Request Timeout",
        429 => "Too Many Requests",
        500 => "Internal Server Error",
        502 => "Bad Gateway",
        503 => "Service Unavailable",
        504 => "Gateway Timeout",
        _ => "Error"
    };
}

// Retry request models
public record FailOnceRequest(string? Key);
public record FailNTimesRequest(int FailCount, string? Key);
public record IntermittentRequest(double FailureRate);
public record SlowRequest(int DelayMs);
public record TimeoutRequest(int DelayMs);
public record ResetCountersRequest(string? Key);
public record CircuitBreakerRequest(int Threshold, int CooldownCalls, string? Key);
public record ErrorSimulationRequest(string? Message, string? Title);
public record DegradedRequest(int? DelayMs);
public record FlakyRequest(string? Key);
