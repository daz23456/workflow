using System.Collections.Concurrent;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Validates consumer contracts between workflows and tasks.
/// </summary>
public class ConsumerContractValidator : IConsumerContractValidator
{
    private readonly ConcurrentDictionary<string, List<ConsumerContract>> _contractsByTask = new();

    /// <inheritdoc />
    public void RegisterContract(ConsumerContract contract)
    {
        var contracts = _contractsByTask.GetOrAdd(contract.TaskName, _ => new List<ConsumerContract>());
        lock (contracts)
        {
            // Remove existing contract for same workflow
            contracts.RemoveAll(c => c.ConsumerWorkflow == contract.ConsumerWorkflow);
            contracts.Add(contract);
        }
    }

    /// <inheritdoc />
    public IReadOnlyList<ConsumerContract> GetContractsForTask(string taskName)
    {
        if (_contractsByTask.TryGetValue(taskName, out var contracts))
        {
            lock (contracts)
            {
                return contracts.ToList();
            }
        }
        return Array.Empty<ConsumerContract>();
    }

    /// <inheritdoc />
    public ContractValidationResult ValidateTaskChange(string taskName, HashSet<string> availableFields, FieldType fieldType)
    {
        var result = new ContractValidationResult();

        if (!_contractsByTask.TryGetValue(taskName, out var contracts))
        {
            return result; // No contracts, always valid
        }

        lock (contracts)
        {
            foreach (var contract in contracts)
            {
                var requiredFields = fieldType == FieldType.Input
                    ? contract.RequiredInputFields
                    : contract.RequiredOutputFields;

                foreach (var field in requiredFields)
                {
                    if (!availableFields.Contains(field))
                    {
                        result.IsValid = false;
                        result.MissingFields.Add(field);

                        if (!result.BrokenContracts.Contains(contract))
                        {
                            result.BrokenContracts.Add(contract);
                        }
                    }
                }
            }
        }

        return result;
    }

    /// <inheritdoc />
    public IReadOnlySet<string> GetRequiredFieldsForTask(string taskName, FieldType fieldType)
    {
        var requiredFields = new HashSet<string>();

        if (_contractsByTask.TryGetValue(taskName, out var contracts))
        {
            lock (contracts)
            {
                foreach (var contract in contracts)
                {
                    var fields = fieldType == FieldType.Input
                        ? contract.RequiredInputFields
                        : contract.RequiredOutputFields;

                    foreach (var field in fields)
                    {
                        requiredFields.Add(field);
                    }
                }
            }
        }

        return requiredFields;
    }

    /// <inheritdoc />
    public void RemoveContract(string taskName, string workflowName)
    {
        if (_contractsByTask.TryGetValue(taskName, out var contracts))
        {
            lock (contracts)
            {
                contracts.RemoveAll(c => c.ConsumerWorkflow == workflowName);
            }
        }
    }
}
