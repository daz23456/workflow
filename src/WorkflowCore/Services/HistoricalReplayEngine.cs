using System.Text.Json;
using System.Text.RegularExpressions;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Engine for verifying workflow optimizations by replaying historical executions.
/// </summary>
public class HistoricalReplayEngine : IHistoricalReplayEngine
{
    private readonly IExecutionRepository _executionRepository;
    private readonly IWorkflowOrchestrator _orchestrator;

    // Default fields to ignore during comparison (non-deterministic)
    private static readonly HashSet<string> DefaultIgnoreFields = new(StringComparer.OrdinalIgnoreCase)
    {
        "timestamp", "createdAt", "updatedAt", "modifiedAt",
        "id", "uuid", "guid", "requestId", "correlationId", "traceId"
    };

    // Regex patterns for detecting non-deterministic values
    private static readonly Regex UuidPattern = new(
        @"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
        RegexOptions.Compiled);

    private static readonly Regex Iso8601Pattern = new(
        @"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}",
        RegexOptions.Compiled);

    public HistoricalReplayEngine(
        IExecutionRepository executionRepository,
        IWorkflowOrchestrator orchestrator)
    {
        _executionRepository = executionRepository ?? throw new ArgumentNullException(nameof(executionRepository));
        _orchestrator = orchestrator ?? throw new ArgumentNullException(nameof(orchestrator));
    }

    /// <inheritdoc />
    public async Task<ReplayResult> ReplayWorkflowAsync(
        WorkflowResource originalWorkflow,
        WorkflowResource optimizedWorkflow,
        Dictionary<string, WorkflowTaskResource> availableTasks,
        int replayCount = 10,
        ReplayOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        options ??= new ReplayOptions();

        // Dry-run mode: static structure comparison only (no HTTP execution)
        if (options.DryRun)
        {
            return await Task.FromResult(CompareWorkflowStructure(originalWorkflow, optimizedWorkflow));
        }

        var workflowName = originalWorkflow.Metadata?.Name ?? string.Empty;

        // Fetch historical successful executions
        var historicalExecutions = await _executionRepository.ListExecutionsAsync(
            workflowName,
            ExecutionStatus.Succeeded,
            skip: 0,
            take: replayCount);

        if (historicalExecutions.Count == 0)
        {
            return new ReplayResult(
                TotalReplays: 0,
                MatchingOutputs: 0,
                Mismatches: new List<ReplayMismatch>(),
                AverageTimeDelta: TimeSpan.Zero);
        }

        var mismatches = new List<ReplayMismatch>();
        var matchingOutputs = 0;
        var timeDeltas = new List<TimeSpan>();

        foreach (var historicalExecution in historicalExecutions)
        {
            cancellationToken.ThrowIfCancellationRequested();

            // Deserialize the saved inputs
            var inputs = DeserializeInputSnapshot(historicalExecution.InputSnapshot);

            // Re-execute with optimized workflow
            var replayResult = await _orchestrator.ExecuteAsync(
                optimizedWorkflow,
                availableTasks,
                inputs,
                cancellationToken);

            // Calculate time delta (negative = faster)
            if (historicalExecution.Duration.HasValue)
            {
                var timeDelta = replayResult.TotalDuration - historicalExecution.Duration.Value;
                timeDeltas.Add(timeDelta);
            }

            // Check for execution status mismatch
            if (!replayResult.Success)
            {
                mismatches.Add(new ReplayMismatch(
                    historicalExecution.Id.ToString(),
                    "workflow",
                    "Execution status mismatch: Original succeeded, replay failed"));
                continue;
            }

            // Compare task outputs
            var outputsMatch = CompareTaskOutputs(
                historicalExecution,
                replayResult,
                options,
                out var taskMismatch);

            if (outputsMatch)
            {
                matchingOutputs++;
            }
            else if (taskMismatch != null)
            {
                mismatches.Add(taskMismatch with { ExecutionId = historicalExecution.Id.ToString() });
            }
        }

        var averageTimeDelta = timeDeltas.Count > 0
            ? TimeSpan.FromTicks((long)timeDeltas.Average(t => t.Ticks))
            : TimeSpan.Zero;

        return new ReplayResult(
            TotalReplays: historicalExecutions.Count,
            MatchingOutputs: matchingOutputs,
            Mismatches: mismatches,
            AverageTimeDelta: averageTimeDelta);
    }

