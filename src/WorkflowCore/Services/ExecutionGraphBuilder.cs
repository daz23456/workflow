using System.Text.RegularExpressions;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

public interface IExecutionGraphBuilder
{
    ExecutionGraphResult Build(WorkflowResource workflow);
}

public class ExecutionGraphBuilder : IExecutionGraphBuilder
{
    private static readonly Regex TaskOutputRegex = new(@"tasks\.([^.]+)\.output", RegexOptions.Compiled);

    public ExecutionGraphResult Build(WorkflowResource workflow)
    {
        var graph = new ExecutionGraph();
        var errors = new List<ValidationError>();

        // Build dependency graph
        foreach (var task in workflow.Spec.Tasks)
        {
            graph.AddNode(task.Id);

            // Extract dependencies from input templates
            foreach (var (_, template) in task.Input)
            {
                var matches = TaskOutputRegex.Matches(template);
                foreach (Match match in matches)
                {
                    var dependencyTaskId = match.Groups[1].Value;
                    graph.AddDependency(task.Id, dependencyTaskId);
                }
            }
        }

        // Detect circular dependencies
        var cycles = graph.DetectCycles();
        if (cycles.Any())
        {
            foreach (var cycle in cycles)
            {
                errors.Add(ErrorMessageBuilder.CircularDependency(
                    workflow.Metadata?.Name ?? "unknown",
                    cycle));
            }
        }

        return new ExecutionGraphResult
        {
            IsValid = errors.Count == 0,
            Graph = errors.Count == 0 ? graph : null,
            Errors = errors
        };
    }
}
