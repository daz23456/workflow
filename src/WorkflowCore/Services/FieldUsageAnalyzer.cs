using System.Collections.Concurrent;
using System.Text.RegularExpressions;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Analyzes workflow field usage patterns for impact analysis.
/// </summary>
public class FieldUsageAnalyzer : IFieldUsageAnalyzer
{
    private readonly ConcurrentDictionary<string, List<WorkflowTaskUsage>> _usagesByTask = new();

    // Regex patterns for template extraction
    private static readonly Regex InputFieldPattern = new(@"\{\{\s*input\.(\w+)\s*\}\}", RegexOptions.Compiled);
    private static readonly Regex TaskOutputPattern = new(@"\{\{\s*tasks\.[\w-]+\.output\.(\w+)\s*\}\}", RegexOptions.Compiled);
    private static readonly Regex TaskRefFromOutputPattern = new(@"\{\{\s*tasks\.([\w-]+)\.output", RegexOptions.Compiled);

    /// <inheritdoc />
    public IReadOnlyList<WorkflowTaskUsage> AnalyzeWorkflow(WorkflowResource workflow)
    {
        var usages = new Dictionary<string, WorkflowTaskUsage>();
        var workflowName = workflow.Metadata?.Name ?? string.Empty;

        // Analyze task inputs
        foreach (var task in workflow.Spec?.Tasks ?? Enumerable.Empty<WorkflowTaskStep>())
        {
            var taskRef = task.TaskRef ?? string.Empty;
            if (string.IsNullOrEmpty(taskRef)) continue;

            if (!usages.TryGetValue(taskRef, out var usage))
            {
                usage = new WorkflowTaskUsage
                {
                    TaskName = taskRef,
                    WorkflowName = workflowName
                };
                usages[taskRef] = usage;
            }

            // Extract input field references from task input
            if (task.Input != null)
            {
                foreach (var kvp in task.Input)
                {
                    var value = kvp.Value?.ToString() ?? string.Empty;
                    ExtractInputFields(value, usage.UsedInputFields);
                }
            }
        }

        // Analyze output mapping for output field usage
        if (workflow.Spec?.Output != null)
        {
            foreach (var kvp in workflow.Spec.Output)
            {
                var template = kvp.Value;

                // Find which task this output refers to
                var taskRefMatch = TaskRefFromOutputPattern.Match(template);
                if (taskRefMatch.Success)
                {
                    var taskId = taskRefMatch.Groups[1].Value;
                    // Find the taskRef for this taskId
                    var task = workflow.Spec.Tasks?.FirstOrDefault(t => t.Id == taskId);
                    var taskRef = task?.TaskRef ?? taskId;

                    if (!usages.TryGetValue(taskRef, out var usage))
                    {
                        usage = new WorkflowTaskUsage
                        {
                            TaskName = taskRef,
                            WorkflowName = workflowName
                        };
                        usages[taskRef] = usage;
                    }

                    // Extract output fields
                    var fieldMatches = TaskOutputPattern.Matches(template);
                    foreach (Match match in fieldMatches)
                    {
                        usage.UsedOutputFields.Add(match.Groups[1].Value);
                    }
                }
            }
        }

        return usages.Values.ToList();
    }

    /// <inheritdoc />
    public void RegisterUsage(WorkflowTaskUsage usage)
    {
        var usages = _usagesByTask.GetOrAdd(usage.TaskName, _ => new List<WorkflowTaskUsage>());
        lock (usages)
        {
            // Remove existing usage for same workflow
            usages.RemoveAll(u => u.WorkflowName == usage.WorkflowName);
            usages.Add(usage);
        }
    }

    /// <inheritdoc />
    public IReadOnlyList<WorkflowTaskUsage> GetTaskUsage(string taskName)
    {
        if (_usagesByTask.TryGetValue(taskName, out var usages))
        {
            lock (usages)
            {
                return usages.ToList();
            }
        }
        return Array.Empty<WorkflowTaskUsage>();
    }

    /// <inheritdoc />
    public FieldUsageInfo GetFieldUsageInfo(string taskName, string fieldName, FieldType fieldType)
    {
        var fieldInfo = new FieldUsageInfo
        {
            FieldName = fieldName,
            FieldType = fieldType
        };

        if (_usagesByTask.TryGetValue(taskName, out var usages))
        {
            lock (usages)
            {
                foreach (var usage in usages)
                {
                    var fieldsToCheck = fieldType == FieldType.Input
                        ? usage.UsedInputFields
                        : usage.UsedOutputFields;

                    if (fieldsToCheck.Contains(fieldName))
                    {
                        fieldInfo.UsedByWorkflows.Add(usage.WorkflowName);
                    }
                }
            }
        }

        return fieldInfo;
    }

    /// <inheritdoc />
    public bool IsFieldRemovalSafe(string taskName, string fieldName, FieldType fieldType)
    {
        var fieldInfo = GetFieldUsageInfo(taskName, fieldName, fieldType);
        return fieldInfo.IsUnused;
    }

    /// <inheritdoc />
    public IReadOnlyList<FieldUsageInfo> GetAllFieldUsage(string taskName)
    {
        var fieldInfoMap = new Dictionary<(string name, FieldType type), FieldUsageInfo>();

        if (_usagesByTask.TryGetValue(taskName, out var usages))
        {
            lock (usages)
            {
                foreach (var usage in usages)
                {
                    // Add input fields
                    foreach (var field in usage.UsedInputFields)
                    {
                        var key = (field, FieldType.Input);
                        if (!fieldInfoMap.TryGetValue(key, out var info))
                        {
                            info = new FieldUsageInfo
                            {
                                FieldName = field,
                                FieldType = FieldType.Input
                            };
                            fieldInfoMap[key] = info;
                        }
                        info.UsedByWorkflows.Add(usage.WorkflowName);
                    }

                    // Add output fields
                    foreach (var field in usage.UsedOutputFields)
                    {
                        var key = (field, FieldType.Output);
                        if (!fieldInfoMap.TryGetValue(key, out var info))
                        {
                            info = new FieldUsageInfo
                            {
                                FieldName = field,
                                FieldType = FieldType.Output
                            };
                            fieldInfoMap[key] = info;
                        }
                        info.UsedByWorkflows.Add(usage.WorkflowName);
                    }
                }
            }
        }

        return fieldInfoMap.Values.ToList();
    }

    private static void ExtractInputFields(string template, HashSet<string> fields)
    {
        var matches = InputFieldPattern.Matches(template);
        foreach (Match match in matches)
        {
            fields.Add(match.Groups[1].Value);
        }
    }
}
