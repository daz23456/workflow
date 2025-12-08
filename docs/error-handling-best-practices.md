# Error Handling Best Practices

This document outlines best practices for error responses in workflow tasks. Following these guidelines will help ensure your error responses are helpful for both humans and machines.

## Error Quality Rating System

The workflow engine analyzes error responses and assigns a quality rating (0-5 stars) based on five criteria:

| Criterion | Description | Example |
|-----------|-------------|---------|
| Human-Readable Message | Clear error message for users | `"User not found"` |
| Machine-Readable Error Code | Standardized code for automation | `USER_NOT_FOUND` |
| Appropriate HTTP Status | Correct status code for the error type | `404 Not Found` |
| Request Correlation ID | Unique ID for debugging | `req_abc123xyz` |
| Actionable Suggestion | Guidance on how to resolve | `"Check the user ID and try again"` |

## Best Practices

### 1. Always Include a Human-Readable Message

Error messages should be clear and understandable to end users.

**Good:**
```json
{
  "message": "The requested user could not be found. Please verify the user ID."
}
```

**Bad:**
```json
{
  "error": "ERR_NOSUCH_ENTITY"
}
```

### 2. Provide Machine-Readable Error Codes

Use consistent, standardized error codes that clients can programmatically handle.

**Recommended error code format:**
- Use SCREAMING_SNAKE_CASE
- Be specific but not overly verbose
- Group related errors with prefixes

**Common error codes:**
| Code | Meaning |
|------|---------|
| `VALIDATION_ERROR` | Input validation failed |
| `NOT_FOUND` | Resource does not exist |
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Permission denied |
| `CONFLICT` | Resource state conflict |
| `RATE_LIMITED` | Too many requests |
| `INTERNAL_ERROR` | Server-side error |

**Example:**
```json
{
  "message": "Invalid email format",
  "errorCode": "VALIDATION_ERROR",
  "field": "email"
}
```

### 3. Use Appropriate HTTP Status Codes

Match the HTTP status code to the error type:

| Status | When to Use |
|--------|-------------|
| `400 Bad Request` | Invalid input, validation errors |
| `401 Unauthorized` | Missing or invalid authentication |
| `403 Forbidden` | Authenticated but not authorized |
| `404 Not Found` | Resource doesn't exist |
| `409 Conflict` | State conflict (duplicate, etc.) |
| `422 Unprocessable Entity` | Semantic validation errors |
| `429 Too Many Requests` | Rate limiting |
| `500 Internal Server Error` | Unexpected server errors |
| `502 Bad Gateway` | Upstream service error |
| `503 Service Unavailable` | Temporary unavailability |

### 4. Include Request Correlation IDs

Every error response should include a unique request ID for debugging.

**Example:**
```json
{
  "message": "Database connection failed",
  "errorCode": "INTERNAL_ERROR",
  "requestId": "req_1a2b3c4d5e6f",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Benefits:**
- Correlate logs across services
- Help support teams investigate issues
- Enable users to reference specific requests

### 5. Provide Actionable Suggestions

Tell users what they can do to resolve the error.

**Example:**
```json
{
  "message": "Rate limit exceeded",
  "errorCode": "RATE_LIMITED",
  "suggestion": "Please wait 60 seconds before retrying. Consider implementing exponential backoff.",
  "retryAfter": 60
}
```

## Complete Error Response Example

Here's an example of a 5-star error response:

```json
{
  "message": "The specified user account does not exist",
  "errorCode": "USER_NOT_FOUND",
  "httpStatus": 404,
  "requestId": "req_abc123xyz",
  "timestamp": "2024-01-15T10:30:00Z",
  "suggestion": "Verify the user ID is correct. If this is a new user, they may need to register first.",
  "details": {
    "userId": "usr_invalid123",
    "searchedIn": ["active_users", "pending_users"]
  },
  "documentation": "https://docs.example.com/errors/USER_NOT_FOUND"
}
```

## Error Response Schema (RFC 7807)

For maximum interoperability, consider using the RFC 7807 Problem Details format:

```json
{
  "type": "https://example.com/errors/user-not-found",
  "title": "User Not Found",
  "status": 404,
  "detail": "User with ID 'usr_123' was not found in the system",
  "instance": "/api/users/usr_123",
  "requestId": "req_abc123xyz"
}
```

## Quality Scoring

The workflow engine automatically scores error responses:

| Stars | Quality Level | Criteria Met |
|-------|---------------|--------------|
| 5 | Excellent | All 5 criteria |
| 4 | Good | 4 of 5 criteria |
| 3 | Acceptable | 3 of 5 criteria |
| 2 | Needs Work | 2 of 5 criteria |
| 1 | Poor | 1 criterion |
| 0 | Unacceptable | No criteria met |

## UI Components

The workflow UI provides components to display error quality:

### Star Rating
Shows the overall quality score as filled/empty stars.

### Quality Breakdown
Displays which criteria were met/unmet with details.

### Improvement Tips
Provides actionable suggestions for missing criteria.

### Quality Badge
Compact indicator for use on cards and lists.

## Related Resources

- [RFC 7807: Problem Details for HTTP APIs](https://tools.ietf.org/html/rfc7807)
- [HTTP Status Codes (MDN)](https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)
- [API Error Handling Best Practices](https://docs.example.com/api-errors)
