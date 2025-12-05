namespace TestApiServer.Endpoints;

/// <summary>
/// Retry testing endpoints - fail-once, fail-n-times, intermittent, slow responses
/// </summary>
public static class RetryEndpoints
{
    private static readonly Dictionary<string, int> _failCounters = new();
    private static readonly Dictionary<string, int> _callCounters = new();

    public static void MapRetryEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/retry")
            .WithTags("Retry Testing");

        // POST /api/retry/fail-once - Fails first time, succeeds after
        group.MapPost("/fail-once", (FailOnceRequest? request) =>
        {
            var key = request?.Key ?? "default";
            if (!_failCounters.ContainsKey(key))
                _failCounters[key] = 0;

            _failCounters[key]++;

            if (_failCounters[key] == 1)
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
                attempts = _failCounters[key],
                message = "Request succeeded on retry"
            });
        })
            .WithName("FailOnce")
            .WithOpenApi();

        // POST /api/retry/fail-n-times - Fails N times, then succeeds
        group.MapPost("/fail-n-times", (FailNTimesRequest request) =>
        {
            var key = request.Key ?? "default";
            if (!_failCounters.ContainsKey(key))
                _failCounters[key] = 0;

            _failCounters[key]++;

            if (_failCounters[key] <= request.FailCount)
            {
                return Results.Problem(
                    detail: $"Service unavailable (attempt {_failCounters[key]} of {request.FailCount})",
                    statusCode: 503,
                    title: "Service Unavailable"
                );
            }

            return Results.Ok(new
            {
                success = true,
                attempts = _failCounters[key],
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
        group.MapPost("/reset", (ResetCountersRequest? request) =>
        {
            if (string.IsNullOrEmpty(request?.Key))
            {
                _failCounters.Clear();
                _callCounters.Clear();
                return Results.Ok(new { message = "All counters reset" });
            }

            _failCounters.Remove(request.Key);
            _callCounters.Remove(request.Key);
            return Results.Ok(new { message = $"Counter '{request.Key}' reset" });
        })
            .WithName("ResetRetryCounters")
            .WithOpenApi();

        // GET /api/retry/counters - Get current counter values
        group.MapGet("/counters", () =>
        {
            return Results.Ok(new
            {
                failCounters = _failCounters,
                callCounters = _callCounters
            });
        })
            .WithName("GetRetryCounters")
            .WithOpenApi();

        // POST /api/retry/circuit-breaker - Simulates circuit breaker pattern
        group.MapPost("/circuit-breaker", (CircuitBreakerRequest request) =>
        {
            var key = request.Key ?? "default";
            if (!_callCounters.ContainsKey(key))
                _callCounters[key] = 0;

            _callCounters[key]++;

            // After threshold failures, "open" the circuit for cooldown period
            if (_callCounters[key] > request.Threshold && _callCounters[key] <= request.Threshold + request.CooldownCalls)
            {
                return Results.Problem(
                    detail: $"Circuit breaker OPEN (call {_callCounters[key]}, cooling down for {request.CooldownCalls} more calls)",
                    statusCode: 503,
                    title: "Circuit Open"
                );
            }

            // First threshold calls fail
            if (_callCounters[key] <= request.Threshold)
            {
                return Results.Problem(
                    detail: $"Service error (call {_callCounters[key]} of {request.Threshold} until circuit opens)",
                    statusCode: 500,
                    title: "Internal Server Error"
                );
            }

            // After cooldown, succeed
            return Results.Ok(new
            {
                success = true,
                calls = _callCounters[key],
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
                title: request?.Title ?? "Simulated Error"
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
        group.MapPost("/flaky", (FlakyRequest? request) =>
        {
            var key = request?.Key ?? "default";
            if (!_callCounters.ContainsKey(key))
                _callCounters[key] = 0;

            _callCounters[key]++;

            // Odd calls fail, even calls succeed
            if (_callCounters[key] % 2 == 1)
            {
                return Results.Problem(
                    detail: $"Flaky failure (call {_callCounters[key]})",
                    statusCode: 500,
                    title: "Flaky Error"
                );
            }

            return Results.Ok(new
            {
                success = true,
                attempt = _callCounters[key],
                message = "Flaky endpoint succeeded on this attempt"
            });
        })
            .WithName("FlakyEndpoint")
            .WithOpenApi();
    }
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
