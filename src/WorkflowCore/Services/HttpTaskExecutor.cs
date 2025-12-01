using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using WorkflowCore.Interfaces;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

public interface IHttpTaskExecutor
{
    Task<TaskExecutionResult> ExecuteAsync(
        WorkflowTaskSpec taskSpec,
        TemplateContext context,
        CancellationToken cancellationToken = default);
}

public class HttpTaskExecutor : IHttpTaskExecutor
{
    private readonly ITemplateResolver _templateResolver;
    private readonly ISchemaValidator _schemaValidator;
    private readonly IRetryPolicy _retryPolicy;
    private readonly IHttpClientWrapper _httpClient;
    private readonly IResponseHandlerFactory _responseHandlerFactory;

    public HttpTaskExecutor(
        ITemplateResolver templateResolver,
        ISchemaValidator schemaValidator,
        IRetryPolicy retryPolicy,
        IHttpClientWrapper httpClient,
        IResponseHandlerFactory responseHandlerFactory)
    {
        _templateResolver = templateResolver ?? throw new ArgumentNullException(nameof(templateResolver));
        _schemaValidator = schemaValidator ?? throw new ArgumentNullException(nameof(schemaValidator));
        _retryPolicy = retryPolicy ?? throw new ArgumentNullException(nameof(retryPolicy));
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _responseHandlerFactory = responseHandlerFactory ?? throw new ArgumentNullException(nameof(responseHandlerFactory));
    }

