using System.Text;

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
    /// </summary>
    public string? ServiceName { get; set; }

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
    /// Generates a concise summary of the error for logs and alerts
    /// </summary>
    public string GetSummary()
    {
        var sb = new StringBuilder();
        sb.Append($"Task '{TaskId}' failed: {ErrorType}");

        if (HttpStatusCode.HasValue)
        {
            sb.Append($" (HTTP {HttpStatusCode})");
        }

        if (!string.IsNullOrEmpty(ServiceName))
        {
            sb.Append($" calling {ServiceName}");
        }

        if (!string.IsNullOrEmpty(ErrorMessage))
        {
            sb.Append($" - {ErrorMessage}");
        }

        return sb.ToString();
    }

    /// <summary>
    /// Generates a detailed description for support staff
    /// </summary>
    public string GetSupportDescription()
    {
        var sb = new StringBuilder();

        // Task identification
        sb.AppendLine("=== Task Error Report ===");
        sb.AppendLine($"Task ID: {TaskId}");
        if (!string.IsNullOrEmpty(TaskName))
            sb.AppendLine($"Task Name: {TaskName}");
        if (!string.IsNullOrEmpty(TaskDescription))
            sb.AppendLine($"Description: {TaskDescription}");

        sb.AppendLine();

        // Error details
        sb.AppendLine("--- Error Details ---");
        sb.AppendLine($"Type: {ErrorType}");
        sb.AppendLine($"Message: {ErrorMessage}");
        if (!string.IsNullOrEmpty(ErrorCode))
            sb.AppendLine($"Code: {ErrorCode}");

        sb.AppendLine();

        // Service details
        if (!string.IsNullOrEmpty(ServiceName) || !string.IsNullOrEmpty(ServiceUrl))
        {
            sb.AppendLine("--- Service Details ---");
            if (!string.IsNullOrEmpty(ServiceName))
                sb.AppendLine($"Service: {ServiceName}");
            if (!string.IsNullOrEmpty(HttpMethod))
                sb.AppendLine($"Method: {HttpMethod}");
            if (!string.IsNullOrEmpty(ServiceUrl))
                sb.AppendLine($"URL: {ServiceUrl}");
            if (HttpStatusCode.HasValue)
                sb.AppendLine($"Status Code: {HttpStatusCode}");
            sb.AppendLine();
        }

        // Timing
        sb.AppendLine("--- Timing ---");
        sb.AppendLine($"Duration until error: {DurationUntilErrorMs}ms");
        sb.AppendLine($"Retry attempts: {RetryAttempts}");
        if (MaxRetries > 0)
            sb.AppendLine($"Max retries: {MaxRetries}");

        // Guidance
        if (!string.IsNullOrEmpty(Suggestion) || !string.IsNullOrEmpty(SupportAction))
        {
            sb.AppendLine();
            sb.AppendLine("--- Recommended Action ---");
            if (!string.IsNullOrEmpty(Suggestion))
                sb.AppendLine(Suggestion);
            if (!string.IsNullOrEmpty(SupportAction))
                sb.AppendLine(SupportAction);
        }

        return sb.ToString();
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

        return errorInfo;
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
        return error.ErrorType switch
        {
            TaskErrorType.Timeout =>
                $"The request to {error.ServiceName ?? "the service"} timed out. " +
                "Consider increasing the timeout or checking if the service is under heavy load.",

            TaskErrorType.NetworkError =>
                $"Could not connect to {error.ServiceName ?? "the service"}. " +
                "Verify the service is running and accessible from the workflow engine.",

            TaskErrorType.AuthenticationError =>
                $"Authentication failed for {error.ServiceName ?? "the service"}. " +
                "Check that the credentials/API key are valid and have not expired.",

            TaskErrorType.RateLimitError =>
                $"Rate limit exceeded for {error.ServiceName ?? "the service"}. " +
                "Reduce request frequency or contact the service owner to increase limits.",

            TaskErrorType.ValidationError =>
                "The request or response did not match the expected schema. " +
                "Verify the task configuration and API contract.",

            TaskErrorType.ConfigurationError =>
                "The task is misconfigured. " +
                "Check the task definition for missing or invalid properties.",

            TaskErrorType.HttpError when error.HttpStatusCode >= 500 =>
                $"The {error.ServiceName ?? "service"} returned a server error ({error.HttpStatusCode}). " +
                "Check the service logs or contact the service team.",

            TaskErrorType.HttpError when error.HttpStatusCode >= 400 =>
                $"The request to {error.ServiceName ?? "the service"} was rejected ({error.HttpStatusCode}). " +
                "Verify the request parameters and API contract.",

            _ => "An unexpected error occurred. Check the logs for more details."
        };
    }

    #endregion
}
