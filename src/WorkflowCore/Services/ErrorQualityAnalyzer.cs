using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Analyzes error responses for quality based on best practices.
/// Uses a 5-star rating system (one star per criterion met).
/// </summary>
public class ErrorQualityAnalyzer : IErrorQualityAnalyzer
{
    // Fields that indicate a human-readable message
    private static readonly string[] MessageFields = { "message", "error", "title", "detail", "description" };

    // Fields that indicate a machine-readable error code
    private static readonly string[] ErrorCodeFields = { "code", "errorCode", "error_code", "type", "errorType" };

    // Fields that indicate a request/correlation ID
    private static readonly string[] RequestIdFields = { "requestId", "request_id", "correlationId", "correlation_id", "traceId", "trace_id", "instance" };

    // Fields that indicate an actionable suggestion
    private static readonly string[] SuggestionFields = { "suggestion", "hint", "fix", "action", "help", "resolution", "howToFix" };

    // Error codes that should map to specific HTTP status ranges
    private static readonly Dictionary<string, int[]> ErrorCodeToStatusMapping = new(StringComparer.OrdinalIgnoreCase)
    {
        // 400 Bad Request
        { "VALIDATION_ERROR", new[] { 400, 422 } },
        { "BAD_REQUEST", new[] { 400 } },
        { "INVALID_INPUT", new[] { 400, 422 } },
        { "INVALID_REQUEST", new[] { 400 } },
        { "UNPROCESSABLE_ENTITY", new[] { 422 } },

        // 401 Unauthorized
        { "UNAUTHORIZED", new[] { 401 } },
        { "AUTHENTICATION_REQUIRED", new[] { 401 } },
        { "UNAUTHENTICATED", new[] { 401 } },

        // 403 Forbidden
        { "FORBIDDEN", new[] { 403 } },
        { "ACCESS_DENIED", new[] { 403 } },
        { "PERMISSION_DENIED", new[] { 403 } },

        // 404 Not Found
        { "NOT_FOUND", new[] { 404 } },
        { "RESOURCE_NOT_FOUND", new[] { 404 } },

        // 409 Conflict
        { "CONFLICT", new[] { 409 } },
        { "ALREADY_EXISTS", new[] { 409 } },

        // 429 Rate Limited
        { "RATE_LIMITED", new[] { 429 } },
        { "TOO_MANY_REQUESTS", new[] { 429 } },
        { "THROTTLED", new[] { 429 } },

        // 500+ Server Errors
        { "INTERNAL_ERROR", new[] { 500 } },
        { "SERVER_ERROR", new[] { 500 } },
        { "INTERNAL_SERVER_ERROR", new[] { 500 } },
        { "SERVICE_UNAVAILABLE", new[] { 503 } },
        { "TIMEOUT", new[] { 504, 408 } },
        { "GATEWAY_TIMEOUT", new[] { 504 } }
    };

    /// <inheritdoc/>
    public ErrorQualityScore Analyze(string? errorBody, int httpStatusCode, string? taskId = null)
    {
        if (string.IsNullOrWhiteSpace(errorBody))
        {
            return CreateEmptyScore(httpStatusCode, taskId);
        }

        try
        {
            using var doc = JsonDocument.Parse(errorBody);
            return Analyze(doc.RootElement, httpStatusCode, taskId);
        }
        catch (JsonException)
        {
            return CreateEmptyScore(httpStatusCode, taskId);
        }
    }

    /// <inheritdoc/>
    public ErrorQualityScore Analyze(JsonElement errorElement, int httpStatusCode, string? taskId = null)
    {
        var score = new ErrorQualityScore
        {
            HttpStatusCode = httpStatusCode,
            TaskId = taskId,
            AnalyzedAt = DateTime.UtcNow
        };

        // Check each criterion
        CheckHasMessage(errorElement, score);
        CheckHasErrorCode(errorElement, score);
        CheckAppropriateHttpStatus(errorElement, httpStatusCode, score);
        CheckHasRequestId(errorElement, score);
        CheckHasActionableSuggestion(errorElement, score);

        // Calculate stars from criteria met
        score.Stars = CountBits((int)score.CriteriaMet);

        // Calculate missing criteria
        score.CriteriaMissing = ErrorQualityCriteria.All & ~score.CriteriaMet;

        return score;
    }