    public async Task<TaskExecutionResult> ExecuteAsync(
        WorkflowTaskSpec taskSpec,
        TemplateContext context,
        CancellationToken cancellationToken = default)
    {
        // Support both 'http' (new) and 'request' (old) properties for backward compatibility
        var httpRequest = taskSpec.Http ?? taskSpec.Request;

        if (httpRequest == null)
        {
            return new TaskExecutionResult
            {
                Success = false,
                Errors = new List<string> { "Task request definition is null" },
                ErrorInfo = new TaskErrorInfo
                {
                    ErrorType = TaskErrorType.ConfigurationError,
                    ErrorMessage = "Task request definition is null",
                    Suggestion = "Ensure the task has either 'http' or 'request' configuration defined."
                }
            };
        }

        var stopwatch = Stopwatch.StartNew();
        var startTime = DateTime.UtcNow;
        var attemptNumber = 0;
        Exception? lastException = null;
        string? resolvedUrl = null;
        string? httpMethod = httpRequest.Method?.ToUpperInvariant();

        // Parse and apply timeout if specified
        var timeout = TimeoutParser.Parse(taskSpec.Timeout);
        var timeoutCts = timeout.HasValue
            ? CancellationTokenSource.CreateLinkedTokenSource(cancellationToken)
            : null;

        if (timeoutCts != null)
        {
            timeoutCts.CancelAfter(timeout!.Value);
        }

        var effectiveToken = timeoutCts?.Token ?? cancellationToken;

        try
        {
            while (true)
            {
                attemptNumber++;

                try
                {
                    // Build HTTP request with resolved templates
                    var request = await BuildHttpRequestAsync(httpRequest, context, effectiveToken);
                    resolvedUrl = request.RequestUri?.ToString();

                    // Execute HTTP request
                    var response = await _httpClient.SendAsync(request, effectiveToken);

                    // Check for non-success status codes and create structured error
                    if (!response.IsSuccessStatusCode)
                    {
                        stopwatch.Stop();
                        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

                        return new TaskExecutionResult
                        {
                            Success = false,
                            Errors = new List<string>
                            {
                                $"HTTP {(int)response.StatusCode}: {response.ReasonPhrase}"
                            },
                            ErrorInfo = CreateHttpErrorInfo(
                                (int)response.StatusCode,
                                responseBody,
                                resolvedUrl,
                                httpMethod,
                                attemptNumber - 1,
                                stopwatch.Elapsed,
                                startTime),
                            RetryCount = attemptNumber - 1,
                            Duration = stopwatch.Elapsed
                        };
                    }

                    // Parse response using appropriate handler based on content type
                    var contentType = response.Content.Headers.ContentType?.MediaType ?? "application/json";
                    var handler = _responseHandlerFactory.GetHandler(contentType);
                    var output = await handler.HandleAsync(response, cancellationToken);

                    // Success
                    stopwatch.Stop();
                    return new TaskExecutionResult
                    {
                        Success = true,
                        Output = output,
                        RetryCount = attemptNumber - 1,
                        Duration = stopwatch.Elapsed
                    };
                }
                catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or OperationCanceledException)
                {
                    lastException = ex;

                    // Check if we should retry
                    if (!_retryPolicy.ShouldRetry(ex, attemptNumber))
                    {
                        break;
                    }

                    // Wait before retrying
                    var delay = _retryPolicy.CalculateDelay(attemptNumber);
                    await Task.Delay(delay, cancellationToken);
                }
            }

            // All retries exhausted or non-retryable error
            stopwatch.Stop();
            return new TaskExecutionResult
            {
                Success = false,
                Errors = new List<string>
                {
                    lastException?.Message ?? "Unknown error occurred"
                },
                ErrorInfo = CreateExceptionErrorInfo(
                    lastException,
                    resolvedUrl,
                    httpMethod,
                    attemptNumber - 1,
                    stopwatch.Elapsed,
                    startTime),
                RetryCount = attemptNumber - 1,
                Duration = stopwatch.Elapsed
            };
        }
        finally
        {
            timeoutCts?.Dispose();
        }
    }

    /// <summary>
    /// Creates structured error info from an HTTP response status code
    /// </summary>
    private static TaskErrorInfo CreateHttpErrorInfo(
        int statusCode,
        string? responseBody,
        string? serviceUrl,
        string? httpMethod,
        int retryAttempts,
        TimeSpan duration,
        DateTime startTime)
    {
        var errorInfo = TaskErrorInfo.FromHttpResponse(
            statusCode,
            responseBody,
            taskId: "", // TaskId will be set by orchestrator
            taskName: null,
            serviceUrl: serviceUrl,
            httpMethod: httpMethod,
            retryAttempts: retryAttempts);

        errorInfo.TaskStartedAt = startTime;
        errorInfo.DurationUntilErrorMs = (long)duration.TotalMilliseconds;

        return errorInfo;
    }

    /// <summary>
    /// Creates structured error info from an exception
    /// </summary>
    private static TaskErrorInfo CreateExceptionErrorInfo(
        Exception? ex,
        string? serviceUrl,
        string? httpMethod,
        int retryAttempts,
        TimeSpan duration,
        DateTime startTime)
    {
        if (ex == null)
        {
            return new TaskErrorInfo
            {
                ErrorType = TaskErrorType.UnknownError,
                ErrorMessage = "Unknown error occurred",
                ServiceUrl = serviceUrl,
                HttpMethod = httpMethod,
                RetryAttempts = retryAttempts,
                TaskStartedAt = startTime,
                DurationUntilErrorMs = (long)duration.TotalMilliseconds
            };
        }

        var errorInfo = TaskErrorInfo.FromException(
            ex,
            taskId: "", // TaskId will be set by orchestrator
            taskName: null,
            serviceUrl: serviceUrl,
            httpMethod: httpMethod,
            retryAttempts: retryAttempts);

        errorInfo.TaskStartedAt = startTime;
        errorInfo.DurationUntilErrorMs = (long)duration.TotalMilliseconds;

        return errorInfo;
    }

    private async Task<HttpRequestMessage> BuildHttpRequestAsync(
        HttpRequestDefinition requestDef,
        TemplateContext context,
        CancellationToken cancellationToken)
    {
        // Resolve URL template
        var resolvedUrl = await _templateResolver.ResolveAsync(requestDef.Url, context);

        // Create HTTP method
        var method = requestDef.Method.ToUpperInvariant() switch
        {
            "GET" => HttpMethod.Get,
            "POST" => HttpMethod.Post,
            "PUT" => HttpMethod.Put,
            "DELETE" => HttpMethod.Delete,
            "PATCH" => HttpMethod.Patch,
            _ => throw new ArgumentException($"Unsupported HTTP method: {requestDef.Method}")
        };

        var request = new HttpRequestMessage(method, resolvedUrl);

        // Add headers
        if (requestDef.Headers != null)
        {
            foreach (var (key, value) in requestDef.Headers)
            {
                var resolvedValue = await _templateResolver.ResolveAsync(value, context);
                request.Headers.Add(key, resolvedValue);
            }
        }

        // Add body for POST/PUT/PATCH
        if (!string.IsNullOrEmpty(requestDef.Body) &&
            (method == HttpMethod.Post || method == HttpMethod.Put || method == HttpMethod.Patch))
        {
            var resolvedBody = await _templateResolver.ResolveAsync(requestDef.Body, context);
            request.Content = new StringContent(resolvedBody, Encoding.UTF8, "application/json");
        }

        return request;
    }
}
