using FluentAssertions;
using WorkflowCore.Models;
using Xunit;

namespace WorkflowCore.Tests.Models;

public class TaskErrorInfoTests
{
    [Fact]
    public void TaskErrorInfo_ShouldHaveTaskIdentification()
    {
        // Arrange & Act
        var error = new TaskErrorInfo
        {
            TaskId = "fetch-user",
            TaskName = "Fetch User Details",
            TaskDescription = "Retrieves user information from the user service"
        };

        // Assert
        error.TaskId.Should().Be("fetch-user");
        error.TaskName.Should().Be("Fetch User Details");
        error.TaskDescription.Should().Be("Retrieves user information from the user service");
    }

    [Fact]
    public void TaskErrorInfo_ShouldCategorizeErrorType()
    {
        // Arrange & Act
        var timeoutError = new TaskErrorInfo { ErrorType = TaskErrorType.Timeout };
        var httpError = new TaskErrorInfo { ErrorType = TaskErrorType.HttpError };
        var validationError = new TaskErrorInfo { ErrorType = TaskErrorType.ValidationError };
        var networkError = new TaskErrorInfo { ErrorType = TaskErrorType.NetworkError };
        var configError = new TaskErrorInfo { ErrorType = TaskErrorType.ConfigurationError };

        // Assert
        timeoutError.ErrorType.Should().Be(TaskErrorType.Timeout);
        httpError.ErrorType.Should().Be(TaskErrorType.HttpError);
        validationError.ErrorType.Should().Be(TaskErrorType.ValidationError);
        networkError.ErrorType.Should().Be(TaskErrorType.NetworkError);
        configError.ErrorType.Should().Be(TaskErrorType.ConfigurationError);
    }

    [Fact]
    public void TaskErrorInfo_ShouldIncludeServiceDetails()
    {
        // Arrange & Act
        var error = new TaskErrorInfo
        {
            ServiceName = "user-service",
            ServiceUrl = "https://api.example.com/users/123",
            HttpMethod = "GET",
            HttpStatusCode = 503
        };

        // Assert
        error.ServiceName.Should().Be("user-service");
        error.ServiceUrl.Should().Be("https://api.example.com/users/123");
        error.HttpMethod.Should().Be("GET");
        error.HttpStatusCode.Should().Be(503);
    }

    [Fact]
    public void TaskErrorInfo_ShouldIncludeErrorDetails()
    {
        // Arrange & Act
        var error = new TaskErrorInfo
        {
            ErrorMessage = "Connection refused",
            ErrorCode = "ECONNREFUSED",
            StackTrace = "at System.Net.Http.HttpClient.SendAsync..."
        };

        // Assert
        error.ErrorMessage.Should().Be("Connection refused");
        error.ErrorCode.Should().Be("ECONNREFUSED");
        error.StackTrace.Should().StartWith("at System.Net.Http");
    }

    [Fact]
    public void TaskErrorInfo_ShouldIncludeRetryInfo()
    {
        // Arrange & Act
        var error = new TaskErrorInfo
        {
            RetryAttempts = 3,
            MaxRetries = 3,
            IsRetryable = true,
            NextRetryInMs = 5000
        };

        // Assert
        error.RetryAttempts.Should().Be(3);
        error.MaxRetries.Should().Be(3);
        error.IsRetryable.Should().BeTrue();
        error.NextRetryInMs.Should().Be(5000);
    }

    [Fact]
    public void TaskErrorInfo_ShouldIncludeTimingInfo()
    {
        // Arrange
        var startTime = DateTime.UtcNow;
        var errorTime = startTime.AddSeconds(5);

        // Act
        var error = new TaskErrorInfo
        {
            OccurredAt = errorTime,
            TaskStartedAt = startTime,
            DurationUntilErrorMs = 5000
        };

        // Assert
        error.OccurredAt.Should().Be(errorTime);
        error.TaskStartedAt.Should().Be(startTime);
        error.DurationUntilErrorMs.Should().Be(5000);
    }

