using FluentAssertions;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class TimeoutParserTests
{
    [Fact]
    public void Parse_NullInput_ReturnsNull()
    {
        // Arrange
        string? input = null;

        // Act
        var result = TimeoutParser.Parse(input);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void Parse_EmptyString_ReturnsNull()
    {
        // Arrange
        var input = "";

        // Act
        var result = TimeoutParser.Parse(input);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public void Parse_WhitespaceOnly_ReturnsNull()
    {
        // Arrange
        var input = "   ";

        // Act
        var result = TimeoutParser.Parse(input);

        // Assert
        result.Should().BeNull();
    }

    [Theory]
    [InlineData("30s", 30)]
    [InlineData("1s", 1)]
    [InlineData("60s", 60)]
    [InlineData("0s", 0)]
    public void Parse_ValidSeconds_ReturnsCorrectTimeSpan(string input, int expectedSeconds)
    {
        // Act
        var result = TimeoutParser.Parse(input);

        // Assert
        result.Should().NotBeNull();
        result!.Value.TotalSeconds.Should().Be(expectedSeconds);
    }

    [Theory]
    [InlineData("500ms", 500)]
    [InlineData("1000ms", 1000)]
    [InlineData("100ms", 100)]
    [InlineData("0ms", 0)]
    public void Parse_ValidMilliseconds_ReturnsCorrectTimeSpan(string input, int expectedMilliseconds)
    {
        // Act
        var result = TimeoutParser.Parse(input);

        // Assert
        result.Should().NotBeNull();
        result!.Value.TotalMilliseconds.Should().Be(expectedMilliseconds);
    }

    [Theory]
    [InlineData("5m", 5)]
    [InlineData("1m", 1)]
    [InlineData("30m", 30)]
    [InlineData("0m", 0)]
    public void Parse_ValidMinutes_ReturnsCorrectTimeSpan(string input, int expectedMinutes)
    {
        // Act
        var result = TimeoutParser.Parse(input);

        // Assert
        result.Should().NotBeNull();
        result!.Value.TotalMinutes.Should().Be(expectedMinutes);
    }

    [Theory]
    [InlineData("2h", 2)]
    [InlineData("1h", 1)]
    [InlineData("24h", 24)]
    [InlineData("0h", 0)]
    public void Parse_ValidHours_ReturnsCorrectTimeSpan(string input, int expectedHours)
    {
        // Act
        var result = TimeoutParser.Parse(input);

        // Assert
        result.Should().NotBeNull();
        result!.Value.TotalHours.Should().Be(expectedHours);
    }

    [Theory]
    [InlineData("invalid")]
    [InlineData("30x")]
    [InlineData("abc")]
    [InlineData("30")]
    [InlineData("s")]
    [InlineData("m")]
    [InlineData("h")]
    [InlineData("ms")]
    public void Parse_InvalidFormat_ThrowsFormatException(string input)
    {
        // Act
        Action act = () => TimeoutParser.Parse(input);

        // Assert
        act.Should().Throw<FormatException>()
            .WithMessage($"Invalid timeout format: '{input}'. Expected formats: '30s', '5m', '2h', '500ms'");
    }

    [Theory]
    [InlineData("notanumber-s")]
    [InlineData("xyz-m")]
    [InlineData("abc-h")]
    [InlineData("invalid-ms")]
    public void Parse_InvalidNumber_ThrowsFormatException(string input)
    {
        // Act
        Action act = () => TimeoutParser.Parse(input);

        // Assert
        act.Should().Throw<FormatException>()
            .WithMessage($"Invalid timeout format: '{input}'. Expected formats: '30s', '5m', '2h', '500ms'");
    }

    [Fact]
    public void Parse_LeadingAndTrailingWhitespace_ParsesCorrectly()
    {
        // Arrange
        var input = "  30s  ";

        // Act
        var result = TimeoutParser.Parse(input);

        // Assert
        result.Should().NotBeNull();
        result!.Value.TotalSeconds.Should().Be(30);
    }
}
