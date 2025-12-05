using System.Text;
using WorkflowCore.Services;

namespace WorkflowCore.Models;

/// <summary>
/// Categorizes the type of error that occurred during task execution.
/// Used for error classification, metrics, and actionable guidance.
/// </summary>
public enum TaskErrorType
{
    /// <summary>
    /// Task execution exceeded the configured timeout
    /// </summary>
    Timeout,

    /// <summary>
    /// HTTP request returned a non-success status code (4xx, 5xx)
    /// </summary>
    HttpError,

    /// <summary>
    /// Network-level error (DNS resolution, connection refused, etc.)
    /// </summary>
    NetworkError,

    /// <summary>
    /// Input or output schema validation failed
    /// </summary>
    ValidationError,

    /// <summary>
    /// Task configuration is invalid (missing URL, invalid method, etc.)
    /// </summary>
    ConfigurationError,

    /// <summary>
    /// Authentication or authorization failed (401, 403)
    /// </summary>
    AuthenticationError,

    /// <summary>
    /// Rate limit exceeded (429)
    /// </summary>
    RateLimitError,

    /// <summary>
    /// Error type could not be determined
    /// </summary>
    UnknownError
}

/// <summary>
/// Categorizes the type of service for routing and escalation purposes.
/// </summary>
public enum ServiceCategory
{
    /// <summary>
    /// Service category is not known
    /// </summary>
    Unknown,

    /// <summary>
    /// Internal microservice owned by the organization
    /// </summary>
    Internal,

    /// <summary>
    /// External third-party API (Stripe, Twilio, etc.)
    /// </summary>
    ThirdParty,

    /// <summary>
    /// Infrastructure service (database, cache, queue)
    /// </summary>
    Infrastructure
}

/// <summary>
/// Structured error information for a task execution failure.
/// Provides comprehensive context for debugging and support.
/// </summary>
public class TaskErrorInfo
{
    #region Task Identification

    /// <summary>
    /// The unique identifier of the task within the workflow (e.g., "fetch-user")
    /// </summary>
    public string TaskId { get; set; } = string.Empty;

    /// <summary>
    /// Human-readable name of the task (e.g., "Fetch User Details")
    /// </summary>
    public string? TaskName { get; set; }

    /// <summary>
    /// Description of what the task does (for support context)
    /// </summary>
    public string? TaskDescription { get; set; }

    #endregion

    #region Error Classification

    /// <summary>
    /// Categorized type of error for filtering and routing
    /// </summary>
    public TaskErrorType ErrorType { get; set; } = TaskErrorType.UnknownError;

    /// <summary>
    /// Primary error message (user-friendly)
    /// </summary>
    public string ErrorMessage { get; set; } = string.Empty;

    /// <summary>
    /// Error code if available (e.g., "ECONNREFUSED", "ETIMEDOUT")
    /// </summary>
    public string? ErrorCode { get; set; }

    /// <summary>
    /// Full stack trace for debugging (only included when requested)
    /// </summary>
    public string? StackTrace { get; set; }

    #endregion

    #region Service Details

    /// <summary>
    /// Name of the external service that was being called (e.g., "user-service")
    /// Extracted from URL hostname or can be set explicitly from task metadata
    /// </summary>
    public string? ServiceName { get; set; }

    /// <summary>
    /// Human-readable display name for the service (e.g., "User Profile Service")
    /// Used in error messages for clarity
    /// </summary>
    public string? ServiceDisplayName { get; set; }

    /// <summary>
    /// Full URL that was being called
    /// </summary>
    public string? ServiceUrl { get; set; }

    /// <summary>
    /// HTTP method used (GET, POST, etc.)
    /// </summary>
    public string? HttpMethod { get; set; }

    /// <summary>
    /// HTTP status code returned (if applicable)
    /// </summary>
    public int? HttpStatusCode { get; set; }

    /// <summary>
    /// Response body snippet for debugging (truncated if large)
    /// </summary>
    public string? ResponseBodyPreview { get; set; }

    /// <summary>
    /// Category of service for routing (Internal, External, ThirdParty)
    /// </summary>
    public ServiceCategory ServiceCategory { get; set; } = ServiceCategory.Unknown;

    /// <summary>
    /// Team or owner responsible for this service (for escalation)
    /// </summary>
    public string? ServiceOwner { get; set; }

    #endregion

    #region Error Response Compliance

    /// <summary>
    /// Compliance level of the error response (RFC 7807)
    /// </summary>
    public string? ResponseCompliance { get; set; }

