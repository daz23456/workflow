using System.Diagnostics;
using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

public interface IWorkflowOrchestrator
{
    Task<WorkflowExecutionResult> ExecuteAsync(
        WorkflowResource workflow,
        Dictionary<string, WorkflowTaskResource> availableTasks,
        Dictionary<string, object> inputs,
        CancellationToken cancellationToken = default);
}

public class WorkflowOrchestrator : IWorkflowOrchestrator
{
    private readonly IExecutionGraphBuilder _graphBuilder;
    private readonly IHttpTaskExecutor _httpTaskExecutor;
    private readonly ITransformTaskExecutor? _transformTaskExecutor;
    private readonly ITemplateResolver _templateResolver;
    private readonly SemaphoreSlim _semaphore;

    public WorkflowOrchestrator(
        IExecutionGraphBuilder graphBuilder,
        IHttpTaskExecutor httpTaskExecutor,
        ITemplateResolver templateResolver,
        int maxConcurrentTasks = int.MaxValue,
        ITransformTaskExecutor? transformTaskExecutor = null)
    {
        _graphBuilder = graphBuilder ?? throw new ArgumentNullException(nameof(graphBuilder));
        _httpTaskExecutor = httpTaskExecutor ?? throw new ArgumentNullException(nameof(httpTaskExecutor));
        _templateResolver = templateResolver ?? throw new ArgumentNullException(nameof(templateResolver));
        _transformTaskExecutor = transformTaskExecutor;

        if (maxConcurrentTasks <= 0)
        {
            throw new ArgumentException("maxConcurrentTasks must be greater than 0", nameof(maxConcurrentTasks));
        }

        _semaphore = new SemaphoreSlim(maxConcurrentTasks, maxConcurrentTasks);
    }