    private static ErrorQualityScore CreateEmptyScore(int httpStatusCode, string? taskId)
    {
        var score = new ErrorQualityScore
        {
            HttpStatusCode = httpStatusCode,
            TaskId = taskId,
            AnalyzedAt = DateTime.UtcNow,
            Stars = 0,
            CriteriaMet = ErrorQualityCriteria.None,
            CriteriaMissing = ErrorQualityCriteria.All
        };

        // Add all criteria as unmet
        AddUnmetCriterion(score, ErrorQualityCriteria.HasMessage, "Human-Readable Message",
            "Add a 'message' field with a clear, human-readable error description");
        AddUnmetCriterion(score, ErrorQualityCriteria.HasErrorCode, "Machine-Readable Error Code",
            "Add a 'code' field with a machine-readable error code (e.g., 'VALIDATION_ERROR')");
        AddUnmetCriterion(score, ErrorQualityCriteria.AppropriateHttpStatus, "Appropriate HTTP Status",
            "Ensure HTTP status code matches the error type");
        AddUnmetCriterion(score, ErrorQualityCriteria.HasRequestId, "Request/Correlation ID",
            "Add a 'requestId' or 'correlationId' field for debugging and tracing");
        AddUnmetCriterion(score, ErrorQualityCriteria.HasActionableSuggestion, "Actionable Suggestion",
            "Add a 'suggestion' field explaining how the user can fix the issue");

        return score;
    }

    private void CheckHasMessage(JsonElement element, ErrorQualityScore score)
    {
        var (found, value) = TryGetStringField(element, MessageFields);

        if (found && !string.IsNullOrWhiteSpace(value))
        {
            score.CriteriaMet |= ErrorQualityCriteria.HasMessage;
            score.CriteriaBreakdown.Add(new CriterionResult
            {
                Criterion = ErrorQualityCriteria.HasMessage,
                Name = "Human-Readable Message",
                Met = true,
                Details = TruncateForDisplay(value, 100)
            });
        }
        else
        {
            AddUnmetCriterion(score, ErrorQualityCriteria.HasMessage, "Human-Readable Message",
                "Add a 'message' field with a clear, human-readable error description");
        }
    }

    private void CheckHasErrorCode(JsonElement element, ErrorQualityScore score)
    {
        var (found, value) = TryGetStringField(element, ErrorCodeFields);

        if (found && !string.IsNullOrWhiteSpace(value))
        {
            score.CriteriaMet |= ErrorQualityCriteria.HasErrorCode;
            score.CriteriaBreakdown.Add(new CriterionResult
            {
                Criterion = ErrorQualityCriteria.HasErrorCode,
                Name = "Machine-Readable Error Code",
                Met = true,
                Details = value
            });
        }
        else
        {
            AddUnmetCriterion(score, ErrorQualityCriteria.HasErrorCode, "Machine-Readable Error Code",
                "Add a 'code' field with a machine-readable error code (e.g., 'VALIDATION_ERROR', 'NOT_FOUND')");
        }
    }