    /// <summary>
    /// Compliance score (0-100) for the error response format
    /// </summary>
    public int? ResponseComplianceScore { get; set; }

    /// <summary>
    /// Issues found with the error response format
    /// </summary>
    public List<string>? ResponseComplianceIssues { get; set; }

    /// <summary>
    /// Recommendations for improving the error response format
    /// </summary>
    public List<string>? ResponseComplianceRecommendations { get; set; }

    /// <summary>
    /// Brief compliance summary for display
    /// </summary>
    public string? ResponseComplianceSummary { get; set; }

    #endregion

    #region Retry Information

    /// <summary>
    /// Number of retry attempts made before failing
    /// </summary>
    public int RetryAttempts { get; set; }

    /// <summary>
    /// Maximum retries configured for this task
    /// </summary>
    public int MaxRetries { get; set; }

    /// <summary>
    /// Whether this error type is retryable
    /// </summary>
    public bool IsRetryable { get; set; }

    /// <summary>
    /// Suggested wait time before next retry (if retryable)
    /// </summary>
    public int? NextRetryInMs { get; set; }

    #endregion

    #region Timing Information

    /// <summary>
    /// When the error occurred (UTC)
    /// </summary>
    public DateTime OccurredAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When the task started executing (UTC)
    /// </summary>
    public DateTime TaskStartedAt { get; set; }

    /// <summary>
    /// How long the task ran before the error occurred
    /// </summary>
    public long DurationUntilErrorMs { get; set; }

    #endregion

    #region Actionable Guidance

    /// <summary>
    /// Suggested action to resolve the issue
    /// </summary>
    public string? Suggestion { get; set; }

    /// <summary>
    /// Link to relevant documentation
    /// </summary>
    public string? DocumentationLink { get; set; }

    /// <summary>
    /// Instructions for support staff
    /// </summary>
    public string? SupportAction { get; set; }

    #endregion

    #region Helper Methods

    /// <summary>
    /// Generates a concise summary of the error for logs and alerts.
    /// FORMAT: [SERVICE] Task 'X' failed: ErrorType (HTTP Status) - Message
    /// Leading with service ensures support staff immediately know where to route.
    /// </summary>
    public string GetSummary()
    {
        var sb = new StringBuilder();

        // LEAD WITH SERVICE - this is what support needs to see first for routing
        var serviceName = GetEffectiveServiceName();
        if (!string.IsNullOrEmpty(serviceName))
        {
            sb.Append($"[{serviceName.ToUpperInvariant()}] ");
        }

        sb.Append($"Task '{TaskId}' failed: {ErrorType}");

        if (HttpStatusCode.HasValue)
        {
            sb.Append($" (HTTP {HttpStatusCode})");
        }

        if (!string.IsNullOrEmpty(ErrorMessage))
        {
            sb.Append($" - {ErrorMessage}");
        }

        return sb.ToString();
    }

    /// <summary>
    /// Gets the most descriptive service name available.
    /// Prefers ServiceDisplayName over ServiceName over hostname extraction.
    /// </summary>
    public string? GetEffectiveServiceName()
    {
        if (!string.IsNullOrEmpty(ServiceDisplayName))
            return ServiceDisplayName;

        if (!string.IsNullOrEmpty(ServiceName))
            return ServiceName;

        return null;
    }

