using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Interface for contract verification service.
/// </summary>
public interface IContractVerificationService
{
    /// <summary>
    /// Register a test scenario for a task.
    /// </summary>
    void RegisterScenario(TaskTestScenario scenario);

    /// <summary>
    /// Get all scenarios for a task.
    /// </summary>
    IReadOnlyList<TaskTestScenario> GetScenariosForTask(string taskName);

    /// <summary>
    /// Verify a specific contract scenario.
    /// </summary>
    ContractVerificationResult VerifyContract(string taskName, string scenarioName);

    /// <summary>
    /// Verify all contracts for a task.
    /// </summary>
    IReadOnlyList<ContractVerificationResult> VerifyAllContracts(string taskName);
}

/// <summary>
/// Result of a contract verification.
/// </summary>
public class ContractVerificationResult
{
    /// <summary>
    /// Name of the scenario that was verified.
    /// </summary>
    public string ScenarioName { get; set; } = string.Empty;

    /// <summary>
    /// Whether the contract was verified successfully.
    /// </summary>
    public bool IsVerified { get; set; } = true;

    /// <summary>
    /// Errors encountered during verification.
    /// </summary>
    public List<string> Errors { get; set; } = new();

    /// <summary>
    /// When the verification was performed.
    /// </summary>
    public DateTime VerifiedAt { get; set; } = DateTime.UtcNow;
}
