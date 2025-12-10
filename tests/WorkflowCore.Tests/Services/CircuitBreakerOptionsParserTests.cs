using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;

namespace WorkflowCore.Tests.Services;

/// <summary>
/// Tests for CircuitBreakerOptionsParser - duration string parsing and spec conversion.
/// </summary>
public class CircuitBreakerOptionsParserTests
{
    #region ParseDuration - Milliseconds Tests

    [Theory]
    [InlineData("100ms", 100)]
    [InlineData("500ms", 500)]
    [InlineData("1000ms", 1000)]
    [InlineData("0ms", 0)]
    public void ParseDuration_ParsesMilliseconds_Correctly(string input, double expectedMs)
    {
        // Act
        var result = CircuitBreakerOptionsParser.ParseDuration(input);

        // Assert
        result.Should().Be(TimeSpan.FromMilliseconds(expectedMs));
    }

    [Fact]
    public void ParseDuration_ParsesDecimalMilliseconds()
    {
        // Act
        var result = CircuitBreakerOptionsParser.ParseDuration("1500.5ms");

        // Assert
        result.Should().Be(TimeSpan.FromMilliseconds(1500.5));
    }

    #endregion

    #region ParseDuration - Seconds Tests

    [Theory]
    [InlineData("1s", 1)]
    [InlineData("30s", 30)]
    [InlineData("60s", 60)]
    [InlineData("0s", 0)]
    public void ParseDuration_ParsesSeconds_Correctly(string input, double expectedSeconds)
    {
        // Act
        var result = CircuitBreakerOptionsParser.ParseDuration(input);

        // Assert
        result.Should().Be(TimeSpan.FromSeconds(expectedSeconds));
    }

    [Fact]
    public void ParseDuration_ParsesDecimalSeconds()
    {
        // Act
        var result = CircuitBreakerOptionsParser.ParseDuration("1.5s");

        // Assert
        result.Should().Be(TimeSpan.FromSeconds(1.5));
    }

    #endregion

    #region ParseDuration - Minutes Tests

    [Theory]
    [InlineData("1m", 1)]
    [InlineData("5m", 5)]
    [InlineData("60m", 60)]
    [InlineData("0m", 0)]
    public void ParseDuration_ParsesMinutes_Correctly(string input, double expectedMinutes)
    {
        // Act
        var result = CircuitBreakerOptionsParser.ParseDuration(input);

        // Assert
        result.Should().Be(TimeSpan.FromMinutes(expectedMinutes));
    }

    [Fact]
    public void ParseDuration_ParsesDecimalMinutes()
    {
        // Act
        var result = CircuitBreakerOptionsParser.ParseDuration("2.5m");

        // Assert
        result.Should().Be(TimeSpan.FromMinutes(2.5));
    }

    #endregion

    #region ParseDuration - Hours Tests

    [Theory]
    [InlineData("1h", 1)]
    [InlineData("2h", 2)]
    [InlineData("24h", 24)]
    [InlineData("0h", 0)]
    public void ParseDuration_ParsesHours_Correctly(string input, double expectedHours)
    {
        // Act
        var result = CircuitBreakerOptionsParser.ParseDuration(input);

        // Assert
        result.Should().Be(TimeSpan.FromHours(expectedHours));
    }

    [Fact]
    public void ParseDuration_ParsesDecimalHours()
    {
        // Act
        var result = CircuitBreakerOptionsParser.ParseDuration("1.5h");

        // Assert
        result.Should().Be(TimeSpan.FromHours(1.5));
    }

    #endregion

    #region ParseDuration - Edge Cases

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void ParseDuration_ReturnsZero_ForNullOrWhitespace(string? input)
    {
        // Act
        var result = CircuitBreakerOptionsParser.ParseDuration(input!);

        // Assert
        result.Should().Be(TimeSpan.Zero);
    }

    [Theory]
    [InlineData("invalid")]
    [InlineData("abc")]
    [InlineData("123")]
    [InlineData("s")]
    [InlineData("m")]
    public void ParseDuration_ReturnsZero_ForInvalidFormat(string input)
    {
        // Act
        var result = CircuitBreakerOptionsParser.ParseDuration(input);

        // Assert
        result.Should().Be(TimeSpan.Zero);
    }

