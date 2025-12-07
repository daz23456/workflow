namespace WorkflowCore.Models;

/// <summary>
/// Type of field (input or output).
/// </summary>
public enum FieldType
{
    Input,
    Output
}

/// <summary>
/// Detailed information about how a specific field is used across workflows.
/// </summary>
public class FieldUsageInfo
{
    /// <summary>
    /// Name of the field.
    /// </summary>
    public string FieldName { get; set; } = string.Empty;

    /// <summary>
    /// Type of field (input or output).
    /// </summary>
    public FieldType FieldType { get; set; } = FieldType.Input;

    /// <summary>
    /// List of workflows that use this field.
    /// </summary>
    public HashSet<string> UsedByWorkflows { get; set; } = new();

    /// <summary>
    /// Number of workflows using this field.
    /// </summary>
    public int UsageCount => UsedByWorkflows.Count;

    /// <summary>
    /// Whether no workflow uses this field (safe to remove).
    /// </summary>
    public bool IsUnused => UsedByWorkflows.Count == 0;
}
