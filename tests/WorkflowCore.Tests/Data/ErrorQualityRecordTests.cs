using FluentAssertions;
using WorkflowCore.Data;
using WorkflowCore.Models;
using Xunit;

namespace WorkflowCore.Tests.Data;

public class ErrorQualityRecordTests
{
    [Fact]
    public void FromScore_CreatesRecordWithCorrectValues()
    {
        // Arrange
        var score = new ErrorQualityScore
        {
            Stars = 4,
            CriteriaMet = ErrorQualityCriteria.HasMessage | ErrorQualityCriteria.HasErrorCode |
                          ErrorQualityCriteria.AppropriateHttpStatus | ErrorQualityCriteria.HasRequestId,
            CriteriaMissing = ErrorQualityCriteria.HasActionableSuggestion,
            HttpStatusCode = 404,
            TaskId = "task-1",
            AnalyzedAt = DateTime.UtcNow,
            ImprovementTips = new List<string> { "Add a suggestion field" },
            CriteriaBreakdown = new List<CriterionResult>
            {
                new() { Criterion = ErrorQualityCriteria.HasMessage, Name = "Message", Met = true, Details = "Found" }
            }
        };
        var executionId = Guid.NewGuid();
        var errorBody = "{\"error\": \"Not found\"}";

        // Act
        var record = ErrorQualityRecord.FromScore(score, executionId, "test-workflow", null, "get-user", errorBody);

        // Assert
        record.ExecutionId.Should().Be(executionId);
        record.WorkflowName.Should().Be("test-workflow");
        record.TaskRef.Should().Be("get-user");
        record.TaskId.Should().Be("task-1");
        record.Stars.Should().Be(4);
        record.CriteriaMet.Should().Be((int)score.CriteriaMet);
        record.CriteriaMissing.Should().Be((int)score.CriteriaMissing);
        record.HttpStatusCode.Should().Be(404);
        record.ErrorBody.Should().Be(errorBody);
        record.ImprovementTipsJson.Should().Contain("Add a suggestion field");
        record.CriteriaBreakdownJson.Should().Contain("Message");
    }

    [Fact]
    public void FromScore_TruncatesLongErrorBody()
    {
        // Arrange
        var score = new ErrorQualityScore { Stars = 0 };
        var longErrorBody = new string('x', 5000);

        // Act
        var record = ErrorQualityRecord.FromScore(score, Guid.NewGuid(), "workflow", errorBody: longErrorBody);

        // Assert
        record.ErrorBody.Should().HaveLength(4000);
    }

    [Fact]
    public void FromScore_HandlesNullErrorBody()
    {
        // Arrange
        var score = new ErrorQualityScore { Stars = 0 };

        // Act
        var record = ErrorQualityRecord.FromScore(score, Guid.NewGuid(), "workflow", errorBody: null);

        // Assert
        record.ErrorBody.Should().BeNull();
    }

    [Fact]
    public void CriteriaMetEnum_ConvertsBidirectionally()
    {
        // Arrange
        var record = new ErrorQualityRecord();

        // Act
        record.CriteriaMetEnum = ErrorQualityCriteria.HasMessage | ErrorQualityCriteria.HasErrorCode;

        // Assert
        record.CriteriaMet.Should().Be((int)(ErrorQualityCriteria.HasMessage | ErrorQualityCriteria.HasErrorCode));
        record.CriteriaMetEnum.Should().HaveFlag(ErrorQualityCriteria.HasMessage);
        record.CriteriaMetEnum.Should().HaveFlag(ErrorQualityCriteria.HasErrorCode);
    }

    [Fact]
    public void CriteriaMissingEnum_ConvertsBidirectionally()
    {
        // Arrange
        var record = new ErrorQualityRecord();

        // Act
        record.CriteriaMissingEnum = ErrorQualityCriteria.HasRequestId | ErrorQualityCriteria.HasActionableSuggestion;

        // Assert
        record.CriteriaMissing.Should().Be((int)(ErrorQualityCriteria.HasRequestId | ErrorQualityCriteria.HasActionableSuggestion));
        record.CriteriaMissingEnum.Should().HaveFlag(ErrorQualityCriteria.HasRequestId);
        record.CriteriaMissingEnum.Should().HaveFlag(ErrorQualityCriteria.HasActionableSuggestion);
    }

    [Fact]
    public void NewRecord_HasDefaultValues()
    {
        // Act
        var record = new ErrorQualityRecord();

        // Assert
        record.Id.Should().NotBeEmpty();
        record.CreatedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        record.AnalyzedAt.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void FromScore_SetsTaskExecutionId_WhenProvided()
    {
        // Arrange
        var score = new ErrorQualityScore { Stars = 3 };
        var executionId = Guid.NewGuid();
        var taskExecutionId = Guid.NewGuid();

        // Act
        var record = ErrorQualityRecord.FromScore(score, executionId, "workflow", taskExecutionId);

        // Assert
        record.TaskExecutionId.Should().Be(taskExecutionId);
    }

    [Fact]
    public void FromScore_SerializesCriteriaBreakdown()
    {
        // Arrange
        var score = new ErrorQualityScore
        {
            Stars = 2,
            CriteriaBreakdown = new List<CriterionResult>
            {
                new() { Criterion = ErrorQualityCriteria.HasMessage, Name = "Human-Readable Message", Met = true, Details = "Found 'Not Found'" },
                new() { Criterion = ErrorQualityCriteria.HasErrorCode, Name = "Machine-Readable Error Code", Met = true, Details = "NOT_FOUND" },
                new() { Criterion = ErrorQualityCriteria.AppropriateHttpStatus, Name = "Appropriate HTTP Status", Met = false, Tip = "Use 404 for not found" }
            }
        };

        // Act
        var record = ErrorQualityRecord.FromScore(score, Guid.NewGuid(), "workflow");

        // Assert
        record.CriteriaBreakdownJson.Should().Contain("HasMessage");
        record.CriteriaBreakdownJson.Should().Contain("Human-Readable Message");
        record.CriteriaBreakdownJson.Should().Contain("true");
        record.CriteriaBreakdownJson.Should().Contain("false");
    }
}
