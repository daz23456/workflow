using Microsoft.Extensions.Options;
using WorkflowCore.Services;

namespace WorkflowGateway.Services;

/// <summary>
/// Configuration options for the baseline refresh service.
/// </summary>
public class BaselineRefreshOptions
{
    /// <summary>
    /// How often to refresh all baselines. Default: 1 hour.
    /// </summary>
    public TimeSpan RefreshInterval { get; set; } = TimeSpan.FromHours(1);

    /// <summary>
    /// Whether baseline refresh is enabled. Default: true.
    /// </summary>
    public bool Enabled { get; set; } = true;
}

/// <summary>
/// Background service that periodically refreshes anomaly baselines for all workflows.
/// Follows the same pattern as ScheduleTriggerService.
/// </summary>
public class BaselineRefreshService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<BaselineRefreshService> _logger;
    private readonly BaselineRefreshOptions _options;

    public BaselineRefreshService(
        IServiceScopeFactory scopeFactory,
        ILogger<BaselineRefreshService> logger,
        IOptions<BaselineRefreshOptions> options)
    {
        _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _options = options?.Value ?? new BaselineRefreshOptions();
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!_options.Enabled)
        {
            _logger.LogInformation("Baseline refresh service is disabled");
            return;
        }

        _logger.LogInformation("Baseline refresh service started with interval {Interval}", _options.RefreshInterval);

        // Initial delay to allow system to stabilize
        await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RefreshBaselinesAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                // Expected during shutdown
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during baseline refresh cycle");
            }

            try
            {
                await Task.Delay(_options.RefreshInterval, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }

        _logger.LogInformation("Baseline refresh service stopped");
    }

    private async Task RefreshBaselinesAsync(CancellationToken ct)
    {
        using var scope = _scopeFactory.CreateScope();
        var baselineService = scope.ServiceProvider.GetRequiredService<IAnomalyBaselineService>();

        _logger.LogDebug("Starting baseline refresh cycle");
        var startTime = DateTime.UtcNow;

        await baselineService.RefreshAllBaselinesAsync(ct);

        var elapsed = DateTime.UtcNow - startTime;
        _logger.LogDebug("Baseline refresh cycle completed in {ElapsedMs}ms", elapsed.TotalMilliseconds);
    }
}