    public async Task<WorkflowExecutionResult> ExecuteAsync(
        WorkflowResource workflow,
        Dictionary<string, WorkflowTaskResource> availableTasks,
        Dictionary<string, object> inputs,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        var taskResults = new Dictionary<string, TaskExecutionResult>();
        var errors = new List<string>();

        try
        {
            // Build execution graph
            var graphResult = _graphBuilder.Build(workflow);
            if (!graphResult.IsValid)
            {
                return new WorkflowExecutionResult
                {
                    Success = false,
                    Errors = graphResult.Errors.Select(e => e.Message).ToList(),
                    TotalDuration = stopwatch.Elapsed
                };
            }

            if (graphResult.Graph == null)
            {
                return new WorkflowExecutionResult
                {
                    Success = false,
                    Errors = new List<string> { "Execution graph is null" },
                    TotalDuration = stopwatch.Elapsed
                };
            }

            // Handle empty workflow
            if (workflow.Spec.Tasks.Count == 0)
            {
                return new WorkflowExecutionResult
                {
                    Success = true,
                    Output = new Dictionary<string, object>(),
                    TotalDuration = stopwatch.Elapsed
                };
            }

            // Initialize template context
            var context = new TemplateContext
            {
                Input = inputs
            };

            // Track completed and failed tasks
            var completedTasks = new HashSet<string>();
            var failedTasks = new HashSet<string>();
            var remainingTasks = workflow.Spec.Tasks.Select(t => t.Id).ToHashSet();

            // Execute tasks in parallel levels based on dependencies
            while (remainingTasks.Count > 0)
            {
                cancellationToken.ThrowIfCancellationRequested();

                // Find tasks ready to execute (all dependencies satisfied)
                var readyTasks = remainingTasks
                    .Where(taskId =>
                    {
                        var dependencies = graphResult.Graph.GetDependencies(taskId);
                        return dependencies.All(dep => completedTasks.Contains(dep));
                    })
                    .ToList();

                if (readyTasks.Count == 0)
                {
                    // No tasks ready but tasks remaining = dependency failed or circular dependency
                    // Mark remaining tasks as skipped
                    foreach (var taskId in remainingTasks)
                    {
                        taskResults[taskId] = new TaskExecutionResult
                        {
                            Success = false,
                            Errors = new List<string> { "Task skipped due to failed dependency" }
                        };
                        errors.Add($"Task '{taskId}' skipped due to failed dependency");
                    }
                    break;
                }

                // Execute ready tasks in parallel
                var tasks = readyTasks.Select(async taskId =>
                {
                    var taskStep = workflow.Spec.Tasks.First(t => t.Id == taskId);

                    // Check if any dependencies failed
                    var dependencies = graphResult.Graph.GetDependencies(taskId);
                    var hasFailedDependency = dependencies.Any(dep => failedTasks.Contains(dep));

                    if (hasFailedDependency)
                    {
                        return (taskId, new TaskExecutionResult
                        {
                            Success = false,
                            Errors = new List<string> { "Task skipped due to failed dependency" }
                        });
                    }

                    // Get task spec
                    if (!availableTasks.ContainsKey(taskStep.TaskRef))
                    {
                        var errorMessage = $"Task reference '{taskStep.TaskRef}' not found";
                        return (taskId, new TaskExecutionResult
                        {
                            Success = false,
                            Errors = new List<string> { errorMessage }
                        });
                    }

                    var taskSpec = availableTasks[taskStep.TaskRef].Spec;

                    // Execute task with concurrency control
                    await _semaphore.WaitAsync(cancellationToken);
                    try
                    {
                        TaskExecutionResult taskResult;

                        // Route based on task type
                        if (taskSpec.Type == "transform")
                        {
                            if (_transformTaskExecutor == null)
                            {
                                taskResult = new TaskExecutionResult
                                {
                                    Success = false,
                                    Errors = new List<string> { "Transform task executor not available" }
                                };
                            }
                            else
                            {
                                // For transform tasks, resolve the task input templates first
                                var resolvedInput = new Dictionary<string, object>();
                                if (taskStep.Input != null)
                                {
                                    foreach (var (key, value) in taskStep.Input)
                                    {
                                        try
                                        {
                                            var resolvedValue = await _templateResolver.ResolveAsync(value, context);

                                            // If the resolved value is a JSON string, deserialize it back to an object
                                            // This is needed because template resolution serializes objects to JSON
                                            if (resolvedValue.StartsWith("{") || resolvedValue.StartsWith("["))
                                            {
                                                try
                                                {
                                                    var deserialized = JsonSerializer.Deserialize<object>(resolvedValue);
                                                    resolvedInput[key] = deserialized ?? resolvedValue;
                                                }
                                                catch
                                                {
                                                    // If deserialization fails, use the string as-is
                                                    resolvedInput[key] = resolvedValue;
                                                }
                                            }
                                            else
                                            {
                                                resolvedInput[key] = resolvedValue;
                                            }
                                        }
                                        catch (Exception ex)
                                        {
                                            taskResult = new TaskExecutionResult
                                            {
                                                Success = false,
                                                Errors = new List<string> { $"Failed to resolve input '{key}': {ex.Message}" }
                                            };
                                            return (taskId, taskResult);
                                        }
                                    }
                                }

                                // Pass the resolved input to the transform executor
                                taskResult = await _transformTaskExecutor.ExecuteAsync(taskSpec, resolvedInput, cancellationToken);
                            }
                        }
                        else
                        {
                            // Default to HTTP task executor for other types
                            taskResult = await _httpTaskExecutor.ExecuteAsync(taskSpec, context, cancellationToken);
                        }

                        return (taskId, taskResult);
                    }
                    finally
                    {
                        _semaphore.Release();
                    }
                }).ToList();

                // Wait for all parallel tasks to complete
                var results = await Task.WhenAll(tasks);

                // Process results
                foreach (var (taskId, taskResult) in results)
                {
                    taskResults[taskId] = taskResult;

                    if (!taskResult.Success)
                    {
                        failedTasks.Add(taskId);
                        errors.Add($"Task '{taskId}' failed: {string.Join(", ", taskResult.Errors)}");
                    }
                    else
                    {
                        completedTasks.Add(taskId);
                        if (taskResult.Output != null)
                        {
                            // Add task output to context for downstream tasks (thread-safe)
                            context.TaskOutputs[taskId] = taskResult.Output;
                        }
                    }

                    remainingTasks.Remove(taskId);
                }
            }

            // Build workflow output based on output mapping
            var workflowOutput = new Dictionary<string, object>();
            if (workflow.Spec.Output != null && workflow.Spec.Output.Count > 0)
            {
                foreach (var outputMapping in workflow.Spec.Output)
                {
                    try
                    {
                        // Use TemplateResolver to handle mixed text and nested paths
                        var resolvedValue = await _templateResolver.ResolveAsync(outputMapping.Value, context);
                        workflowOutput[outputMapping.Key] = resolvedValue;
                    }
                    catch (Exception ex)
                    {
                        errors.Add($"Failed to resolve output '{outputMapping.Key}': {ex.Message}");
                    }
                }
            }

            stopwatch.Stop();

            return new WorkflowExecutionResult
            {
                Success = errors.Count == 0,
                Output = workflowOutput,
                TaskResults = taskResults,
                Errors = errors,
                TotalDuration = stopwatch.Elapsed
            };
        }
        catch (OperationCanceledException)
        {
            stopwatch.Stop();
            return new WorkflowExecutionResult
            {
                Success = false,
                TaskResults = taskResults,
                Errors = new List<string> { "Workflow execution was cancelled" },
                TotalDuration = stopwatch.Elapsed
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            return new WorkflowExecutionResult
            {
                Success = false,
                TaskResults = taskResults,
                Errors = new List<string> { $"Workflow execution failed: {ex.Message}" },
                TotalDuration = stopwatch.Elapsed
            };
        }
    }

}
