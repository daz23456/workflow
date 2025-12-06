using System.Security.Cryptography;
using System.Text;

namespace WorkflowCore.Services;

/// <summary>
/// HMAC-SHA256 signature validator for webhook payloads.
/// Uses constant-time comparison to prevent timing attacks.
/// </summary>
public class HmacValidator : IHmacValidator
{
    private const string SignaturePrefix = "sha256=";

    /// <inheritdoc />
    public bool ValidateSignature(string payload, string signature, string secret)
    {
        if (payload == null || signature == null || secret == null)
        {
            return false;
        }

        if (string.IsNullOrEmpty(signature))
        {
            return false;
        }

        // Signature must start with sha256= prefix (lowercase)
        if (!signature.StartsWith(SignaturePrefix, StringComparison.Ordinal))
        {
            return false;
        }

        // Compute expected signature
        var expected = ComputeSignature(payload, secret);

        // Use constant-time comparison to prevent timing attacks
        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(signature),
            Encoding.UTF8.GetBytes(expected));
    }

    /// <inheritdoc />
    public string ComputeSignature(string payload, string secret)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(payload));
        var hexHash = Convert.ToHexString(hash).ToLower();
        return SignaturePrefix + hexHash;
    }
}
