using System;
using System.Text.Json;
using FluentAssertions;
using WorkflowCore.Models;
using Xunit;

namespace WorkflowCore.Tests.Models;

/// <summary>
/// Tests for DurationDataPoint model serialization and validation.
/// </summary>
public class DurationDataPointTests
{
    [Fact]
    public void DurationDataPoint_Should_Have_All_Required_Properties()
    {
        // Arrange
        var date = new DateTime(2025, 11, 25, 0, 0, 0, DateTimeKind.Utc);

        // Act
        var dataPoint = new DurationDataPoint
        {
            Date = date,
            AverageDurationMs = 1250.5,
            MinDurationMs = 450.0,
            MaxDurationMs = 3200.0,
            P50DurationMs = 1200.0,
            P95DurationMs = 2800.0,
            ExecutionCount = 124,
            SuccessCount = 122,
            FailureCount = 2
        };

        // Assert
        dataPoint.Date.Should().Be(date);
        dataPoint.AverageDurationMs.Should().Be(1250.5);
        dataPoint.MinDurationMs.Should().Be(450.0);
        dataPoint.MaxDurationMs.Should().Be(3200.0);
        dataPoint.P50DurationMs.Should().Be(1200.0);
        dataPoint.P95DurationMs.Should().Be(2800.0);
        dataPoint.ExecutionCount.Should().Be(124);
        dataPoint.SuccessCount.Should().Be(122);
        dataPoint.FailureCount.Should().Be(2);
    }

    [Fact]
    public void DurationDataPoint_Should_Serialize_To_Json_Correctly()
    {
        // Arrange
        var dataPoint = new DurationDataPoint
        {
            Date = new DateTime(2025, 11, 25, 0, 0, 0, DateTimeKind.Utc),
            AverageDurationMs = 1250.5,
            MinDurationMs = 450.0,
            MaxDurationMs = 3200.0,
            P50DurationMs = 1200.0,
            P95DurationMs = 2800.0,
            ExecutionCount = 124,
            SuccessCount = 122,
            FailureCount = 2
        };

        // Act
        var json = JsonSerializer.Serialize(dataPoint);

        // Assert
        json.Should().Contain("\"date\":");
        json.Should().Contain("\"averageDurationMs\":1250.5");
        json.Should().Contain("\"minDurationMs\":450");
        json.Should().Contain("\"maxDurationMs\":3200");
        json.Should().Contain("\"p50DurationMs\":1200");
        json.Should().Contain("\"p95DurationMs\":2800");
        json.Should().Contain("\"executionCount\":124");
        json.Should().Contain("\"successCount\":122");
        json.Should().Contain("\"failureCount\":2");
    }

    [Fact]
    public void DurationDataPoint_Should_Deserialize_From_Json_Correctly()
    {
        // Arrange
        var json = @"{
            ""date"": ""2025-11-25T00:00:00Z"",
            ""averageDurationMs"": 1250.5,
            ""minDurationMs"": 450.0,
            ""maxDurationMs"": 3200.0,
            ""p50DurationMs"": 1200.0,
            ""p95DurationMs"": 2800.0,
            ""executionCount"": 124,
            ""successCount"": 122,
            ""failureCount"": 2
        }";

        // Act
        var dataPoint = JsonSerializer.Deserialize<DurationDataPoint>(json);

        // Assert
        dataPoint.Should().NotBeNull();
        dataPoint!.Date.Should().Be(new DateTime(2025, 11, 25, 0, 0, 0, DateTimeKind.Utc));
        dataPoint.AverageDurationMs.Should().Be(1250.5);
        dataPoint.MinDurationMs.Should().Be(450.0);
        dataPoint.MaxDurationMs.Should().Be(3200.0);
        dataPoint.P50DurationMs.Should().Be(1200.0);
        dataPoint.P95DurationMs.Should().Be(2800.0);
        dataPoint.ExecutionCount.Should().Be(124);
        dataPoint.SuccessCount.Should().Be(122);
        dataPoint.FailureCount.Should().Be(2);
    }
}
