using System.Collections.Concurrent;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Verifies task contracts against recorded interactions.
/// </summary>
public class ContractVerificationService : IContractVerificationService
{
    private readonly ConcurrentDictionary<string, List<TaskTestScenario>> _scenariosByTask = new();
    private readonly IInteractionRecorder _interactionRecorder;

    public ContractVerificationService(IInteractionRecorder interactionRecorder)
    {
        _interactionRecorder = interactionRecorder;
    }

    /// <inheritdoc />
    public void RegisterScenario(TaskTestScenario scenario)
    {
        var scenarios = _scenariosByTask.GetOrAdd(scenario.TaskName, _ => new List<TaskTestScenario>());
        lock (scenarios)
        {
            // Remove existing scenario with same name
            scenarios.RemoveAll(s => s.ScenarioName == scenario.ScenarioName);
            scenarios.Add(scenario);
        }
    }

    /// <inheritdoc />
    public IReadOnlyList<TaskTestScenario> GetScenariosForTask(string taskName)
    {
        if (_scenariosByTask.TryGetValue(taskName, out var scenarios))
        {
            lock (scenarios)
            {
                return scenarios.ToList();
            }
        }
        return Array.Empty<TaskTestScenario>();
    }

    /// <inheritdoc />
    public ContractVerificationResult VerifyContract(string taskName, string scenarioName)
    {
        var result = new ContractVerificationResult { ScenarioName = scenarioName };

        // Find scenario
        var scenarios = GetScenariosForTask(taskName);
        var scenario = scenarios.FirstOrDefault(s => s.ScenarioName == scenarioName);

        if (scenario == null)
        {
            result.IsVerified = false;
            result.Errors.Add($"Scenario not found: {scenarioName}");
            return result;
        }

        // Get latest interaction
        var interaction = _interactionRecorder.GetLatestInteraction(taskName);
        if (interaction == null)
        {
            result.IsVerified = false;
            result.Errors.Add($"No recorded interactions found for task: {taskName}");
            return result;
        }

        // Verify status code
        if (interaction.StatusCode != scenario.ExpectedStatusCode)
        {
            result.IsVerified = false;
            result.Errors.Add($"Expected status code {scenario.ExpectedStatusCode} but got {interaction.StatusCode}");
        }

        return result;
    }

    /// <inheritdoc />
    public IReadOnlyList<ContractVerificationResult> VerifyAllContracts(string taskName)
    {
        var scenarios = GetScenariosForTask(taskName);
        return scenarios.Select(s => VerifyContract(taskName, s.ScenarioName)).ToList();
    }
}
