namespace WorkflowCore.Models;

/// <summary>
/// Parsed workflow reference specification.
/// Stage 21.1: WorkflowRef Resolution
///
/// Supports formats:
/// - Simple name: "order-processing"
/// - With version: "order-processing@v2"
/// - Namespace-scoped: "billing/invoice-workflow"
/// - Fully qualified: "billing/invoice-workflow@v3"
/// </summary>
public class WorkflowRefSpec
{
    /// <summary>
    /// The workflow name (required).
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Optional version identifier (e.g., "v2", "1.0.0").
    /// If not specified, the latest/default version is used.
    /// </summary>
    public string? Version { get; set; }

    /// <summary>
    /// Optional namespace override.
    /// If not specified, inherits from the parent workflow's namespace.
    /// </summary>
    public string? Namespace { get; set; }
}

/// <summary>
/// Result of workflow resolution.
/// </summary>
public class WorkflowResolutionResult
{
    /// <summary>
    /// Whether the resolution was successful.
    /// </summary>
    public bool IsSuccess { get; set; }

    /// <summary>
    /// The resolved workflow resource (null if resolution failed).
    /// </summary>
    public WorkflowResource? Workflow { get; set; }

    /// <summary>
    /// Error message if resolution failed.
    /// </summary>
    public string? Error { get; set; }

    public static WorkflowResolutionResult Success(WorkflowResource workflow) => new()
    {
        IsSuccess = true,
        Workflow = workflow
    };

    public static WorkflowResolutionResult Failure(string error) => new()
    {
        IsSuccess = false,
        Error = error
    };
}

/// <summary>
/// Result of task step validation for workflowRef/taskRef mutual exclusivity.
/// </summary>
public class TaskStepValidationResult
{
    /// <summary>
    /// Whether the task step is valid.
    /// </summary>
    public bool IsValid { get; set; }

    /// <summary>
    /// Error message if validation failed.
    /// </summary>
    public string? Error { get; set; }

    public static TaskStepValidationResult Valid() => new() { IsValid = true };

    public static TaskStepValidationResult Invalid(string error) => new()
    {
        IsValid = false,
        Error = error
    };
}