    [Fact]
    public void TaskErrorInfo_ShouldProvideActionableGuidance()
    {
        // Arrange & Act
        var error = new TaskErrorInfo
        {
            Suggestion = "Check if the user-service is running and accessible",
            DocumentationLink = "https://docs.example.com/troubleshooting/network-errors",
            SupportAction = "If the issue persists, contact the user-service team at #user-service-support"
        };

        // Assert
        error.Suggestion.Should().Contain("user-service");
        error.DocumentationLink.Should().StartWith("https://");
        error.SupportAction.Should().Contain("contact");
    }

    [Fact]
    public void TaskErrorInfo_ShouldGenerateSummaryMessage()
    {
        // Arrange
        var error = new TaskErrorInfo
        {
            TaskId = "fetch-user",
            TaskName = "Fetch User Details",
            ErrorType = TaskErrorType.HttpError,
            HttpStatusCode = 503,
            ServiceName = "user-service",
            ErrorMessage = "Service Unavailable"
        };

        // Act
        var summary = error.GetSummary();

        // Assert
        summary.Should().Contain("fetch-user");
        summary.Should().Contain("HttpError");
        summary.Should().Contain("503");
        // Service name is uppercased for visibility in the new format: [USER-SERVICE]
        summary.Should().ContainEquivalentOf("user-service");
        // Verify service leads the message (for routing purposes)
        summary.Should().StartWith("[USER-SERVICE]");
    }

    [Fact]
    public void TaskErrorInfo_ShouldGenerateSupportFriendlyDescription()
    {
        // Arrange
        var error = new TaskErrorInfo
        {
            TaskId = "payment-process",
            TaskName = "Process Payment",
            TaskDescription = "Charges the customer's payment method",
            ErrorType = TaskErrorType.Timeout,
            ServiceName = "payment-gateway",
            ServiceUrl = "https://payments.example.com/charge",
            HttpMethod = "POST",
            DurationUntilErrorMs = 30000,
            RetryAttempts = 3,
            ErrorMessage = "The operation timed out after 30000ms"
        };

        // Act
        var description = error.GetSupportDescription();

        // Assert
        description.Should().Contain("payment-process");
        description.Should().Contain("Process Payment");
        description.Should().Contain("payment-gateway");
        description.Should().Contain("POST");
        description.Should().Contain("30000");
        description.Should().Contain("3"); // retry attempts
    }
}

public class TaskErrorTypeTests
{
    [Theory]
    [InlineData(TaskErrorType.Timeout, "Timeout")]
    [InlineData(TaskErrorType.HttpError, "HttpError")]
    [InlineData(TaskErrorType.NetworkError, "NetworkError")]
    [InlineData(TaskErrorType.ValidationError, "ValidationError")]
    [InlineData(TaskErrorType.ConfigurationError, "ConfigurationError")]
    [InlineData(TaskErrorType.AuthenticationError, "AuthenticationError")]
    [InlineData(TaskErrorType.RateLimitError, "RateLimitError")]
    [InlineData(TaskErrorType.UnknownError, "UnknownError")]
    public void TaskErrorType_ShouldHaveExpectedValues(TaskErrorType errorType, string expectedName)
    {
        // Assert
        errorType.ToString().Should().Be(expectedName);
    }
}

public class TaskExecutionResultErrorTests
{
    [Fact]
    public void TaskExecutionResult_ShouldSupportStructuredErrors()
    {
        // Arrange
        var error = new TaskErrorInfo
        {
            TaskId = "fetch-user",
            ErrorType = TaskErrorType.HttpError,
            HttpStatusCode = 500,
            ErrorMessage = "Internal Server Error"
        };

        // Act
        var result = new TaskExecutionResult
        {
            Success = false,
            ErrorInfo = error
        };

        // Assert
        result.Success.Should().BeFalse();
        result.ErrorInfo.Should().NotBeNull();
        result.ErrorInfo!.TaskId.Should().Be("fetch-user");
        result.ErrorInfo.ErrorType.Should().Be(TaskErrorType.HttpError);
    }

    [Fact]
    public void TaskExecutionResult_ShouldMaintainBackwardCompatibility()
    {
        // Arrange - old style with string errors
        var result = new TaskExecutionResult
        {
            Success = false,
            Errors = new List<string> { "Some error occurred" }
        };

        // Act & Assert - should still work
        result.Errors.Should().ContainSingle().Which.Should().Be("Some error occurred");
    }
}
