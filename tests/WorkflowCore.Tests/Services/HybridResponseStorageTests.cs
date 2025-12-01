using FluentAssertions;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class HybridResponseStorageTests : IDisposable
{
    private readonly HybridResponseStorage _storage;
    private readonly List<string> _tempFilesToCleanup = new();

    public HybridResponseStorageTests()
    {
        _storage = new HybridResponseStorage();
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

    #region Small File Tests (Base64)

    [Fact]
    public async Task StoreAsync_WithSmallFile_ReturnsBase64Encoding()
    {
        // Arrange
        var content = new byte[100 * 1024]; // 100KB
        Random.Shared.NextBytes(content);

        // Act
        var result = await _storage.StoreAsync(content, "application/pdf", CancellationToken.None);

        // Assert
        result.Should().ContainKey("encoding");
        result["encoding"].Should().Be("base64");
        result.Should().ContainKey("data");
        result.Should().ContainKey("content_type");
        result["content_type"].Should().Be("application/pdf");
        result.Should().ContainKey("size_bytes");
        result["size_bytes"].Should().Be(100 * 1024);
    }

    [Fact]
    public async Task StoreAsync_WithExactly500KB_ReturnsBase64()
    {
        // Arrange
        var content = new byte[500 * 1024]; // Exactly 500KB
        Random.Shared.NextBytes(content);

        // Act
        var result = await _storage.StoreAsync(content, "application/pdf", CancellationToken.None);

        // Assert
        result["encoding"].Should().Be("base64");
    }

    [Fact]
    public async Task StoreAsync_WithSmallFile_Base64DecodesCorrectly()
    {
        // Arrange
        var content = new byte[100 * 1024];
        Random.Shared.NextBytes(content);

        // Act
        var result = await _storage.StoreAsync(content, "application/pdf", CancellationToken.None);

        // Assert
        var base64 = result["data"].ToString()!;
        var decoded = Convert.FromBase64String(base64);
        decoded.Should().Equal(content);
    }

    #endregion

    #region Large File Tests (Temp File)

    [Fact]
    public async Task StoreAsync_WithLargeFile_ReturnsTempFilePath()
    {
        // Arrange
        var content = new byte[600 * 1024]; // 600KB
        Random.Shared.NextBytes(content);

        // Act
        var result = await _storage.StoreAsync(content, "application/pdf", CancellationToken.None);

        // Assert
        result.Should().ContainKey("encoding");
        result["encoding"].Should().Be("file");
        result.Should().ContainKey("file_path");
        result.Should().ContainKey("content_type");
        result["content_type"].Should().Be("application/pdf");
        result.Should().ContainKey("size_bytes");
        result["size_bytes"].Should().Be(600 * 1024);

        var filePath = result["file_path"].ToString()!;
        _tempFilesToCleanup.Add(filePath);
    }

    [Fact]
    public async Task StoreAsync_With513KB_ReturnsTempFilePath()
    {
        // Arrange
        var content = new byte[513 * 1024]; // 513KB (just over 512KB threshold)
        Random.Shared.NextBytes(content);

        // Act
        var result = await _storage.StoreAsync(content, "application/pdf", CancellationToken.None);

        // Assert
        result["encoding"].Should().Be("file");

        var filePath = result["file_path"].ToString()!;
        _tempFilesToCleanup.Add(filePath);
    }

    [Fact]
    public async Task StoreAsync_WithLargeFile_FileExistsOnDisk()
    {
        // Arrange
        var content = new byte[600 * 1024];
        Random.Shared.NextBytes(content);

        // Act
        var result = await _storage.StoreAsync(content, "application/pdf", CancellationToken.None);

        // Assert
        var filePath = result["file_path"].ToString()!;
        File.Exists(filePath).Should().BeTrue();

        _tempFilesToCleanup.Add(filePath);
    }

    [Fact]
    public async Task StoreAsync_WithLargeFile_FileHasCorrectContent()
    {
        // Arrange
        var content = new byte[600 * 1024];
        Random.Shared.NextBytes(content);

        // Act
        var result = await _storage.StoreAsync(content, "application/pdf", CancellationToken.None);

        // Assert
        var filePath = result["file_path"].ToString()!;
        var fileContent = await File.ReadAllBytesAsync(filePath);
        fileContent.Should().Equal(content);

        _tempFilesToCleanup.Add(filePath);
    }

    [Fact]
    public async Task StoreAsync_WithLargeFile_FileHasCorrectExtension()
    {
        // Arrange
        var content = new byte[600 * 1024];
        Random.Shared.NextBytes(content);

        // Act
        var result = await _storage.StoreAsync(content, "application/pdf", CancellationToken.None);

        // Assert
        var filePath = result["file_path"].ToString()!;
        filePath.Should().EndWith(".pdf");

        _tempFilesToCleanup.Add(filePath);
    }

    [Fact]
    public async Task StoreAsync_WithLargeExcel_FileHasExcelExtension()
    {
        // Arrange
        var content = new byte[600 * 1024];
        Random.Shared.NextBytes(content);

        // Act
        var result = await _storage.StoreAsync(content,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            CancellationToken.None);

        // Assert
        var filePath = result["file_path"].ToString()!;
        filePath.Should().EndWith(".xlsx");

        _tempFilesToCleanup.Add(filePath);
    }

    [Fact]
    public async Task StoreAsync_WithLargeFile_FileNameContainsPrefix()
    {
        // Arrange
        var content = new byte[600 * 1024];
        Random.Shared.NextBytes(content);

        // Act
        var result = await _storage.StoreAsync(content, "application/pdf", CancellationToken.None);

        // Assert
        var filePath = result["file_path"].ToString()!;
        Path.GetFileName(filePath).Should().StartWith("workflow_");

        _tempFilesToCleanup.Add(filePath);
    }

    [Fact]
    public async Task StoreAsync_WithLargeFile_FilePathIsInTempDirectory()
    {
        // Arrange
        var content = new byte[600 * 1024];
        Random.Shared.NextBytes(content);

        // Act
        var result = await _storage.StoreAsync(content, "application/pdf", CancellationToken.None);

        // Assert
        var filePath = result["file_path"].ToString()!;
        filePath.Should().StartWith(Path.GetTempPath());

        _tempFilesToCleanup.Add(filePath);
    }

    #endregion

    #region Cleanup Tests

    [Fact]
    public void CleanupTempFile_WithExistingFile_DeletesFile()
    {
        // Arrange
        var tempFile = Path.Combine(Path.GetTempPath(), $"test_{Guid.NewGuid()}.tmp");
        File.WriteAllText(tempFile, "test content");

        // Act
        _storage.CleanupTempFile(tempFile);

        // Assert
        File.Exists(tempFile).Should().BeFalse();
    }

    [Fact]
    public void CleanupTempFile_WithNonExistentFile_DoesNotThrow()
    {
        // Arrange
        var nonExistentPath = Path.Combine(Path.GetTempPath(), $"nonexistent_{Guid.NewGuid()}.tmp");

        // Act
        Action act = () => _storage.CleanupTempFile(nonExistentPath);

        // Assert
        act.Should().NotThrow();
    }

    [Fact]
    public void CleanupTempFile_WithNullPath_DoesNotThrow()
    {
        // Act
        Action act = () => _storage.CleanupTempFile(null);

        // Assert
        act.Should().NotThrow();
    }

    [Fact]
    public void CleanupTempFile_WithEmptyPath_DoesNotThrow()
    {
        // Act
        Action act = () => _storage.CleanupTempFile(string.Empty);

        // Assert
        act.Should().NotThrow();
    }

    #endregion
}
