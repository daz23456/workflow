using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Validates consumer contracts between workflows and tasks.
/// </summary>
public interface IConsumerContractValidator
{
    /// <summary>
    /// Registers a consumer contract.
    /// </summary>
    /// <param name="contract">The contract to register.</param>
    void RegisterContract(ConsumerContract contract);

    /// <summary>
    /// Gets all contracts for a task.
    /// </summary>
    /// <param name="taskName">Name of the task.</param>
    /// <returns>List of contracts.</returns>
    IReadOnlyList<ConsumerContract> GetContractsForTask(string taskName);

    /// <summary>
    /// Validates a task change against all consumer contracts.
    /// </summary>
    /// <param name="taskName">Name of the task.</param>
    /// <param name="availableFields">Fields available in the changed task.</param>
    /// <param name="fieldType">Type of fields being checked.</param>
    /// <returns>Validation result.</returns>
    ContractValidationResult ValidateTaskChange(string taskName, HashSet<string> availableFields, FieldType fieldType);

    /// <summary>
    /// Gets all required fields for a task from all consumer contracts.
    /// </summary>
    /// <param name="taskName">Name of the task.</param>
    /// <param name="fieldType">Type of fields.</param>
    /// <returns>Set of required fields.</returns>
    IReadOnlySet<string> GetRequiredFieldsForTask(string taskName, FieldType fieldType);

    /// <summary>
    /// Removes a contract for a specific workflow.
    /// </summary>
    /// <param name="taskName">Name of the task.</param>
    /// <param name="workflowName">Name of the workflow.</param>
    void RemoveContract(string taskName, string workflowName);
}

/// <summary>
/// Result of contract validation.
/// </summary>
public class ContractValidationResult
{
    /// <summary>
    /// Whether the validation passed.
    /// </summary>
    public bool IsValid { get; set; } = true;

    /// <summary>
    /// Contracts that are broken by the change.
    /// </summary>
    public List<ConsumerContract> BrokenContracts { get; set; } = new();

    /// <summary>
    /// Fields that are missing from the task.
    /// </summary>
    public HashSet<string> MissingFields { get; set; } = new();

    /// <summary>
    /// Workflows affected by the broken contracts.
    /// </summary>
    public IReadOnlyList<string> AffectedWorkflows => BrokenContracts
        .Select(c => c.ConsumerWorkflow)
        .Distinct()
        .ToList();
}
