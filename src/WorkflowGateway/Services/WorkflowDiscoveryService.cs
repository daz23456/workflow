using System.Collections.Concurrent;
using WorkflowCore.Models;

namespace WorkflowGateway.Services;

public interface IWorkflowDiscoveryService
{
    Task<List<WorkflowResource>> DiscoverWorkflowsAsync(string? @namespace = null);
    Task<WorkflowResource?> GetWorkflowByNameAsync(string name, string? @namespace = null);
    Task<List<WorkflowTaskResource>> DiscoverTasksAsync(string? @namespace = null);
    Task<WorkflowTaskResource?> GetTaskByNameAsync(string name, string? @namespace = null);
    event EventHandler<WorkflowChangedEventArgs>? WorkflowsChanged;
}

public class WorkflowDiscoveryService : IWorkflowDiscoveryService
{
    private readonly IKubernetesWorkflowClient _kubernetesClient;
    private readonly int _cacheTTLSeconds;
    private readonly ConcurrentDictionary<string, CacheEntry<List<WorkflowResource>>> _workflowCache = new();
    private readonly ConcurrentDictionary<string, CacheEntry<List<WorkflowTaskResource>>> _taskCache = new();
    private readonly object _eventLock = new();

    public event EventHandler<WorkflowChangedEventArgs>? WorkflowsChanged;

    public WorkflowDiscoveryService(IKubernetesWorkflowClient kubernetesClient, int cacheTTLSeconds = 30)
    {
        _kubernetesClient = kubernetesClient ?? throw new ArgumentNullException(nameof(kubernetesClient));
        _cacheTTLSeconds = cacheTTLSeconds;
    }

    public async Task<List<WorkflowResource>> DiscoverWorkflowsAsync(string? @namespace = null)
    {
        // If no namespace specified, use cluster-wide query to get all workflows
        if (@namespace == null)
        {
            var cacheKey = "workflows:all";

            // Check cache
            if (_workflowCache.TryGetValue(cacheKey, out var cached))
            {
                if (DateTime.UtcNow < cached.ExpiresAt)
                {
                    return cached.Data;
                }
            }

            // Use cluster-wide query - auto-discovers all namespaces
            var workflows = await _kubernetesClient.ListAllWorkflowsAsync();

            // Update cache
            var previousWorkflows = cached?.Data ?? new List<WorkflowResource>();
            _workflowCache[cacheKey] = new CacheEntry<List<WorkflowResource>>
            {
                Data = workflows,
                ExpiresAt = DateTime.UtcNow.AddSeconds(_cacheTTLSeconds)
            };

            // Detect changes and raise event
            DetectAndRaiseWorkflowChanges(previousWorkflows, workflows);

            return workflows;
        }

        // Query specific namespace
        var ns = @namespace;
        var nsKey = $"workflows:{ns}";

        // Check cache
        if (_workflowCache.TryGetValue(nsKey, out var nsCached))
        {
            if (DateTime.UtcNow < nsCached.ExpiresAt)
            {
                return nsCached.Data;
            }
        }

        // Query Kubernetes
        var nsWorkflows = await QueryWorkflowsFromKubernetesAsync(ns);

        // Update cache
        var prevWorkflows = nsCached?.Data ?? new List<WorkflowResource>();
        _workflowCache[nsKey] = new CacheEntry<List<WorkflowResource>>
        {
            Data = nsWorkflows,
            ExpiresAt = DateTime.UtcNow.AddSeconds(_cacheTTLSeconds)
        };

        // Detect changes and raise event
        DetectAndRaiseWorkflowChanges(prevWorkflows, nsWorkflows);

        return nsWorkflows;
    }

    public async Task<WorkflowResource?> GetWorkflowByNameAsync(string name, string? @namespace = null)
    {
        var workflows = await DiscoverWorkflowsAsync(@namespace);
        return workflows.FirstOrDefault(w => w.Metadata?.Name == name);
    }

    public async Task<List<WorkflowTaskResource>> DiscoverTasksAsync(string? @namespace = null)
    {
        // If no namespace specified, use cluster-wide query to get all tasks
        if (@namespace == null)
        {
            var cacheKey = "tasks:all";

            // Check cache
            if (_taskCache.TryGetValue(cacheKey, out var cached))
            {
                if (DateTime.UtcNow < cached.ExpiresAt)
                {
                    return cached.Data;
                }
            }

            // Use cluster-wide query - auto-discovers all namespaces
            var tasks = await _kubernetesClient.ListAllTasksAsync();

            // Update cache
            _taskCache[cacheKey] = new CacheEntry<List<WorkflowTaskResource>>
            {
                Data = tasks,
                ExpiresAt = DateTime.UtcNow.AddSeconds(_cacheTTLSeconds)
            };

            return tasks;
        }

        // Query specific namespace
        var ns = @namespace;
        var nsKey = $"tasks:{ns}";

        // Check cache
        if (_taskCache.TryGetValue(nsKey, out var nsCached))
        {
            if (DateTime.UtcNow < nsCached.ExpiresAt)
            {
                return nsCached.Data;
            }
        }

        // Query Kubernetes
        var nsTasks = await QueryTasksFromKubernetesAsync(ns);

        // Update cache
        _taskCache[nsKey] = new CacheEntry<List<WorkflowTaskResource>>
        {
            Data = nsTasks,
            ExpiresAt = DateTime.UtcNow.AddSeconds(_cacheTTLSeconds)
        };

        return nsTasks;
    }

    public async Task<WorkflowTaskResource?> GetTaskByNameAsync(string name, string? @namespace = null)
    {
        var tasks = await DiscoverTasksAsync(@namespace);
        return tasks.FirstOrDefault(t => t.Metadata?.Name == name);
    }

    private Task<List<WorkflowResource>> QueryWorkflowsFromKubernetesAsync(string @namespace)
    {
        return _kubernetesClient.ListWorkflowsAsync(@namespace);
    }

    private Task<List<WorkflowTaskResource>> QueryTasksFromKubernetesAsync(string @namespace)
    {
        return _kubernetesClient.ListTasksAsync(@namespace);
    }

    private void DetectAndRaiseWorkflowChanges(
        List<WorkflowResource> previousWorkflows,
        List<WorkflowResource> currentWorkflows)
    {
        var previousNames = previousWorkflows
            .Select(w => w.Metadata?.Name)
            .Where(n => n != null)
            .ToHashSet();

        var currentNames = currentWorkflows
            .Select(w => w.Metadata?.Name)
            .Where(n => n != null)
            .ToHashSet();

        var addedWorkflows = currentNames.Except(previousNames!).ToList();
        var removedWorkflows = previousNames.Except(currentNames!).ToList();

        if (addedWorkflows.Any() || removedWorkflows.Any())
        {
            var eventArgs = new WorkflowChangedEventArgs
            {
                AddedWorkflows = addedWorkflows!,
                RemovedWorkflows = removedWorkflows!
            };

            lock (_eventLock)
            {
                WorkflowsChanged?.Invoke(this, eventArgs);
            }
        }
    }

    private class CacheEntry<T>
    {
        public required T Data { get; set; }
        public DateTime ExpiresAt { get; set; }
    }
}

public class WorkflowChangedEventArgs : EventArgs
{
    public List<string> AddedWorkflows { get; set; } = new();
    public List<string> RemovedWorkflows { get; set; } = new();
}