    /// <summary>
    /// Compares workflow structure without execution (dry-run mode).
    /// Validates DAG structure, dependencies, and task configuration.
    /// </summary>
    private static ReplayResult CompareWorkflowStructure(
        WorkflowResource original,
        WorkflowResource optimized)
    {
        var mismatches = new List<ReplayMismatch>();
        var originalTasks = original.Spec.Tasks;
        var optimizedTasks = optimized.Spec.Tasks;

        // Build task lookup for both workflows
        var originalTaskMap = originalTasks.ToDictionary(t => t.Id, t => t);
        var optimizedTaskMap = optimizedTasks.ToDictionary(t => t.Id, t => t);

        // Check for removed tasks (may break dependencies)
        foreach (var origTask in originalTasks)
        {
            if (!optimizedTaskMap.ContainsKey(origTask.Id))
            {
                // Task removed - check if it was used by other tasks
                var dependents = originalTasks
                    .Where(t => t.DependsOn?.Contains(origTask.Id) == true)
                    .Select(t => t.Id)
                    .ToList();

                if (dependents.Count > 0)
                {
                    mismatches.Add(new ReplayMismatch(
                        "structure",
                        origTask.Id,
                        $"Task removed but has dependents: {string.Join(", ", dependents)}"));
                }
            }
        }

        // Check for dependency changes that could affect semantics
        foreach (var optTask in optimizedTasks)
        {
            if (!originalTaskMap.TryGetValue(optTask.Id, out var origTask))
            {
                // New task added - that's generally safe
                continue;
            }

            // Check if task references the same underlying task
            if (origTask.TaskRef != optTask.TaskRef && origTask.WorkflowRef != optTask.WorkflowRef)
            {
                mismatches.Add(new ReplayMismatch(
                    "structure",
                    optTask.Id,
                    $"Task reference changed: {origTask.TaskRef ?? origTask.WorkflowRef} -> {optTask.TaskRef ?? optTask.WorkflowRef}"));
            }

            // Check for broken dependencies
            var origDeps = origTask.DependsOn ?? new List<string>();
            var optDeps = optTask.DependsOn ?? new List<string>();

            // New dependencies added - could change execution order
            var addedDeps = optDeps.Except(origDeps).ToList();
            if (addedDeps.Count > 0)
            {
                mismatches.Add(new ReplayMismatch(
                    "structure",
                    optTask.Id,
                    $"New dependencies added (may change execution order): {string.Join(", ", addedDeps)}"));
            }
        }

        // Check input/output schema compatibility
        if (!AreInputSchemasCompatible(original.Spec.Input, optimized.Spec.Input))
        {
            mismatches.Add(new ReplayMismatch(
                "structure",
                "workflow-input",
                "Workflow input schema changed"));
        }

        if (!AreOutputSchemasCompatible(original.Spec.Output, optimized.Spec.Output))
        {
            mismatches.Add(new ReplayMismatch(
                "structure",
                "workflow-output",
                "Workflow output schema changed"));
        }

        // Calculate confidence: 1.0 if no mismatches, scaled down by mismatch count
        var totalChecks = originalTasks.Count + optimizedTasks.Count + 2; // +2 for input/output
        var passedChecks = totalChecks - mismatches.Count;
        var matchingOutputs = mismatches.Count == 0 ? 1 : 0;

        return new ReplayResult(
            TotalReplays: 1,  // Structure comparison counts as 1 "replay"
            MatchingOutputs: matchingOutputs,
            Mismatches: mismatches,
            AverageTimeDelta: TimeSpan.Zero);  // No execution, no time delta
    }

    private static bool AreInputSchemasCompatible(object? original, object? optimized)
    {
        // For now, simple null check - schemas should match
        if (original == null && optimized == null) return true;
        if (original == null || optimized == null) return false;
        // Deep comparison could be added here
        return true;
    }

    private static bool AreOutputSchemasCompatible(object? original, object? optimized)
    {
        // For now, simple null check - schemas should match
        if (original == null && optimized == null) return true;
        if (original == null || optimized == null) return false;
        // Deep comparison could be added here
        return true;
    }

    private static Dictionary<string, object> DeserializeInputSnapshot(string? inputSnapshot)
    {
        if (string.IsNullOrWhiteSpace(inputSnapshot))
        {
            return new Dictionary<string, object>();
        }

        try
        {
            var result = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(inputSnapshot);
            if (result == null)
            {
                return new Dictionary<string, object>();
            }

            // Convert JsonElements to objects
            var converted = new Dictionary<string, object>();
            foreach (var kvp in result)
            {
                converted[kvp.Key] = ConvertJsonElement(kvp.Value);
            }
            return converted;
        }
        catch (JsonException)
        {
            return new Dictionary<string, object>();
        }
    }

