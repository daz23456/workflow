using System.Text.Json;
using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class ErrorQualityAnalyzerTests
{
    private readonly IErrorQualityAnalyzer _analyzer;

    public ErrorQualityAnalyzerTests()
    {
        _analyzer = new ErrorQualityAnalyzer();
    }

    #region Basic Scoring Tests

    [Fact]
    public void Analyze_NullErrorBody_Returns0Stars()
    {
        // Act
        var result = _analyzer.Analyze(null, 500);

        // Assert
        result.Stars.Should().Be(0);
        result.CriteriaMet.Should().Be(ErrorQualityCriteria.None);
    }

    [Fact]
    public void Analyze_EmptyErrorBody_Returns0Stars()
    {
        // Act
        var result = _analyzer.Analyze("", 500);

        // Assert
        result.Stars.Should().Be(0);
        result.CriteriaMet.Should().Be(ErrorQualityCriteria.None);
    }

    [Fact]
    public void Analyze_InvalidJson_Returns0Stars()
    {
        // Act
        var result = _analyzer.Analyze("not valid json", 500);

        // Assert
        result.Stars.Should().Be(0);
        result.CriteriaMet.Should().Be(ErrorQualityCriteria.None);
    }

    [Fact]
    public void Analyze_PerfectError_Returns5Stars()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new
        {
            message = "User not found with ID 123",
            code = "USER_NOT_FOUND",
            requestId = "req-abc-123",
            suggestion = "Verify the user ID exists before making this request"
        });

        // Act
        var result = _analyzer.Analyze(errorJson, 404);

        // Assert
        result.Stars.Should().Be(5);
        result.CriteriaMet.Should().Be(ErrorQualityCriteria.All);
        result.ImprovementTips.Should().BeEmpty();
    }

    #endregion

    #region HasMessage Criterion Tests

    [Fact]
    public void Analyze_WithMessage_MeetsHasMessageCriterion()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { message = "Something went wrong" });

        // Act
        var result = _analyzer.Analyze(errorJson, 500);

        // Assert
        result.HasCriterion(ErrorQualityCriteria.HasMessage).Should().BeTrue();
        result.CriteriaBreakdown.Should().Contain(c =>
            c.Criterion == ErrorQualityCriteria.HasMessage && c.Met);
    }

    [Fact]
    public void Analyze_WithError_MeetsHasMessageCriterion()
    {
        // Arrange - "error" field is also acceptable for message
        var errorJson = JsonSerializer.Serialize(new { error = "Something went wrong" });

        // Act
        var result = _analyzer.Analyze(errorJson, 500);

        // Assert
        result.HasCriterion(ErrorQualityCriteria.HasMessage).Should().BeTrue();
    }

    [Fact]
    public void Analyze_WithTitle_MeetsHasMessageCriterion()
    {
        // Arrange - RFC 7807 uses "title"
        var errorJson = JsonSerializer.Serialize(new { title = "Not Found" });

        // Act
        var result = _analyzer.Analyze(errorJson, 404);

        // Assert
        result.HasCriterion(ErrorQualityCriteria.HasMessage).Should().BeTrue();
    }

    [Fact]
    public void Analyze_WithDetail_MeetsHasMessageCriterion()
    {
        // Arrange - RFC 7807 uses "detail"
        var errorJson = JsonSerializer.Serialize(new { detail = "The requested resource was not found" });

        // Act
        var result = _analyzer.Analyze(errorJson, 404);

        // Assert
        result.HasCriterion(ErrorQualityCriteria.HasMessage).Should().BeTrue();
    }

    [Fact]
    public void Analyze_WithEmptyMessage_FailsHasMessageCriterion()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { message = "" });

        // Act
        var result = _analyzer.Analyze(errorJson, 500);

        // Assert
        result.HasCriterion(ErrorQualityCriteria.HasMessage).Should().BeFalse();
    }

    [Fact]
    public void Analyze_WithWhitespaceMessage_FailsHasMessageCriterion()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { message = "   " });

        // Act
        var result = _analyzer.Analyze(errorJson, 500);

        // Assert
        result.HasCriterion(ErrorQualityCriteria.HasMessage).Should().BeFalse();
    }

    #endregion

    #region HasErrorCode Criterion Tests

    [Fact]
    public void Analyze_WithCode_MeetsHasErrorCodeCriterion()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { code = "VALIDATION_ERROR" });

        // Act
        var result = _analyzer.Analyze(errorJson, 400);

        // Assert
        result.HasCriterion(ErrorQualityCriteria.HasErrorCode).Should().BeTrue();
    }

    [Fact]
    public void Analyze_WithErrorCode_MeetsHasErrorCodeCriterion()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { errorCode = "NOT_FOUND" });

        // Act
        var result = _analyzer.Analyze(errorJson, 404);

        // Assert
        result.HasCriterion(ErrorQualityCriteria.HasErrorCode).Should().BeTrue();
    }

    [Fact]
    public void Analyze_WithType_MeetsHasErrorCodeCriterion()
    {
        // Arrange - RFC 7807 uses "type" as URI
        var errorJson = JsonSerializer.Serialize(new { type = "https://example.com/errors/not-found" });

        // Act
        var result = _analyzer.Analyze(errorJson, 404);

        // Assert
        result.HasCriterion(ErrorQualityCriteria.HasErrorCode).Should().BeTrue();
    }

    [Fact]
    public void Analyze_WithEmptyCode_FailsHasErrorCodeCriterion()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { code = "" });

        // Act
        var result = _analyzer.Analyze(errorJson, 500);

        // Assert
        result.HasCriterion(ErrorQualityCriteria.HasErrorCode).Should().BeFalse();
    }

    #endregion

    #region AppropriateHttpStatus Criterion Tests

    [Theory]
    [InlineData(400, "VALIDATION_ERROR")]
    [InlineData(400, "BAD_REQUEST")]
    [InlineData(400, "INVALID_INPUT")]
    [InlineData(401, "UNAUTHORIZED")]
    [InlineData(401, "AUTHENTICATION_REQUIRED")]
    [InlineData(403, "FORBIDDEN")]
    [InlineData(403, "ACCESS_DENIED")]
    [InlineData(404, "NOT_FOUND")]
    [InlineData(404, "RESOURCE_NOT_FOUND")]
    [InlineData(409, "CONFLICT")]
    [InlineData(422, "UNPROCESSABLE_ENTITY")]
    [InlineData(429, "RATE_LIMITED")]
    [InlineData(429, "TOO_MANY_REQUESTS")]
    [InlineData(500, "INTERNAL_ERROR")]
    [InlineData(500, "SERVER_ERROR")]
    [InlineData(503, "SERVICE_UNAVAILABLE")]
    public void Analyze_AppropriateStatusCode_MeetsAppropriateHttpStatusCriterion(int statusCode, string errorCode)
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { code = errorCode });

        // Act
        var result = _analyzer.Analyze(errorJson, statusCode);

        // Assert
        result.HasCriterion(ErrorQualityCriteria.AppropriateHttpStatus).Should().BeTrue();
    }

    [Fact]
    public void Analyze_ValidationErrorWith500_FailsAppropriateHttpStatusCriterion()
    {
        // Arrange - validation errors should be 4xx, not 500
        var errorJson = JsonSerializer.Serialize(new { code = "VALIDATION_ERROR" });

        // Act
        var result = _analyzer.Analyze(errorJson, 500);

        // Assert
        result.HasCriterion(ErrorQualityCriteria.AppropriateHttpStatus).Should().BeFalse();
    }

    [Fact]
    public void Analyze_NotFoundWith500_FailsAppropriateHttpStatusCriterion()
    {
        // Arrange - not found should be 404, not 500
        var errorJson = JsonSerializer.Serialize(new { code = "NOT_FOUND" });

        // Act
        var result = _analyzer.Analyze(errorJson, 500);

        // Assert
        result.HasCriterion(ErrorQualityCriteria.AppropriateHttpStatus).Should().BeFalse();
    }

    [Fact]
    public void Analyze_GenericError_PassesIfStatusCodeIsReasonable()
    {
        // Arrange - generic server error with 500 is reasonable
        var errorJson = JsonSerializer.Serialize(new { message = "An error occurred" });

        // Act
        var result = _analyzer.Analyze(errorJson, 500);

        // Assert
        result.HasCriterion(ErrorQualityCriteria.AppropriateHttpStatus).Should().BeTrue();
    }

    #endregion

    #region HasRequestId Criterion Tests

    [Fact]
    public void Analyze_WithRequestId_MeetsHasRequestIdCriterion()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { requestId = "req-abc-123" });

        // Act
        var result = _analyzer.Analyze(errorJson, 500);

        // Assert
        result.HasCriterion(ErrorQualityCriteria.HasRequestId).Should().BeTrue();
    }

    [Fact]
    public void Analyze_WithCorrelationId_MeetsHasRequestIdCriterion()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { correlationId = "corr-xyz-789" });

        // Act
        var result = _analyzer.Analyze(errorJson, 500);

        // Assert
        result.HasCriterion(ErrorQualityCriteria.HasRequestId).Should().BeTrue();
    }

    [Fact]
    public void Analyze_WithTraceId_MeetsHasRequestIdCriterion()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { traceId = "trace-123" });

        // Act
        var result = _analyzer.Analyze(errorJson, 500);

        // Assert
        result.HasCriterion(ErrorQualityCriteria.HasRequestId).Should().BeTrue();
    }

    [Fact]
    public void Analyze_WithInstance_MeetsHasRequestIdCriterion()
    {
        // Arrange - RFC 7807 uses "instance"
        var errorJson = JsonSerializer.Serialize(new { instance = "/errors/12345" });

        // Act
        var result = _analyzer.Analyze(errorJson, 500);

        // Assert
        result.HasCriterion(ErrorQualityCriteria.HasRequestId).Should().BeTrue();
    }

    [Fact]
    public void Analyze_WithEmptyRequestId_FailsHasRequestIdCriterion()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { requestId = "" });

        // Act
        var result = _analyzer.Analyze(errorJson, 500);

        // Assert
        result.HasCriterion(ErrorQualityCriteria.HasRequestId).Should().BeFalse();
    }

    #endregion

    #region HasActionableSuggestion Criterion Tests

    [Fact]
    public void Analyze_WithSuggestion_MeetsHasActionableSuggestionCriterion()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { suggestion = "Try again later" });

        // Act
        var result = _analyzer.Analyze(errorJson, 500);

        // Assert
        result.HasCriterion(ErrorQualityCriteria.HasActionableSuggestion).Should().BeTrue();
    }

    [Fact]
    public void Analyze_WithHint_MeetsHasActionableSuggestionCriterion()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { hint = "Check your API key" });

        // Act
        var result = _analyzer.Analyze(errorJson, 401);

        // Assert
        result.HasCriterion(ErrorQualityCriteria.HasActionableSuggestion).Should().BeTrue();
    }

    [Fact]
    public void Analyze_WithFix_MeetsHasActionableSuggestionCriterion()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { fix = "Update to the latest API version" });

        // Act
        var result = _analyzer.Analyze(errorJson, 400);

        // Assert
        result.HasCriterion(ErrorQualityCriteria.HasActionableSuggestion).Should().BeTrue();
    }

    [Fact]
    public void Analyze_WithAction_MeetsHasActionableSuggestionCriterion()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { action = "Retry the request" });

        // Act
        var result = _analyzer.Analyze(errorJson, 503);

        // Assert
        result.HasCriterion(ErrorQualityCriteria.HasActionableSuggestion).Should().BeTrue();
    }

    [Fact]
    public void Analyze_WithHelp_MeetsHasActionableSuggestionCriterion()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { help = "Visit docs.example.com for more info" });

        // Act
        var result = _analyzer.Analyze(errorJson, 400);

        // Assert
        result.HasCriterion(ErrorQualityCriteria.HasActionableSuggestion).Should().BeTrue();
    }

    [Fact]
    public void Analyze_WithEmptySuggestion_FailsHasActionableSuggestionCriterion()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { suggestion = "" });

        // Act
        var result = _analyzer.Analyze(errorJson, 500);

        // Assert
        result.HasCriterion(ErrorQualityCriteria.HasActionableSuggestion).Should().BeFalse();
    }

    #endregion

    #region Star Count Tests

    [Fact]
    public void Analyze_1Criterion_Returns1Star()
    {
        // Arrange - only message
        var errorJson = JsonSerializer.Serialize(new { message = "Error occurred" });

        // Act
        var result = _analyzer.Analyze(errorJson, 500);

        // Assert
        result.Stars.Should().BeGreaterThanOrEqualTo(1);
    }

    [Fact]
    public void Analyze_3Criteria_Returns3Stars()
    {
        // Arrange - message + code + appropriate status
        var errorJson = JsonSerializer.Serialize(new
        {
            message = "User not found",
            code = "NOT_FOUND"
        });

        // Act
        var result = _analyzer.Analyze(errorJson, 404);

        // Assert
        result.Stars.Should().Be(3);
    }

    #endregion

    #region Improvement Tips Tests

    [Fact]
    public void Analyze_MissingMessage_IncludesTipForMessage()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { code = "ERROR" });

        // Act
        var result = _analyzer.Analyze(errorJson, 500);

        // Assert
        result.ImprovementTips.Should().Contain(t => t.Contains("message", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Analyze_MissingErrorCode_IncludesTipForErrorCode()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { message = "Error occurred" });

        // Act
        var result = _analyzer.Analyze(errorJson, 500);

        // Assert
        result.ImprovementTips.Should().Contain(t => t.Contains("code", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Analyze_MissingRequestId_IncludesTipForRequestId()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { message = "Error occurred" });

        // Act
        var result = _analyzer.Analyze(errorJson, 500);

        // Assert
        result.ImprovementTips.Should().Contain(t =>
            t.Contains("requestId", StringComparison.OrdinalIgnoreCase) ||
            t.Contains("correlation", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public void Analyze_MissingSuggestion_IncludesTipForSuggestion()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { message = "Error occurred" });

        // Act
        var result = _analyzer.Analyze(errorJson, 500);

        // Assert
        result.ImprovementTips.Should().Contain(t =>
            t.Contains("suggestion", StringComparison.OrdinalIgnoreCase) ||
            t.Contains("actionable", StringComparison.OrdinalIgnoreCase));
    }

    #endregion

    #region CriteriaBreakdown Tests

    [Fact]
    public void Analyze_ReturnsAllCriteriaInBreakdown()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { message = "Error" });

        // Act
        var result = _analyzer.Analyze(errorJson, 500);

        // Assert
        result.CriteriaBreakdown.Should().HaveCount(5);
        result.CriteriaBreakdown.Should().Contain(c => c.Criterion == ErrorQualityCriteria.HasMessage);
        result.CriteriaBreakdown.Should().Contain(c => c.Criterion == ErrorQualityCriteria.HasErrorCode);
        result.CriteriaBreakdown.Should().Contain(c => c.Criterion == ErrorQualityCriteria.AppropriateHttpStatus);
        result.CriteriaBreakdown.Should().Contain(c => c.Criterion == ErrorQualityCriteria.HasRequestId);
        result.CriteriaBreakdown.Should().Contain(c => c.Criterion == ErrorQualityCriteria.HasActionableSuggestion);
    }

    [Fact]
    public void Analyze_CriteriaBreakdown_IncludesNames()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { message = "Error" });

        // Act
        var result = _analyzer.Analyze(errorJson, 500);

        // Assert
        result.CriteriaBreakdown.Should().OnlyContain(c => !string.IsNullOrEmpty(c.Name));
    }

    [Fact]
    public void Analyze_MetCriteria_IncludesDetails()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { message = "User not found" });

        // Act
        var result = _analyzer.Analyze(errorJson, 404);

        // Assert
        var messageCriterion = result.CriteriaBreakdown.First(c => c.Criterion == ErrorQualityCriteria.HasMessage);
        messageCriterion.Details.Should().Contain("User not found");
    }

    [Fact]
    public void Analyze_UnmetCriteria_IncludesTip()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { message = "Error" });

        // Act
        var result = _analyzer.Analyze(errorJson, 500);

        // Assert
        var codeCriterion = result.CriteriaBreakdown.First(c => c.Criterion == ErrorQualityCriteria.HasErrorCode);
        codeCriterion.Met.Should().BeFalse();
        codeCriterion.Tip.Should().NotBeNullOrEmpty();
    }

    #endregion

    #region Metadata Tests

    [Fact]
    public void Analyze_SetsHttpStatusCode()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { message = "Error" });

        // Act
        var result = _analyzer.Analyze(errorJson, 404);

        // Assert
        result.HttpStatusCode.Should().Be(404);
    }

    [Fact]
    public void Analyze_SetsTaskId_WhenProvided()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { message = "Error" });

        // Act
        var result = _analyzer.Analyze(errorJson, 500, "my-task");

        // Assert
        result.TaskId.Should().Be("my-task");
    }

    [Fact]
    public void Analyze_SetsAnalyzedAt()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { message = "Error" });
        var before = DateTime.UtcNow;

        // Act
        var result = _analyzer.Analyze(errorJson, 500);
        var after = DateTime.UtcNow;

        // Assert
        result.AnalyzedAt.Should().BeOnOrAfter(before).And.BeOnOrBefore(after);
    }

    #endregion

    #region JsonElement Overload Tests

    [Fact]
    public void Analyze_JsonElement_WorksCorrectly()
    {
        // Arrange
        var json = JsonSerializer.Serialize(new
        {
            message = "Not found",
            code = "NOT_FOUND",
            requestId = "req-123"
        });
        var element = JsonDocument.Parse(json).RootElement;

        // Act
        var result = _analyzer.Analyze(element, 404, "task-1");

        // Assert
        result.Stars.Should().Be(4); // message + code + status + requestId
        result.TaskId.Should().Be("task-1");
    }

    #endregion

    #region StarDisplay and Summary Tests

    [Fact]
    public void Analyze_5Stars_ShowsCorrectDisplay()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new
        {
            message = "User not found",
            code = "NOT_FOUND",
            requestId = "req-123",
            suggestion = "Check the user ID"
        });

        // Act
        var result = _analyzer.Analyze(errorJson, 404);

        // Assert
        result.Stars.Should().Be(5);
        result.StarDisplay.Should().Be("⭐⭐⭐⭐⭐");
        result.Summary.Should().Contain("Excellent");
    }

    [Fact]
    public void Analyze_0Stars_ShowsCorrectDisplay()
    {
        // Act
        var result = _analyzer.Analyze(null, 500);

        // Assert
        result.Stars.Should().Be(0);
        result.StarDisplay.Should().Be("☆☆☆☆☆");
        result.Summary.Should().Contain("Critical");
    }

    [Fact]
    public void Analyze_3Stars_ShowsCorrectDisplay()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new
        {
            message = "Not found",
            code = "NOT_FOUND"
        });

        // Act
        var result = _analyzer.Analyze(errorJson, 404);

        // Assert
        result.Stars.Should().Be(3);
        result.StarDisplay.Should().Be("⭐⭐⭐☆☆");
        result.Summary.Should().Contain("Fair");
    }

    #endregion

    #region CriteriaMissing Tests

    [Fact]
    public void Analyze_AllCriteriaMet_CriteriaMissingIsNone()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new
        {
            message = "User not found",
            code = "NOT_FOUND",
            requestId = "req-123",
            suggestion = "Check the user ID"
        });

        // Act
        var result = _analyzer.Analyze(errorJson, 404);

        // Assert
        result.CriteriaMissing.Should().Be(ErrorQualityCriteria.None);
    }

    [Fact]
    public void Analyze_NoCriteriaMet_CriteriaMissingIsAll()
    {
        // Act
        var result = _analyzer.Analyze(null, 500);

        // Assert
        result.CriteriaMissing.Should().Be(ErrorQualityCriteria.All);
    }

    [Fact]
    public void Analyze_SomeCriteriaMet_CriteriaMissingShowsRemainder()
    {
        // Arrange
        var errorJson = JsonSerializer.Serialize(new { message = "Error" });

        // Act
        var result = _analyzer.Analyze(errorJson, 500);

        // Assert
        result.CriteriaMissing.Should().HaveFlag(ErrorQualityCriteria.HasErrorCode);
        result.CriteriaMissing.Should().HaveFlag(ErrorQualityCriteria.HasRequestId);
        result.CriteriaMissing.Should().HaveFlag(ErrorQualityCriteria.HasActionableSuggestion);
    }

    #endregion
}
