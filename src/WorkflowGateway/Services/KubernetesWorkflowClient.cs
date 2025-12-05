using System.Diagnostics.CodeAnalysis;
using System.Text.Json;
using k8s;
using WorkflowCore.Models;

namespace WorkflowGateway.Services;

[ExcludeFromCodeCoverage]
public class KubernetesWorkflowClient : IKubernetesWorkflowClient
{
    private readonly IKubernetes _kubernetes;

    public KubernetesWorkflowClient(IKubernetes kubernetes)
    {
        _kubernetes = kubernetes ?? throw new ArgumentNullException(nameof(kubernetes));
    }

    public async Task<List<WorkflowResource>> ListWorkflowsAsync(string @namespace, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _kubernetes.CustomObjects.ListNamespacedCustomObjectAsync(
                group: "workflow.example.com",
                version: "v1",
                namespaceParameter: @namespace,
                plural: "workflows",
                cancellationToken: cancellationToken);

            return ParseWorkflowListResponse(response);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error querying workflows: {ex.Message}");
            return new List<WorkflowResource>();
        }
    }

    public async Task<List<WorkflowTaskResource>> ListTasksAsync(string @namespace, CancellationToken cancellationToken = default)
    {
        try
        {
            var response = await _kubernetes.CustomObjects.ListNamespacedCustomObjectAsync(
                group: "workflow.example.com",
                version: "v1",
                namespaceParameter: @namespace,
                plural: "workflowtasks",
                cancellationToken: cancellationToken);

            return ParseTaskListResponse(response);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error querying tasks: {ex.Message}");
            return new List<WorkflowTaskResource>();
        }
    }

    private List<WorkflowResource> ParseWorkflowListResponse(object response)
    {
        var workflows = new List<WorkflowResource>();

        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        var json = JsonSerializer.Serialize(response);
        var doc = JsonDocument.Parse(json);

        if (doc.RootElement.TryGetProperty("Items", out var itemsElement) ||
            doc.RootElement.TryGetProperty("items", out itemsElement))
        {
            foreach (var item in itemsElement.EnumerateArray())
            {
                var workflowJson = item.GetRawText();
                var workflow = JsonSerializer.Deserialize<WorkflowResource>(workflowJson, options);
                if (workflow != null)
                {
                    workflows.Add(workflow);
                }
            }
        }

        return workflows;
    }

    private List<WorkflowTaskResource> ParseTaskListResponse(object response)
    {
        var tasks = new List<WorkflowTaskResource>();

        // Use default options which properly respect [JsonPolymorphic] attributes
        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        };

        var json = JsonSerializer.Serialize(response);
        var doc = JsonDocument.Parse(json);

        if (doc.RootElement.TryGetProperty("Items", out var itemsElement) ||
            doc.RootElement.TryGetProperty("items", out itemsElement))
        {
            foreach (var item in itemsElement.EnumerateArray())
            {
                var taskName = item.TryGetProperty("metadata", out var meta) && meta.TryGetProperty("name", out var name)
                    ? name.GetString()
                    : "unknown";
                try
                {
                    var taskJson = item.GetRawText();
                    var task = JsonSerializer.Deserialize<WorkflowTaskResource>(taskJson, options);
                    if (task != null)
                    {
                        tasks.Add(task);
                    }
                }
                catch (Exception ex)
                {
                    // Log but continue - one bad task shouldn't break all discovery
                    Console.WriteLine($"Warning: Failed to deserialize task '{taskName}' ({ex.GetType().Name}): {ex.Message}");
                }
            }
        }

        return tasks;
    }

    public async Task<List<WorkflowResource>> ListWorkflowsFromNamespacesAsync(IEnumerable<string> namespaces, CancellationToken cancellationToken = default)
    {
        var allWorkflows = new List<WorkflowResource>();
        var tasks = namespaces.Select(ns => ListWorkflowsAsync(ns, cancellationToken));
        var results = await Task.WhenAll(tasks);

        foreach (var workflows in results)
        {
            allWorkflows.AddRange(workflows);
        }

        return allWorkflows;
    }

    public async Task<List<WorkflowTaskResource>> ListTasksFromNamespacesAsync(IEnumerable<string> namespaces, CancellationToken cancellationToken = default)
    {
        var allTasks = new List<WorkflowTaskResource>();
        var taskQueries = namespaces.Select(ns => ListTasksAsync(ns, cancellationToken));
        var results = await Task.WhenAll(taskQueries);

        foreach (var tasks in results)
        {
            allTasks.AddRange(tasks);
        }

        return allTasks;
    }

    public async Task<List<WorkflowResource>> ListAllWorkflowsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            // Use cluster-wide query to list workflows from all namespaces
            var response = await _kubernetes.CustomObjects.ListClusterCustomObjectAsync(
                group: "workflow.example.com",
                version: "v1",
                plural: "workflows",
                cancellationToken: cancellationToken);

            return ParseWorkflowListResponse(response);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error querying workflows (cluster-wide): {ex.Message}");
            return new List<WorkflowResource>();
        }
    }

    public async Task<List<WorkflowTaskResource>> ListAllTasksAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            // Use cluster-wide query to list tasks from all namespaces
            var response = await _kubernetes.CustomObjects.ListClusterCustomObjectAsync(
                group: "workflow.example.com",
                version: "v1",
                plural: "workflowtasks",
                cancellationToken: cancellationToken);

            return ParseTaskListResponse(response);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error querying tasks (cluster-wide): {ex.Message}");
            return new List<WorkflowTaskResource>();
        }
    }
}
