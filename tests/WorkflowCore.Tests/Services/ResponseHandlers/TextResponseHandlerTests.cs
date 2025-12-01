using System.Net;
using System.Text;
using FluentAssertions;
using WorkflowCore.Services.ResponseHandlers;
using Xunit;

namespace WorkflowCore.Tests.Services.ResponseHandlers;

public class TextResponseHandlerTests
{
    private readonly TextResponseHandler _handler;

    public TextResponseHandlerTests()
    {
        _handler = new TextResponseHandler();
    }

    #region CanHandle Tests

    [Fact]
    public void CanHandle_WithTextPlain_ReturnsTrue()
    {
        // Act
        var result = _handler.CanHandle("text/plain");

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void CanHandle_WithTextHtml_ReturnsTrue()
    {
        // Act
        var result = _handler.CanHandle("text/html");

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void CanHandle_WithTextXml_ReturnsTrue()
    {
        // Act
        var result = _handler.CanHandle("text/xml");

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void CanHandle_WithApplicationPdf_ReturnsFalse()
    {
        // Act
        var result = _handler.CanHandle("application/pdf");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void CanHandle_WithApplicationJson_ReturnsFalse()
    {
        // Act
        var result = _handler.CanHandle("application/json");

        // Assert
        result.Should().BeFalse();
    }

    #endregion

    #region HandleAsync Tests

    [Fact]
    public async Task HandleAsync_WithPlainText_ReturnsTextContent()
    {
        // Arrange
        var textContent = "Hello, World!";
        var response = CreateTextResponse(textContent, "text/plain");

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Should().ContainKey("content_type");
        result["content_type"].Should().Be("text/plain");
        result.Should().ContainKey("data");
        result["data"].Should().Be(textContent);
    }

    [Fact]
    public async Task HandleAsync_WithHtmlContent_ReturnsHtml()
    {
        // Arrange
        var htmlContent = "<html><body><h1>Test</h1></body></html>";
        var response = CreateTextResponse(htmlContent, "text/html");

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result["content_type"].Should().Be("text/html");
        result["data"].Should().Be(htmlContent);
    }

    [Fact]
    public async Task HandleAsync_WithXmlContent_ReturnsXml()
    {
        // Arrange
        var xmlContent = "<?xml version=\"1.0\"?><root><item>Test</item></root>";
        var response = CreateTextResponse(xmlContent, "text/xml");

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result["content_type"].Should().Be("text/xml");
        result["data"].Should().Be(xmlContent);
    }

    [Fact]
    public async Task HandleAsync_WithEmptyText_ReturnsEmptyString()
    {
        // Arrange
        var response = CreateTextResponse(string.Empty, "text/plain");

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result["data"].Should().Be(string.Empty);
    }

    [Fact]
    public async Task HandleAsync_WithUnicodeCharacters_PreservesUnicode()
    {
        // Arrange
        var unicodeText = "Hello 世界 🌍 Привет";
        var response = CreateTextResponse(unicodeText, "text/plain");

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result["data"].Should().Be(unicodeText);
    }

    [Fact]
    public async Task HandleAsync_WithLargeText_HandlesCorrectly()
    {
        // Arrange
        var largeText = new string('A', 100000); // 100KB of 'A's
        var response = CreateTextResponse(largeText, "text/plain");

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result["data"].Should().Be(largeText);
    }

    [Fact]
    public async Task HandleAsync_WithContentTypeAndCharset_ExtractsBaseContentType()
    {
        // Arrange
        var textContent = "Test content";
        var response = CreateTextResponse(textContent, "text/plain; charset=utf-8");

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result["content_type"].Should().Be("text/plain");
        result["data"].Should().Be(textContent);
    }

    #endregion

    #region Helper Methods

    private static HttpResponseMessage CreateTextResponse(string content, string contentType)
    {
        // Extract base media type from content type (e.g., "text/plain; charset=utf-8" -> "text/plain")
        var mediaType = contentType.Split(';')[0].Trim();

        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(content, Encoding.UTF8, mediaType)
        };
    }

    #endregion
}
