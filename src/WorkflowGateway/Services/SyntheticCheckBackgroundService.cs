using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using WorkflowCore.Models;
using WorkflowCore.Services;

namespace WorkflowGateway.Services;

/// <summary>
/// Background service that periodically refreshes health checks for all workflows.
/// Uses IServiceScopeFactory to resolve scoped services (ISyntheticCheckService depends on IExecutionRepository).
/// </summary>
public class SyntheticCheckBackgroundService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly SyntheticCheckOptions _options;
    private readonly ILogger<SyntheticCheckBackgroundService> _logger;

    private static readonly TimeSpan InitialDelay = TimeSpan.FromSeconds(30);

    public SyntheticCheckBackgroundService(
        IServiceScopeFactory scopeFactory,
        IOptions<SyntheticCheckOptions> options,
        ILogger<SyntheticCheckBackgroundService> logger)
    {
        _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
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

        // Create a scope to resolve scoped services
        using var scope = _scopeFactory.CreateScope();
        var discoveryService = scope.ServiceProvider.GetRequiredService<IWorkflowDiscoveryService>();
        var checkService = scope.ServiceProvider.GetRequiredService<ISyntheticCheckService>();

        // Get all known workflows
        var workflows = await discoveryService.DiscoverWorkflowsAsync();

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
                    var result = await checkService.CheckWorkflowHealthAsync(w.Metadata!.Name, ct);

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
