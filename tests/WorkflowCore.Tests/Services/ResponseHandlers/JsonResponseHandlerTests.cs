using System.Net;
using System.Text;
using FluentAssertions;
using WorkflowCore.Services.ResponseHandlers;
using Xunit;

namespace WorkflowCore.Tests.Services.ResponseHandlers;

public class JsonResponseHandlerTests
{
    private readonly JsonResponseHandler _handler;

    public JsonResponseHandlerTests()
    {
        _handler = new JsonResponseHandler();
    }

    #region CanHandle Tests

    [Fact]
    public void CanHandle_WithApplicationJson_ReturnsTrue()
    {
        // Act
        var result = _handler.CanHandle("application/json");

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void CanHandle_WithTextJson_ReturnsTrue()
    {
        // Act
        var result = _handler.CanHandle("text/json");

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void CanHandle_WithApplicationJsonAndCharset_ReturnsTrue()
    {
        // Act
        var result = _handler.CanHandle("application/json; charset=utf-8");

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

    #endregion

    #region HandleAsync Tests - JSON Objects

    [Fact]
    public async Task HandleAsync_WithJsonObject_ReturnsDeserializedDictionary()
    {
        // Arrange
        var json = "{\"id\":\"123\",\"name\":\"John Doe\"}";
        var response = CreateJsonResponse(json);

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Should().ContainKey("id");
        result["id"].ToString().Should().Be("123");
        result.Should().ContainKey("name");
        result["name"].ToString().Should().Be("John Doe");
    }

    [Fact]
    public async Task HandleAsync_WithNestedJsonObject_ReturnsNestedStructure()
    {
        // Arrange
        var json = "{\"user\":{\"id\":\"123\",\"email\":\"test@example.com\"}}";
        var response = CreateJsonResponse(json);

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result.Should().ContainKey("user");
    }

    [Fact]
    public async Task HandleAsync_WithEmptyJsonObject_ReturnsEmptyDictionary()
    {
        // Arrange
        var json = "{}";
        var response = CreateJsonResponse(json);

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result.Should().BeEmpty();
    }

    #endregion

    #region HandleAsync Tests - JSON Arrays

    [Fact]
    public async Task HandleAsync_WithJsonArray_WrapsInDataKey()
    {
        // Arrange
        var json = "[{\"id\":\"1\"},{\"id\":\"2\"}]";
        var response = CreateJsonResponse(json);

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result.Should().ContainKey("data");
        result["data"].Should().NotBeNull();
    }

    [Fact]
    public async Task HandleAsync_WithEmptyJsonArray_WrapsInDataKey()
    {
        // Arrange
        var json = "[]";
        var response = CreateJsonResponse(json);

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result.Should().ContainKey("data");
    }

    #endregion

    #region HandleAsync Tests - JSON Primitives

    [Fact]
    public async Task HandleAsync_WithJsonString_WrapsInDataKey()
    {
        // Arrange
        var json = "\"Hello World\"";
        var response = CreateJsonResponse(json);

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result.Should().ContainKey("data");
        result["data"].ToString().Should().Be("Hello World");
    }

    [Fact]
    public async Task HandleAsync_WithJsonNumber_WrapsInDataKey()
    {
        // Arrange
        var json = "42";
        var response = CreateJsonResponse(json);

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result.Should().ContainKey("data");
    }

    #endregion

    #region HandleAsync Tests - Edge Cases

    [Fact]
    public async Task HandleAsync_WithNullValuesInJson_PreservesNulls()
    {
        // Arrange
        var json = "{\"name\":\"John\",\"middleName\":null}";
        var response = CreateJsonResponse(json);

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result.Should().ContainKey("middleName");
    }

    [Fact]
    public async Task HandleAsync_WithUnicodeCharacters_HandlesCorrectly()
    {
        // Arrange
        var json = "{\"message\":\"Hello 世界 🌍\"}";
        var response = CreateJsonResponse(json);

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result["message"].ToString().Should().Contain("世界");
        result["message"].ToString().Should().Contain("🌍");
    }

    [Fact]
    public async Task HandleAsync_WithEscapedCharacters_HandlesCorrectly()
    {
        // Arrange
        var json = "{\"path\":\"C:\\\\Users\\\\John\\\\file.txt\"}";
        var response = CreateJsonResponse(json);

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result["path"].ToString().Should().Contain("\\");
    }

    [Fact]
    public async Task HandleAsync_WithInvalidJson_ThrowsJsonException()
    {
        // Arrange
        var invalidJson = "{invalid json}";
        var response = CreateJsonResponse(invalidJson);

        // Act
        Func<Task> act = async () => await _handler.HandleAsync(response, CancellationToken.None);

        // Assert - accepts JsonException or any subclass (JsonReaderException)
        await act.Should().ThrowAsync<System.Text.Json.JsonException>();
    }

    #endregion

    #region Helper Methods

    private static HttpResponseMessage CreateJsonResponse(string json)
    {
        return new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };
    }

    #endregion
}
