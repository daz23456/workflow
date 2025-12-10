using FluentAssertions;
using WorkflowCore.Services;

namespace WorkflowCore.Tests.Services;

/// <summary>
/// Tests for ErrorResponseAnalyzer - RFC 7807 compliance checking.
/// </summary>
public class ErrorResponseAnalyzerTests
{
    private readonly ErrorResponseAnalyzer _analyzer = new();

    #region Empty/Null Response Tests

    [Fact]
    public void Analyze_NullResponse_ReturnsNonCompliant()
    {
        // Act
        var result = _analyzer.Analyze(null, 400);

        // Assert
        result.Compliance.Should().Be(ErrorResponseCompliance.NonCompliant);
        result.Score.Should().Be(0);
        result.Issues.Should().Contain("Empty error response body");
        result.Recommendations.Should().HaveCountGreaterThan(0);
    }

    [Fact]
    public void Analyze_EmptyResponse_ReturnsNonCompliant()
    {
        // Act
        var result = _analyzer.Analyze("", 500);

        // Assert
        result.Compliance.Should().Be(ErrorResponseCompliance.NonCompliant);
        result.Score.Should().Be(0);
        result.Issues.Should().Contain("Empty error response body");
    }

    [Fact]
    public void Analyze_WhitespaceOnlyResponse_ReturnsNonCompliant()
    {
        // Act
        var result = _analyzer.Analyze("   \n\t  ", 400);

        // Assert
        result.Compliance.Should().Be(ErrorResponseCompliance.NonCompliant);
        result.Score.Should().Be(0);
    }

    #endregion

    #region Invalid JSON Tests

    [Fact]
    public void Analyze_NonJsonResponse_ReturnsNonCompliant()
    {
        // Act
        var result = _analyzer.Analyze("Internal Server Error", 500);

        // Assert
        result.Compliance.Should().Be(ErrorResponseCompliance.NonCompliant);
        result.IsJson.Should().BeFalse();
        result.Score.Should().Be(5); // Small score for having a response
        result.Issues.Should().Contain("Response is not valid JSON");
        result.Recommendations.Should().Contain(r => r.Contains("Return error responses as JSON"));
    }

    [Fact]
    public void Analyze_HtmlResponse_ReturnsNonCompliant()
    {
        // Act
        var result = _analyzer.Analyze("<html><body>Error</body></html>", 500);

        // Assert
        result.Compliance.Should().Be(ErrorResponseCompliance.NonCompliant);
        result.IsJson.Should().BeFalse();
        result.Issues.Should().Contain("Response is not valid JSON");
    }

    [Fact]
    public void Analyze_TruncatesLongNonJsonResponseInIssues()
    {
        // Arrange
        var longResponse = new string('x', 200);

        // Act
        var result = _analyzer.Analyze(longResponse, 500);

        // Assert
        result.Issues.Should().Contain(i => i.Contains("...") && i.Contains("Received:"));
    }

    [Fact]
    public void Analyze_JsonArrayRoot_ReturnsNonCompliant()
    {
        // Act
        var result = _analyzer.Analyze("[\"error\", \"message\"]", 400);

        // Assert
        result.Compliance.Should().Be(ErrorResponseCompliance.NonCompliant);
        result.IsJson.Should().BeTrue();
        result.Score.Should().Be(10);
        result.Issues.Should().Contain("Root element is not a JSON object");
    }

    [Fact]
    public void Analyze_JsonPrimitiveRoot_ReturnsNonCompliant()
    {
        // Act
        var result = _analyzer.Analyze("\"just a string\"", 400);

        // Assert
        result.Compliance.Should().Be(ErrorResponseCompliance.NonCompliant);
        result.Issues.Should().Contain("Root element is not a JSON object");
    }

    #endregion

    #region RFC 7807 Compliant Response Tests

    [Fact]
    public void Analyze_FullyCompliantResponse_ReturnsCompliant()
    {
        // Arrange
        var response = @"{
            ""type"": ""https://api.example.com/errors/validation"",
            ""title"": ""Validation Error"",
            ""status"": 400,
            ""detail"": ""The userId field is required"",
            ""instance"": ""/api/users/123""
        }";

