using FluentAssertions;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

/// <summary>
/// Tests for CronParser service - Stage 20.1: Schedule Triggers
/// </summary>
public class CronParserTests
{
    private readonly ICronParser _parser;

    public CronParserTests()
    {
        _parser = new CronParser();
    }

    #region Validation Tests

    [Theory]
    [InlineData("* * * * *")]           // Every minute
    [InlineData("0 * * * *")]           // Every hour
    [InlineData("0 0 * * *")]           // Every day at midnight
    [InlineData("0 0 * * 0")]           // Every Sunday at midnight
    [InlineData("0 9 * * 1-5")]         // Weekdays at 9am
    [InlineData("*/15 * * * *")]        // Every 15 minutes
    [InlineData("0 0 1 * *")]           // First of every month
    public void IsValid_WithValidCronExpression_ShouldReturnTrue(string cron)
    {
        // Act
        var result = _parser.IsValid(cron);

        // Assert
        result.Should().BeTrue();
    }

    [Theory]
    [InlineData("")]                    // Empty
    [InlineData("invalid")]             // Invalid format
    [InlineData("* * *")]               // Too few fields
    [InlineData("* * * * * * *")]       // Too many fields
    [InlineData("60 * * * *")]          // Invalid minute (60)
    [InlineData("* 25 * * *")]          // Invalid hour (25)
    [InlineData("* * 32 * *")]          // Invalid day (32)
    [InlineData("* * * 13 *")]          // Invalid month (13)
    [InlineData("* * * * 8")]           // Invalid day of week (8)
    public void IsValid_WithInvalidCronExpression_ShouldReturnFalse(string cron)
    {
        // Act
        var result = _parser.IsValid(cron);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void IsValid_WithNull_ShouldReturnFalse()
    {
        // Act
        var result = _parser.IsValid(null!);

        // Assert
        result.Should().BeFalse();
    }

    #endregion

    #region Next Occurrence Tests

    [Fact]
    public void GetNextOccurrence_EveryMinute_ShouldReturnNextMinute()
    {
        // Arrange
        var cron = "* * * * *";
        var baseTime = new DateTime(2024, 1, 15, 10, 30, 0, DateTimeKind.Utc);

        // Act
        var next = _parser.GetNextOccurrence(cron, baseTime);

        // Assert
        next.Should().NotBeNull();
        next.Should().Be(new DateTime(2024, 1, 15, 10, 31, 0, DateTimeKind.Utc));
    }

    [Fact]
    public void GetNextOccurrence_EveryHour_ShouldReturnNextHour()
    {
        // Arrange
        var cron = "0 * * * *";
        var baseTime = new DateTime(2024, 1, 15, 10, 30, 0, DateTimeKind.Utc);

        // Act
        var next = _parser.GetNextOccurrence(cron, baseTime);

        // Assert
        next.Should().NotBeNull();
        next.Should().Be(new DateTime(2024, 1, 15, 11, 0, 0, DateTimeKind.Utc));
    }

    [Fact]
    public void GetNextOccurrence_DailyAtMidnight_ShouldReturnNextMidnight()
    {
        // Arrange
        var cron = "0 0 * * *";
        var baseTime = new DateTime(2024, 1, 15, 10, 30, 0, DateTimeKind.Utc);

        // Act
        var next = _parser.GetNextOccurrence(cron, baseTime);

        // Assert
        next.Should().NotBeNull();
        next.Should().Be(new DateTime(2024, 1, 16, 0, 0, 0, DateTimeKind.Utc));
    }

    [Fact]
    public void GetNextOccurrence_Weekdays9am_ShouldSkipWeekends()
    {
        // Arrange - Friday at 5pm
        var cron = "0 9 * * 1-5";
        var baseTime = new DateTime(2024, 1, 12, 17, 0, 0, DateTimeKind.Utc); // Friday

        // Act
        var next = _parser.GetNextOccurrence(cron, baseTime);

        // Assert - Should be Monday 9am
        next.Should().NotBeNull();
        next!.Value.DayOfWeek.Should().Be(DayOfWeek.Monday);
        next.Value.Hour.Should().Be(9);
    }

    [Fact]
    public void GetNextOccurrence_WithInvalidCron_ShouldReturnNull()
    {
        // Arrange
        var cron = "invalid";
        var baseTime = DateTime.UtcNow;

        // Act
        var next = _parser.GetNextOccurrence(cron, baseTime);

        // Assert
        next.Should().BeNull();
    }

    #endregion

    #region Multiple Occurrences Tests

    [Fact]
    public void GetNextOccurrences_ShouldReturnRequestedCount()
    {
        // Arrange
        var cron = "0 * * * *"; // Every hour
        var baseTime = new DateTime(2024, 1, 15, 10, 0, 0, DateTimeKind.Utc);
        var count = 5;

        // Act
        var occurrences = _parser.GetNextOccurrences(cron, baseTime, count);

        // Assert
        occurrences.Should().HaveCount(count);
        occurrences[0].Should().Be(new DateTime(2024, 1, 15, 11, 0, 0, DateTimeKind.Utc));
        occurrences[1].Should().Be(new DateTime(2024, 1, 15, 12, 0, 0, DateTimeKind.Utc));
        occurrences[4].Should().Be(new DateTime(2024, 1, 15, 15, 0, 0, DateTimeKind.Utc));
    }

    [Fact]
    public void GetNextOccurrences_WithInvalidCron_ShouldReturnEmptyList()
    {
        // Arrange
        var cron = "invalid";
        var baseTime = DateTime.UtcNow;

        // Act
        var occurrences = _parser.GetNextOccurrences(cron, baseTime, 5);

        // Assert
        occurrences.Should().BeEmpty();
    }

    #endregion

    #region Description Tests

    [Theory]
    [InlineData("* * * * *", "Every minute")]
    [InlineData("0 * * * *", "Every hour")]
    [InlineData("0 0 * * *", "Every day at midnight")]
    [InlineData("*/15 * * * *", "Every 15 minutes")]
    public void GetDescription_ShouldReturnHumanReadable(string cron, string expectedDescription)
    {
        // Act
        var description = _parser.GetDescription(cron);

        // Assert
        description.Should().NotBeNullOrEmpty();
        description.Should().Contain(expectedDescription,
            because: $"cron '{cron}' should have description containing '{expectedDescription}'");
    }

    [Fact]
    public void GetDescription_WithInvalidCron_ShouldReturnInvalidMessage()
    {
        // Arrange
        var cron = "invalid";

        // Act
        var description = _parser.GetDescription(cron);

        // Assert
        description.Should().Contain("Invalid");
    }

    #endregion

    #region IsDue Tests

    [Fact]
    public void IsDue_WhenNextOccurrenceIsNow_ShouldReturnTrue()
    {
        // Arrange
        var cron = "* * * * *"; // Every minute
        var now = new DateTime(2024, 1, 15, 10, 30, 0, DateTimeKind.Utc);
        var lastRun = new DateTime(2024, 1, 15, 10, 28, 0, DateTimeKind.Utc);

        // Act
        var isDue = _parser.IsDue(cron, lastRun, now);

        // Assert
        isDue.Should().BeTrue();
    }

    [Fact]
    public void IsDue_WhenRecentlyRun_ShouldReturnFalse()
    {
        // Arrange
        var cron = "0 * * * *"; // Every hour
        var now = new DateTime(2024, 1, 15, 10, 30, 0, DateTimeKind.Utc);
        var lastRun = new DateTime(2024, 1, 15, 10, 0, 0, DateTimeKind.Utc);

        // Act
        var isDue = _parser.IsDue(cron, lastRun, now);

        // Assert
        isDue.Should().BeFalse();
    }

    [Fact]
    public void IsDue_WhenNeverRun_ShouldReturnTrue()
    {
        // Arrange
        var cron = "* * * * *";
        var now = DateTime.UtcNow;
        DateTime? lastRun = null;

        // Act
        var isDue = _parser.IsDue(cron, lastRun, now);

        // Assert
        isDue.Should().BeTrue();
    }

    [Fact]
    public void IsDue_WithInvalidCron_ShouldReturnFalse()
    {
        // Arrange
        var cron = "invalid";
        var now = DateTime.UtcNow;
        DateTime? lastRun = null;

        // Act
        var isDue = _parser.IsDue(cron, lastRun, now);

        // Assert
        isDue.Should().BeFalse();
    }

    #endregion
}
