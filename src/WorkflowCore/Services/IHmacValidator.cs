namespace WorkflowCore.Services;

/// <summary>
/// Interface for HMAC signature validation.
/// Used by WebhookController to validate webhook payloads.
/// </summary>
public interface IHmacValidator
{
    /// <summary>
    /// Validates that the signature matches the payload using the provided secret.
    /// </summary>
    /// <param name="payload">The raw request body</param>
    /// <param name="signature">The signature from the X-Webhook-Signature header (format: "sha256=...")</param>
    /// <param name="secret">The shared secret for HMAC computation</param>
    /// <returns>True if the signature is valid, false otherwise</returns>
    bool ValidateSignature(string payload, string signature, string secret);

    /// <summary>
    /// Computes the HMAC-SHA256 signature for a payload.
    /// </summary>
    /// <param name="payload">The raw request body</param>
    /// <param name="secret">The shared secret for HMAC computation</param>
    /// <returns>The signature in format "sha256={hex}"</returns>
    string ComputeSignature(string payload, string secret);
}
