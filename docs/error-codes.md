# Workflow Error Codes Reference

This document describes all error types and codes returned by the workflow orchestration engine. These structured errors help support staff quickly identify issues and take appropriate action.

## Error Types

### Timeout
**Type:** `Timeout`

The task execution exceeded the configured timeout period.

| Field | Example Value |
|-------|---------------|
| errorType | `Timeout` |
| errorMessage | `The operation timed out after 30000ms` |
| isRetryable | `true` |

**Common Causes:**
- External service is slow or unresponsive
- Network latency issues
- Service under heavy load
- Timeout configured too low for the operation

**Suggested Actions:**
1. Check if the target service is healthy
2. Review service response times in monitoring
3. Consider increasing the task timeout if the operation legitimately takes longer
4. Check for network issues between the workflow engine and the service

---

### HttpError
**Type:** `HttpError`

The HTTP request completed but returned a non-success status code (4xx or 5xx).

| Field | Example Value |
|-------|---------------|
| errorType | `HttpError` |
| httpStatusCode | `500`, `502`, `503`, `504` |
| errorMessage | `Internal Server Error` |
| isRetryable | `true` (for 5xx), `false` (for most 4xx) |

**Common Status Codes:**

| Code | Meaning | Retryable | Action |
|------|---------|-----------|--------|
| 400 | Bad Request | No | Check request payload and parameters |
| 404 | Not Found | No | Verify the resource exists |
| 405 | Method Not Allowed | No | Check HTTP method configuration |
| 408 | Request Timeout | Yes | Retry with backoff |
| 500 | Internal Server Error | Yes | Check target service logs |
| 502 | Bad Gateway | Yes | Check upstream service health |
| 503 | Service Unavailable | Yes | Service may be overloaded or restarting |
| 504 | Gateway Timeout | Yes | Check service response times |

**Suggested Actions:**
1. Check the `httpStatusCode` to understand the specific error
2. Review `responseBodyPreview` for error details from the service
3. For 5xx errors: Check target service health and logs
4. For 4xx errors: Verify request configuration and input data

---

### NetworkError
**Type:** `NetworkError`

The HTTP request failed at the network level before receiving a response.

| Field | Example Value |
|-------|---------------|
| errorType | `NetworkError` |
| errorMessage | `Connection refused` |
| errorCode | `ECONNREFUSED`, `ETIMEDOUT`, `ENOTFOUND` |
| isRetryable | `true` |

**Common Error Codes:**

| Code | Meaning | Action |
|------|---------|--------|
| ECONNREFUSED | Connection refused | Service is not running or not listening on the expected port |
| ETIMEDOUT | Connection timed out | Network connectivity issues or firewall blocking |
| ENOTFOUND | DNS lookup failed | Invalid hostname or DNS resolution issues |
| ECONNRESET | Connection reset | Service crashed or network instability |
| EHOSTUNREACH | Host unreachable | Network routing issues |

**Suggested Actions:**
1. Verify the target service is running and accessible
2. Check network connectivity from the workflow engine
3. Verify DNS resolution for the service hostname
4. Check firewall rules and security groups
5. Review service URL configuration

---

### AuthenticationError
**Type:** `AuthenticationError`

Authentication or authorization failed when calling the external service.

| Field | Example Value |
|-------|---------------|
| errorType | `AuthenticationError` |
| httpStatusCode | `401` or `403` |
| errorMessage | `Unauthorized - Authentication is required` |
| isRetryable | `false` |

**Status Codes:**

| Code | Meaning | Action |
|------|---------|--------|
| 401 | Unauthorized | Invalid or missing credentials |
| 403 | Forbidden | Valid credentials but insufficient permissions |

**Suggested Actions:**
1. Verify API keys or tokens are valid and not expired
2. Check that credentials have the required permissions
3. Ensure authentication headers are correctly configured in the task
4. Review the target service's authentication requirements
5. Check if the API key needs to be rotated or renewed

---

### RateLimitError
**Type:** `RateLimitError`

The external service rejected the request due to rate limiting.

| Field | Example Value |
|-------|---------------|
| errorType | `RateLimitError` |
| httpStatusCode | `429` |
| errorMessage | `Too Many Requests - Rate limit exceeded` |
| isRetryable | `true` |

**Suggested Actions:**
1. Reduce request frequency to the target service
2. Implement request batching where possible
3. Contact the service owner to increase rate limits
4. Add delays between workflow executions
5. Check the `Retry-After` header in the response for wait time

---

### ValidationError
**Type:** `ValidationError`

The request or response did not match the expected schema.

| Field | Example Value |
|-------|---------------|
| errorType | `ValidationError` |
| errorMessage | `Required field 'userId' is missing` |
| isRetryable | `false` |

