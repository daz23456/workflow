using WorkflowCore.Services;

namespace WorkflowCore.Models;

public class ExecutionGraph
{
    private readonly Dictionary<string, HashSet<string>> _dependencies = new();

    public List<string> Nodes => _dependencies.Keys.ToList();

    public void AddNode(string nodeId)
    {
        if (!_dependencies.ContainsKey(nodeId))
        {
            _dependencies[nodeId] = new HashSet<string>();
        }
    }

    public void AddDependency(string nodeId, string dependsOn)
    {
        if (!_dependencies.ContainsKey(nodeId))
        {
            AddNode(nodeId);
        }

        _dependencies[nodeId].Add(dependsOn);
    }

    public List<string> GetDependencies(string nodeId)
    {
        return _dependencies.ContainsKey(nodeId)
            ? _dependencies[nodeId].ToList()
            : new List<string>();
    }

    public List<List<string>> DetectCycles()
    {
        var cycles = new List<List<string>>();
        var visited = new HashSet<string>();
        var recursionStack = new HashSet<string>();
        var currentPath = new List<string>();

        foreach (var node in Nodes)
        {
            if (!visited.Contains(node))
            {
                DetectCyclesRecursive(node, visited, recursionStack, currentPath, cycles);
            }
        }

        return cycles;
    }

    private bool DetectCyclesRecursive(
        string node,
        HashSet<string> visited,
        HashSet<string> recursionStack,
        List<string> currentPath,
        List<List<string>> cycles)
    {
        visited.Add(node);
        recursionStack.Add(node);
        currentPath.Add(node);

        foreach (var dependency in GetDependencies(node))
        {
            if (!visited.Contains(dependency))
            {
                if (DetectCyclesRecursive(dependency, visited, recursionStack, currentPath, cycles))
                {
                    return true;
                }
            }
            else if (recursionStack.Contains(dependency))
            {
                // Cycle detected
                var cycleStartIndex = currentPath.IndexOf(dependency);
                var cycle = currentPath.Skip(cycleStartIndex).ToList();
                cycle.Add(dependency); // Complete the cycle
                cycles.Add(cycle);
                return true;
            }
        }

        currentPath.RemoveAt(currentPath.Count - 1);
        recursionStack.Remove(node);
        return false;
    }

    public List<string> GetIndependentTasks()
    {
        return Nodes
            .Where(node => GetDependencies(node).Count == 0)
            .ToList();
    }

    public List<string> GetExecutionOrder()
    {
        var result = new List<string>();
        var visited = new HashSet<string>();

        foreach (var node in Nodes)
        {
            if (!visited.Contains(node))
            {
                TopologicalSortRecursive(node, visited, result);
            }
        }

        return result;
    }

    private void TopologicalSortRecursive(string node, HashSet<string> visited, List<string> result)
    {
        visited.Add(node);

        foreach (var dependency in GetDependencies(node))
        {
            if (!visited.Contains(dependency))
            {
                TopologicalSortRecursive(dependency, visited, result);
            }
        }

        result.Add(node);
    }

    /// <summary>
    /// Identifies groups of tasks that can execute in parallel.
    /// Uses BFS to group tasks by their dependency level.
    /// </summary>
    /// <returns>List of parallel groups ordered by execution level.</returns>
    public List<ParallelGroup> GetParallelGroups()
    {
        if (Nodes.Count == 0)
        {
            return new List<ParallelGroup>();
        }

        // Build a map of dependents (reverse dependencies)
        var dependents = BuildDependentsMap();

        // Track the level of each task
        var taskLevels = new Dictionary<string, int>();

        // Start with tasks that have no dependencies (level 0)
        var queue = new Queue<string>();
        foreach (var node in Nodes)
        {
            if (GetDependencies(node).Count == 0)
            {
                queue.Enqueue(node);
                taskLevels[node] = 0;
            }
        }

        // BFS to assign levels
        while (queue.Count > 0)
        {
            var current = queue.Dequeue();
            var currentLevel = taskLevels[current];

            // Process all tasks that depend on this one
            if (dependents.ContainsKey(current))
            {
                foreach (var dependent in dependents[current])
                {
                    // Check if all dependencies of the dependent are processed
                    var dependencies = GetDependencies(dependent);
                    var maxDependencyLevel = dependencies
                        .Where(dep => taskLevels.ContainsKey(dep))
                        .Select(dep => taskLevels[dep])
                        .DefaultIfEmpty(-1)
                        .Max();

                    if (dependencies.All(dep => taskLevels.ContainsKey(dep)))
                    {
                        var newLevel = maxDependencyLevel + 1;

                        // Update level if not set or if we found a longer dependency path
                        if (!taskLevels.ContainsKey(dependent) || taskLevels[dependent] < newLevel)
                        {
                            taskLevels[dependent] = newLevel;
                            queue.Enqueue(dependent);
                        }
                    }
                }
            }
        }

        // Group tasks by level
        var groupedByLevel = taskLevels
            .GroupBy(kvp => kvp.Value)
            .OrderBy(g => g.Key)
            .Select(g => new ParallelGroup
            {
                Level = g.Key,
                TaskIds = g.Select(kvp => kvp.Key).OrderBy(id => id).ToList()
            })
            .ToList();

        return groupedByLevel;
    }

    /// <summary>
    /// Gets all tasks that depend on the specified task (reverse dependencies).
    /// Used for SignalFlow events to notify dependent tasks when a task completes.
    /// </summary>
    /// <param name="taskId">The task to find dependents for.</param>
    /// <returns>List of task IDs that depend on the specified task.</returns>
    public List<string> GetDependentTasks(string taskId)
    {
        var dependents = new List<string>();
        foreach (var node in Nodes)
        {
            if (GetDependencies(node).Contains(taskId))
            {
                dependents.Add(node);
            }
        }
        return dependents;
    }

    /// <summary>
    /// Builds a map of which tasks depend on each task (reverse dependencies).
    /// </summary>
    private Dictionary<string, HashSet<string>> BuildDependentsMap()
    {
        var dependents = new Dictionary<string, HashSet<string>>();

        foreach (var node in Nodes)
        {
            foreach (var dependency in GetDependencies(node))
            {
                if (!dependents.ContainsKey(dependency))
                {
                    dependents[dependency] = new HashSet<string>();
                }
                dependents[dependency].Add(node);
            }
        }

        return dependents;
    }
}

public class ExecutionGraphResult
{
    public bool IsValid { get; set; }
    public ExecutionGraph? Graph { get; set; }
    public List<ValidationError> Errors { get; set; } = new();

    /// <summary>
    /// Diagnostic information about how dependencies were detected
    /// </summary>
    public GraphBuildDiagnostics? Diagnostics { get; set; }
}
