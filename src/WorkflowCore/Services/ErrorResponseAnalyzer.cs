using System.Text.Json;

namespace WorkflowCore.Services;

/// <summary>
/// Compliance level for error responses
/// </summary>
public enum ErrorResponseCompliance
{
    /// <summary>
    /// Fully compliant with RFC 7807 ProblemDetails
    /// </summary>
    Compliant,

    /// <summary>
    /// Has some required fields but missing others
    /// </summary>
    PartiallyCompliant,

    /// <summary>
    /// Does not follow the expected standard
    /// </summary>
    NonCompliant,

    /// <summary>
    /// Could not analyze (not JSON, empty, etc.)
    /// </summary>
    Unknown
}

/// <summary>
/// Result of analyzing an error response for standards compliance
/// </summary>
public class ErrorResponseComplianceResult
{
    /// <summary>
    /// Overall compliance level
    /// </summary>
    public ErrorResponseCompliance Compliance { get; set; } = ErrorResponseCompliance.Unknown;

    /// <summary>
    /// Compliance score (0-100)
    /// </summary>
    public int Score { get; set; }

    /// <summary>
    /// List of issues found with the error response
    /// </summary>
    public List<string> Issues { get; set; } = new();

    /// <summary>
    /// Actionable advice for improving the error response
    /// </summary>
    public List<string> Recommendations { get; set; } = new();

    /// <summary>
    /// Which standard was checked against
    /// </summary>
    public string Standard { get; set; } = "RFC 7807 (Problem Details)";

    /// <summary>
    /// Fields that were present in the response
    /// </summary>
    public List<string> PresentFields { get; set; } = new();

    /// <summary>
    /// Fields that are required but missing
    /// </summary>
    public List<string> MissingFields { get; set; } = new();

    /// <summary>
    /// Whether the response is valid JSON
    /// </summary>
    public bool IsJson { get; set; }

    /// <summary>
    /// Brief summary of the compliance status
    /// </summary>
    public string Summary => Compliance switch
    {
        ErrorResponseCompliance.Compliant => $"Compliant ({Score}%) - Follows RFC 7807 ProblemDetails standard",
        ErrorResponseCompliance.PartiallyCompliant => $"Partially Compliant ({Score}%) - {MissingFields.Count} required field(s) missing",
        ErrorResponseCompliance.NonCompliant => $"Non-Compliant ({Score}%) - Does not follow standard error format",
        _ => "Unknown - Could not analyze response"
    };
}

/// <summary>
/// Analyzes HTTP error responses for standards compliance.
/// Checks against RFC 7807 (Problem Details for HTTP APIs).
/// </summary>
public interface IErrorResponseAnalyzer
{
    /// <summary>
    /// Analyzes an error response body for compliance with error response standards
    /// </summary>
    /// <param name="responseBody">The HTTP response body</param>
    /// <param name="statusCode">The HTTP status code</param>
    /// <returns>Compliance analysis result</returns>
    ErrorResponseComplianceResult Analyze(string? responseBody, int? statusCode);
}

/// <summary>
/// Analyzes HTTP error responses for standards compliance.
/// Checks against RFC 7807 (Problem Details for HTTP APIs).
/// </summary>
public class ErrorResponseAnalyzer : IErrorResponseAnalyzer
{
    // RFC 7807 required and recommended fields
    private static readonly string[] RequiredFields = { "type", "title" };
    private static readonly string[] RecommendedFields = { "status", "detail", "instance" };
    private static readonly string[] OptionalFields = { "traceId", "errors", "extensions" };

