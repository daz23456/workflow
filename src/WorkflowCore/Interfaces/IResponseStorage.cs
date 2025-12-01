namespace WorkflowCore.Interfaces;

/// <summary>
/// Handles storage of binary response content using hybrid strategy:
/// - Small files (&lt;500KB): Base64-encoded in memory
/// - Large files (≥500KB): Saved to temporary file on disk
/// </summary>
public interface IResponseStorage
{
    /// <summary>
    /// Stores binary content using the optimal strategy based on file size.
    /// </summary>
    /// <param name="content">The binary content to store</param>
    /// <param name="contentType">The MIME type (e.g., "application/pdf")</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>
    /// A dictionary containing:
    /// - content_type: MIME type
    /// - encoding: "base64" or "file"
    /// - data: Base64 string (if encoding=base64)
    /// - file_path: Absolute path to temp file (if encoding=file)
    /// - size_bytes: Original file size in bytes
    /// </returns>
    Task<Dictionary<string, object>> StoreAsync(
        byte[] content,
        string contentType,
        CancellationToken cancellationToken);

    /// <summary>
    /// Cleans up a temporary file created by StoreAsync.
    /// Safe to call even if file doesn't exist or path is null.
    /// </summary>
    /// <param name="filePath">Path to temp file, or null</param>
    void CleanupTempFile(string? filePath);
}
