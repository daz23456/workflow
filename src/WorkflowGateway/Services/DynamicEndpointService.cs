using System.Collections.Concurrent;
using WorkflowCore.Models;
using WorkflowGateway.Models;

namespace WorkflowGateway.Services;

public interface IDynamicEndpointService
{
    Task RegisterWorkflowEndpointsAsync(WorkflowResource workflow);
    Task UnregisterWorkflowEndpointsAsync(string workflowName);
    Task SyncWithDiscoveredWorkflowsAsync(string? @namespace = null);
    Task OnWorkflowsChangedAsync(List<string> addedWorkflows, List<string> removedWorkflows, string? @namespace = null);
    List<EndpointInfo> GetRegisteredEndpoints();
}

public class DynamicEndpointService : IDynamicEndpointService
{
    private readonly IWorkflowDiscoveryService _discoveryService;
    private readonly ConcurrentDictionary<string, List<EndpointInfo>> _registeredEndpoints = new();

    public DynamicEndpointService(IWorkflowDiscoveryService discoveryService)
    {
        _discoveryService = discoveryService ?? throw new ArgumentNullException(nameof(discoveryService));
    }

    public Task RegisterWorkflowEndpointsAsync(WorkflowResource workflow)
    {
        var workflowName = workflow.Metadata?.Name ?? throw new ArgumentException("Workflow must have a name");

        var endpoints = new List<EndpointInfo>
        {
            new EndpointInfo
            {
                WorkflowName = workflowName,
                Pattern = $"/api/v1/workflows/{workflowName}/execute",
                HttpMethod = "POST",
                EndpointType = "execute"
            },
            new EndpointInfo
            {
                WorkflowName = workflowName,
                Pattern = $"/api/v1/workflows/{workflowName}/test",
                HttpMethod = "POST",
                EndpointType = "test"
            },
            new EndpointInfo
            {
                WorkflowName = workflowName,
                Pattern = $"/api/v1/workflows/{workflowName}",
                HttpMethod = "GET",
                EndpointType = "get"
            }
        };

        // Replace if exists, otherwise add
        _registeredEndpoints[workflowName] = endpoints;

        return Task.CompletedTask;
    }

    public Task UnregisterWorkflowEndpointsAsync(string workflowName)
    {
        _registeredEndpoints.TryRemove(workflowName, out _);
        return Task.CompletedTask;
    }

    public async Task SyncWithDiscoveredWorkflowsAsync(string? @namespace = null)
    {
        var workflows = await _discoveryService.DiscoverWorkflowsAsync(@namespace);

        foreach (var workflow in workflows)
        {
            await RegisterWorkflowEndpointsAsync(workflow);
        }
    }

    public async Task OnWorkflowsChangedAsync(List<string> addedWorkflows, List<string> removedWorkflows, string? @namespace = null)
    {
        // Register new workflows
        foreach (var workflowName in addedWorkflows)
        {
            var workflow = await _discoveryService.GetWorkflowByNameAsync(workflowName, @namespace);
            if (workflow != null)
            {
                await RegisterWorkflowEndpointsAsync(workflow);
            }
        }

        // Unregister removed workflows
        foreach (var workflowName in removedWorkflows)
        {
            await UnregisterWorkflowEndpointsAsync(workflowName);
        }
    }

    public List<EndpointInfo> GetRegisteredEndpoints()
    {
        return _registeredEndpoints.Values.SelectMany(e => e).ToList();
    }
}
