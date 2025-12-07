using System.Diagnostics;
using System.Net.Http.Headers;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Service for performing synthetic health checks on workflow endpoints.
/// Replays GET requests from previous successful executions to verify services are available.
/// </summary>
public class SyntheticCheckService : ISyntheticCheckService
{
    private readonly IExecutionRepository _executionRepository;
    private readonly HttpClient _httpClient;
    private readonly IMemoryCache _cache;
    private readonly SyntheticCheckOptions _options;
    private const string CacheKeyPrefix = "health:";
    private const string AllStatusesKey = "health:all";

    public SyntheticCheckService(
        IExecutionRepository executionRepository,
        HttpClient httpClient,
        IMemoryCache cache,
        IOptions<SyntheticCheckOptions> options)
    {
        _executionRepository = executionRepository ?? throw new ArgumentNullException(nameof(executionRepository));
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _cache = cache ?? throw new ArgumentNullException(nameof(cache));
        _options = options?.Value ?? throw new ArgumentNullException(nameof(options));
    }

    /// <inheritdoc />
    public async Task<WorkflowHealthStatus> CheckWorkflowHealthAsync(
        string workflowName, CancellationToken ct = default)
    {
        var overallStopwatch = Stopwatch.StartNew();

        // Get last successful execution
        var executions = await _executionRepository.ListExecutionsAsync(
            workflowName,
            ExecutionStatus.Succeeded,
            skip: 0,
            take: 1);

        if (executions.Count == 0)
        {
            var unknownStatus = new WorkflowHealthStatus
            {
                WorkflowName = workflowName,
                OverallHealth = HealthState.Unknown,
                Tasks = new List<TaskHealthStatus>(),
                CheckedAt = DateTime.UtcNow,
                DurationMs = overallStopwatch.ElapsedMilliseconds
            };
            CacheResult(workflowName, unknownStatus);
            return unknownStatus;
        }

        var execution = executions[0];

        // Filter to GET requests with resolved URLs (if configured)
        var tasksToCheck = execution.TaskExecutionRecords
            .Where(t => !string.IsNullOrEmpty(t.ResolvedUrl))
            .Where(t => !_options.OnlyCheckGetRequests ||
                        string.Equals(t.HttpMethod, "GET", StringComparison.OrdinalIgnoreCase))
            .ToList();

        if (tasksToCheck.Count == 0)
        {
            var healthyStatus = new WorkflowHealthStatus
            {
                WorkflowName = workflowName,
                OverallHealth = HealthState.Healthy,
                Tasks = new List<TaskHealthStatus>(),
                CheckedAt = DateTime.UtcNow,
                DurationMs = overallStopwatch.ElapsedMilliseconds
            };
            CacheResult(workflowName, healthyStatus);
            return healthyStatus;
        }

        // Check each endpoint in parallel
        var checkTasks = tasksToCheck.Select(t => CheckEndpointAsync(t, ct));
        var results = await Task.WhenAll(checkTasks);

        overallStopwatch.Stop();

        var status = new WorkflowHealthStatus
        {
            WorkflowName = workflowName,
            Tasks = results.ToList(),
            OverallHealth = DetermineOverallHealth(results),
            CheckedAt = DateTime.UtcNow,
            DurationMs = overallStopwatch.ElapsedMilliseconds
        };

        CacheResult(workflowName, status);
        return status;
    }

    /// <inheritdoc />
    public Task<WorkflowHealthStatus?> GetCachedHealthStatusAsync(string workflowName)
    {
        var key = CacheKeyPrefix + workflowName;
        _cache.TryGetValue(key, out WorkflowHealthStatus? status);
        return Task.FromResult(status);
    }

    /// <inheritdoc />
    public Task<IReadOnlyList<WorkflowHealthStatus>> GetAllHealthStatusesAsync()
    {
        if (_cache.TryGetValue(AllStatusesKey, out HashSet<string>? workflowNames) && workflowNames != null)
        {
            var statuses = new List<WorkflowHealthStatus>();
            foreach (var name in workflowNames)
            {
                if (_cache.TryGetValue(CacheKeyPrefix + name, out WorkflowHealthStatus? status) && status != null)
                {
                    statuses.Add(status);
                }
            }
            return Task.FromResult<IReadOnlyList<WorkflowHealthStatus>>(statuses);
        }

        return Task.FromResult<IReadOnlyList<WorkflowHealthStatus>>(new List<WorkflowHealthStatus>());
    }

    /// <inheritdoc />
    public async Task RefreshAllHealthChecksAsync(CancellationToken ct = default)
    {
        if (_cache.TryGetValue(AllStatusesKey, out HashSet<string>? workflowNames) && workflowNames != null)
        {
            var refreshTasks = workflowNames.Select(name => CheckWorkflowHealthAsync(name, ct));
            await Task.WhenAll(refreshTasks);
        }
    }

    private async Task<TaskHealthStatus> CheckEndpointAsync(TaskExecutionRecord task, CancellationToken ct)
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, task.ResolvedUrl);

            // Add authorization header if configured
            if (!string.IsNullOrEmpty(_options.ServiceAccountToken))
            {
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ServiceAccountToken);
            }

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(_options.TimeoutSeconds));

            var response = await _httpClient.SendAsync(request, cts.Token);

            stopwatch.Stop();

            return new TaskHealthStatus
            {
                TaskId = task.TaskId ?? string.Empty,
                TaskRef = task.TaskRef ?? string.Empty,
                Url = task.ResolvedUrl,
                Reachable = true,
                StatusCode = (int)response.StatusCode,
                Status = response.IsSuccessStatusCode ? HealthState.Healthy : HealthState.Degraded,
                LatencyMs = stopwatch.ElapsedMilliseconds
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();

            return new TaskHealthStatus
            {
                TaskId = task.TaskId ?? string.Empty,
                TaskRef = task.TaskRef ?? string.Empty,
                Url = task.ResolvedUrl,
                Reachable = false,
                Status = HealthState.Unhealthy,
                ErrorMessage = ex.Message,
                LatencyMs = stopwatch.ElapsedMilliseconds
            };
        }
    }

    private static HealthState DetermineOverallHealth(IEnumerable<TaskHealthStatus> tasks)
    {
        var taskList = tasks.ToList();

        if (taskList.Count == 0)
            return HealthState.Healthy;

        if (taskList.Any(t => t.Status == HealthState.Unhealthy))
            return HealthState.Unhealthy;

        if (taskList.Any(t => t.Status == HealthState.Degraded))
            return HealthState.Degraded;

        return HealthState.Healthy;
    }

    private void CacheResult(string workflowName, WorkflowHealthStatus status)
    {
        var key = CacheKeyPrefix + workflowName;
        var cacheOptions = new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromSeconds(_options.CacheTTLSeconds)
        };

        _cache.Set(key, status, cacheOptions);

        // Track all workflow names for GetAllHealthStatusesAsync
        var allNames = _cache.GetOrCreate(AllStatusesKey, entry =>
        {
            entry.Priority = CacheItemPriority.NeverRemove;
            return new HashSet<string>();
        })!;

        allNames.Add(workflowName);
    }
}
