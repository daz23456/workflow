namespace WorkflowCore.Models;

/// <summary>
/// Represents a workflow's contract with a task - the fields it requires.
/// This is the consumer's declaration of what it needs from the task.
/// </summary>
public class ConsumerContract
{
    /// <summary>
    /// Name of the task this contract is for.
    /// </summary>
    public string TaskName { get; set; } = string.Empty;

    /// <summary>
    /// Name of the workflow (consumer) that has this contract.
    /// </summary>
    public string ConsumerWorkflow { get; set; } = string.Empty;

    /// <summary>
    /// Input fields required by the consumer workflow.
    /// </summary>
    public HashSet<string> RequiredInputFields { get; set; } = new();

    /// <summary>
    /// Output fields required by the consumer workflow.
    /// </summary>
    public HashSet<string> RequiredOutputFields { get; set; } = new();

    /// <summary>
    /// Whether the contract has any required fields.
    /// </summary>
    public bool IsValid => RequiredInputFields.Count > 0 || RequiredOutputFields.Count > 0;

    /// <summary>
    /// Total number of required fields across input and output.
    /// </summary>
    public int TotalRequiredFields => RequiredInputFields.Count + RequiredOutputFields.Count;

    /// <summary>
    /// Version of this contract.
    /// </summary>
    public int Version { get; set; } = 1;

    /// <summary>
    /// When this contract was created.
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