    /// <summary>
    /// Generates a detailed description for support staff.
    /// Starts with ESCALATION INFO so support knows immediately where to route.
    /// </summary>
    public string GetSupportDescription()
    {
        var sb = new StringBuilder();

        // ESCALATION INFO FIRST - support needs this immediately
        sb.AppendLine("╔══════════════════════════════════════════════════════════════╗");
        sb.AppendLine("║                    TASK ERROR REPORT                          ║");
        sb.AppendLine("╚══════════════════════════════════════════════════════════════╝");
        sb.AppendLine();

        // Who to contact - THE MOST IMPORTANT INFO FOR ROUTING
        sb.AppendLine("┌─── ESCALATION TARGET ───────────────────────────────────────┐");
        var escalationInfo = GetEscalationInfo();
        sb.AppendLine($"│ Route To: {escalationInfo.RouteToTeam,-50} │");
        sb.AppendLine($"│ Category: {escalationInfo.Category,-50} │");
        if (!string.IsNullOrEmpty(ServiceOwner))
            sb.AppendLine($"│ Owner:    {ServiceOwner,-50} │");
        sb.AppendLine("└─────────────────────────────────────────────────────────────┘");
        sb.AppendLine();

        // Service details (WHAT service had the problem)
        sb.AppendLine("┌─── SERVICE DETAILS ─────────────────────────────────────────┐");
        var effectiveName = GetEffectiveServiceName() ?? "(unknown service)";
        sb.AppendLine($"│ Service:     {effectiveName,-47} │");
        if (!string.IsNullOrEmpty(HttpMethod))
            sb.AppendLine($"│ Method:      {HttpMethod,-47} │");
        if (!string.IsNullOrEmpty(ServiceUrl))
        {
            var urlDisplay = ServiceUrl.Length > 47 ? ServiceUrl.Substring(0, 44) + "..." : ServiceUrl;
            sb.AppendLine($"│ URL:         {urlDisplay,-47} │");
        }
        if (HttpStatusCode.HasValue)
            sb.AppendLine($"│ HTTP Status: {HttpStatusCode,-47} │");
        sb.AppendLine("└─────────────────────────────────────────────────────────────┘");
        sb.AppendLine();

        // Error details (WHAT went wrong)
        sb.AppendLine("┌─── ERROR DETAILS ───────────────────────────────────────────┐");
        sb.AppendLine($"│ Type:    {ErrorType,-51} │");
        var msgDisplay = ErrorMessage.Length > 51 ? ErrorMessage.Substring(0, 48) + "..." : ErrorMessage;
        sb.AppendLine($"│ Message: {msgDisplay,-51} │");
        if (!string.IsNullOrEmpty(ErrorCode))
            sb.AppendLine($"│ Code:    {ErrorCode,-51} │");
        sb.AppendLine("└─────────────────────────────────────────────────────────────┘");
        sb.AppendLine();

        // Task identification
        sb.AppendLine("┌─── TASK INFO ───────────────────────────────────────────────┐");
        sb.AppendLine($"│ Task ID:   {TaskId,-49} │");
        if (!string.IsNullOrEmpty(TaskName))
            sb.AppendLine($"│ Task Name: {TaskName,-49} │");
        sb.AppendLine("└─────────────────────────────────────────────────────────────┘");
        sb.AppendLine();

        // Timing
        sb.AppendLine("┌─── TIMING ──────────────────────────────────────────────────┐");
        sb.AppendLine($"│ Duration until error: {DurationUntilErrorMs}ms");
        sb.AppendLine($"│ Retry attempts:       {RetryAttempts}/{(MaxRetries > 0 ? MaxRetries.ToString() : "∞")}");
        sb.AppendLine($"│ Error occurred at:    {OccurredAt:yyyy-MM-dd HH:mm:ss} UTC");
        sb.AppendLine("└─────────────────────────────────────────────────────────────┘");
        sb.AppendLine();

        // Recommended action
        sb.AppendLine("┌─── RECOMMENDED ACTION ──────────────────────────────────────┐");
        if (!string.IsNullOrEmpty(Suggestion))
            sb.AppendLine($"│ {Suggestion}");
        if (!string.IsNullOrEmpty(SupportAction))
            sb.AppendLine($"│ Support: {SupportAction}");
        sb.AppendLine("└─────────────────────────────────────────────────────────────┘");

        return sb.ToString();
    }

