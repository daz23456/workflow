using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Analyzes the blast radius of task changes using BFS traversal with cycle detection.
/// </summary>
public class BlastRadiusAnalyzer : IBlastRadiusAnalyzer
{
    private readonly ITaskDependencyTracker _dependencyTracker;

    public BlastRadiusAnalyzer(ITaskDependencyTracker dependencyTracker)
    {
        _dependencyTracker = dependencyTracker;
    }

    /// <inheritdoc />
    public Task<BlastRadiusResult> AnalyzeAsync(
        string taskName,
        int maxDepth = 1,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();

        var result = new BlastRadiusResult
        {
            TaskName = taskName,
            AnalysisDepth = maxDepth
        };

        // Track visited nodes to prevent cycles
        var visitedTasks = new HashSet<string> { taskName };
        var visitedWorkflows = new HashSet<string>();

        // BFS queue: tasks to process at current level
        var currentLevelTasks = new List<string> { taskName };
        var hasMoreLevels = false;

        // Add source node to graph
        result.Graph.Nodes.Add(new BlastRadiusNode
        {
            Id = $"task:{taskName}",
            Name = taskName,
            Type = BlastRadiusNodeType.Task,
            Depth = 0,
            IsSource = true
        });

        for (int depth = 1; depth <= maxDepth && currentLevelTasks.Count > 0; depth++)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var depthLevel = new BlastRadiusDepthLevel { Depth = depth };
            var nextLevelTasks = new List<string>();

            foreach (var task in currentLevelTasks)
            {
                // Find all workflows using this task
                var workflows = _dependencyTracker.GetAffectedWorkflows(task) ?? Array.Empty<string>();

                foreach (var workflow in workflows)
                {
                    if (visitedWorkflows.Contains(workflow))
                        continue;

                    visitedWorkflows.Add(workflow);
                    depthLevel.Workflows.Add(workflow);
                    result.AffectedWorkflows.Add(workflow);

                    // Add workflow node
                    result.Graph.Nodes.Add(new BlastRadiusNode
                    {
                        Id = $"workflow:{workflow}",
                        Name = workflow,
                        Type = BlastRadiusNodeType.Workflow,
                        Depth = depth,
                        IsSource = false
                    });

                    // Add edge from task to workflow
                    result.Graph.Edges.Add(new BlastRadiusEdge
                    {
                        Source = $"task:{task}",
                        Target = $"workflow:{workflow}",
                        Relationship = "usedBy"
                    });

                    // Find all tasks in this workflow
                    var tasksInWorkflow = _dependencyTracker.GetTasksInWorkflow(workflow) ?? Array.Empty<string>();

                    foreach (var otherTask in tasksInWorkflow)
                    {
                        if (visitedTasks.Contains(otherTask))
                            continue;

                        visitedTasks.Add(otherTask);
                        depthLevel.Tasks.Add(otherTask);
                        result.AffectedTasks.Add(otherTask);
                        nextLevelTasks.Add(otherTask);

                        // Add task node
                        result.Graph.Nodes.Add(new BlastRadiusNode
                        {
                            Id = $"task:{otherTask}",
                            Name = otherTask,
                            Type = BlastRadiusNodeType.Task,
                            Depth = depth,
                            IsSource = false
                        });

                        // Add edge from workflow to task
                        result.Graph.Edges.Add(new BlastRadiusEdge
                        {
                            Source = $"workflow:{workflow}",
                            Target = $"task:{otherTask}",
                            Relationship = "contains"
                        });
                    }
                }
            }

            if (depthLevel.Workflows.Count > 0 || depthLevel.Tasks.Count > 0)
            {
                result.ByDepth.Add(depthLevel);
            }

            currentLevelTasks = nextLevelTasks;

            // Check if there would be more levels beyond max depth
            if (depth == maxDepth && nextLevelTasks.Count > 0)
            {
                // Check if any of the next level tasks have dependents
                foreach (var nextTask in nextLevelTasks)
                {
                    var nextWorkflows = _dependencyTracker.GetAffectedWorkflows(nextTask) ?? Array.Empty<string>();
                    if (nextWorkflows.Any(w => !visitedWorkflows.Contains(w)))
                    {
                        hasMoreLevels = true;
                        break;
                    }
                }
            }
        }

        result.TruncatedAtDepth = hasMoreLevels;

        return Task.FromResult(result);
    }
}
