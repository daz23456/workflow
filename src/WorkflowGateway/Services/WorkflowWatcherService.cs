using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using WorkflowGateway.Services;

namespace WorkflowGateway.Services;

public class WorkflowWatcherService : BackgroundService
{
    private readonly IWorkflowDiscoveryService _discoveryService;
    private readonly IDynamicEndpointService _endpointService;
    private readonly ILogger<WorkflowWatcherService> _logger;
    private readonly TimeSpan _pollingInterval;
    private HashSet<string> _previousWorkflows = new();

    public WorkflowWatcherService(
        IWorkflowDiscoveryService discoveryService,
        IDynamicEndpointService endpointService,
        ILogger<WorkflowWatcherService> logger,
        int pollingIntervalSeconds = 30)
    {
        _discoveryService = discoveryService ?? throw new ArgumentNullException(nameof(discoveryService));
        _endpointService = endpointService ?? throw new ArgumentNullException(nameof(endpointService));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _pollingInterval = TimeSpan.FromSeconds(pollingIntervalSeconds);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("WorkflowWatcherService started. Polling interval: {Interval} seconds", _pollingInterval.TotalSeconds);

        // Initial sync
        await SyncWorkflowsAsync(stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(_pollingInterval, stoppingToken);
                await SyncWorkflowsAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                _logger.LogInformation("WorkflowWatcherService is stopping");
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while syncing workflows");
                // Continue polling even if there's an error
            }
        }

        _logger.LogInformation("WorkflowWatcherService stopped");
    }

    private async Task SyncWorkflowsAsync(CancellationToken cancellationToken)
    {
        try
        {
            // Discover current workflows
            var currentWorkflows = await _discoveryService.DiscoverWorkflowsAsync(null);
            var currentWorkflowNames = new HashSet<string>(
                currentWorkflows.Select(w => w.Metadata?.Name ?? "").Where(n => !string.IsNullOrEmpty(n))
            );

            // Detect added workflows
            var addedWorkflows = currentWorkflowNames.Except(_previousWorkflows).ToList();

            // Detect removed workflows
            var removedWorkflows = _previousWorkflows.Except(currentWorkflowNames).ToList();

            if (addedWorkflows.Any() || removedWorkflows.Any())
            {
                _logger.LogInformation(
                    "Workflow changes detected. Added: {AddedCount}, Removed: {RemovedCount}",
                    addedWorkflows.Count,
                    removedWorkflows.Count);

                // Notify endpoint service of changes
                await _endpointService.OnWorkflowsChangedAsync(addedWorkflows, removedWorkflows, null);

                // Update previous state
                _previousWorkflows = currentWorkflowNames;

                _logger.LogInformation("Endpoint registration updated successfully");
            }
            else
            {
                _logger.LogDebug("No workflow changes detected");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to sync workflows");
            throw;
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("WorkflowWatcherService is stopping gracefully");
        await base.StopAsync(cancellationToken);
    }
}