    [Fact]
    public void ParseDuration_IsCaseInsensitive()
    {
        // Act & Assert
        CircuitBreakerOptionsParser.ParseDuration("100MS").Should().Be(TimeSpan.FromMilliseconds(100));
        CircuitBreakerOptionsParser.ParseDuration("30S").Should().Be(TimeSpan.FromSeconds(30));
        CircuitBreakerOptionsParser.ParseDuration("5M").Should().Be(TimeSpan.FromMinutes(5));
        CircuitBreakerOptionsParser.ParseDuration("1H").Should().Be(TimeSpan.FromHours(1));
    }

    [Fact]
    public void ParseDuration_TrimsWhitespace()
    {
        // Act
        var result = CircuitBreakerOptionsParser.ParseDuration("  30s  ");

        // Assert
        result.Should().Be(TimeSpan.FromSeconds(30));
    }

    [Theory]
    [InlineData("abcms")]
    [InlineData("xyzs")]
    [InlineData("notanumberm")]
    public void ParseDuration_ReturnsZero_WhenNumericPartIsInvalid(string input)
    {
        // Act
        var result = CircuitBreakerOptionsParser.ParseDuration(input);

        // Assert
        result.Should().Be(TimeSpan.Zero);
    }

    #endregion

    #region ConvertToOptions Tests

    [Fact]
    public void ConvertToOptions_ThrowsArgumentNullException_WhenSpecIsNull()
    {
        // Act & Assert
        var act = () => CircuitBreakerOptionsParser.ConvertToOptions(null!);
        act.Should().Throw<ArgumentNullException>();
    }

    [Fact]
    public void ConvertToOptions_ConvertsAllProperties()
    {
        // Arrange
        var spec = new CircuitBreakerSpec
        {
            FailureThreshold = 5,
            SamplingDuration = "60s",
            BreakDuration = "30s",
            HalfOpenRequests = 3
        };

        // Act
        var result = CircuitBreakerOptionsParser.ConvertToOptions(spec);

        // Assert
        result.FailureThreshold.Should().Be(5);
        result.SamplingDuration.Should().Be(TimeSpan.FromSeconds(60));
        result.BreakDuration.Should().Be(TimeSpan.FromSeconds(30));
        result.HalfOpenRequests.Should().Be(3);
    }

    [Fact]
    public void ConvertToOptions_HandlesMillisecondDurations()
    {
        // Arrange
        var spec = new CircuitBreakerSpec
        {
            FailureThreshold = 10,
            SamplingDuration = "500ms",
            BreakDuration = "1000ms",
            HalfOpenRequests = 1
        };

        // Act
        var result = CircuitBreakerOptionsParser.ConvertToOptions(spec);

        // Assert
        result.SamplingDuration.Should().Be(TimeSpan.FromMilliseconds(500));
        result.BreakDuration.Should().Be(TimeSpan.FromMilliseconds(1000));
    }

    [Fact]
    public void ConvertToOptions_HandlesMinuteDurations()
    {
        // Arrange
        var spec = new CircuitBreakerSpec
        {
            FailureThreshold = 3,
            SamplingDuration = "5m",
            BreakDuration = "2m",
            HalfOpenRequests = 2
        };

        // Act
        var result = CircuitBreakerOptionsParser.ConvertToOptions(spec);

        // Assert
        result.SamplingDuration.Should().Be(TimeSpan.FromMinutes(5));
        result.BreakDuration.Should().Be(TimeSpan.FromMinutes(2));
    }

    [Fact]
    public void ConvertToOptions_HandlesHourDurations()
    {
        // Arrange
        var spec = new CircuitBreakerSpec
        {
            FailureThreshold = 100,
            SamplingDuration = "1h",
            BreakDuration = "30m",
            HalfOpenRequests = 5
        };

        // Act
        var result = CircuitBreakerOptionsParser.ConvertToOptions(spec);

        // Assert
        result.SamplingDuration.Should().Be(TimeSpan.FromHours(1));
        result.BreakDuration.Should().Be(TimeSpan.FromMinutes(30));
    }

    [Fact]
    public void ConvertToOptions_HandlesEmptyDurations()
    {
        // Arrange
        var spec = new CircuitBreakerSpec
        {
            FailureThreshold = 5,
            SamplingDuration = "",
            BreakDuration = "",
            HalfOpenRequests = 1
        };

        // Act
        var result = CircuitBreakerOptionsParser.ConvertToOptions(spec);

        // Assert
        result.SamplingDuration.Should().Be(TimeSpan.Zero);
        result.BreakDuration.Should().Be(TimeSpan.Zero);
    }

    #endregion
}
