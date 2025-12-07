using WorkflowCore.Models;

namespace WorkflowGateway.Models;

/// <summary>
/// Response model for field usage query.
/// </summary>
public class FieldUsageResponse
{
    /// <summary>
    /// Name of the task.
    /// </summary>
    public string TaskName { get; set; } = string.Empty;

    /// <summary>
    /// List of field usage information.
    /// </summary>
    public List<FieldUsageInfoDto> Fields { get; set; } = new();
}

/// <summary>
/// DTO for field usage info.
/// </summary>
public class FieldUsageInfoDto
{
    /// <summary>
    /// Name of the field.
    /// </summary>
    public string FieldName { get; set; } = string.Empty;

    /// <summary>
    /// Type of field (Input/Output).
    /// </summary>
    public string FieldType { get; set; } = string.Empty;

    /// <summary>
    /// Workflows using this field.
    /// </summary>
    public List<string> UsedByWorkflows { get; set; } = new();

    /// <summary>
    /// Number of workflows using this field.
    /// </summary>
    public int UsageCount { get; set; }

    /// <summary>
    /// Whether the field is unused (safe to remove).
    /// </summary>
    public bool IsUnused { get; set; }
}

/// <summary>
/// Response model for field impact analysis.
/// </summary>
public class FieldImpactResponse
{
    /// <summary>
    /// Name of the task.
    /// </summary>
    public string TaskName { get; set; } = string.Empty;

    /// <summary>
    /// Name of the field being analyzed.
    /// </summary>
    public string FieldName { get; set; } = string.Empty;

    /// <summary>
    /// Type of field (Input/Output).
    /// </summary>
    public string FieldType { get; set; } = string.Empty;

    /// <summary>
    /// Whether removing this field is safe.
    /// </summary>
    public bool IsRemovalSafe { get; set; }

    /// <summary>
    /// Workflows affected by removing this field.
    /// </summary>
    public List<string> AffectedWorkflows { get; set; } = new();

    /// <summary>
    /// Number of affected workflows.
    /// </summary>
    public int AffectedCount => AffectedWorkflows.Count;
}

/// <summary>
/// Response model for workflow usage analysis.
/// </summary>
public class WorkflowUsageAnalysisResponse
{
    /// <summary>
    /// Name of the analyzed workflow.
    /// </summary>
    public string WorkflowName { get; set; } = string.Empty;

    /// <summary>
    /// List of task usages found.
    /// </summary>
    public List<TaskUsageDto> TaskUsages { get; set; } = new();

    /// <summary>
    /// When the analysis was performed.
    /// </summary>
    public DateTime AnalyzedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// DTO for task usage.
/// </summary>
public class TaskUsageDto
{
    /// <summary>
    /// Name of the task.
    /// </summary>
    public string TaskName { get; set; } = string.Empty;

    /// <summary>
    /// Input fields used by the workflow.
    /// </summary>
    public List<string> UsedInputFields { get; set; } = new();

    /// <summary>
    /// Output fields used by the workflow.
    /// </summary>
    public List<string> UsedOutputFields { get; set; } = new();
}
