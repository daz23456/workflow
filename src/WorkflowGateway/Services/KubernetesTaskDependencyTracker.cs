using System.Collections.Concurrent;
using WorkflowCore.Models;
using WorkflowCore.Services;

namespace WorkflowGateway.Services;

/// <summary>
/// Kubernetes-aware implementation of task dependency tracking with inverted index.
/// Uses O(1) lookups via inverted index that rebuilds on cache refresh.
/// Supports 50K+ tasks and 5K+ workflows through intelligent caching.
/// </summary>
public class KubernetesTaskDependencyTracker : ITaskDependencyTracker
{
    private readonly IWorkflowDiscoveryService _discoveryService;

    // Inverted index: task name -> list of workflows using it
    private ConcurrentDictionary<string, List<string>> _taskToWorkflowsIndex = new(StringComparer.OrdinalIgnoreCase);

    // Workflow -> tasks index for GetTasksInWorkflow
    private ConcurrentDictionary<string, List<string>> _workflowToTasksIndex = new(StringComparer.OrdinalIgnoreCase);

    // Track when index was last built
    private DateTime _lastIndexBuild = DateTime.MinValue;
    private readonly TimeSpan _indexTTL = TimeSpan.FromSeconds(30);
    private readonly object _indexLock = new();

    public KubernetesTaskDependencyTracker(IWorkflowDiscoveryService discoveryService)
    {
        _discoveryService = discoveryService ?? throw new ArgumentNullException(nameof(discoveryService));
    }

    /// <summary>
    /// Rebuilds the inverted index from the workflow discovery cache.
    /// Called automatically when index expires (30s TTL matches discovery cache).
    /// </summary>
    private void RebuildIndexIfNeeded()
    {
        if (DateTime.UtcNow - _lastIndexBuild < _indexTTL)
            return;

        lock (_indexLock)
        {
            // Double-check after acquiring lock
            if (DateTime.UtcNow - _lastIndexBuild < _indexTTL)
                return;

            var workflows = _discoveryService.DiscoverWorkflowsAsync().GetAwaiter().GetResult();

            var newTaskIndex = new ConcurrentDictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);
            var newWorkflowIndex = new ConcurrentDictionary<string, List<string>>(StringComparer.OrdinalIgnoreCase);

            foreach (var workflow in workflows)
            {
                var workflowName = workflow.Metadata.Name;
                var taskRefs = workflow.Spec.Tasks
                    .Where(t => !string.IsNullOrEmpty(t.TaskRef))
                    .Select(t => t.TaskRef!)
                    .Distinct()
                    .ToList();

                // Build workflow -> tasks index
                newWorkflowIndex[workflowName] = taskRefs;

                // Build task -> workflows inverted index
                foreach (var taskRef in taskRefs)
                {
                    var workflowList = newTaskIndex.GetOrAdd(taskRef, _ => new List<string>());
                    lock (workflowList)
                    {
                        if (!workflowList.Contains(workflowName))
                            workflowList.Add(workflowName);
                    }
                }
            }

            // Atomic swap
            _taskToWorkflowsIndex = newTaskIndex;
            _workflowToTasksIndex = newWorkflowIndex;
            _lastIndexBuild = DateTime.UtcNow;
        }
    }

    /// <inheritdoc />
    public void RegisterDependency(string taskName, string workflowName)
    {
        // No-op: Dependencies are discovered from K8s cache, not registered
    }

    /// <inheritdoc />
    public void UnregisterDependency(string taskName, string workflowName)
    {
        // No-op: Dependencies are discovered from K8s cache, not registered
    }

    /// <inheritdoc />
    public TaskDependency? GetDependency(string taskName)
    {
        var workflows = GetAffectedWorkflows(taskName);
        if (workflows.Count == 0)
            return null;

        return new TaskDependency
        {
            TaskName = taskName,
            DependentWorkflows = workflows.ToList(),
            LastUpdated = DateTime.UtcNow
        };
    }

    /// <inheritdoc />
    public IReadOnlyList<string> GetAffectedWorkflows(string taskName)
    {
        // O(1) lookup using inverted index
        RebuildIndexIfNeeded();

        if (_taskToWorkflowsIndex.TryGetValue(taskName, out var workflows))
        {
            lock (workflows)
            {
                return workflows.ToList();
            }
        }

        return Array.Empty<string>();
    }

    /// <inheritdoc />
    public void RegisterFieldUsage(string taskName, string workflowName, IEnumerable<string> fields)
    {
        // No-op: Field usage tracking not supported in K8s-based tracker
    }

    /// <inheritdoc />
    public IReadOnlyList<string> GetWorkflowsUsingField(string taskName, string fieldName)
    {
        // Not supported in K8s-based tracker - would require parsing task input templates
        return Array.Empty<string>();
    }

    /// <inheritdoc />
    public IReadOnlyList<string> GetTasksInWorkflow(string workflowName)
    {
        // O(1) lookup using workflow -> tasks index
        RebuildIndexIfNeeded();

        if (_workflowToTasksIndex.TryGetValue(workflowName, out var tasks))
        {
            return tasks.ToList();
        }

        return Array.Empty<string>();
    }
}
