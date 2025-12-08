using System.Collections.Concurrent;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// In-memory implementation of task dependency tracking.
/// </summary>
public class TaskDependencyTracker : ITaskDependencyTracker
{
    private readonly ConcurrentDictionary<string, TaskDependency> _dependencies = new();

    /// <inheritdoc />
    public void RegisterDependency(string taskName, string workflowName)
    {
        var dependency = _dependencies.GetOrAdd(taskName, _ => new TaskDependency { TaskName = taskName });

        lock (dependency)
        {
            if (!dependency.DependentWorkflows.Contains(workflowName))
            {
                dependency.DependentWorkflows.Add(workflowName);
                dependency.LastUpdated = DateTime.UtcNow;
            }
        }
    }

    /// <inheritdoc />
    public void UnregisterDependency(string taskName, string workflowName)
    {
        if (_dependencies.TryGetValue(taskName, out var dependency))
        {
            lock (dependency)
            {
                dependency.DependentWorkflows.Remove(workflowName);
                dependency.UsedFields.Remove(workflowName);
                dependency.LastUpdated = DateTime.UtcNow;
            }
        }
    }

    /// <inheritdoc />
    public TaskDependency? GetDependency(string taskName)
    {
        return _dependencies.TryGetValue(taskName, out var dependency) ? dependency : null;
    }

    /// <inheritdoc />
    public IReadOnlyList<string> GetAffectedWorkflows(string taskName)
    {
        if (_dependencies.TryGetValue(taskName, out var dependency))
        {
            lock (dependency)
            {
                return dependency.DependentWorkflows.ToList();
            }
        }
        return Array.Empty<string>();
    }

    /// <inheritdoc />
    public void RegisterFieldUsage(string taskName, string workflowName, IEnumerable<string> fields)
    {
        if (_dependencies.TryGetValue(taskName, out var dependency))
        {
            lock (dependency)
            {
                dependency.UsedFields[workflowName] = fields.ToList();
                dependency.LastUpdated = DateTime.UtcNow;
            }
        }
    }

    /// <inheritdoc />
    public IReadOnlyList<string> GetWorkflowsUsingField(string taskName, string fieldName)
    {
        if (_dependencies.TryGetValue(taskName, out var dependency))
        {
            lock (dependency)
            {
                return dependency.UsedFields
                    .Where(kvp => kvp.Value.Contains(fieldName))
                    .Select(kvp => kvp.Key)
                    .ToList();
            }
        }
        return Array.Empty<string>();
    }
}
