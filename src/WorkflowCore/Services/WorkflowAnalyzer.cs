using System.Text.Json;
using System.Text.RegularExpressions;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Analyzes workflows to detect optimization opportunities.
/// </summary>
public class WorkflowAnalyzer : IWorkflowAnalyzer
{
    // Regex to match template expressions like {{ tasks.task-id.output.field }}
    private static readonly Regex TaskOutputPattern = new(
        @"\{\{\s*tasks\.([a-zA-Z0-9_-]+)\.output",
        RegexOptions.Compiled);

    // Regex to extract operation type from transform JSON
    private static readonly Regex OperationPattern = new(
        @"""operation""\s*:\s*""(\w+)""",
        RegexOptions.Compiled);

    // Regex to extract field from filter operations
    private static readonly Regex FilterFieldPattern = new(
        @"""field""\s*:\s*""([^""]+)""",
        RegexOptions.Compiled);

    // Regex to extract mappings from map operations
    private static readonly Regex MappingsPattern = new(
        @"""mappings""\s*:\s*\{([^}]+)\}",
        RegexOptions.Compiled);

    // Regex to extract fields from select operations
    private static readonly Regex SelectFieldsPattern = new(
        @"""fields""\s*:\s*\{([^}]+)\}",
        RegexOptions.Compiled);

    /// <summary>
    /// Analyzes a workflow and returns optimization candidates.
    /// </summary>
    public WorkflowAnalysisResult Analyze(WorkflowResource workflow)
    {
        var workflowName = workflow.Metadata?.Name ?? "unknown";
        var tasks = workflow.Spec?.Tasks ?? new List<WorkflowTaskStep>();
        var output = workflow.Spec?.Output;

        if (tasks.Count == 0)
        {
            return new WorkflowAnalysisResult(
                workflowName,
                new List<OptimizationCandidate>(),
                new Dictionary<string, HashSet<string>>());
        }

        // Build the output usage graph
        var outputUsage = BuildOutputUsageGraph(tasks, output);

        // Detect optimization candidates
        var candidates = new List<OptimizationCandidate>();

        // Detect dead tasks
        candidates.AddRange(DetectDeadTasks(tasks, outputUsage));

        // Detect parallel promotion candidates
        candidates.AddRange(DetectParallelPromotionCandidates(tasks, outputUsage));

        // Build task lookup and transform info for pipeline analysis
        var taskLookup = tasks.Where(t => !string.IsNullOrEmpty(t.Id))
            .ToDictionary(t => t.Id!, t => t);
        var transformInfo = BuildTransformInfo(tasks);

        // Detect transform-specific optimizations
        candidates.AddRange(DetectFilterReorderCandidates(tasks, taskLookup, transformInfo));
        candidates.AddRange(DetectTransformFusionCandidates(tasks, taskLookup, transformInfo));
        candidates.AddRange(DetectRedundantTransformCandidates(tasks, taskLookup, transformInfo));
        candidates.AddRange(DetectFilterFusionCandidates(tasks, taskLookup, transformInfo));
        candidates.AddRange(DetectEarlyLimitCandidates(tasks, taskLookup, transformInfo));

        return new WorkflowAnalysisResult(workflowName, candidates, outputUsage);
    }

    /// <summary>
    /// Builds a graph tracking which task outputs are consumed by which tasks.
    /// </summary>
    private Dictionary<string, HashSet<string>> BuildOutputUsageGraph(
        List<WorkflowTaskStep> tasks,
        Dictionary<string, string>? workflowOutput)
    {
        var usage = new Dictionary<string, HashSet<string>>();

        // Initialize usage tracking for all tasks
        foreach (var task in tasks)
        {
            if (!string.IsNullOrEmpty(task.Id))
            {
                usage[task.Id] = new HashSet<string>();
            }
        }

        // Track task input references
        foreach (var task in tasks)
        {
            if (task.Input == null) continue;

            foreach (var inputValue in task.Input.Values)
            {
                var referencedTasks = ExtractTaskReferences(inputValue);
                foreach (var referencedTask in referencedTasks)
                {
                    if (usage.ContainsKey(referencedTask))
                    {
                        usage[referencedTask].Add(task.Id);
                    }
                }
            }
        }

        // Track workflow output references
        if (workflowOutput != null)
        {
            foreach (var outputValue in workflowOutput.Values)
            {
                var referencedTasks = ExtractTaskReferences(outputValue);
                foreach (var referencedTask in referencedTasks)
                {
                    if (usage.ContainsKey(referencedTask))
                    {
                        usage[referencedTask].Add("_workflow_output");
                    }
                }
            }
        }

        return usage;
    }

    /// <summary>
    /// Extracts task IDs referenced in a template expression.
    /// </summary>
    private HashSet<string> ExtractTaskReferences(string expression)
    {
        var taskIds = new HashSet<string>();
        var matches = TaskOutputPattern.Matches(expression);

        foreach (Match match in matches)
        {
            if (match.Groups.Count > 1)
            {
                taskIds.Add(match.Groups[1].Value);
            }
        }

        return taskIds;
    }

    /// <summary>
    /// Detects tasks whose outputs are never consumed.
    /// </summary>
    private List<OptimizationCandidate> DetectDeadTasks(
        List<WorkflowTaskStep> tasks,
        Dictionary<string, HashSet<string>> outputUsage)
    {
        var candidates = new List<OptimizationCandidate>();

        foreach (var task in tasks)
        {
            if (string.IsNullOrEmpty(task.Id)) continue;

            // Check if the task's output is never used
            if (outputUsage.TryGetValue(task.Id, out var consumers) && consumers.Count == 0)
            {
                // Calculate estimated impact based on task count
                var estimatedImpact = 1.0 / tasks.Count;

                candidates.Add(new OptimizationCandidate(
                    Type: "dead-task",
                    TaskId: task.Id,
                    Description: $"Task '{task.Id}' output is never consumed by any other task or workflow output",
                    EstimatedImpact: estimatedImpact));
            }
        }

        return candidates;
    }

    /// <summary>
    /// Detects tasks that could be promoted to run in parallel.
    /// A task can be promoted if it has a dependsOn but doesn't actually use the output of those dependencies.
    /// </summary>
    private List<OptimizationCandidate> DetectParallelPromotionCandidates(
        List<WorkflowTaskStep> tasks,
        Dictionary<string, HashSet<string>> outputUsage)
    {
        var candidates = new List<OptimizationCandidate>();

        foreach (var task in tasks)
        {
            if (string.IsNullOrEmpty(task.Id) || task.DependsOn == null || task.DependsOn.Count == 0)
            {
                continue;
            }

            // Get the tasks that this task's inputs actually reference
            var actualDependencies = new HashSet<string>();
            if (task.Input != null)
            {
                foreach (var inputValue in task.Input.Values)
                {
                    var refs = ExtractTaskReferences(inputValue);
                    foreach (var refTask in refs)
                    {
                        actualDependencies.Add(refTask);
                    }
                }
            }

            // Find declared dependencies that are not actual data dependencies
            var unnecessaryDependencies = new List<string>();
            foreach (var declaredDep in task.DependsOn)
            {
                if (!actualDependencies.Contains(declaredDep))
                {
                    unnecessaryDependencies.Add(declaredDep);
                }
            }

            // Create candidates for unnecessary dependencies
            if (unnecessaryDependencies.Count > 0)
            {
                var depList = string.Join(", ", unnecessaryDependencies);
                candidates.Add(new OptimizationCandidate(
                    Type: "parallel-promotion",
                    TaskId: task.Id,
                    Description: $"Task '{task.Id}' declares dependency on [{depList}] but doesn't use their output. These could run in parallel.",
                    EstimatedImpact: 0.3 * unnecessaryDependencies.Count));
            }
        }

        return candidates;
    }

    /// <summary>
    /// Information about a transform operation in a task.
    /// </summary>
    private record TransformInfo(
        string TaskId,
        string OperationType,
        HashSet<string> ProducedFields,
        HashSet<string> ConsumedFields,
        string? FilterField);

    /// <summary>
    /// Builds transform info for all tasks that have transform operations.
    /// </summary>
    private Dictionary<string, TransformInfo> BuildTransformInfo(List<WorkflowTaskStep> tasks)
    {
        var info = new Dictionary<string, TransformInfo>();

        foreach (var task in tasks)
        {
            if (string.IsNullOrEmpty(task.Id) || task.Input == null)
                continue;

            // Look for transform input
            if (!task.Input.TryGetValue("transform", out var transformJson))
                continue;

            // Extract operation type
            var opMatch = OperationPattern.Match(transformJson);
            if (!opMatch.Success)
                continue;

            var operationType = opMatch.Groups[1].Value;
            var producedFields = new HashSet<string>();
            var consumedFields = new HashSet<string>();
            string? filterField = null;

            // Extract field information based on operation type
            switch (operationType)
            {
                case "map":
                    var mappingsMatch = MappingsPattern.Match(transformJson);
                    if (mappingsMatch.Success)
                    {
                        // Extract field names from mappings
                        var mappingsContent = mappingsMatch.Groups[1].Value;
                        var fieldMatches = Regex.Matches(mappingsContent, @"""(\w+)""\s*:");
                        foreach (Match m in fieldMatches)
                        {
                            producedFields.Add(m.Groups[1].Value);
                        }
                    }
                    break;

                case "select":
                    var selectMatch = SelectFieldsPattern.Match(transformJson);
                    if (selectMatch.Success)
                    {
                        var fieldsContent = selectMatch.Groups[1].Value;
                        // Extract what fields are selected (consumed from input)
                        var valueMatches = Regex.Matches(fieldsContent, @"\$\.(\w+)");
                        foreach (Match m in valueMatches)
                        {
                            consumedFields.Add(m.Groups[1].Value);
                        }
                        // Extract output field names (produced)
                        var outputMatches = Regex.Matches(fieldsContent, @"""(\w+)""\s*:");
                        foreach (Match m in outputMatches)
                        {
                            producedFields.Add(m.Groups[1].Value);
                        }
                    }
                    break;

                case "filter":
                    var filterMatch = FilterFieldPattern.Match(transformJson);
                    if (filterMatch.Success)
                    {
                        filterField = filterMatch.Groups[1].Value;
                        consumedFields.Add(filterField);
                    }
                    break;

                case "limit":
                case "skip":
                    // These don't produce/consume specific fields
                    break;
            }

            info[task.Id] = new TransformInfo(task.Id, operationType, producedFields, consumedFields, filterField);
        }

        return info;
    }

    /// <summary>
    /// Gets the upstream task that this task consumes data from.
    /// </summary>
    private string? GetUpstreamTask(WorkflowTaskStep task)
    {
        if (task.Input == null || !task.Input.TryGetValue("data", out var dataInput))
            return null;

        var match = TaskOutputPattern.Match(dataInput);
        return match.Success ? match.Groups[1].Value : null;
    }

    /// <summary>
    /// Detects filter operations that could be reordered before map operations.
    /// </summary>
    private List<OptimizationCandidate> DetectFilterReorderCandidates(
        List<WorkflowTaskStep> tasks,
        Dictionary<string, WorkflowTaskStep> taskLookup,
        Dictionary<string, TransformInfo> transformInfo)
    {
        var candidates = new List<OptimizationCandidate>();

        foreach (var task in tasks)
        {
            if (string.IsNullOrEmpty(task.Id))
                continue;

            // Is this a filter task?
            if (!transformInfo.TryGetValue(task.Id, out var filterInfo) || filterInfo.OperationType != "filter")
                continue;

            // Get upstream task
            var upstreamId = GetUpstreamTask(task);
            if (upstreamId == null || !transformInfo.TryGetValue(upstreamId, out var upstreamInfo))
                continue;

            // Is upstream a map operation?
            if (upstreamInfo.OperationType != "map")
                continue;

            // Check if filter uses a field produced by the map
            // If so, we can't reorder (filter depends on computed field)
            if (filterInfo.FilterField != null && upstreamInfo.ProducedFields.Contains(filterInfo.FilterField))
                continue;

            // This is a candidate: filter could be moved before map
            candidates.Add(new OptimizationCandidate(
                Type: "filter-reorder",
                TaskId: task.Id,
                Description: $"Task '{task.Id}' applies filter after map '{upstreamId}'. Moving filter before map could reduce data volume before expensive transformations.",
                EstimatedImpact: 0.4));
        }

        return candidates;
    }

    /// <summary>
    /// Detects consecutive transform operations that could be fused.
    /// </summary>
    private List<OptimizationCandidate> DetectTransformFusionCandidates(
        List<WorkflowTaskStep> tasks,
        Dictionary<string, WorkflowTaskStep> taskLookup,
        Dictionary<string, TransformInfo> transformInfo)
    {
        var candidates = new List<OptimizationCandidate>();

        foreach (var task in tasks)
        {
            if (string.IsNullOrEmpty(task.Id))
                continue;

            if (!transformInfo.TryGetValue(task.Id, out var currentInfo))
                continue;

            // Get upstream task
            var upstreamId = GetUpstreamTask(task);
            if (upstreamId == null || !transformInfo.TryGetValue(upstreamId, out var upstreamInfo))
                continue;

            // Check for fusible operation pairs
            bool canFuse = false;
            string fusionDescription = "";

            // map + map = fuse into single map
            if (currentInfo.OperationType == "map" && upstreamInfo.OperationType == "map")
            {
                canFuse = true;
                fusionDescription = $"Consecutive map operations '{upstreamId}' → '{task.Id}' could be fused into a single map";
            }
            // select + select = fuse into single select
            else if (currentInfo.OperationType == "select" && upstreamInfo.OperationType == "select")
            {
                canFuse = true;
                fusionDescription = $"Consecutive select operations '{upstreamId}' → '{task.Id}' could be fused into a single select";
            }

            if (canFuse)
            {
                candidates.Add(new OptimizationCandidate(
                    Type: "transform-fusion",
                    TaskId: task.Id,
                    Description: fusionDescription,
                    EstimatedImpact: 0.25));
            }
        }

        return candidates;
    }

    /// <summary>
    /// Detects redundant transforms (e.g., select ignoring fields from previous map).
    /// </summary>
    private List<OptimizationCandidate> DetectRedundantTransformCandidates(
        List<WorkflowTaskStep> tasks,
        Dictionary<string, WorkflowTaskStep> taskLookup,
        Dictionary<string, TransformInfo> transformInfo)
    {
        var candidates = new List<OptimizationCandidate>();

        foreach (var task in tasks)
        {
            if (string.IsNullOrEmpty(task.Id))
                continue;

            // Is this a select task?
            if (!transformInfo.TryGetValue(task.Id, out var selectInfo) || selectInfo.OperationType != "select")
                continue;

            // Get upstream task
            var upstreamId = GetUpstreamTask(task);
            if (upstreamId == null || !transformInfo.TryGetValue(upstreamId, out var upstreamInfo))
                continue;

            // Is upstream a map operation?
            if (upstreamInfo.OperationType != "map")
                continue;

            // Check if select ignores any fields produced by map
            var ignoredFields = upstreamInfo.ProducedFields
                .Where(f => !selectInfo.ConsumedFields.Contains(f))
                .ToList();

            if (ignoredFields.Count > 0)
            {
                var fieldsStr = string.Join(", ", ignoredFields);
                candidates.Add(new OptimizationCandidate(
                    Type: "redundant-transform",
                    TaskId: task.Id,
                    Description: $"Task '{task.Id}' select ignores computed fields [{fieldsStr}] from map '{upstreamId}'. The map computation for these fields is wasted.",
                    EstimatedImpact: 0.2 * ignoredFields.Count));
            }
        }

        return candidates;
    }

    /// <summary>
    /// Detects consecutive filter operations that could be combined.
    /// </summary>
    private List<OptimizationCandidate> DetectFilterFusionCandidates(
        List<WorkflowTaskStep> tasks,
        Dictionary<string, WorkflowTaskStep> taskLookup,
        Dictionary<string, TransformInfo> transformInfo)
    {
        var candidates = new List<OptimizationCandidate>();

        foreach (var task in tasks)
        {
            if (string.IsNullOrEmpty(task.Id))
                continue;

            // Is this a filter task?
            if (!transformInfo.TryGetValue(task.Id, out var filterInfo) || filterInfo.OperationType != "filter")
                continue;

            // Get upstream task
            var upstreamId = GetUpstreamTask(task);
            if (upstreamId == null || !transformInfo.TryGetValue(upstreamId, out var upstreamInfo))
                continue;

            // Is upstream also a filter operation?
            if (upstreamInfo.OperationType != "filter")
                continue;

            // Two consecutive filters can be combined with AND
            candidates.Add(new OptimizationCandidate(
                Type: "filter-fusion",
                TaskId: task.Id,
                Description: $"Consecutive filter operations '{upstreamId}' → '{task.Id}' could be combined into a single filter with AND logic",
                EstimatedImpact: 0.15));
        }

        return candidates;
    }

    /// <summary>
    /// Detects limit operations that could be applied earlier in the pipeline.
    /// </summary>
    private List<OptimizationCandidate> DetectEarlyLimitCandidates(
        List<WorkflowTaskStep> tasks,
        Dictionary<string, WorkflowTaskStep> taskLookup,
        Dictionary<string, TransformInfo> transformInfo)
    {
        var candidates = new List<OptimizationCandidate>();

        foreach (var task in tasks)
        {
            if (string.IsNullOrEmpty(task.Id))
                continue;

            // Is this a limit task?
            if (!transformInfo.TryGetValue(task.Id, out var limitInfo) || limitInfo.OperationType != "limit")
                continue;

            // Get upstream task
            var upstreamId = GetUpstreamTask(task);
            if (upstreamId == null || !transformInfo.TryGetValue(upstreamId, out var upstreamInfo))
                continue;

            // Is upstream an expensive operation (map) that doesn't change count?
            // Note: filter changes count, so limit after filter is semantically different
            if (upstreamInfo.OperationType == "map")
            {
                candidates.Add(new OptimizationCandidate(
                    Type: "early-limit",
                    TaskId: task.Id,
                    Description: $"Task '{task.Id}' applies limit after map '{upstreamId}'. Moving limit earlier could reduce processing volume.",
                    EstimatedImpact: 0.35));
            }
        }

        return candidates;
    }
}
