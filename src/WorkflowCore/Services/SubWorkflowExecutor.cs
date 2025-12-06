using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Executes sub-workflows with context isolation.
/// Stage 21.2: Sub-Workflow Execution
/// </summary>
public class SubWorkflowExecutor : ISubWorkflowExecutor
{
    private readonly IWorkflowOrchestrator _orchestrator;
    private readonly IWorkflowRefResolver _resolver;
    private readonly ITemplateResolver _templateResolver;

    public SubWorkflowExecutor(
        IWorkflowOrchestrator orchestrator,
        IWorkflowRefResolver resolver)
    {
        _orchestrator = orchestrator ?? throw new ArgumentNullException(nameof(orchestrator));
        _resolver = resolver ?? throw new ArgumentNullException(nameof(resolver));
        _templateResolver = new TemplateResolver();
    }

    /// <summary>
    /// Execute a sub-workflow with context isolation.
    /// </summary>
    public async Task<TaskExecutionResult> ExecuteAsync(
        WorkflowResource subWorkflow,
        Dictionary<string, WorkflowTaskResource> availableTasks,
        Dictionary<string, WorkflowResource> availableWorkflows,
        TemplateContext parentContext,
        Dictionary<string, string> inputMappings,
        string? timeout,
        CancellationToken cancellationToken = default)
    {
        ArgumentNullException.ThrowIfNull(subWorkflow);

        cancellationToken.ThrowIfCancellationRequested();

        var startedAt = DateTime.UtcNow;

        try
        {
            // Parse timeout and create combined cancellation token
            var timeoutSpan = TimeoutParser.Parse(timeout);
            using var timeoutCts = timeoutSpan.HasValue
                ? new CancellationTokenSource(timeoutSpan.Value)
                : new CancellationTokenSource();

            using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(
                cancellationToken,
                timeoutCts.Token);

            // Resolve input templates using parent context
            var resolvedInputs = await ResolveInputMappingsAsync(inputMappings, parentContext);

            // Execute sub-workflow with isolated context (don't pass parent TaskOutputs)
            // The orchestrator will create its own TaskOutputs for the sub-workflow
            WorkflowExecutionResult subWorkflowResult;
            try
            {
                subWorkflowResult = await _orchestrator.ExecuteAsync(
                    subWorkflow,
                    availableTasks,
                    resolvedInputs,
                    linkedCts.Token);
            }
            catch (OperationCanceledException) when (timeoutCts.Token.IsCancellationRequested && !cancellationToken.IsCancellationRequested)
            {
                // Timeout expired (not parent cancellation)
                var completedAt = DateTime.UtcNow;
                return new TaskExecutionResult
                {
                    Success = false,
                    Errors = new List<string> { $"Sub-workflow '{subWorkflow.Metadata.Name}' execution timeout after {timeout}" },
                    Output = new Dictionary<string, object>(),
                    StartedAt = startedAt,
                    CompletedAt = completedAt,
                    Duration = completedAt - startedAt
                };
            }

            var endedAt = DateTime.UtcNow;

            // Convert sub-workflow result to task result
            return new TaskExecutionResult
            {
                Success = subWorkflowResult.Success,
                Errors = subWorkflowResult.Errors ?? new List<string>(),
                Output = subWorkflowResult.Output ?? new Dictionary<string, object>(),
                StartedAt = startedAt,
                CompletedAt = endedAt,
                Duration = endedAt - startedAt
            };
        }
        catch (TemplateResolutionException ex)
        {
            var completedAt = DateTime.UtcNow;
            return new TaskExecutionResult
            {
                Success = false,
                Errors = new List<string> { $"Failed to resolve input template: {ex.Message}" },
                Output = new Dictionary<string, object>(),
                StartedAt = startedAt,
                CompletedAt = completedAt,
                Duration = completedAt - startedAt
            };
        }
    }

    private async Task<Dictionary<string, object>> ResolveInputMappingsAsync(
        Dictionary<string, string> inputMappings,
        TemplateContext parentContext)
    {
        var resolved = new Dictionary<string, object>();

        foreach (var (key, template) in inputMappings)
        {
            var resolvedValue = await _templateResolver.ResolveAsync(template, parentContext);
            resolved[key] = resolvedValue;
        }

        return resolved;
    }
}