    private void CheckAppropriateHttpStatus(JsonElement element, int httpStatusCode, ErrorQualityScore score)
    {
        var (found, errorCode) = TryGetStringField(element, ErrorCodeFields);

        bool isAppropriate;
        string details;

        if (found && !string.IsNullOrWhiteSpace(errorCode))
        {
            // Check if the error code maps to an expected HTTP status
            if (ErrorCodeToStatusMapping.TryGetValue(errorCode, out var expectedStatuses))
            {
                isAppropriate = expectedStatuses.Contains(httpStatusCode);
                details = isAppropriate
                    ? $"HTTP {httpStatusCode} is appropriate for '{errorCode}'"
                    : $"HTTP {httpStatusCode} may not be appropriate for '{errorCode}' (expected: {string.Join(" or ", expectedStatuses)})";
            }
            else
            {
                // Unknown error code - assume status is appropriate if it's in a reasonable range
                isAppropriate = IsReasonableStatusCode(httpStatusCode);
                details = $"HTTP {httpStatusCode} (error code '{errorCode}' not in known mappings)";
            }
        }
        else
        {
            // No error code - check if status is in a reasonable range for generic errors
            isAppropriate = IsReasonableStatusCode(httpStatusCode);
            details = isAppropriate
                ? $"HTTP {httpStatusCode} is a valid error status"
                : $"HTTP {httpStatusCode} is unusual for an error response";
        }

        if (isAppropriate)
        {
            score.CriteriaMet |= ErrorQualityCriteria.AppropriateHttpStatus;
            score.CriteriaBreakdown.Add(new CriterionResult
            {
                Criterion = ErrorQualityCriteria.AppropriateHttpStatus,
                Name = "Appropriate HTTP Status",
                Met = true,
                Details = details
            });
        }
        else
        {
            AddUnmetCriterion(score, ErrorQualityCriteria.AppropriateHttpStatus, "Appropriate HTTP Status",
                "Use appropriate HTTP status codes: 400 for validation, 401 for auth, 404 for not found, 500 for server errors");
            var criterion = score.CriteriaBreakdown.Last();
            criterion.Details = details;
        }
    }

    private void CheckHasRequestId(JsonElement element, ErrorQualityScore score)
    {
        var (found, value) = TryGetStringField(element, RequestIdFields);

        if (found && !string.IsNullOrWhiteSpace(value))
        {
            score.CriteriaMet |= ErrorQualityCriteria.HasRequestId;
            score.CriteriaBreakdown.Add(new CriterionResult
            {
                Criterion = ErrorQualityCriteria.HasRequestId,
                Name = "Request/Correlation ID",
                Met = true,
                Details = value
            });
        }
        else
        {
            AddUnmetCriterion(score, ErrorQualityCriteria.HasRequestId, "Request/Correlation ID",
                "Add a 'requestId' or 'correlationId' field for debugging and tracing");
        }
    }

    private void CheckHasActionableSuggestion(JsonElement element, ErrorQualityScore score)
    {
        var (found, value) = TryGetStringField(element, SuggestionFields);

        if (found && !string.IsNullOrWhiteSpace(value))
        {
            score.CriteriaMet |= ErrorQualityCriteria.HasActionableSuggestion;
            score.CriteriaBreakdown.Add(new CriterionResult
            {
                Criterion = ErrorQualityCriteria.HasActionableSuggestion,
                Name = "Actionable Suggestion",
                Met = true,
                Details = TruncateForDisplay(value, 100)
            });
        }
        else
        {
            AddUnmetCriterion(score, ErrorQualityCriteria.HasActionableSuggestion, "Actionable Suggestion",
                "Add a 'suggestion' or 'hint' field explaining how the user can resolve the issue");
        }
    }

    private static void AddUnmetCriterion(ErrorQualityScore score, ErrorQualityCriteria criterion, string name, string tip)
    {
        score.CriteriaBreakdown.Add(new CriterionResult
        {
            Criterion = criterion,
            Name = name,
            Met = false,
            Tip = tip
        });
        score.ImprovementTips.Add(tip);
    }

    private static (bool Found, string? Value) TryGetStringField(JsonElement element, string[] fieldNames)
    {
        if (element.ValueKind != JsonValueKind.Object)
        {
            return (false, null);
        }

        foreach (var fieldName in fieldNames)
        {
            if (element.TryGetProperty(fieldName, out var prop) && prop.ValueKind == JsonValueKind.String)
            {
                return (true, prop.GetString());
            }
        }

        return (false, null);
    }

    private static bool IsReasonableStatusCode(int statusCode)
    {
        // Any 4xx or 5xx status code is reasonable for an error
        return statusCode >= 400 && statusCode < 600;
    }

    private static int CountBits(int value)
    {
        int count = 0;
        while (value != 0)
        {
            count += value & 1;
            value >>= 1;
        }
        return count;
    }

    private static string TruncateForDisplay(string value, int maxLength)
    {
        if (value.Length <= maxLength)
            return value;
        return value[..(maxLength - 3)] + "...";
    }
}
