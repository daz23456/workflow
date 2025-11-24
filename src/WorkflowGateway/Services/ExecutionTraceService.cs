using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Models;

namespace WorkflowGateway.Services;

/// <summary>
/// Service for building detailed execution traces from workflow execution records.
/// </summary>
public class ExecutionTraceService : IExecutionTraceService
{
    private const string SucceededStatus = "Succeeded";

    /// <inheritdoc />
    public ExecutionTraceResponse BuildTrace(ExecutionRecord executionRecord, WorkflowResource workflow)
    {
        if (executionRecord == null) throw new ArgumentNullException(nameof(executionRecord));
        if (workflow == null) throw new ArgumentNullException(nameof(workflow));

        // Build execution graph from workflow definition
        var graphBuilder = new ExecutionGraphBuilder();
        var graphResult = graphBuilder.Build(workflow);
        if (graphResult.Graph == null)
        {
            throw new InvalidOperationException("Failed to build execution graph from workflow definition.");
        }
        var graph = graphResult.Graph;

        var response = new ExecutionTraceResponse
        {
            ExecutionId = executionRecord.Id,
            WorkflowName = executionRecord.WorkflowName ?? string.Empty,
            StartedAt = executionRecord.StartedAt,
            CompletedAt = executionRecord.CompletedAt,
            TotalDurationMs = executionRecord.Duration?.TotalMilliseconds != null
                ? (long)executionRecord.Duration.Value.TotalMilliseconds
                : null
        };

        // Build task timing details with wait time calculation
        response.TaskTimings = BuildTaskTimings(executionRecord.TaskExecutionRecords, graph);

        // Build dependency information
        response.DependencyOrder = BuildDependencyInfo(executionRecord.TaskExecutionRecords, graph);

        // Get planned parallel groups from graph
        response.PlannedParallelGroups = graph.GetParallelGroups();

        // Detect actual parallel execution from timing data
        response.ActualParallelGroups = DetectActualParallelGroups(executionRecord.TaskExecutionRecords);

        return response;
    }

    private List<TaskTimingDetail> BuildTaskTimings(List<TaskExecutionRecord> taskRecords, ExecutionGraph graph)
    {
        var timings = new List<TaskTimingDetail>();

        foreach (var taskRecord in taskRecords)
        {
            var dependencies = graph.GetDependencies(taskRecord.TaskId ?? string.Empty);
            var waitTimeMs = CalculateWaitTime(taskRecord, taskRecords, dependencies);

            timings.Add(new TaskTimingDetail
            {
                TaskId = taskRecord.TaskId ?? string.Empty,
                TaskRef = taskRecord.TaskRef ?? string.Empty,
                StartedAt = taskRecord.StartedAt,
                CompletedAt = taskRecord.CompletedAt ?? taskRecord.StartedAt,
                DurationMs = taskRecord.Duration != null
                    ? (long)taskRecord.Duration.Value.TotalMilliseconds
                    : 0,
                WaitTimeMs = waitTimeMs,
                WaitedForTasks = dependencies.ToList(),
                RetryCount = taskRecord.RetryCount,
                Success = taskRecord.Status == SucceededStatus
            });
        }

        return timings;
    }

    private long CalculateWaitTime(TaskExecutionRecord task, List<TaskExecutionRecord> allTasks, List<string> dependencies)
    {
        if (!dependencies.Any())
        {
            return 0; // No dependencies = no wait time
        }

        var dependencyRecords = FindDependencyRecords(allTasks, dependencies);

        if (!dependencyRecords.Any())
        {
            return 0; // Dependencies not found (shouldn't happen in valid data)
        }

        // Wait time = task start - max(dependency completion times)
        var maxDependencyCompletedAt = dependencyRecords
            .Where(t => t.CompletedAt.HasValue)
            .Max(t => t.CompletedAt!.Value);

        var waitTime = task.StartedAt - maxDependencyCompletedAt;
        return waitTime.TotalMilliseconds > 0 ? (long)waitTime.TotalMilliseconds : 0;
    }

    private static List<TaskExecutionRecord> FindDependencyRecords(List<TaskExecutionRecord> allTasks, List<string> dependencies)
    {
        return allTasks.Where(t => dependencies.Contains(t.TaskId ?? string.Empty)).ToList();
    }

    private List<DependencyInfo> BuildDependencyInfo(List<TaskExecutionRecord> taskRecords, ExecutionGraph graph)
    {
        var dependencyInfos = new List<DependencyInfo>();

        foreach (var taskRecord in taskRecords)
        {
            var dependencies = graph.GetDependencies(taskRecord.TaskId ?? string.Empty);

            DateTime? readyAt = null;
            if (dependencies.Any())
            {
                var dependencyRecords = FindDependencyRecords(taskRecords, dependencies);
                if (dependencyRecords.Any() && dependencyRecords.All(t => t.CompletedAt.HasValue))
                {
                    readyAt = dependencyRecords.Max(t => t.CompletedAt!.Value);
                }
            }

            dependencyInfos.Add(new DependencyInfo
            {
                TaskId = taskRecord.TaskId ?? string.Empty,
                DependsOn = dependencies.ToList(),
                ReadyAt = readyAt,
                StartedAt = taskRecord.StartedAt
            });
        }

        return dependencyInfos;
    }

    private List<ActualParallelGroup> DetectActualParallelGroups(List<TaskExecutionRecord> taskRecords)
    {
        if (!taskRecords.Any())
        {
            return new List<ActualParallelGroup>();
        }

        var parallelGroups = new List<ActualParallelGroup>();
        var processedTasks = new HashSet<string>();

        foreach (var task in taskRecords.OrderBy(t => t.StartedAt))
        {
            var taskId = task.TaskId ?? string.Empty;
            if (processedTasks.Contains(taskId))
            {
                continue;
            }

            // Find all tasks that overlap with this task
            var overlappingTasks = taskRecords
                .Where(t => t.TaskId == taskId || TasksOverlap(task, t))
                .ToList();

            if (overlappingTasks.Count > 1)
            {
                // Multiple tasks overlapped - create a parallel group
                var group = new ActualParallelGroup
                {
                    StartedAt = overlappingTasks.Min(t => t.StartedAt),
                    CompletedAt = overlappingTasks.Max(t => t.CompletedAt ?? t.StartedAt),
                    TaskIds = overlappingTasks.Select(t => t.TaskId ?? string.Empty).ToList()
                };

                parallelGroups.Add(group);

                // Mark all tasks in this group as processed
                foreach (var t in overlappingTasks)
                {
                    processedTasks.Add(t.TaskId ?? string.Empty);
                }
            }
        }

        return parallelGroups;
    }

    private static bool TasksOverlap(TaskExecutionRecord task1, TaskExecutionRecord task2)
    {
        var start1 = task1.StartedAt;
        var end1 = task1.CompletedAt ?? task1.StartedAt;
        var start2 = task2.StartedAt;
        var end2 = task2.CompletedAt ?? task2.StartedAt;

        return start1 < end2 && end1 > start2;
    }
}