    /// <summary>
    /// Gets escalation routing information based on error type and service category.
    /// Helps support staff immediately know who to contact.
    /// </summary>
    public (string RouteToTeam, string Category, string Urgency) GetEscalationInfo()
    {
        // If explicit owner is set, use that
        if (!string.IsNullOrEmpty(ServiceOwner))
        {
            return (ServiceOwner, ServiceCategory.ToString(), GetUrgencyLevel());
        }

        // Route based on service category and error type
        var routeTo = (ServiceCategory, ErrorType) switch
        {
            // Infrastructure issues - route to platform/ops
            (ServiceCategory.Infrastructure, _) => "Platform/Infrastructure Team",

            // Third-party API issues
            (ServiceCategory.ThirdParty, TaskErrorType.RateLimitError) => $"Check {GetEffectiveServiceName() ?? "third-party"} rate limits - may need account upgrade",
            (ServiceCategory.ThirdParty, TaskErrorType.AuthenticationError) => $"Check API credentials for {GetEffectiveServiceName() ?? "third-party service"}",
            (ServiceCategory.ThirdParty, _) => $"{GetEffectiveServiceName() ?? "Third-party"} vendor support",

            // Internal service issues based on error type
            (_, TaskErrorType.Timeout) => $"Service team for {GetEffectiveServiceName() ?? "target service"} - check performance",
            (_, TaskErrorType.NetworkError) => $"Network/Platform team - cannot reach {GetEffectiveServiceName() ?? "service"}",
            (_, TaskErrorType.AuthenticationError) => $"Security team - auth failure for {GetEffectiveServiceName() ?? "service"}",
            (_, TaskErrorType.RateLimitError) => $"Service team for {GetEffectiveServiceName() ?? "service"} - increase limits",
            (_, TaskErrorType.HttpError) when HttpStatusCode >= 500 => $"Service team for {GetEffectiveServiceName() ?? "service"} - server error",
            (_, TaskErrorType.HttpError) when HttpStatusCode >= 400 => $"Workflow team - check request to {GetEffectiveServiceName() ?? "service"}",
            (_, TaskErrorType.ValidationError) => "Workflow team - schema mismatch",
            (_, TaskErrorType.ConfigurationError) => "Workflow team - task configuration issue",

            _ => $"Service team for {GetEffectiveServiceName() ?? "unknown service"}"
        };

        return (routeTo, ServiceCategory.ToString(), GetUrgencyLevel());
    }

    private string GetUrgencyLevel()
    {
        return ErrorType switch
        {
            TaskErrorType.NetworkError => "HIGH - Service unreachable",
            TaskErrorType.Timeout => "MEDIUM - Performance issue",
            TaskErrorType.AuthenticationError => "HIGH - Access blocked",
            TaskErrorType.RateLimitError => "MEDIUM - Throttled",
            TaskErrorType.HttpError when HttpStatusCode >= 500 => "HIGH - Server error",
            TaskErrorType.HttpError when HttpStatusCode >= 400 => "LOW - Client error",
            _ => "MEDIUM"
        };
    }

    /// <summary>
    /// Creates a TaskErrorInfo from an exception and HTTP context
    /// </summary>
    public static TaskErrorInfo FromException(
        Exception ex,
        string taskId,
        string? taskName = null,
        string? serviceUrl = null,
        string? httpMethod = null,
        int retryAttempts = 0)
    {
        var errorInfo = new TaskErrorInfo
        {
            TaskId = taskId,
            TaskName = taskName,
            ErrorMessage = ex.Message,
            ServiceUrl = serviceUrl,
            HttpMethod = httpMethod,
            RetryAttempts = retryAttempts,
            OccurredAt = DateTime.UtcNow
        };

        // Classify error type based on exception
        errorInfo.ErrorType = ClassifyException(ex);

        // Extract service name from URL if possible
        if (!string.IsNullOrEmpty(serviceUrl))
        {
            try
            {
                var uri = new Uri(serviceUrl);
                errorInfo.ServiceName = uri.Host;
            }
            catch
            {
                // Ignore URL parsing errors
            }
        }

        // Set retryability based on error type
        errorInfo.IsRetryable = IsRetryableError(errorInfo.ErrorType);

        // Generate suggestions based on error type
        errorInfo.Suggestion = GenerateSuggestion(errorInfo);

        return errorInfo;
    }

    /// <summary>
    /// Creates a TaskErrorInfo from an HTTP response
    /// </summary>
    public static TaskErrorInfo FromHttpResponse(
        int statusCode,
        string? responseBody,
        string taskId,
        string? taskName = null,
        string? serviceUrl = null,
        string? httpMethod = null,
        int retryAttempts = 0)
    {
        var errorInfo = new TaskErrorInfo
        {
            TaskId = taskId,
            TaskName = taskName,
            HttpStatusCode = statusCode,
            ServiceUrl = serviceUrl,
            HttpMethod = httpMethod,
            RetryAttempts = retryAttempts,
            OccurredAt = DateTime.UtcNow
        };

        // Classify error type based on status code
        errorInfo.ErrorType = ClassifyHttpStatus(statusCode);

        // Set error message based on status
        errorInfo.ErrorMessage = GetHttpErrorMessage(statusCode);

        // Truncate response body for preview
        if (!string.IsNullOrEmpty(responseBody))
        {
            errorInfo.ResponseBodyPreview = responseBody.Length > 500
                ? responseBody.Substring(0, 500) + "..."
                : responseBody;
        }

        // Extract service name from URL
        if (!string.IsNullOrEmpty(serviceUrl))
        {
            try
            {
                var uri = new Uri(serviceUrl);
                errorInfo.ServiceName = uri.Host;
            }
            catch
            {
                // Ignore URL parsing errors
            }
        }

        // Set retryability
        errorInfo.IsRetryable = IsRetryableHttpStatus(statusCode);

        // Generate suggestions
        errorInfo.Suggestion = GenerateSuggestion(errorInfo);

        // Analyze error response compliance with RFC 7807 (only for error responses)
        if (statusCode >= 400)
        {
            AnalyzeResponseCompliance(errorInfo, responseBody, statusCode);
        }

        return errorInfo;
    }