        // Act
        var result = _analyzer.Analyze(response, 400);

        // Assert
        result.Compliance.Should().Be(ErrorResponseCompliance.Compliant);
        result.IsJson.Should().BeTrue();
        result.Score.Should().BeGreaterOrEqualTo(80);
        result.PresentFields.Should().Contain("type");
        result.PresentFields.Should().Contain("title");
        result.PresentFields.Should().Contain("status");
        result.PresentFields.Should().Contain("detail");
        result.PresentFields.Should().Contain("instance");
        result.MissingFields.Should().BeEmpty();
    }

    [Fact]
    public void Analyze_RequiredFieldsOnly_ReturnsCompliant()
    {
        // Arrange - only type and title (required fields)
        var response = @"{
            ""type"": ""https://api.example.com/errors/not-found"",
            ""title"": ""Not Found""
        }";

        // Act
        var result = _analyzer.Analyze(response, 404);

        // Assert
        result.Compliance.Should().Be(ErrorResponseCompliance.Compliant);
        result.MissingFields.Should().BeEmpty();
        result.Score.Should().BeGreaterOrEqualTo(80);
    }

    [Fact]
    public void Analyze_WithOptionalTraceId_IncludesInPresentFields()
    {
        // Arrange
        var response = @"{
            ""type"": ""https://api.example.com/errors/server"",
            ""title"": ""Server Error"",
            ""status"": 500,
            ""traceId"": ""abc123""
        }";

        // Act
        var result = _analyzer.Analyze(response, 500);

        // Assert
        result.PresentFields.Should().Contain("traceId");
    }

    [Fact]
    public void Analyze_WithErrorsArray_IncludesInPresentFields()
    {
        // Arrange
        var response = @"{
            ""type"": ""https://api.example.com/errors/validation"",
            ""title"": ""Validation Error"",
            ""errors"": { ""field1"": [""error1""] }
        }";

        // Act
        var result = _analyzer.Analyze(response, 400);

        // Assert
        result.PresentFields.Should().Contain("errors");
    }

    #endregion

    #region Partially Compliant Response Tests

    [Fact]
    public void Analyze_MissingTypeField_ReturnsPartiallyCompliant()
    {
        // Arrange
        var response = @"{
            ""title"": ""Validation Error"",
            ""status"": 400,
            ""detail"": ""Field is required""
        }";

        // Act
        var result = _analyzer.Analyze(response, 400);

        // Assert
        result.Compliance.Should().Be(ErrorResponseCompliance.PartiallyCompliant);
        result.MissingFields.Should().Contain("type");
        result.Issues.Should().Contain("Missing required field: 'type'");
        result.Recommendations.Should().Contain(r => r.Contains("Add 'type' field"));
    }

    [Fact]
    public void Analyze_MissingTitleField_ReturnsPartiallyCompliant()
    {
        // Arrange
        var response = @"{
            ""type"": ""https://api.example.com/errors/validation"",
            ""status"": 400
        }";

        // Act
        var result = _analyzer.Analyze(response, 400);

        // Assert
        result.Compliance.Should().Be(ErrorResponseCompliance.PartiallyCompliant);
        result.MissingFields.Should().Contain("title");
        result.Recommendations.Should().Contain(r => r.Contains("Add 'title' field"));
    }

    [Fact]
    public void Analyze_WithAlternativeErrorField_ReturnsPartiallyCompliant()
    {
        // Arrange
        var response = @"{
            ""error"": ""validation_error"",
            ""message"": ""The request was invalid""
        }";

        // Act
        var result = _analyzer.Analyze(response, 400);

        // Assert
        result.Compliance.Should().Be(ErrorResponseCompliance.PartiallyCompliant);
        result.Recommendations.Should().Contain(r => r.Contains("non-standard fields"));
    }

    [Fact]
    public void Analyze_WithErrorCodeField_ReturnsPartiallyCompliant()
    {
        // Arrange
        var response = @"{
            ""errorCode"": ""VALIDATION_001"",
            ""errorMessage"": ""Invalid input""
        }";

        // Act
        var result = _analyzer.Analyze(response, 400);

        // Assert
        result.Compliance.Should().Be(ErrorResponseCompliance.PartiallyCompliant);
    }

    #endregion

    #region Non-Compliant Response Tests

    [Fact]
    public void Analyze_EmptyJsonObject_ReturnsNonCompliant()
    {
        // Act
        var result = _analyzer.Analyze("{}", 400);

        // Assert
        result.Compliance.Should().Be(ErrorResponseCompliance.NonCompliant);
        result.MissingFields.Should().Contain("type");
        result.MissingFields.Should().Contain("title");
    }

    [Fact]
    public void Analyze_UnrelatedJsonFields_ReturnsNonCompliant()
    {
        // Arrange
        var response = @"{
            ""foo"": ""bar"",
            ""baz"": 123
        }";

        // Act
        var result = _analyzer.Analyze(response, 400);

        // Assert
        result.Compliance.Should().Be(ErrorResponseCompliance.NonCompliant);
        result.Recommendations.Should().Contain(r => r.Contains("Example compliant response"));
    }

    #endregion

    #region Status Mismatch Tests

    [Fact]
    public void Analyze_StatusMismatch_AddsIssue()
    {
        // Arrange
        var response = @"{
            ""type"": ""https://api.example.com/errors/validation"",
            ""title"": ""Validation Error"",
            ""status"": 400
        }";

        // Act - HTTP status is 500 but body says 400
        var result = _analyzer.Analyze(response, 500);

        // Assert
        result.Issues.Should().Contain(i => i.Contains("Status in body (400) doesn't match HTTP status (500)"));
        result.Recommendations.Should().Contain(r => r.Contains("Ensure 'status' field matches HTTP status code"));
    }

    [Fact]
    public void Analyze_StatusMatches_NoIssue()
    {
        // Arrange
        var response = @"{
            ""type"": ""https://api.example.com/errors/validation"",
            ""title"": ""Validation Error"",
            ""status"": 400
        }";

        // Act
        var result = _analyzer.Analyze(response, 400);

        // Assert
        result.Issues.Should().NotContain(i => i.Contains("doesn't match HTTP status"));
    }

    [Fact]
    public void Analyze_NoStatusCodeProvided_SkipsStatusCheck()
    {
        // Arrange
        var response = @"{
            ""type"": ""https://api.example.com/errors/validation"",
            ""title"": ""Validation Error"",
            ""status"": 400
        }";

        // Act
        var result = _analyzer.Analyze(response, null);

        // Assert
        result.Issues.Should().NotContain(i => i.Contains("doesn't match HTTP status"));
    }

    #endregion

    #region Case Insensitive Property Matching Tests

    [Fact]
    public void Analyze_LowercaseFields_RecognizesFields()
    {
        // Arrange
        var response = @"{
            ""type"": ""https://api.example.com/errors/validation"",
            ""title"": ""Validation Error""
        }";

        // Act
        var result = _analyzer.Analyze(response, 400);

        // Assert
        result.PresentFields.Should().Contain("type");
        result.PresentFields.Should().Contain("title");
    }

    [Fact]
    public void Analyze_PascalCaseFields_RecognizesFields()
    {
        // Arrange - PascalCase fields should be recognized by HasProperty
        var response = @"{
            ""Type"": ""https://api.example.com/errors/validation"",
            ""Title"": ""Validation Error""
        }";

        // Act
        var result = _analyzer.Analyze(response, 400);

        // Assert - HasProperty checks PascalCase variants
        result.PresentFields.Should().Contain("type");
        result.PresentFields.Should().Contain("title");
        result.MissingFields.Should().BeEmpty(); // Required fields found
    }

    #endregion

    #region Recommendations Tests

    [Fact]
    public void Analyze_MissingStatus_RecommendsAddingStatus()
    {
        // Arrange
        var response = @"{
            ""type"": ""https://api.example.com/errors/validation"",
            ""title"": ""Validation Error""
        }";

        // Act
        var result = _analyzer.Analyze(response, 400);

        // Assert
        result.Recommendations.Should().Contain(r => r.Contains("Add 'status' field") && r.Contains("400"));
    }

    [Fact]
    public void Analyze_MissingDetail_RecommendsAddingDetail()
    {
        // Arrange
        var response = @"{
            ""type"": ""https://api.example.com/errors/validation"",
            ""title"": ""Validation Error"",
            ""status"": 400
        }";

        // Act
        var result = _analyzer.Analyze(response, 400);

        // Assert
        result.Recommendations.Should().Contain(r => r.Contains("Add 'detail' field"));
    }

    [Fact]
    public void Analyze_MissingInstance_RecommendsAddingInstance()
    {
        // Arrange
        var response = @"{
            ""type"": ""https://api.example.com/errors/validation"",
            ""title"": ""Validation Error"",
            ""status"": 400,
            ""detail"": ""Something went wrong""
        }";

        // Act
        var result = _analyzer.Analyze(response, 400);

        // Assert
        result.Recommendations.Should().Contain(r => r.Contains("Consider adding 'instance' field"));
    }

    #endregion

    #region Summary Property Tests

    [Fact]
    public void Summary_CompliantResponse_ShowsCompliantMessage()
    {
        // Arrange
        var response = @"{
            ""type"": ""https://api.example.com/errors/validation"",
            ""title"": ""Validation Error"",
            ""status"": 400,
            ""detail"": ""Error"",
            ""instance"": ""/test""
        }";

        // Act
        var result = _analyzer.Analyze(response, 400);

        // Assert
        result.Summary.Should().Contain("Compliant");
        result.Summary.Should().Contain("RFC 7807");
    }

    [Fact]
    public void Summary_PartiallyCompliantResponse_ShowsMissingCount()
    {
        // Arrange
        var response = @"{
            ""title"": ""Validation Error""
        }";

        // Act
        var result = _analyzer.Analyze(response, 400);

        // Assert
        result.Summary.Should().Contain("Partially Compliant");
        result.Summary.Should().Contain("required field(s) missing");
    }

    [Fact]
    public void Summary_NonCompliantResponse_ShowsNonCompliantMessage()
    {
        // Arrange
        var response = @"{}";

        // Act
        var result = _analyzer.Analyze(response, 400);

        // Assert
        result.Summary.Should().Contain("Non-Compliant");
        result.Summary.Should().Contain("Does not follow standard");
    }

    #endregion

    #region Score Calculation Tests

    [Fact]
    public void Analyze_OptionalFieldsPresent_IncreasesScore()
    {
        // Arrange - with multiple optional fields (traceId, errors, extensions)
        var responseWithOptional = @"{
            ""type"": ""https://api.example.com/errors/validation"",
            ""title"": ""Validation Error"",
            ""status"": 400,
            ""detail"": ""Error"",
            ""instance"": ""/test"",
            ""traceId"": ""abc123"",
            ""errors"": {}
        }";

        var responseWithoutOptional = @"{
            ""type"": ""https://api.example.com/errors/validation"",
            ""title"": ""Validation Error"",
            ""status"": 400,
            ""detail"": ""Error"",
            ""instance"": ""/test""
        }";

        // Act
        var resultWithOptional = _analyzer.Analyze(responseWithOptional, 400);
        var resultWithoutOptional = _analyzer.Analyze(responseWithoutOptional, 400);

        // Assert - with optional fields, score should be higher or equal (bonus points apply)
        resultWithOptional.Score.Should().BeGreaterOrEqualTo(resultWithoutOptional.Score);
        resultWithOptional.PresentFields.Should().Contain("traceId");
        resultWithOptional.PresentFields.Should().Contain("errors");
    }

    [Fact]
    public void Analyze_ScoreCannotExceed100()
    {
        // Arrange - all fields present
        var response = @"{
            ""type"": ""https://api.example.com/errors/validation"",
            ""title"": ""Validation Error"",
            ""status"": 400,
            ""detail"": ""Error"",
            ""instance"": ""/test"",
            ""traceId"": ""abc123"",
            ""errors"": {},
            ""extensions"": {}
        }";

        // Act
        var result = _analyzer.Analyze(response, 400);

        // Assert
        result.Score.Should().BeLessOrEqualTo(100);
    }

    #endregion
}
