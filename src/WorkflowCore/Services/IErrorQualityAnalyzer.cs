using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Analyzes error responses for quality based on best practices.
/// Uses a 5-star rating system (one star per criterion met).
/// </summary>
public interface IErrorQualityAnalyzer
{
    /// <summary>
    /// Analyzes an error response for quality.
    /// </summary>
    /// <param name="errorBody">The error response body (JSON string or object)</param>
    /// <param name="httpStatusCode">The HTTP status code of the response</param>
    /// <param name="taskId">Optional task ID for context</param>
    /// <returns>Quality score with breakdown and improvement tips</returns>
    ErrorQualityScore Analyze(string? errorBody, int httpStatusCode, string? taskId = null);

    /// <summary>
    /// Analyzes an error response from a JsonElement.
    /// </summary>
    /// <param name="errorElement">The parsed JSON error response</param>
    /// <param name="httpStatusCode">The HTTP status code of the response</param>
    /// <param name="taskId">Optional task ID for context</param>
    /// <returns>Quality score with breakdown and improvement tips</returns>
    ErrorQualityScore Analyze(System.Text.Json.JsonElement errorElement, int httpStatusCode, string? taskId = null);
}