    /// <summary>
    /// Analyzes the response body for RFC 7807 compliance and populates compliance fields
    /// </summary>
    private static void AnalyzeResponseCompliance(TaskErrorInfo errorInfo, string? responseBody, int? statusCode)
    {
        try
        {
            var analyzer = new ErrorResponseAnalyzer();
            var complianceResult = analyzer.Analyze(responseBody, statusCode);

            errorInfo.ResponseCompliance = complianceResult.Compliance.ToString();
            errorInfo.ResponseComplianceScore = complianceResult.Score;
            errorInfo.ResponseComplianceIssues = complianceResult.Issues;
            errorInfo.ResponseComplianceRecommendations = complianceResult.Recommendations;
            errorInfo.ResponseComplianceSummary = complianceResult.Summary;
        }
        catch
        {
            // If analysis fails, leave compliance fields null - non-critical feature
        }
    }

    private static TaskErrorType ClassifyException(Exception ex)
    {
        return ex switch
        {
            TimeoutException => TaskErrorType.Timeout,
            TaskCanceledException tce when tce.CancellationToken.IsCancellationRequested => TaskErrorType.Timeout,
            OperationCanceledException => TaskErrorType.Timeout,
            HttpRequestException hre when hre.Message.Contains("401") => TaskErrorType.AuthenticationError,
            HttpRequestException hre when hre.Message.Contains("403") => TaskErrorType.AuthenticationError,
            HttpRequestException hre when hre.Message.Contains("429") => TaskErrorType.RateLimitError,
            HttpRequestException => TaskErrorType.NetworkError,
            ArgumentException => TaskErrorType.ConfigurationError,
            InvalidOperationException => TaskErrorType.ConfigurationError,
            _ => TaskErrorType.UnknownError
        };
    }

    private static TaskErrorType ClassifyHttpStatus(int statusCode)
    {
        return statusCode switch
        {
            401 or 403 => TaskErrorType.AuthenticationError,
            429 => TaskErrorType.RateLimitError,
            >= 400 and < 500 => TaskErrorType.HttpError,
            >= 500 => TaskErrorType.HttpError,
            _ => TaskErrorType.UnknownError
        };
    }

    private static string GetHttpErrorMessage(int statusCode)
    {
        return statusCode switch
        {
            400 => "Bad Request - The request was malformed or invalid",
            401 => "Unauthorized - Authentication is required",
            403 => "Forbidden - Access is denied",
            404 => "Not Found - The requested resource does not exist",
            408 => "Request Timeout - The server timed out waiting for the request",
            429 => "Too Many Requests - Rate limit exceeded",
            500 => "Internal Server Error - The server encountered an error",
            502 => "Bad Gateway - The upstream server returned an invalid response",
            503 => "Service Unavailable - The service is temporarily unavailable",
            504 => "Gateway Timeout - The upstream server timed out",
            _ => $"HTTP Error {statusCode}"
        };
    }

    private static bool IsRetryableError(TaskErrorType errorType)
    {
        return errorType switch
        {
            TaskErrorType.Timeout => true,
            TaskErrorType.NetworkError => true,
            TaskErrorType.RateLimitError => true,
            TaskErrorType.HttpError => true, // May be retryable for 5xx
            _ => false
        };
    }

    private static bool IsRetryableHttpStatus(int statusCode)
    {
        return statusCode switch
        {
            408 => true,  // Request Timeout
            429 => true,  // Too Many Requests
            >= 500 and <= 599 => true, // Server errors
            _ => false
        };
    }

