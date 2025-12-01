using System.Net;
using FluentAssertions;
using Moq;
using WorkflowCore.Interfaces;
using WorkflowCore.Services.ResponseHandlers;
using Xunit;

namespace WorkflowCore.Tests.Services.ResponseHandlers;

public class BinaryResponseHandlerTests : IDisposable
{
    private readonly Mock<IResponseStorage> _mockStorage;
    private readonly BinaryResponseHandler _handler;
    private readonly List<string> _tempFilesToCleanup = new();

    public BinaryResponseHandlerTests()
    {
        _mockStorage = new Mock<IResponseStorage>();
        _handler = new BinaryResponseHandler(_mockStorage.Object);
    }

    public void Dispose()
    {
        // Cleanup any temp files created during tests
        foreach (var filePath in _tempFilesToCleanup)
        {
            if (File.Exists(filePath))
            {
                File.Delete(filePath);
            }
        }
    }

    #region CanHandle Tests

    [Fact]
    public void CanHandle_WithApplicationPdf_ReturnsTrue()
    {
        // Act
        var result = _handler.CanHandle("application/pdf");

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void CanHandle_WithImagePng_ReturnsTrue()
    {
        // Act
        var result = _handler.CanHandle("image/png");

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void CanHandle_WithImageJpeg_ReturnsTrue()
    {
        // Act
        var result = _handler.CanHandle("image/jpeg");

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void CanHandle_WithExcelSpreadsheet_ReturnsTrue()
    {
        // Act
        var result = _handler.CanHandle("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void CanHandle_WithWordDocument_ReturnsTrue()
    {
        // Act
        var result = _handler.CanHandle("application/vnd.openxmlformats-officedocument.wordprocessingml.document");

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void CanHandle_WithApplicationJson_ReturnsFalse()
    {
        // Act
        var result = _handler.CanHandle("application/json");

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void CanHandle_WithTextPlain_ReturnsFalse()
    {
        // Act
        var result = _handler.CanHandle("text/plain");

        // Assert
        result.Should().BeFalse();
    }

    #endregion

    #region HandleAsync Tests - Small Files (Base64)

    [Fact]
    public async Task HandleAsync_WithSmallPdf_DelegatesToStorage()
    {
        // Arrange
        var content = new byte[100 * 1024]; // 100KB
        Random.Shared.NextBytes(content);
        var response = CreateBinaryResponse(content, "application/pdf");

        var storageResult = new Dictionary<string, object>
        {
            ["encoding"] = "base64",
            ["data"] = Convert.ToBase64String(content),
            ["content_type"] = "application/pdf",
            ["size_bytes"] = content.Length
        };

        _mockStorage.Setup(s => s.StoreAsync(
            It.IsAny<byte[]>(),
            "application/pdf",
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(storageResult);

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result.Should().ContainKey("encoding");
        result["encoding"].Should().Be("base64");
        result.Should().ContainKey("data");
        result.Should().ContainKey("content_type");
        result["content_type"].Should().Be("application/pdf");

        _mockStorage.Verify(s => s.StoreAsync(
            It.Is<byte[]>(b => b.SequenceEqual(content)),
            "application/pdf",
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_WithSmallPng_DelegatesToStorage()
    {
        // Arrange
        var content = new byte[50 * 1024]; // 50KB
        Random.Shared.NextBytes(content);
        var response = CreateBinaryResponse(content, "image/png");

        var storageResult = new Dictionary<string, object>
        {
            ["encoding"] = "base64",
            ["data"] = Convert.ToBase64String(content),
            ["content_type"] = "image/png",
            ["size_bytes"] = content.Length
        };

        _mockStorage.Setup(s => s.StoreAsync(
            It.IsAny<byte[]>(),
            "image/png",
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(storageResult);

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result["encoding"].Should().Be("base64");
        result["content_type"].Should().Be("image/png");
    }

    [Fact]
    public async Task HandleAsync_WithSmallJpeg_DelegatesToStorage()
    {
        // Arrange
        var content = new byte[75 * 1024]; // 75KB
        Random.Shared.NextBytes(content);
        var response = CreateBinaryResponse(content, "image/jpeg");

        var storageResult = new Dictionary<string, object>
        {
            ["encoding"] = "base64",
            ["data"] = Convert.ToBase64String(content),
            ["content_type"] = "image/jpeg",
            ["size_bytes"] = content.Length
        };

        _mockStorage.Setup(s => s.StoreAsync(
            It.IsAny<byte[]>(),
            "image/jpeg",
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(storageResult);

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result["encoding"].Should().Be("base64");
        result["content_type"].Should().Be("image/jpeg");
    }

    #endregion

    #region HandleAsync Tests - Large Files (Temp File)

    [Fact]
    public async Task HandleAsync_WithLargePdf_DelegatesToStorage()
    {
        // Arrange
        var content = new byte[600 * 1024]; // 600KB
        Random.Shared.NextBytes(content);
        var response = CreateBinaryResponse(content, "application/pdf");

        var tempFilePath = Path.Combine(Path.GetTempPath(), $"workflow_{Guid.NewGuid()}.pdf");
        _tempFilesToCleanup.Add(tempFilePath);

        var storageResult = new Dictionary<string, object>
        {
            ["encoding"] = "file",
            ["file_path"] = tempFilePath,
            ["content_type"] = "application/pdf",
            ["size_bytes"] = content.Length
        };

        _mockStorage.Setup(s => s.StoreAsync(
            It.IsAny<byte[]>(),
            "application/pdf",
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(storageResult);

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result.Should().ContainKey("encoding");
        result["encoding"].Should().Be("file");
        result.Should().ContainKey("file_path");
        result["content_type"].Should().Be("application/pdf");

        _mockStorage.Verify(s => s.StoreAsync(
            It.Is<byte[]>(b => b.SequenceEqual(content)),
            "application/pdf",
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_WithLargeExcel_DelegatesToStorage()
    {
        // Arrange
        var content = new byte[800 * 1024]; // 800KB
        Random.Shared.NextBytes(content);
        var response = CreateBinaryResponse(content,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

        var tempFilePath = Path.Combine(Path.GetTempPath(), $"workflow_{Guid.NewGuid()}.xlsx");
        _tempFilesToCleanup.Add(tempFilePath);

        var storageResult = new Dictionary<string, object>
        {
            ["encoding"] = "file",
            ["file_path"] = tempFilePath,
            ["content_type"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ["size_bytes"] = content.Length
        };

        _mockStorage.Setup(s => s.StoreAsync(
            It.IsAny<byte[]>(),
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(storageResult);

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result["encoding"].Should().Be("file");
        result["content_type"].Should().Be("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    }

    [Fact]
    public async Task HandleAsync_WithLargeWord_DelegatesToStorage()
    {
        // Arrange
        var content = new byte[1024 * 1024]; // 1MB
        Random.Shared.NextBytes(content);
        var response = CreateBinaryResponse(content,
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document");

        var tempFilePath = Path.Combine(Path.GetTempPath(), $"workflow_{Guid.NewGuid()}.docx");
        _tempFilesToCleanup.Add(tempFilePath);

        var storageResult = new Dictionary<string, object>
        {
            ["encoding"] = "file",
            ["file_path"] = tempFilePath,
            ["content_type"] = "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ["size_bytes"] = content.Length
        };

        _mockStorage.Setup(s => s.StoreAsync(
            It.IsAny<byte[]>(),
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(storageResult);

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result["encoding"].Should().Be("file");
        result["content_type"].Should().Be("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    }

    [Fact]
    public async Task HandleAsync_WithLargePng_DelegatesToStorage()
    {
        // Arrange
        var content = new byte[2 * 1024 * 1024]; // 2MB
        Random.Shared.NextBytes(content);
        var response = CreateBinaryResponse(content, "image/png");

        var tempFilePath = Path.Combine(Path.GetTempPath(), $"workflow_{Guid.NewGuid()}.png");
        _tempFilesToCleanup.Add(tempFilePath);

        var storageResult = new Dictionary<string, object>
        {
            ["encoding"] = "file",
            ["file_path"] = tempFilePath,
            ["content_type"] = "image/png",
            ["size_bytes"] = content.Length
        };

        _mockStorage.Setup(s => s.StoreAsync(
            It.IsAny<byte[]>(),
            "image/png",
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(storageResult);

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result["encoding"].Should().Be("file");
        result["content_type"].Should().Be("image/png");
    }

    [Fact]
    public async Task HandleAsync_WithLargeJpeg_DelegatesToStorage()
    {
        // Arrange
        var content = new byte[1500 * 1024]; // 1.5MB
        Random.Shared.NextBytes(content);
        var response = CreateBinaryResponse(content, "image/jpeg");

        var tempFilePath = Path.Combine(Path.GetTempPath(), $"workflow_{Guid.NewGuid()}.jpg");
        _tempFilesToCleanup.Add(tempFilePath);

        var storageResult = new Dictionary<string, object>
        {
            ["encoding"] = "file",
            ["file_path"] = tempFilePath,
            ["content_type"] = "image/jpeg",
            ["size_bytes"] = content.Length
        };

        _mockStorage.Setup(s => s.StoreAsync(
            It.IsAny<byte[]>(),
            "image/jpeg",
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(storageResult);

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result["encoding"].Should().Be("file");
        result["content_type"].Should().Be("image/jpeg");
    }

    #endregion

    #region Edge Cases

    [Fact]
    public async Task HandleAsync_WithEmptyContent_DelegatesToStorage()
    {
        // Arrange
        var content = Array.Empty<byte>();
        var response = CreateBinaryResponse(content, "application/pdf");

        var storageResult = new Dictionary<string, object>
        {
            ["encoding"] = "base64",
            ["data"] = string.Empty,
            ["content_type"] = "application/pdf",
            ["size_bytes"] = 0
        };

        _mockStorage.Setup(s => s.StoreAsync(
            It.IsAny<byte[]>(),
            "application/pdf",
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(storageResult);

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();
        result["size_bytes"].Should().Be(0);

        _mockStorage.Verify(s => s.StoreAsync(
            It.Is<byte[]>(b => b.Length == 0),
            "application/pdf",
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_WithContentTypeWithCharset_ExtractsBaseContentType()
    {
        // Arrange
        var content = new byte[100 * 1024];
        Random.Shared.NextBytes(content);
        var response = CreateBinaryResponse(content, "application/pdf; charset=utf-8");

        var storageResult = new Dictionary<string, object>
        {
            ["encoding"] = "base64",
            ["data"] = Convert.ToBase64String(content),
            ["content_type"] = "application/pdf",
            ["size_bytes"] = content.Length
        };

        _mockStorage.Setup(s => s.StoreAsync(
            It.IsAny<byte[]>(),
            "application/pdf",
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(storageResult);

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result.Should().NotBeNull();

        _mockStorage.Verify(s => s.StoreAsync(
            It.IsAny<byte[]>(),
            "application/pdf",
            It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_PreservesSizeBytesFromStorage()
    {
        // Arrange
        var content = new byte[250 * 1024];
        Random.Shared.NextBytes(content);
        var response = CreateBinaryResponse(content, "application/pdf");

        var storageResult = new Dictionary<string, object>
        {
            ["encoding"] = "base64",
            ["data"] = Convert.ToBase64String(content),
            ["content_type"] = "application/pdf",
            ["size_bytes"] = 256000 // Storage may calculate differently
        };

        _mockStorage.Setup(s => s.StoreAsync(
            It.IsAny<byte[]>(),
            "application/pdf",
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(storageResult);

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result["size_bytes"].Should().Be(256000);
    }

    [Fact]
    public async Task HandleAsync_PassesCancellationTokenToStorage()
    {
        // Arrange
        var content = new byte[100];
        var response = CreateBinaryResponse(content, "application/pdf");
        var cts = new CancellationTokenSource();
        var cancellationToken = cts.Token;

        var storageResult = new Dictionary<string, object>
        {
            ["encoding"] = "base64",
            ["data"] = Convert.ToBase64String(content),
            ["content_type"] = "application/pdf",
            ["size_bytes"] = content.Length
        };

        _mockStorage.Setup(s => s.StoreAsync(
            It.IsAny<byte[]>(),
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(storageResult);

        // Act
        await _handler.HandleAsync(response, cancellationToken);

        // Assert
        _mockStorage.Verify(s => s.StoreAsync(
            It.IsAny<byte[]>(),
            It.IsAny<string>(),
            cancellationToken), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ReturnsExactDictionaryFromStorage()
    {
        // Arrange
        var content = new byte[100];
        var response = CreateBinaryResponse(content, "application/pdf");

        var storageResult = new Dictionary<string, object>
        {
            ["encoding"] = "base64",
            ["data"] = "custom_data",
            ["content_type"] = "application/pdf",
            ["size_bytes"] = 100,
            ["custom_field"] = "custom_value"
        };

        _mockStorage.Setup(s => s.StoreAsync(
            It.IsAny<byte[]>(),
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(storageResult);

        // Act
        var result = await _handler.HandleAsync(response, CancellationToken.None);

        // Assert
        result.Should().BeSameAs(storageResult);
        result.Should().ContainKey("custom_field");
        result["custom_field"].Should().Be("custom_value");
    }

    #endregion

    #region Helper Methods

    private static HttpResponseMessage CreateBinaryResponse(byte[] content, string contentType)
    {
        var response = new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new ByteArrayContent(content)
        };

        // Parse content type to extract base type and parameters
        var parts = contentType.Split(';');
        var mediaType = new System.Net.Http.Headers.MediaTypeHeaderValue(parts[0].Trim());

        // Add any parameters (e.g., charset)
        for (int i = 1; i < parts.Length; i++)
        {
            var param = parts[i].Trim();
            var paramParts = param.Split('=');
            if (paramParts.Length == 2)
            {
                mediaType.Parameters.Add(
                    new System.Net.Http.Headers.NameValueHeaderValue(paramParts[0].Trim(), paramParts[1].Trim()));
            }
        }

        response.Content.Headers.ContentType = mediaType;
        return response;
    }

    #endregion
}
