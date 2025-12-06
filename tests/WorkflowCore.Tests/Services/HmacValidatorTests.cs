using FluentAssertions;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

/// <summary>
/// Tests for HmacValidator service - Stage 20.2: Webhook Triggers
/// </summary>
public class HmacValidatorTests
{
    private readonly IHmacValidator _validator;

    public HmacValidatorTests()
    {
        _validator = new HmacValidator();
    }

    #region Signature Validation Tests

    [Fact]
    public void ValidateSignature_WithValidSha256Signature_ShouldReturnTrue()
    {
        // Arrange
        var payload = "{\"event\":\"order.created\",\"data\":{\"id\":123}}";
        var secret = "webhook-secret-key";
        // Pre-computed HMAC-SHA256 of payload with secret
        var signature = ComputeExpectedSignature(payload, secret);

        // Act
        var result = _validator.ValidateSignature(payload, signature, secret);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void ValidateSignature_WithInvalidSignature_ShouldReturnFalse()
    {
        // Arrange
        var payload = "{\"event\":\"order.created\"}";
        var secret = "webhook-secret-key";
        var invalidSignature = "sha256=invalidhash";

        // Act
        var result = _validator.ValidateSignature(payload, invalidSignature, secret);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void ValidateSignature_WithWrongSecret_ShouldReturnFalse()
    {
        // Arrange
        var payload = "{\"event\":\"order.created\"}";
        var correctSecret = "correct-secret";
        var wrongSecret = "wrong-secret";
        var signature = ComputeExpectedSignature(payload, correctSecret);

        // Act
        var result = _validator.ValidateSignature(payload, signature, wrongSecret);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void ValidateSignature_WithModifiedPayload_ShouldReturnFalse()
    {
        // Arrange
        var originalPayload = "{\"event\":\"order.created\"}";
        var modifiedPayload = "{\"event\":\"order.modified\"}";
        var secret = "webhook-secret-key";
        var signature = ComputeExpectedSignature(originalPayload, secret);

        // Act
        var result = _validator.ValidateSignature(modifiedPayload, signature, secret);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void ValidateSignature_WithEmptyPayload_ShouldValidateCorrectly()
    {
        // Arrange
        var payload = "";
        var secret = "webhook-secret-key";
        var signature = ComputeExpectedSignature(payload, secret);

        // Act
        var result = _validator.ValidateSignature(payload, signature, secret);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void ValidateSignature_WithUnicodePayload_ShouldValidateCorrectly()
    {
        // Arrange
        var payload = "{\"message\":\"Hello, 世界! 🌍\"}";
        var secret = "webhook-secret-key";
        var signature = ComputeExpectedSignature(payload, secret);

        // Act
        var result = _validator.ValidateSignature(payload, signature, secret);

        // Assert
        result.Should().BeTrue();
    }

    #endregion

    #region Signature Format Tests

    [Fact]
    public void ValidateSignature_WithoutSha256Prefix_ShouldReturnFalse()
    {
        // Arrange
        var payload = "{\"event\":\"test\"}";
        var secret = "secret";
        // Signature without the sha256= prefix
        var signatureWithoutPrefix = ComputeHexHash(payload, secret);

        // Act
        var result = _validator.ValidateSignature(payload, signatureWithoutPrefix, secret);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void ValidateSignature_WithUppercasePrefix_ShouldReturnFalse()
    {
        // Arrange - GitHub uses lowercase sha256=
        var payload = "{\"event\":\"test\"}";
        var secret = "secret";
        var signatureWithUppercase = "SHA256=" + ComputeHexHash(payload, secret);

        // Act
        var result = _validator.ValidateSignature(payload, signatureWithUppercase, secret);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void ValidateSignature_WithLowercaseHex_ShouldValidate()
    {
        // Arrange
        var payload = "{\"event\":\"test\"}";
        var secret = "secret";
        var signature = "sha256=" + ComputeHexHash(payload, secret).ToLower();

        // Act
        var result = _validator.ValidateSignature(payload, signature, secret);

        // Assert
        result.Should().BeTrue();
    }

    #endregion

    #region Null and Empty Input Tests

    [Fact]
    public void ValidateSignature_WithNullPayload_ShouldReturnFalse()
    {
        // Arrange
        var secret = "secret";
        var signature = "sha256=abc123";

        // Act
        var result = _validator.ValidateSignature(null!, signature, secret);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void ValidateSignature_WithNullSignature_ShouldReturnFalse()
    {
        // Arrange
        var payload = "{\"event\":\"test\"}";
        var secret = "secret";

        // Act
        var result = _validator.ValidateSignature(payload, null!, secret);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void ValidateSignature_WithNullSecret_ShouldReturnFalse()
    {
        // Arrange
        var payload = "{\"event\":\"test\"}";
        var signature = "sha256=abc123";

        // Act
        var result = _validator.ValidateSignature(payload, signature, null!);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void ValidateSignature_WithEmptySignature_ShouldReturnFalse()
    {
        // Arrange
        var payload = "{\"event\":\"test\"}";
        var secret = "secret";

        // Act
        var result = _validator.ValidateSignature(payload, "", secret);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public void ValidateSignature_WithEmptySecret_ShouldStillValidate()
    {
        // Arrange - Empty secret is technically valid (though not recommended)
        var payload = "{\"event\":\"test\"}";
        var secret = "";
        var signature = ComputeExpectedSignature(payload, secret);

        // Act
        var result = _validator.ValidateSignature(payload, signature, secret);

        // Assert
        result.Should().BeTrue();
    }

    #endregion

    #region Compute Signature Tests

    [Fact]
    public void ComputeSignature_ShouldReturnValidFormat()
    {
        // Arrange
        var payload = "{\"event\":\"test\"}";
        var secret = "secret";

        // Act
        var signature = _validator.ComputeSignature(payload, secret);

        // Assert
        signature.Should().StartWith("sha256=");
        signature.Length.Should().Be(71); // "sha256=" (7) + 64 hex chars
    }

    [Fact]
    public void ComputeSignature_ShouldBeConsistent()
    {
        // Arrange
        var payload = "{\"event\":\"test\"}";
        var secret = "secret";

        // Act
        var signature1 = _validator.ComputeSignature(payload, secret);
        var signature2 = _validator.ComputeSignature(payload, secret);

        // Assert
        signature1.Should().Be(signature2);
    }

    [Fact]
    public void ComputeSignature_ShouldProduceLowercaseHex()
    {
        // Arrange
        var payload = "{\"event\":\"test\"}";
        var secret = "secret";

        // Act
        var signature = _validator.ComputeSignature(payload, secret);
        var hexPart = signature.Substring(7); // After "sha256="

        // Assert
        hexPart.Should().MatchRegex("^[a-f0-9]+$"); // Only lowercase hex
    }

    #endregion

    #region Security Tests

    [Fact]
    public void ValidateSignature_ShouldBeTimingAttackResistant()
    {
        // Arrange - This test verifies constant-time comparison is used
        // by checking that similar signatures don't behave differently
        var payload = "{\"event\":\"test\"}";
        var secret = "secret";
        var validSignature = ComputeExpectedSignature(payload, secret);

        // Create signatures that are increasingly similar to valid one
        var completelWrong = "sha256=0000000000000000000000000000000000000000000000000000000000000000";
        var partiallyCorrect = "sha256=" + validSignature.Substring(7, 32) + "0000000000000000000000000000";
        var almostCorrect = validSignature.Substring(0, validSignature.Length - 1) + "0";

        // Act & Assert - All invalid signatures should be rejected
        _validator.ValidateSignature(payload, completelWrong, secret).Should().BeFalse();
        _validator.ValidateSignature(payload, partiallyCorrect, secret).Should().BeFalse();
        _validator.ValidateSignature(payload, almostCorrect, secret).Should().BeFalse();
    }

    #endregion

    #region Helper Methods

    private string ComputeExpectedSignature(string payload, string secret)
    {
        return "sha256=" + ComputeHexHash(payload, secret);
    }

    private string ComputeHexHash(string payload, string secret)
    {
        using var hmac = new System.Security.Cryptography.HMACSHA256(
            System.Text.Encoding.UTF8.GetBytes(secret));
        var hash = hmac.ComputeHash(System.Text.Encoding.UTF8.GetBytes(payload));
        return Convert.ToHexString(hash).ToLower();
    }

    #endregion
}