    private static string GenerateSuggestion(TaskErrorInfo error)
    {
        var serviceName = error.GetEffectiveServiceName() ?? "the service";
        var serviceNameUpper = serviceName.ToUpperInvariant();

        return error.ErrorType switch
        {
            TaskErrorType.Timeout =>
                $"[{serviceNameUpper}] Request timed out. " +
                $"SELF-SERVICE: (1) Check if {serviceName} is under heavy load via its monitoring dashboard, " +
                $"(2) Increase the task timeout in workflow definition if needed, " +
                $"(3) Check recent deployments to {serviceName} that may have introduced latency. " +
                $"ESCALATE TO: {serviceName} service team if issue persists.",

            TaskErrorType.NetworkError =>
                $"[{serviceNameUpper}] Network unreachable. " +
                $"SELF-SERVICE: (1) Verify {serviceName} is deployed and running (check kubernetes/container status), " +
                $"(2) Check DNS resolution for the service URL, " +
                $"(3) Verify network policies/firewall rules allow traffic from workflow engine. " +
                $"ESCALATE TO: Platform/Network team if service is confirmed running but unreachable.",

            TaskErrorType.AuthenticationError =>
                $"[{serviceNameUpper}] Authentication failed ({(error.HttpStatusCode == 401 ? "credentials invalid/expired" : "access forbidden")}). " +
                $"SELF-SERVICE: (1) Check if API key/token for {serviceName} has expired, " +
                $"(2) Verify the credentials in your secrets management are correct, " +
                $"(3) Check if the service account has required permissions. " +
                $"ESCALATE TO: Security team if credentials are valid but access is denied.",

            TaskErrorType.RateLimitError =>
                $"[{serviceNameUpper}] Rate limit exceeded (HTTP 429). " +
                $"SELF-SERVICE: (1) Reduce workflow concurrency or add delays between requests, " +
                $"(2) Check {serviceName} rate limit documentation for current limits, " +
                $"(3) Review if multiple workflows are hitting the same endpoint. " +
                $"ESCALATE TO: {serviceName} service team to request rate limit increase if needed.",

            TaskErrorType.ValidationError =>
                $"Schema validation failed. " +
                $"SELF-SERVICE: (1) Compare your request payload against the task's input schema, " +
                $"(2) Check if {serviceName} API contract has changed recently, " +
                $"(3) Verify all required fields are present and have correct types. " +
                $"ESCALATE TO: Workflow team if schema mismatch is due to API contract change.",

            TaskErrorType.ConfigurationError =>
                $"Task configuration error. " +
                $"SELF-SERVICE: (1) Check the task definition YAML for syntax errors, " +
                $"(2) Verify all required properties (url, method, etc.) are set, " +
                $"(3) Ensure template expressions ({{{{...}}}}) are valid. " +
                $"ESCALATE TO: Workflow team for help with complex configurations.",

            TaskErrorType.HttpError when error.HttpStatusCode >= 500 =>
                $"[{serviceNameUpper}] Server error (HTTP {error.HttpStatusCode}). " +
                $"The problem is ON THE SERVICE SIDE, not the workflow. " +
                $"SELF-SERVICE: (1) Check {serviceName} logs for the error details, " +
                $"(2) Check {serviceName} monitoring for error rate spikes, " +
                $"(3) Check recent deployments to {serviceName}. " +
                $"ESCALATE TO: {serviceName} service team immediately for 500 errors.",

            TaskErrorType.HttpError when error.HttpStatusCode == 404 =>
                $"[{serviceNameUpper}] Resource not found (HTTP 404). " +
                $"SELF-SERVICE: (1) Verify the URL path is correct: {error.ServiceUrl}, " +
                $"(2) Check if the resource ID in the request exists, " +
                $"(3) Ensure {serviceName} hasn't deprecated this endpoint. " +
                $"ESCALATE TO: Workflow team if URL is correct but endpoint doesn't exist.",

            TaskErrorType.HttpError when error.HttpStatusCode >= 400 =>
                $"[{serviceNameUpper}] Client error (HTTP {error.HttpStatusCode}). " +
                $"The request was REJECTED by {serviceName}. " +
                $"SELF-SERVICE: (1) Check the response body for specific error details, " +
                $"(2) Verify request parameters match the API contract, " +
                $"(3) Ensure input data is valid (no nulls where required, correct formats). " +
                $"ESCALATE TO: Workflow team for help interpreting the error.",

            _ =>
                $"Unexpected error calling {serviceName}. " +
                $"SELF-SERVICE: (1) Check the full error message and stack trace, " +
                $"(2) Review recent workflow or service changes, " +
                $"(3) Check if this is a transient issue by retrying. " +
                $"ESCALATE TO: Workflow team with full error details."
        };
    }

    #endregion
}