    /// <inheritdoc />
    public ErrorResponseComplianceResult Analyze(string? responseBody, int? statusCode)
    {
        var result = new ErrorResponseComplianceResult();

        // Handle empty/null response
        if (string.IsNullOrWhiteSpace(responseBody))
        {
            result.Compliance = ErrorResponseCompliance.NonCompliant;
            result.Score = 0;
            result.Issues.Add("Empty error response body");
            result.Recommendations.Add("Return a structured JSON error response instead of an empty body");
            result.Recommendations.Add("Consider using RFC 7807 ProblemDetails format: { \"type\": \"...\", \"title\": \"...\", \"status\": N, \"detail\": \"...\" }");
            return result;
        }

        // Try to parse as JSON
        JsonDocument? doc = null;
        try
        {
            doc = JsonDocument.Parse(responseBody);
            result.IsJson = true;
        }
        catch (JsonException)
        {
            result.IsJson = false;
            result.Compliance = ErrorResponseCompliance.NonCompliant;
            result.Score = 5; // Small score for at least having a response
            result.Issues.Add("Response is not valid JSON");
            result.Issues.Add($"Received: {TruncateForDisplay(responseBody, 100)}");
            result.Recommendations.Add("Return error responses as JSON, not plain text or HTML");
            result.Recommendations.Add("Use Content-Type: application/problem+json for RFC 7807 compliance");
            result.Recommendations.Add("Example format: { \"type\": \"https://example.com/errors/validation\", \"title\": \"Validation Error\", \"status\": 400, \"detail\": \"The request was invalid\" }");
            return result;
        }

        using (doc)
        {
            var root = doc.RootElement;

            // Check if it's an object
            if (root.ValueKind != JsonValueKind.Object)
            {
                result.Compliance = ErrorResponseCompliance.NonCompliant;
                result.Score = 10;
                result.Issues.Add("Root element is not a JSON object");
                result.Recommendations.Add("Error responses should be JSON objects, not arrays or primitives");
                return result;
            }

            // Check for RFC 7807 fields
            var presentFields = new List<string>();
            var missingRequiredFields = new List<string>();
            var missingRecommendedFields = new List<string>();

            // Check required fields
            foreach (var field in RequiredFields)
            {
                if (HasProperty(root, field))
                {
                    presentFields.Add(field);
                }
                else
                {
                    missingRequiredFields.Add(field);
                }
            }

            // Check recommended fields
            foreach (var field in RecommendedFields)
            {
                if (HasProperty(root, field))
                {
                    presentFields.Add(field);
                }
                else
                {
                    missingRecommendedFields.Add(field);
                }
            }

            // Check optional fields
            foreach (var field in OptionalFields)
            {
                if (HasProperty(root, field))
                {
                    presentFields.Add(field);
                }
            }

            // Check for common non-standard fields that indicate partial compliance
            var commonAlternativeFields = new[] { "error", "message", "errorMessage", "code", "errorCode" };
            var hasAlternativeFields = commonAlternativeFields.Any(f => HasProperty(root, f));

            result.PresentFields = presentFields;
            result.MissingFields = missingRequiredFields;

            // Calculate score
            var totalFields = RequiredFields.Length + RecommendedFields.Length;
            var presentCount = presentFields.Count(f => RequiredFields.Contains(f) || RecommendedFields.Contains(f));
            var baseScore = (int)((double)presentCount / totalFields * 100);

            // Bonus points for optional fields
            var optionalPresent = presentFields.Count(f => OptionalFields.Contains(f));
            baseScore = Math.Min(100, baseScore + (optionalPresent * 5));

            result.Score = baseScore;

            // Determine compliance level
            if (missingRequiredFields.Count == 0 && missingRecommendedFields.Count == 0)
            {
                result.Compliance = ErrorResponseCompliance.Compliant;
            }
            else if (missingRequiredFields.Count == 0)
            {
                result.Compliance = ErrorResponseCompliance.Compliant; // Required fields present, just missing recommendations
                result.Score = Math.Max(80, result.Score);
            }
            else if (missingRequiredFields.Count == 1 || hasAlternativeFields)
            {
                result.Compliance = ErrorResponseCompliance.PartiallyCompliant;
            }
            else
            {
                result.Compliance = ErrorResponseCompliance.NonCompliant;
            }

            // Generate specific issues
            foreach (var field in missingRequiredFields)
            {
                result.Issues.Add($"Missing required field: '{field}'");
            }

            foreach (var field in missingRecommendedFields)
            {
                if (missingRequiredFields.Count == 0) // Only mention if we're otherwise compliant
                {
                    result.Issues.Add($"Missing recommended field: '{field}'");
                }
            }

            // Check status field matches actual HTTP status
            if (statusCode.HasValue && HasProperty(root, "status"))
            {
                var statusValue = root.GetProperty("status");
                if (statusValue.ValueKind == JsonValueKind.Number)
                {
                    var bodyStatus = statusValue.GetInt32();
                    if (bodyStatus != statusCode.Value)
                    {
                        result.Issues.Add($"Status in body ({bodyStatus}) doesn't match HTTP status ({statusCode.Value})");
                        result.Recommendations.Add($"Ensure 'status' field matches HTTP status code: {statusCode.Value}");
                    }
                }
            }

            // Generate recommendations based on issues
            if (missingRequiredFields.Contains("type"))
            {
                result.Recommendations.Add("Add 'type' field with a URI identifying the error type (e.g., \"https://api.example.com/errors/validation-error\")");
            }

            if (missingRequiredFields.Contains("title"))
            {
                result.Recommendations.Add("Add 'title' field with a short, human-readable summary (e.g., \"Validation Error\")");
            }

            if (missingRecommendedFields.Contains("status"))
            {
                result.Recommendations.Add($"Add 'status' field matching the HTTP status code{(statusCode.HasValue ? $": {statusCode.Value}" : "")}");
            }

            if (missingRecommendedFields.Contains("detail"))
            {
                result.Recommendations.Add("Add 'detail' field with a human-readable explanation specific to this occurrence");
            }

            if (missingRecommendedFields.Contains("instance"))
            {
                result.Recommendations.Add("Consider adding 'instance' field with a URI reference to this specific error occurrence");
            }

            // If using alternative fields, suggest migration
            if (hasAlternativeFields && result.Compliance != ErrorResponseCompliance.Compliant)
            {
                var detected = commonAlternativeFields.Where(f => HasProperty(root, f)).ToList();
                result.Recommendations.Add($"Detected non-standard fields: [{string.Join(", ", detected)}]. Consider migrating to RFC 7807 format for consistency across APIs.");
            }

            // Provide example if non-compliant
            if (result.Compliance == ErrorResponseCompliance.NonCompliant)
            {
                result.Recommendations.Add("Example compliant response:\n" +
                    "{\n" +
                    "  \"type\": \"https://api.example.com/errors/validation\",\n" +
                    "  \"title\": \"Validation Error\",\n" +
                    $"  \"status\": {statusCode ?? 400},\n" +
                    "  \"detail\": \"The 'userId' field must be a valid GUID.\",\n" +
                    "  \"instance\": \"/api/users/invalid-id\"\n" +
                    "}");
            }
        }

        return result;
    }

    private static bool HasProperty(JsonElement element, string propertyName)
    {
        // Check both exact case and common variations
        if (element.TryGetProperty(propertyName, out _))
            return true;

        // Check lowercase
        if (element.TryGetProperty(propertyName.ToLowerInvariant(), out _))
            return true;

        // Check PascalCase
        var pascalCase = char.ToUpperInvariant(propertyName[0]) + propertyName.Substring(1);
        if (element.TryGetProperty(pascalCase, out _))
            return true;

        return false;
    }

    private static string TruncateForDisplay(string text, int maxLength)
    {
        if (string.IsNullOrEmpty(text) || text.Length <= maxLength)
            return text;
        return text.Substring(0, maxLength) + "...";
    }
}
