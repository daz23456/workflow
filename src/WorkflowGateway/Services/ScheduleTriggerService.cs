using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using WorkflowCore.Models;
using WorkflowCore.Services;

namespace WorkflowGateway.Services;

/// <summary>
/// Background service that polls for workflows with schedule triggers and executes them when due.
/// Follows the same pattern as WorkflowWatcherService.
/// </summary>
public class ScheduleTriggerService : BackgroundService
{
    private readonly IWorkflowDiscoveryService _discoveryService;
    private readonly ICronParser _cronParser;
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ScheduleTriggerService> _logger;
    private readonly TimeSpan _pollingInterval;

    // Track last execution time for each workflow+trigger combination
    private readonly Dictionary<string, DateTime> _lastExecutionTimes = new();

    public ScheduleTriggerService(
        IWorkflowDiscoveryService discoveryService,
        ICronParser cronParser,
        IServiceProvider serviceProvider,
        ILogger<ScheduleTriggerService> logger,
        int pollingIntervalSeconds = 10)
    {
        _discoveryService = discoveryService ?? throw new ArgumentNullException(nameof(discoveryService));
        _cronParser = cronParser ?? throw new ArgumentNullException(nameof(cronParser));
        _serviceProvider = serviceProvider ?? throw new ArgumentNullException(nameof(serviceProvider));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _pollingInterval = TimeSpan.FromSeconds(pollingIntervalSeconds);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("ScheduleTriggerService started. Polling interval: {Interval} seconds", _pollingInterval.TotalSeconds);

        // Initial check with error handling
        try
        {
            await CheckAndExecuteDueSchedulesAsync(stoppingToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred during initial schedule check");
            // Continue to polling loop even if initial check fails
        }

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(_pollingInterval, stoppingToken);
                await CheckAndExecuteDueSchedulesAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                _logger.LogInformation("ScheduleTriggerService is stopping");
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred while checking schedules");
                // Continue polling even if there's an error
            }
        }

        _logger.LogInformation("ScheduleTriggerService stopped");
    }

    private async Task CheckAndExecuteDueSchedulesAsync(CancellationToken cancellationToken)
    {
        try
        {
            // Discover all workflows
            var workflows = await _discoveryService.DiscoverWorkflowsAsync(null);
            var now = DateTime.UtcNow;

            foreach (var workflow in workflows)
            {
                if (workflow.Spec?.Triggers == null || !workflow.Spec.Triggers.Any())
                {
                    continue;
                }

                var workflowName = workflow.Metadata?.Name ?? "unknown";

                foreach (var trigger in workflow.Spec.Triggers)
                {
                    // Only process schedule triggers
                    if (trigger.Type != "schedule" || trigger is not ScheduleTriggerSpec scheduleTrigger)
                    {
                        continue;
                    }

                    // Skip disabled triggers
                    if (!trigger.Enabled)
                    {
                        _logger.LogDebug("Skipping disabled trigger for workflow: {WorkflowName}", workflowName);
                        continue;
                    }

                    // Validate cron expression
                    if (!_cronParser.IsValid(scheduleTrigger.Cron))
                    {
                        _logger.LogWarning("Invalid cron expression '{Cron}' for workflow: {WorkflowName}",
                            scheduleTrigger.Cron, workflowName);
                        continue;
                    }

                    // Build unique key for this workflow+trigger combination
                    var triggerId = scheduleTrigger.Id ?? "default";
                    var triggerKey = $"{workflowName}:{triggerId}";

                    // Get last execution time for this trigger
                    _lastExecutionTimes.TryGetValue(triggerKey, out var lastRun);
                    DateTime? lastRunNullable = lastRun == default ? null : lastRun;

                    // Check if schedule is due
                    if (_cronParser.IsDue(scheduleTrigger.Cron, lastRunNullable, now))
                    {
                        _logger.LogInformation("Schedule trigger due for workflow: {WorkflowName}, Trigger: {TriggerId}",
                            workflowName, triggerId);

                        try
                        {
                            await ExecuteWorkflowAsync(workflow, scheduleTrigger, cancellationToken);

                            // Update last execution time
                            _lastExecutionTimes[triggerKey] = now;

                            _logger.LogInformation("Successfully executed scheduled workflow: {WorkflowName}", workflowName);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Failed to execute scheduled workflow: {WorkflowName}", workflowName);
                            // Continue with other workflows even if one fails
                        }
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to check due schedules");
            // Re-throw to be caught by ExecuteAsync error handling
            throw;
        }
    }

    private async Task ExecuteWorkflowAsync(
        WorkflowResource workflow,
        ScheduleTriggerSpec trigger,
        CancellationToken cancellationToken)
    {
        // Get execution service from scoped container
        using var scope = _serviceProvider.CreateScope();
        var executionService = scope.ServiceProvider.GetRequiredService<IWorkflowExecutionService>();

        // Prepare input from trigger configuration
        var input = trigger.Input != null
            ? new Dictionary<string, object>(trigger.Input)
            : new Dictionary<string, object>();

        // Execute the workflow
        await executionService.ExecuteAsync(workflow, input, cancellationToken);
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("ScheduleTriggerService is stopping gracefully");
        await base.StopAsync(cancellationToken);
    }
}
