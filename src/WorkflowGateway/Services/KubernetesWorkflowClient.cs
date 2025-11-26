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
                var taskJson = item.GetRawText();
                var task = JsonSerializer.Deserialize<WorkflowTaskResource>(taskJson, options);
                if (task != null)
                {
                    tasks.Add(task);
                }
            }
        }

        return tasks;
    }
}