**Common Causes:**
- Input data doesn't match the task's input schema
- Response from service doesn't match the expected output schema
- Missing required fields
- Incorrect data types

**Suggested Actions:**
1. Verify input data matches the workflow's input schema
2. Check the task's output schema matches the service's actual response
3. Review the error message for specific field validation failures
4. Update schemas if the service API has changed

---

### ConfigurationError
**Type:** `ConfigurationError`

The task is misconfigured and cannot be executed.

| Field | Example Value |
|-------|---------------|
| errorType | `ConfigurationError` |
| errorMessage | `Task request definition is null` |
| isRetryable | `false` |

**Common Causes:**
- Missing `http` or `request` configuration in the task
- Invalid URL format
- Unsupported HTTP method
- Missing required task properties

**Suggested Actions:**
1. Review the task definition in the WorkflowTask CRD
2. Ensure all required fields are configured
3. Validate the URL format and HTTP method
4. Check for typos in configuration

---

### UnknownError
**Type:** `UnknownError`

An unexpected error occurred that doesn't fit other categories.

| Field | Example Value |
|-------|---------------|
| errorType | `UnknownError` |
| errorMessage | `Unknown error occurred` |
| isRetryable | `false` |

**Suggested Actions:**
1. Check the full error message for details
2. Review workflow engine logs for stack traces
3. If reproducible, report the issue with steps to reproduce

---

## Error Response Structure

All task errors include a structured `errorInfo` object:

```json
{
  "taskId": "fetch-user",
  "taskDetails": [
    {
      "taskId": "fetch-user",
      "taskRef": "user-lookup-task",
      "success": false,
      "errors": ["HTTP 503: Service Unavailable"],
      "errorInfo": {
        "taskId": "fetch-user",
        "taskName": "user-lookup-task",
        "errorType": "HttpError",
        "errorMessage": "Service Unavailable - The service is temporarily unavailable",
        "serviceName": "api.users.example.com",
        "serviceUrl": "https://api.users.example.com/v1/users/123",
        "httpMethod": "GET",
        "httpStatusCode": 503,
        "responseBodyPreview": "{\"error\":\"Service temporarily unavailable\"}",
        "retryAttempts": 3,
        "isRetryable": true,
        "occurredAt": "2024-01-15T10:30:45.123Z",
        "durationUntilErrorMs": 5432,
        "suggestion": "The api.users.example.com returned a server error (503). Check the service logs or contact the service team.",
        "summary": "Task 'fetch-user' failed: HttpError (HTTP 503) calling api.users.example.com"
      }
    }
  ]
}
```

## Error Field Reference

| Field | Type | Description |
|-------|------|-------------|
| `taskId` | string | Unique identifier of the task within the workflow |
| `taskName` | string | Human-readable name or reference of the task |
| `taskDescription` | string | Description of what the task does |
| `errorType` | string | Category of error (see types above) |
| `errorMessage` | string | Human-readable error description |
| `errorCode` | string | System error code (e.g., ECONNREFUSED) |
| `serviceName` | string | Hostname of the external service |
| `serviceUrl` | string | Full URL that was being called |
| `httpMethod` | string | HTTP method used (GET, POST, etc.) |
| `httpStatusCode` | integer | HTTP status code returned |
| `responseBodyPreview` | string | Truncated response body (max 500 chars) |
| `retryAttempts` | integer | Number of retry attempts made |
| `isRetryable` | boolean | Whether this error type can be retried |
| `occurredAt` | datetime | When the error occurred (UTC) |
| `durationUntilErrorMs` | integer | Time from task start to error (milliseconds) |
| `suggestion` | string | Recommended action to resolve the issue |
| `supportAction` | string | Instructions for support staff |
| `summary` | string | One-line summary for logs and alerts |

## Troubleshooting Workflow

1. **Check `errorType`** - Identifies the category of failure
2. **Review `httpStatusCode`** - For HTTP errors, indicates specific status
3. **Check `serviceName`** - Identifies which external service failed
4. **Review `suggestion`** - Provides actionable guidance
5. **Check `retryAttempts`** - Shows if retries were exhausted
6. **Review `responseBodyPreview`** - May contain service-specific error details
7. **Check `durationUntilErrorMs`** - Helps identify timeout vs immediate failures

## Support Escalation

When escalating issues to service teams, include:

1. The `summary` field for quick context
2. The `serviceName` and `serviceUrl` to identify the target
3. The `httpStatusCode` and `responseBodyPreview` for error details
4. The `occurredAt` timestamp for log correlation
5. The workflow execution ID for full trace lookup
