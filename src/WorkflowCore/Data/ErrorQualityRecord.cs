using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using WorkflowCore.Models;

namespace WorkflowCore.Data;

/// <summary>
/// Database entity for storing error quality analysis results.
/// Links to execution records and task execution records.
/// </summary>
[Table("error_quality_records")]
public class ErrorQualityRecord
{
    /// <summary>
    /// Primary key
    /// </summary>
    [Key]
    [Column("id")]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Foreign key to ExecutionRecord
    /// </summary>
    [Column("execution_id")]
    public Guid ExecutionId { get; set; }

    /// <summary>
    /// Foreign key to TaskExecutionRecord (optional - null for workflow-level)
    /// </summary>
    [Column("task_execution_id")]
    public Guid? TaskExecutionId { get; set; }

    /// <summary>
    /// Task ID that produced the error
    /// </summary>
    [Column("task_id")]
    [MaxLength(255)]
    public string? TaskId { get; set; }

    /// <summary>
    /// Task reference name (e.g., "get-user")
    /// </summary>
    [Column("task_ref")]
    [MaxLength(255)]
    public string? TaskRef { get; set; }

    /// <summary>
    /// Workflow name
    /// </summary>
    [Column("workflow_name")]
    [MaxLength(255)]
    [Required]
    public string WorkflowName { get; set; } = string.Empty;

    /// <summary>
    /// Number of stars (0-5)
    /// </summary>
    [Column("stars")]
    [Range(0, 5)]
    public int Stars { get; set; }

    /// <summary>
    /// Criteria that were met (stored as integer flags)
    /// </summary>
    [Column("criteria_met")]
    public int CriteriaMet { get; set; }

    /// <summary>
    /// Criteria that were NOT met (stored as integer flags)
    /// </summary>
    [Column("criteria_missing")]
    public int CriteriaMissing { get; set; }

    /// <summary>
    /// HTTP status code that was analyzed
    /// </summary>
    [Column("http_status_code")]
    public int? HttpStatusCode { get; set; }

    /// <summary>
    /// The raw error response body (JSON, truncated to 4000 chars)
    /// </summary>
    [Column("error_body")]
    [MaxLength(4000)]
    public string? ErrorBody { get; set; }

    /// <summary>
    /// Improvement tips as JSON array
    /// </summary>
    [Column("improvement_tips")]
    public string? ImprovementTipsJson { get; set; }

    /// <summary>
    /// Criteria breakdown as JSON array
    /// </summary>
    [Column("criteria_breakdown")]
    public string? CriteriaBreakdownJson { get; set; }

    /// <summary>
    /// When the error was analyzed
    /// </summary>
    [Column("analyzed_at")]
    public DateTime AnalyzedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When the record was created
    /// </summary>
    [Column("created_at")]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Gets CriteriaMet as the enum type
    /// </summary>
    [NotMapped]
    public ErrorQualityCriteria CriteriaMetEnum
    {
        get => (ErrorQualityCriteria)CriteriaMet;
        set => CriteriaMet = (int)value;
    }

    /// <summary>
    /// Gets CriteriaMissing as the enum type
    /// </summary>
    [NotMapped]
    public ErrorQualityCriteria CriteriaMissingEnum
    {
        get => (ErrorQualityCriteria)CriteriaMissing;
        set => CriteriaMissing = (int)value;
    }

    /// <summary>
    /// Creates an ErrorQualityRecord from an ErrorQualityScore
    /// </summary>
    public static ErrorQualityRecord FromScore(
        ErrorQualityScore score,
        Guid executionId,
        string workflowName,
        Guid? taskExecutionId = null,
        string? taskRef = null,
        string? errorBody = null)
    {
        return new ErrorQualityRecord
        {
            ExecutionId = executionId,
            TaskExecutionId = taskExecutionId,
            TaskId = score.TaskId,
            TaskRef = taskRef,
            WorkflowName = workflowName,
            Stars = score.Stars,
            CriteriaMet = (int)score.CriteriaMet,
            CriteriaMissing = (int)score.CriteriaMissing,
            HttpStatusCode = score.HttpStatusCode,
            ErrorBody = TruncateErrorBody(errorBody),
            ImprovementTipsJson = System.Text.Json.JsonSerializer.Serialize(score.ImprovementTips),
            CriteriaBreakdownJson = SerializeCriteriaBreakdown(score.CriteriaBreakdown),
            AnalyzedAt = score.AnalyzedAt,
            CreatedAt = DateTime.UtcNow
        };
    }

    private static string? TruncateErrorBody(string? errorBody)
    {
        if (string.IsNullOrEmpty(errorBody))
            return null;
        return errorBody.Length > 4000 ? errorBody[..4000] : errorBody;
    }

    private static string SerializeCriteriaBreakdown(List<CriterionResult> breakdown)
    {
        var simplified = breakdown.Select(c => new
        {
            criterion = c.Criterion.ToString(),
            name = c.Name,
            met = c.Met,
            details = c.Details,
            tip = c.Tip
        });
        return System.Text.Json.JsonSerializer.Serialize(simplified);
    }
}
