using Microsoft.Extensions.Options;
using WorkflowCore.Models;
using WorkflowCore.Services;

namespace WorkflowGateway.Services;

/// <summary>
/// Background service that periodically refreshes health checks for all workflows.
/// </summary>
public class SyntheticCheckBackgroundService : BackgroundService
{
    private readonly ISyntheticCheckService _checkService;
    private readonly IWorkflowDiscoveryService _discoveryService;
    private readonly SyntheticCheckOptions _options;
    private readonly ILogger<SyntheticCheckBackgroundService> _logger;

    private static readonly TimeSpan InitialDelay = TimeSpan.FromSeconds(30);

    public SyntheticCheckBackgroundService(
        ISyntheticCheckService checkService,
        IWorkflowDiscoveryService discoveryService,
        IOptions<SyntheticCheckOptions> options,
        ILogger<SyntheticCheckBackgroundService> logger)
    {
        _checkService = checkService ?? throw new ArgumentNullException(nameof(checkService));
        _discoveryService = discoveryService ?? throw new ArgumentNullException(nameof(discoveryService));
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.Enabled)
        {
            _logger.LogInformation("Synthetic health checks are disabled");
            return;
        }

        _logger.LogInformation(
            "Synthetic health check service starting. Interval: {Interval} minutes, Initial delay: {Delay} seconds",
            _options.IntervalMinutes,
            InitialDelay.TotalSeconds);

        // Initial delay to let the system stabilize
        await Task.Delay(InitialDelay, stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await PerformHealthChecksAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // Normal shutdown
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during synthetic health check cycle");
            }

            try
            {
                await Task.Delay(TimeSpan.FromMinutes(_options.IntervalMinutes), stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }

        _logger.LogInformation("Synthetic health check service stopped");
    }

    private async Task PerformHealthChecksAsync(CancellationToken ct)
    {
        _logger.LogDebug("Starting synthetic health check cycle");

        // Get all known workflows
        var workflows = await _discoveryService.DiscoverWorkflowsAsync();

        if (workflows.Count == 0)
        {
            _logger.LogDebug("No workflows found for health checking");
            return;
        }

        _logger.LogDebug("Checking health for {Count} workflows", workflows.Count);

        // Check all workflows in parallel
        var checkTasks = workflows
            .Where(w => !string.IsNullOrEmpty(w.Metadata?.Name))
            .Select(async w =>
            {
                try
                {
                    var result = await _checkService.CheckWorkflowHealthAsync(w.Metadata!.Name, ct);

                    if (result.OverallHealth == HealthState.Unhealthy)
                    {
                        _logger.LogWarning(
                            "Workflow '{Workflow}' is unhealthy. Failed tasks: {FailedTasks}",
                            w.Metadata.Name,
                            string.Join(", ", result.Tasks.Where(t => t.Status == HealthState.Unhealthy).Select(t => t.TaskId)));
                    }
                    else if (result.OverallHealth == HealthState.Degraded)
                    {
                        _logger.LogWarning(
                            "Workflow '{Workflow}' is degraded. Degraded tasks: {DegradedTasks}",
                            w.Metadata.Name,
                            string.Join(", ", result.Tasks.Where(t => t.Status == HealthState.Degraded).Select(t => t.TaskId)));
                    }
                    else
                    {
                        _logger.LogDebug("Workflow '{Workflow}' is healthy", w.Metadata.Name);
                    }

                    return result;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to check health for workflow '{Workflow}'", w.Metadata?.Name);
                    return null;
                }
            });

        var results = await Task.WhenAll(checkTasks);
        var completedChecks = results.Where(r => r != null).ToList();

        _logger.LogInformation(
            "Completed health check cycle. Results: {Healthy} healthy, {Degraded} degraded, {Unhealthy} unhealthy, {Unknown} unknown",
            completedChecks.Count(r => r!.OverallHealth == HealthState.Healthy),
            completedChecks.Count(r => r!.OverallHealth == HealthState.Degraded),
            completedChecks.Count(r => r!.OverallHealth == HealthState.Unhealthy),
            completedChecks.Count(r => r!.OverallHealth == HealthState.Unknown));
    }
}
