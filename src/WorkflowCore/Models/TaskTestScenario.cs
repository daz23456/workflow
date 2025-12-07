namespace WorkflowCore.Models;

/// <summary>
/// Represents a test scenario for a task - provider state testing.
/// </summary>
public class TaskTestScenario
{
    /// <summary>
    /// Name of the task being tested.
    /// </summary>
    public string TaskName { get; set; } = string.Empty;

    /// <summary>
    /// Unique name for this scenario.
    /// </summary>
    public string ScenarioName { get; set; } = string.Empty;

    /// <summary>
    /// Description of the provider state for this scenario.
    /// </summary>
    public string ProviderState { get; set; } = string.Empty;

    /// <summary>
    /// Expected HTTP status code for this scenario.
    /// </summary>
    public int ExpectedStatusCode { get; set; } = 200;

    /// <summary>
    /// Optional JSON schema the response should match.
    /// </summary>
    public string? ExpectedResponseSchema { get; set; }

    /// <summary>
    /// Sample input data for the task.
    /// </summary>
    public Dictionary<string, object> SampleInput { get; set; } = new();

    /// <summary>
    /// Error scenarios for this task (4xx, 5xx responses).
    /// </summary>
    public List<ErrorScenario> ErrorScenarios { get; set; } = new();

    /// <summary>
    /// When this scenario was created.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Whether this scenario has valid required fields.
    /// </summary>
    public bool IsValid => !string.IsNullOrEmpty(TaskName) && !string.IsNullOrEmpty(ScenarioName);

    /// <summary>
    /// Whether this scenario has error scenarios defined.
    /// </summary>
    public bool HasErrorScenarios => ErrorScenarios.Count > 0;
}

/// <summary>
/// Represents an error scenario for a task.
/// </summary>
public class ErrorScenario
{
    /// <summary>
    /// HTTP status code for this error.
    /// </summary>
    public int StatusCode { get; set; }

    /// <summary>
    /// Error code identifier.
    /// </summary>
    public string ErrorCode { get; set; } = string.Empty;

    /// <summary>
    /// Description of when this error occurs.
    /// </summary>
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Sample error response body.
    /// </summary>
    public string? SampleResponse { get; set; }
}
