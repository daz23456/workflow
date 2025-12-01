using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

public interface IExecutionGraphBuilder
{
    ExecutionGraphResult Build(WorkflowResource workflow);
}

public class ExecutionGraphBuilder : IExecutionGraphBuilder
{
    private static readonly Regex TaskOutputRegex = new(@"tasks\.([^.]+)\.output", RegexOptions.Compiled);
    private readonly ILogger<ExecutionGraphBuilder> _logger;

    public ExecutionGraphBuilder(ILogger<ExecutionGraphBuilder>? logger = null)
    {
        _logger = logger ?? NullLogger<ExecutionGraphBuilder>.Instance;
    }

    public ExecutionGraphResult Build(WorkflowResource workflow)
    {
        var graph = new ExecutionGraph();
        var errors = new List<ValidationError>();
        var diagnostics = new GraphBuildDiagnostics();

        var workflowName = workflow.Metadata?.Name ?? "unknown";
        _logger.LogDebug("Building execution graph for workflow '{WorkflowName}' with {TaskCount} tasks",
            workflowName, workflow.Spec.Tasks.Count);

        // Build dependency graph
        foreach (var task in workflow.Spec.Tasks)
        {
            graph.AddNode(task.Id);
            var taskDiagnostic = new TaskDependencyDiagnostic { TaskId = task.Id };

            // Process explicit dependsOn declarations (MUST be processed first)
            if (task.DependsOn != null && task.DependsOn.Count > 0)
            {
                _logger.LogDebug("Task '{TaskId}' has explicit dependsOn: [{Dependencies}]",
                    task.Id, string.Join(", ", task.DependsOn));

                foreach (var dependencyTaskId in task.DependsOn)
                {
                    graph.AddDependency(task.Id, dependencyTaskId);
                    taskDiagnostic.ExplicitDependencies.Add(dependencyTaskId);
                }
            }
            else
            {
                _logger.LogDebug("Task '{TaskId}' has NO explicit dependsOn (DependsOn is {DependsOnState})",
                    task.Id, task.DependsOn == null ? "null" : "empty");
            }

            // Extract implicit dependencies from input templates
            foreach (var (key, template) in task.Input)
            {
                var matches = TaskOutputRegex.Matches(template);
                foreach (Match match in matches)
                {
                    var dependencyTaskId = match.Groups[1].Value;
                    graph.AddDependency(task.Id, dependencyTaskId);
                    taskDiagnostic.ImplicitDependencies.Add(dependencyTaskId);

                    _logger.LogDebug("Task '{TaskId}' has implicit dependency on '{DependencyTaskId}' via input '{InputKey}'",
                        task.Id, dependencyTaskId, key);
                }
            }

            diagnostics.TaskDiagnostics.Add(taskDiagnostic);
        }

        // Log final dependency summary
        foreach (var taskId in graph.Nodes)
        {
            var deps = graph.GetDependencies(taskId);
            _logger.LogInformation("GRAPH: Task '{TaskId}' depends on: [{Dependencies}]",
                taskId, deps.Any() ? string.Join(", ", deps) : "none (independent)");
        }

        // Detect circular dependencies
        var cycles = graph.DetectCycles();
        if (cycles.Any())
        {
            foreach (var cycle in cycles)
            {
                errors.Add(ErrorMessageBuilder.CircularDependency(
                    workflowName,
                    cycle));
            }
        }

        return new ExecutionGraphResult
        {
            IsValid = errors.Count == 0,
            Graph = errors.Count == 0 ? graph : null,
            Errors = errors,
            Diagnostics = diagnostics
        };
    }
}

/// <summary>
/// Diagnostic information from graph building for debugging dependency issues
/// </summary>
public class GraphBuildDiagnostics
{
    public List<TaskDependencyDiagnostic> TaskDiagnostics { get; set; } = new();
}

/// <summary>
/// Per-task dependency diagnostic
/// </summary>
public class TaskDependencyDiagnostic
{
    public string TaskId { get; set; } = string.Empty;
    public List<string> ExplicitDependencies { get; set; } = new();
    public List<string> ImplicitDependencies { get; set; } = new();
}