    private static object ConvertJsonElement(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.String => element.GetString() ?? string.Empty,
            JsonValueKind.Number when element.TryGetInt64(out var l) => l,
            JsonValueKind.Number => element.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null!,
            JsonValueKind.Array => element.EnumerateArray().Select(ConvertJsonElement).ToList(),
            JsonValueKind.Object => element.EnumerateObject()
                .ToDictionary(p => p.Name, p => ConvertJsonElement(p.Value)),
            _ => element.GetRawText()
        };
    }

    private bool CompareTaskOutputs(
        ExecutionRecord historical,
        WorkflowExecutionResult replay,
        ReplayOptions options,
        out ReplayMismatch? mismatch)
    {
        mismatch = null;

        foreach (var historicalTask in historical.TaskExecutionRecords)
        {
            var taskRef = historicalTask.TaskRef;
            if (string.IsNullOrEmpty(taskRef))
            {
                continue;
            }

            // Find corresponding task in replay
            if (!replay.TaskResults.TryGetValue(taskRef, out var replayTask))
            {
                mismatch = new ReplayMismatch(string.Empty, taskRef, $"Task '{taskRef}' not found in replay");
                return false;
            }

            // Parse historical output
            var historicalOutput = DeserializeOutput(historicalTask.Output);
            var replayOutput = replayTask.Output ?? new Dictionary<string, object>();

            // Compare outputs with non-deterministic field handling
            if (!AreOutputsEquivalent(historicalOutput, replayOutput, options))
            {
                mismatch = new ReplayMismatch(
                    string.Empty,
                    taskRef,
                    $"Output mismatch for task '{taskRef}'");
                return false;
            }
        }

        return true;
    }

    private static Dictionary<string, object> DeserializeOutput(string? outputJson)
    {
        if (string.IsNullOrWhiteSpace(outputJson))
        {
            return new Dictionary<string, object>();
        }

        try
        {
            var result = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(outputJson);
            if (result == null)
            {
                return new Dictionary<string, object>();
            }

            var converted = new Dictionary<string, object>();
            foreach (var kvp in result)
            {
                converted[kvp.Key] = ConvertJsonElement(kvp.Value);
            }
            return converted;
        }
        catch (JsonException)
        {
            return new Dictionary<string, object>();
        }
    }

    private bool AreOutputsEquivalent(
        Dictionary<string, object> expected,
        Dictionary<string, object> actual,
        ReplayOptions options)
    {
        // Build set of fields to ignore
        var ignoreFields = new HashSet<string>(DefaultIgnoreFields, StringComparer.OrdinalIgnoreCase);
        foreach (var field in options.IgnoreFields)
        {
            ignoreFields.Add(field);
        }

        // Compare all keys that are not in ignore list
        var expectedKeys = expected.Keys.Where(k => !ignoreFields.Contains(k)).ToHashSet();
        var actualKeys = actual.Keys.Where(k => !ignoreFields.Contains(k)).ToHashSet();

        // Check for missing/extra keys (excluding ignored fields)
        if (!expectedKeys.SetEquals(actualKeys))
        {
            // If there are extra keys in actual that aren't ignored fields, that's a mismatch
            var missingKeys = expectedKeys.Except(actualKeys);
            var extraKeys = actualKeys.Except(expectedKeys);

            // Allow extra keys but not missing keys
            if (missingKeys.Any())
            {
                return false;
            }
        }

        // Compare values for common keys
        foreach (var key in expectedKeys)
        {
            if (!actual.TryGetValue(key, out var actualValue))
            {
                return false;
            }

            var expectedValue = expected[key];

            // Check if this value should be ignored based on its pattern
            if (ShouldIgnoreValue(expectedValue, actualValue, options))
            {
                continue;
            }

            if (!AreValuesEquivalent(expectedValue, actualValue, options))
            {
                return false;
            }
        }

        return true;
    }

    private static bool ShouldIgnoreValue(object? expected, object? actual, ReplayOptions options)
    {
        // Check if values look like timestamps (ISO 8601)
        if (options.IgnoreTimestampValues)
        {
            if (expected is string expectedStr && actual is string actualStr)
            {
                if (Iso8601Pattern.IsMatch(expectedStr) && Iso8601Pattern.IsMatch(actualStr))
                {
                    return true;
                }
            }
        }

        // Check if values look like UUIDs
        if (options.IgnoreUuidValues)
        {
            if (expected is string expectedStr && actual is string actualStr)
            {
                if (UuidPattern.IsMatch(expectedStr) && UuidPattern.IsMatch(actualStr))
                {
                    return true;
                }
            }
        }

        return false;
    }

    private bool AreValuesEquivalent(object? expected, object? actual, ReplayOptions options)
    {
        if (expected == null && actual == null)
        {
            return true;
        }

        if (expected == null || actual == null)
        {
            return false;
        }

        // Handle dictionaries recursively
        if (expected is Dictionary<string, object> expectedDict && actual is Dictionary<string, object> actualDict)
        {
            return AreOutputsEquivalent(expectedDict, actualDict, options);
        }

        // Handle lists
        if (expected is List<object> expectedList && actual is List<object> actualList)
        {
            if (expectedList.Count != actualList.Count)
            {
                return false;
            }

            for (var i = 0; i < expectedList.Count; i++)
            {
                if (!AreValuesEquivalent(expectedList[i], actualList[i], options))
                {
                    return false;
                }
            }
            return true;
        }

        // Handle numeric comparisons (int/long/double can be equivalent)
        if (IsNumeric(expected) && IsNumeric(actual))
        {
            return Convert.ToDouble(expected) == Convert.ToDouble(actual);
        }

        // Default object comparison
        return expected.Equals(actual);
    }

    private static bool IsNumeric(object? value)
    {
        return value is int or long or float or double or decimal;
    }
}
