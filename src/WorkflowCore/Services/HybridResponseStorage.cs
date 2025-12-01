using WorkflowCore.Interfaces;

namespace WorkflowCore.Services;

/// <summary>
/// Hybrid storage implementation that chooses between base64 encoding and temp file storage
/// based on file size threshold (500KB).
/// </summary>
public class HybridResponseStorage : IResponseStorage
{
    private const int SIZE_THRESHOLD_BYTES = 512 * 1024; // 500KB
    private const string TEMP_FILE_PREFIX = "workflow_";

    private static readonly Dictionary<string, string> ContentTypeExtensions = new()
    {
        ["application/pdf"] = ".pdf",
        ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] = ".xlsx",
        ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"] = ".docx",
        ["image/png"] = ".png",
        ["image/jpeg"] = ".jpg"
    };

    public async Task<Dictionary<string, object>> StoreAsync(
        byte[] content,
        string contentType,
        CancellationToken cancellationToken)
    {
        var fileSize = content.Length;

        if (fileSize < SIZE_THRESHOLD_BYTES)
        {
            // Small file: Base64 encoding
            var base64 = Convert.ToBase64String(content);
            return new Dictionary<string, object>
            {
                ["content_type"] = contentType,
                ["encoding"] = "base64",
                ["data"] = base64,
                ["size_bytes"] = fileSize
            };
        }
        else
        {
            // Large file: Temp file storage
            var extension = ContentTypeExtensions.GetValueOrDefault(contentType, ".bin");
            var tempFileName = $"{TEMP_FILE_PREFIX}{Guid.NewGuid()}{extension}";
            var tempFilePath = Path.Combine(Path.GetTempPath(), tempFileName);

            await File.WriteAllBytesAsync(tempFilePath, content, cancellationToken);

            return new Dictionary<string, object>
            {
                ["content_type"] = contentType,
                ["encoding"] = "file",
                ["file_path"] = tempFilePath,
                ["size_bytes"] = fileSize
            };
        }
    }

    public void CleanupTempFile(string? filePath)
    {
        if (string.IsNullOrEmpty(filePath)) return;

        try
        {
            if (File.Exists(filePath))
            {
                File.Delete(filePath);
            }
        }
        catch
        {
            // Swallow cleanup errors - file may already be deleted or locked
            // OS will clean up temp directory eventually
        }
    }
}
