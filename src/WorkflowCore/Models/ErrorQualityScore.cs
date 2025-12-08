namespace WorkflowCore.Models;

/// <summary>
/// Result of analyzing an error response for quality.
/// Uses a 5-star rating system based on ErrorQualityCriteria.
/// </summary>
public class ErrorQualityScore
{
    /// <summary>
    /// Number of stars (0-5) based on criteria met
    /// </summary>
    public int Stars { get; set; }

    /// <summary>
    /// Criteria that were met (flags enum)
    /// </summary>
    public ErrorQualityCriteria CriteriaMet { get; set; } = ErrorQualityCriteria.None;

    /// <summary>
    /// Criteria that were NOT met (flags enum)
    /// </summary>
    public ErrorQualityCriteria CriteriaMissing { get; set; } = ErrorQualityCriteria.All;

    /// <summary>
    /// Breakdown of each criterion check
    /// </summary>
    public List<CriterionResult> CriteriaBreakdown { get; set; } = new();

    /// <summary>
    /// Tips for improving the error response quality
    /// </summary>
    public List<string> ImprovementTips { get; set; } = new();

    /// <summary>
    /// The HTTP status code that was analyzed
    /// </summary>
    public int? HttpStatusCode { get; set; }

    /// <summary>
    /// The task that produced this error (for context)
    /// </summary>
    public string? TaskId { get; set; }

    /// <summary>
    /// When the error was analyzed
    /// </summary>
    public DateTime AnalyzedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Display string for star rating (e.g., "⭐⭐⭐☆☆")
    /// </summary>
    public string StarDisplay => new string('⭐', Stars) + new string('☆', 5 - Stars);

    /// <summary>
    /// Human-readable summary of the quality score
    /// </summary>
    public string Summary => Stars switch
    {
        5 => "Excellent - All quality criteria met",
        4 => "Good - Most quality criteria met",
        3 => "Fair - Some improvements needed",
        2 => "Poor - Significant improvements needed",
        1 => "Very Poor - Major quality issues",
        _ => "Critical - No quality criteria met"
    };

    /// <summary>
    /// Check if a specific criterion was met
    /// </summary>
    public bool HasCriterion(ErrorQualityCriteria criterion) =>
        (CriteriaMet & criterion) == criterion;
}

/// <summary>
/// Result of checking a single quality criterion
/// </summary>
public class CriterionResult
{
    /// <summary>
    /// Which criterion was checked
    /// </summary>
    public ErrorQualityCriteria Criterion { get; set; }

    /// <summary>
    /// Human-readable name of the criterion
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Whether this criterion was met
    /// </summary>
    public bool Met { get; set; }

    /// <summary>
    /// What was found (or not found)
    /// </summary>
    public string? Details { get; set; }

    /// <summary>
    /// How to fix if not met
    /// </summary>
    public string? Tip { get; set; }
}
