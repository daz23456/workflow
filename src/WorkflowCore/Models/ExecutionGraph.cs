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
}

public class ExecutionGraphResult
{
    public bool IsValid { get; set; }
    public ExecutionGraph? Graph { get; set; }
    public List<ValidationError> Errors { get; set; } = new();
}
