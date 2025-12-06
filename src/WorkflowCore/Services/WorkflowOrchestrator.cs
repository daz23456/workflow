using System.Diagnostics;
using System.Text.Json;
using WorkflowCore.Interfaces;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

public interface IWorkflowOrchestrator
{
    Task<WorkflowExecutionResult> ExecuteAsync(
        WorkflowResource workflow,
        Dictionary<string, WorkflowTaskResource> availableTasks,
        Dictionary<string, object> inputs,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Execute a workflow with sub-workflow support (Stage 21.2).
    /// </summary>
    Task<WorkflowExecutionResult> ExecuteAsync(
        WorkflowResource workflow,
        Dictionary<string, WorkflowTaskResource> availableTasks,
        Dictionary<string, WorkflowResource> availableWorkflows,
        Dictionary<string, object> inputs,
        CancellationToken cancellationToken = default);
}

public class WorkflowOrchestrator : IWorkflowOrchestrator
{
    private readonly IExecutionGraphBuilder _graphBuilder;
    private readonly IHttpTaskExecutor _httpTaskExecutor;
    private readonly ITransformTaskExecutor? _transformTaskExecutor;
    private readonly ITemplateResolver _templateResolver;
    private readonly IWorkflowEventNotifier? _eventNotifier;
    private readonly IResponseStorage _responseStorage;
    private readonly IConditionEvaluator? _conditionEvaluator;
    private readonly ISwitchEvaluator? _switchEvaluator;
    private readonly IForEachExecutor? _forEachExecutor;
    private readonly ISubWorkflowExecutor? _subWorkflowExecutor;
    private readonly IWorkflowRefResolver? _workflowRefResolver;
    private readonly ICircuitBreakerRegistry? _circuitBreakerRegistry;
    private readonly SemaphoreSlim _semaphore;

    public WorkflowOrchestrator(
        IExecutionGraphBuilder graphBuilder,
        IHttpTaskExecutor httpTaskExecutor,
        ITemplateResolver templateResolver,
        IResponseStorage responseStorage,
        int maxConcurrentTasks = int.MaxValue,
        ITransformTaskExecutor? transformTaskExecutor = null,
        IWorkflowEventNotifier? eventNotifier = null,
        IConditionEvaluator? conditionEvaluator = null,
        ISwitchEvaluator? switchEvaluator = null,
        IForEachExecutor? forEachExecutor = null,
        ISubWorkflowExecutor? subWorkflowExecutor = null,
        IWorkflowRefResolver? workflowRefResolver = null,
        ICircuitBreakerRegistry? circuitBreakerRegistry = null)
    {
        _graphBuilder = graphBuilder ?? throw new ArgumentNullException(nameof(graphBuilder));
        _httpTaskExecutor = httpTaskExecutor ?? throw new ArgumentNullException(nameof(httpTaskExecutor));
        _templateResolver = templateResolver ?? throw new ArgumentNullException(nameof(templateResolver));
        _responseStorage = responseStorage ?? throw new ArgumentNullException(nameof(responseStorage));
        _transformTaskExecutor = transformTaskExecutor;
        _eventNotifier = eventNotifier;
        _conditionEvaluator = conditionEvaluator;
        _switchEvaluator = switchEvaluator;
        _forEachExecutor = forEachExecutor;
        _subWorkflowExecutor = subWorkflowExecutor;
        _workflowRefResolver = workflowRefResolver;
        _circuitBreakerRegistry = circuitBreakerRegistry;

        if (maxConcurrentTasks <= 0)
        {
            throw new ArgumentException("maxConcurrentTasks must be greater than 0", nameof(maxConcurrentTasks));
        }

        _semaphore = new SemaphoreSlim(maxConcurrentTasks, maxConcurrentTasks);
    }

    public Task<WorkflowExecutionResult> ExecuteAsync(
        WorkflowResource workflow,
        Dictionary<string, WorkflowTaskResource> availableTasks,
        Dictionary<string, object> inputs,
        CancellationToken cancellationToken = default)
    {
        // Delegate to the new overload with empty availableWorkflows for backward compatibility
        return ExecuteAsync(workflow, availableTasks, new Dictionary<string, WorkflowResource>(), inputs, cancellationToken);
    }

    public async Task<WorkflowExecutionResult> ExecuteAsync(
        WorkflowResource workflow,
        Dictionary<string, WorkflowTaskResource> availableTasks,
        Dictionary<string, WorkflowResource> availableWorkflows,
        Dictionary<string, object> inputs,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        var executionStartedAt = DateTime.UtcNow;
        var taskResults = new Dictionary<string, TaskExecutionResult>();
        var errors = new List<string>();
        var executionId = Guid.NewGuid();
        var workflowName = workflow.Metadata?.Name ?? "unknown";

        // Orchestration cost tracking
        var iterationTimings = new List<IterationTiming>();
        var iterationCount = 0;
        DateTime? previousIterationEndTime = null;

        // Emit workflow started event
        if (_eventNotifier != null)
        {
            await _eventNotifier.OnWorkflowStartedAsync(executionId, workflowName, executionStartedAt);
        }

        try
        {
            // Build execution graph and time it
            var graphBuildStopwatch = Stopwatch.StartNew();
            var graphResult = _graphBuilder.Build(workflow);
            graphBuildStopwatch.Stop();
            var graphBuildDuration = graphBuildStopwatch.Elapsed;

            if (!graphResult.IsValid)
            {
                return new WorkflowExecutionResult
                {
                    Success = false,
                    Errors = graphResult.Errors.Select(e => e.Message).ToList(),
                    TotalDuration = stopwatch.Elapsed,
                    GraphBuildDuration = graphBuildDuration
                };
            }

            if (graphResult.Graph == null)
            {
                return new WorkflowExecutionResult
                {
                    Success = false,
                    Errors = new List<string> { "Execution graph is null" },
                    TotalDuration = stopwatch.Elapsed,
                    GraphBuildDuration = graphBuildDuration
                };
            }

            // Handle empty workflow
            if (workflow.Spec.Tasks.Count == 0)
            {
                return new WorkflowExecutionResult
                {
                    Success = true,
                    Output = new Dictionary<string, object>(),
                    TotalDuration = stopwatch.Elapsed,
                    GraphBuildDuration = graphBuildDuration
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

                // Track iteration start time
                iterationCount++;
                var iterationStartTime = DateTime.UtcNow;
                var schedulingDelay = previousIterationEndTime.HasValue
                    ? iterationStartTime - previousIterationEndTime.Value
                    : TimeSpan.Zero;

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
                    var skippedTime = DateTime.UtcNow;
                    foreach (var taskId in remainingTasks)
                    {
                        taskResults[taskId] = new TaskExecutionResult
                        {
                            Success = false,
                            Errors = new List<string> { "Task skipped due to failed dependency" },
                            StartedAt = skippedTime,
                            CompletedAt = skippedTime,
                            Duration = TimeSpan.Zero
                        };
                        errors.Add($"Task '{taskId}' skipped due to failed dependency");
                    }
                    break;
                }

                // Execute ready tasks in parallel
                var tasks = readyTasks.Select(async taskId =>
                {
                    var taskStep = workflow.Spec.Tasks.First(t => t.Id == taskId);
                    var taskStartTime = DateTime.UtcNow;

                    // Emit task started event
                    if (_eventNotifier != null)
                    {
                        await _eventNotifier.OnTaskStartedAsync(executionId, taskId, taskStep.TaskRef, taskStartTime);
                    }

                    // Check if any dependencies failed
                    var dependencies = graphResult.Graph.GetDependencies(taskId);
                    var hasFailedDependency = dependencies.Any(dep => failedTasks.Contains(dep));

                    if (hasFailedDependency)
                    {
                        var skippedTime = DateTime.UtcNow;
                        return (taskId, new TaskExecutionResult
                        {
                            Success = false,
                            Errors = new List<string> { "Task skipped due to failed dependency" },
                            StartedAt = skippedTime,
                            CompletedAt = skippedTime
                        });
                    }

                    // Evaluate condition if present
                    if (taskStep.Condition?.If != null && _conditionEvaluator != null)
                    {
                        var conditionResult = await _conditionEvaluator.EvaluateAsync(taskStep.Condition.If, context);

                        if (conditionResult.Error != null)
                        {
                            // Condition evaluation failed - treat as task failure
                            var errorTime = DateTime.UtcNow;
                            return (taskId, new TaskExecutionResult
                            {
                                Success = false,
                                Errors = new List<string> { $"Condition evaluation failed: {conditionResult.Error}" },
                                StartedAt = errorTime,
                                CompletedAt = errorTime
                            });
                        }

                        if (!conditionResult.ShouldExecute)
                        {
                            // Condition evaluated to false - skip task
                            var skippedTime = DateTime.UtcNow;
                            return (taskId, new TaskExecutionResult
                            {
                                Success = true,
                                WasSkipped = true,
                                SkipReason = $"Condition '{conditionResult.EvaluatedExpression}' evaluated to false",
                                StartedAt = skippedTime,
                                CompletedAt = skippedTime,
                                Duration = TimeSpan.Zero
                            });
                        }
                    }

                    // Evaluate switch if present to determine taskRef
                    var effectiveTaskRef = taskStep.TaskRef;
                    if (taskStep.Switch != null && _switchEvaluator != null)
                    {
                        var switchResult = await _switchEvaluator.EvaluateAsync(taskStep.Switch, context);

                        if (switchResult.Error != null)
                        {
                            // Switch evaluation failed
                            var errorTime = DateTime.UtcNow;
                            return (taskId, new TaskExecutionResult
                            {
                                Success = false,
                                Errors = new List<string> { $"Switch evaluation failed: {switchResult.Error}" },
                                StartedAt = errorTime,
                                CompletedAt = errorTime
                            });
                        }

                        if (!switchResult.Matched)
                        {
                            // No match found and no default
                            var errorTime = DateTime.UtcNow;
                            return (taskId, new TaskExecutionResult
                            {
                                Success = false,
                                Errors = new List<string> { switchResult.Error ?? "Switch did not match any case" },
                                StartedAt = errorTime,
                                CompletedAt = errorTime
                            });
                        }

                        // Use the matched taskRef
                        effectiveTaskRef = switchResult.TaskRef!;
                    }

                    // Get task spec
                    if (!availableTasks.ContainsKey(effectiveTaskRef))
                    {
                        var errorTime = DateTime.UtcNow;
                        var errorMessage = $"Task reference '{effectiveTaskRef}' not found";
                        return (taskId, new TaskExecutionResult
                        {
                            Success = false,
                            Errors = new List<string> { errorMessage },
                            StartedAt = errorTime,
                            CompletedAt = errorTime
                        });
                    }

                    var taskSpec = availableTasks[effectiveTaskRef].Spec;

                    // Circuit breaker check - Stage 28.1
                    ICircuitBreaker? circuitBreaker = null;
                    CircuitState? circuitState = null;
                    if (taskStep.CircuitBreaker != null && _circuitBreakerRegistry != null)
                    {
                        var options = CircuitBreakerOptionsParser.ConvertToOptions(taskStep.CircuitBreaker);
                        circuitBreaker = _circuitBreakerRegistry.GetOrCreate(effectiveTaskRef, options);
                        circuitState = circuitBreaker.GetState().State;

                        if (!circuitBreaker.CanExecute())
                        {
                            // Circuit is open - check for fallback
                            if (taskStep.Fallback != null && !string.IsNullOrEmpty(taskStep.Fallback.TaskRef))
                            {
                                // Execute fallback task
                                if (availableTasks.TryGetValue(taskStep.Fallback.TaskRef, out var fallbackTaskResource))
                                {
                                    var fallbackStartTime = DateTime.UtcNow;
                                    var fallbackSpec = fallbackTaskResource.Spec;

                                    // Execute fallback with HTTP task executor
                                    var fallbackContext = context;
                                    if (taskStep.Fallback.Input != null && taskStep.Fallback.Input.Count > 0)
                                    {
                                        var mergedInput = new Dictionary<string, object>(context.Input);
                                        foreach (var (key, value) in taskStep.Fallback.Input)
                                        {
                                            var resolvedValue = await _templateResolver.ResolveAsync(value, context);
                                            mergedInput[key] = resolvedValue;
                                        }
                                        fallbackContext = new TemplateContext
                                        {
                                            Input = mergedInput,
                                            TaskOutputs = context.TaskOutputs
                                        };
                                    }

                                    var fallbackResult = await _httpTaskExecutor.ExecuteAsync(fallbackSpec, fallbackContext, cancellationToken);
                                    var fallbackEndTime = DateTime.UtcNow;

                                    return (taskId, new TaskExecutionResult
                                    {
                                        Success = fallbackResult.Success,
                                        Output = fallbackResult.Output,
                                        Errors = fallbackResult.Errors,
                                        StartedAt = fallbackStartTime,
                                        CompletedAt = fallbackEndTime,
                                        Duration = fallbackEndTime - fallbackStartTime,
                                        CircuitState = CircuitState.Open,
                                        UsedFallback = true,
                                        FallbackTaskRef = taskStep.Fallback.TaskRef
                                    });
                                }
                            }

                            // No fallback - return circuit open error
                            var errorTime = DateTime.UtcNow;
                            return (taskId, new TaskExecutionResult
                            {
                                Success = false,
                                Errors = new List<string> { $"Circuit breaker open for task '{effectiveTaskRef}'" },
                                StartedAt = errorTime,
                                CompletedAt = errorTime,
                                CircuitState = CircuitState.Open,
                                ErrorInfo = new TaskErrorInfo
                                {
                                    ErrorType = TaskErrorType.CircuitBreakerOpen,
                                    ErrorMessage = $"Circuit breaker is open for task '{effectiveTaskRef}'. The service has experienced too many recent failures.",
                                    Suggestion = "Wait for the circuit breaker to transition to half-open state, or configure a fallback task."
                                }
                            });
                        }
                    }

                    // Execute task with concurrency control
                    await _semaphore.WaitAsync(cancellationToken);
                    try
                    {
                        // Capture actual start time AFTER semaphore acquired (when task actually starts)
                        var actualStartTime = DateTime.UtcNow;
                        TaskExecutionResult taskResult;

                        // Handle forEach iteration if present
                        if (taskStep.ForEach != null && _forEachExecutor != null)
                        {
                            var forEachResult = await _forEachExecutor.ExecuteAsync(
                                taskStep.ForEach,
                                context,
                                async (itemContext, item, index) =>
                                {
                                    // Resolve task inputs using the forEach context
                                    var taskContext = itemContext;
                                    if (taskStep.Input != null && taskStep.Input.Count > 0)
                                    {
                                        var mergedInput = new Dictionary<string, object>(itemContext.Input);
                                        foreach (var (key, value) in taskStep.Input)
                                        {
                                            try
                                            {
                                                var resolvedValue = await _templateResolver.ResolveAsync(value, itemContext);
                                                if (resolvedValue.StartsWith("{") || resolvedValue.StartsWith("["))
                                                {
                                                    try
                                                    {
                                                        var deserialized = JsonSerializer.Deserialize<object>(resolvedValue);
                                                        mergedInput[key] = deserialized ?? resolvedValue;
                                                    }
                                                    catch
                                                    {
                                                        mergedInput[key] = resolvedValue;
                                                    }
                                                }
                                                else
                                                {
                                                    mergedInput[key] = resolvedValue;
                                                }
                                            }
                                            catch (Exception ex)
                                            {
                                                return new TaskExecutionResult
                                                {
                                                    Success = false,
                                                    Errors = new List<string> { $"Failed to resolve input '{key}': {ex.Message}" }
                                                };
                                            }
                                        }

                                        taskContext = new TemplateContext
                                        {
                                            Input = mergedInput,
                                            TaskOutputs = itemContext.TaskOutputs,
                                            ForEach = itemContext.ForEach
                                        };
                                    }

                                    // Execute the HTTP task for this iteration
                                    return await _httpTaskExecutor.ExecuteAsync(taskSpec, taskContext, cancellationToken);
                                });

                            // Convert ForEachResult to TaskExecutionResult
                            taskResult = new TaskExecutionResult
                            {
                                Success = forEachResult.Success,
                                Output = new Dictionary<string, object>
                                {
                                    ["results"] = forEachResult.Outputs ?? new List<Dictionary<string, object>>(),
                                    ["itemCount"] = forEachResult.ItemCount,
                                    ["successCount"] = forEachResult.SuccessCount,
                                    ["failureCount"] = forEachResult.FailureCount
                                },
                                Errors = forEachResult.ItemResults?
                                    .Where(r => !r.Success && r.Error != null)
                                    .Select(r => $"Item {r.Index}: {r.Error}")
                                    .ToList() ?? new List<string>(),
                                StartedAt = actualStartTime,
                                CompletedAt = DateTime.UtcNow,
                                Duration = DateTime.UtcNow - actualStartTime
                            };

                            return (taskId, taskResult);
                        }

                        // Route based on task type
                        // First check for sub-workflow (workflowRef) - Stage 21.2
                        if (!string.IsNullOrEmpty(taskStep.WorkflowRef))
                        {
                            if (_subWorkflowExecutor == null || _workflowRefResolver == null)
                            {
                                var errorTime = DateTime.UtcNow;
                                taskResult = new TaskExecutionResult
                                {
                                    Success = false,
                                    Errors = new List<string> { "Sub-workflow executor not available" },
                                    StartedAt = actualStartTime,
                                    CompletedAt = errorTime
                                };
                            }
                            else
                            {
                                try
                                {
                                    // Resolve the workflowRef to a WorkflowResource
                                    var parentNamespace = workflow.Metadata?.Namespace ?? "default";
                                    var resolutionResult = _workflowRefResolver.Resolve(taskStep.WorkflowRef, availableWorkflows, parentNamespace);

                                    if (!resolutionResult.IsSuccess || resolutionResult.Workflow == null)
                                    {
                                        var resolveErrorTime = DateTime.UtcNow;
                                        taskResult = new TaskExecutionResult
                                        {
                                            Success = false,
                                            Errors = new List<string> { resolutionResult.Error ?? $"Failed to resolve workflowRef: {taskStep.WorkflowRef}" },
                                            StartedAt = actualStartTime,
                                            CompletedAt = resolveErrorTime
                                        };
                                    }
                                    else
                                    {
                                        // Execute the sub-workflow with input mappings
                                        taskResult = await _subWorkflowExecutor.ExecuteAsync(
                                            resolutionResult.Workflow,
                                            availableTasks,
                                            availableWorkflows,
                                            context,
                                            taskStep.Input ?? new Dictionary<string, string>(),
                                            taskStep.Timeout,
                                            null, // callStack
                                            cancellationToken);
                                    }
                                }
                                catch (Exception ex)
                                {
                                    var errorTime = DateTime.UtcNow;
                                    taskResult = new TaskExecutionResult
                                    {
                                        Success = false,
                                        Errors = new List<string> { $"Failed to execute sub-workflow: {ex.Message}" },
                                        StartedAt = actualStartTime,
                                        CompletedAt = errorTime
                                    };
                                }
                            }
                        }
                        else if (taskSpec.Type == "transform")
                        {
                            if (_transformTaskExecutor == null)
                            {
                                var errorTime = DateTime.UtcNow;
                                taskResult = new TaskExecutionResult
                                {
                                    Success = false,
                                    Errors = new List<string> { "Transform task executor not available" },
                                    StartedAt = actualStartTime,
                                    CompletedAt = errorTime
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
                                            var resolveErrorTime = DateTime.UtcNow;
                                            taskResult = new TaskExecutionResult
                                            {
                                                Success = false,
                                                Errors = new List<string> { $"Failed to resolve input '{key}': {ex.Message}" },
                                                StartedAt = actualStartTime,
                                                CompletedAt = resolveErrorTime
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
                            // First, resolve and merge task step inputs into the context
                            var taskContext = context;
                            if (taskStep.Input != null && taskStep.Input.Count > 0)
                            {
                                // Create a new input dictionary that merges workflow input with task step input
                                var mergedInput = new Dictionary<string, object>(context.Input);
                                foreach (var (key, value) in taskStep.Input)
                                {
                                    try
                                    {
                                        // Resolve templates in the input value (e.g., {{tasks.X.output.Y}})
                                        var resolvedValue = await _templateResolver.ResolveAsync(value, context);

                                        // If the resolved value is JSON, deserialize it
                                        if (resolvedValue.StartsWith("{") || resolvedValue.StartsWith("["))
                                        {
                                            try
                                            {
                                                var deserialized = JsonSerializer.Deserialize<object>(resolvedValue);
                                                mergedInput[key] = deserialized ?? resolvedValue;
                                            }
                                            catch
                                            {
                                                mergedInput[key] = resolvedValue;
                                            }
                                        }
                                        else
                                        {
                                            mergedInput[key] = resolvedValue;
                                        }
                                    }
                                    catch (Exception ex)
                                    {
                                        var resolveErrorTime = DateTime.UtcNow;
                                        taskResult = new TaskExecutionResult
                                        {
                                            Success = false,
                                            Errors = new List<string> { $"Failed to resolve input '{key}': {ex.Message}" },
                                            StartedAt = actualStartTime,
                                            CompletedAt = resolveErrorTime
                                        };
                                        return (taskId, taskResult);
                                    }
                                }

                                // Create a new context with merged inputs
                                taskContext = new TemplateContext
                                {
                                    Input = mergedInput,
                                    TaskOutputs = context.TaskOutputs
                                };
                            }

                            taskResult = await _httpTaskExecutor.ExecuteAsync(taskSpec, taskContext, cancellationToken);
                        }

                        // Capture actual completion time and set timestamps
                        var actualCompletionTime = DateTime.UtcNow;
                        taskResult.StartedAt = actualStartTime;
                        taskResult.CompletedAt = actualCompletionTime;
                        taskResult.Duration = actualCompletionTime - actualStartTime;

                        // Record result to circuit breaker - Stage 28.1
                        if (circuitBreaker != null)
                        {
                            if (taskResult.Success)
                            {
                                circuitBreaker.RecordSuccess();
                            }
                            else
                            {
                                circuitBreaker.RecordFailure();
                            }
                            taskResult.CircuitState = circuitBreaker.GetState().State;
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

                // Track iteration end time and record timing
                var iterationEndTime = DateTime.UtcNow;
                iterationTimings.Add(new IterationTiming
                {
                    Iteration = iterationCount,
                    StartedAt = iterationStartTime,
                    CompletedAt = iterationEndTime,
                    TaskIds = readyTasks,
                    SchedulingDelay = schedulingDelay
                });
                previousIterationEndTime = iterationEndTime;

                // Process results
                foreach (var (taskId, taskResult) in results)
                {
                    taskResults[taskId] = taskResult;

                    // Emit task completed event
                    if (_eventNotifier != null)
                    {
                        var taskStep = workflow.Spec.Tasks.First(t => t.Id == taskId);
                        var taskStatus = taskResult.WasSkipped ? "Skipped" :
                                        taskResult.Success ? "Succeeded" : "Failed";
                        var output = taskResult.Output ?? new Dictionary<string, object>();

                        await _eventNotifier.OnTaskCompletedAsync(
                            executionId,
                            taskId,
                            taskStep.TaskRef,
                            taskStatus,
                            output,
                            taskResult.Duration,
                            DateTime.UtcNow
                        );
                    }

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

                        // Emit signal flow events to dependent tasks for neural visualization
                        if (_eventNotifier != null && graphResult.Graph != null)
                        {
                            var dependentTasks = graphResult.Graph.GetDependentTasks(taskId);
                            foreach (var dependentTaskId in dependentTasks)
                            {
                                await _eventNotifier.OnSignalFlowAsync(
                                    executionId,
                                    taskId,
                                    dependentTaskId,
                                    DateTime.UtcNow
                                );
                            }
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
            var executionCompletedAt = DateTime.UtcNow;

            var success = errors.Count == 0;
            var status = success ? "Succeeded" : "Failed";

            // Emit workflow completed event
            if (_eventNotifier != null)
            {
                await _eventNotifier.OnWorkflowCompletedAsync(
                    executionId,
                    workflowName,
                    status,
                    workflowOutput,
                    stopwatch.Elapsed,
                    executionCompletedAt
                );
            }

            // Calculate orchestration cost metrics
            var orchestrationCost = CalculateOrchestrationCost(
                executionStartedAt,
                executionCompletedAt,
                taskResults,
                iterationTimings,
                stopwatch.Elapsed);

            return new WorkflowExecutionResult
            {
                Success = success,
                Output = workflowOutput,
                TaskResults = taskResults,
                Errors = errors,
                TotalDuration = stopwatch.Elapsed,
                GraphBuildDuration = graphBuildDuration,
                OrchestrationCost = orchestrationCost,
                GraphDiagnostics = graphResult.Diagnostics
            };
        }
        catch (OperationCanceledException)
        {
            stopwatch.Stop();

            // Emit workflow completed event for cancellation
            if (_eventNotifier != null)
            {
                await _eventNotifier.OnWorkflowCompletedAsync(
                    executionId,
                    workflowName,
                    "Cancelled",
                    new Dictionary<string, object>(),
                    stopwatch.Elapsed,
                    DateTime.UtcNow
                );
            }

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

            // Emit workflow completed event for failure
            if (_eventNotifier != null)
            {
                await _eventNotifier.OnWorkflowCompletedAsync(
                    executionId,
                    workflowName,
                    "Failed",
                    new Dictionary<string, object>(),
                    stopwatch.Elapsed,
                    DateTime.UtcNow
                );
            }

            return new WorkflowExecutionResult
            {
                Success = false,
                TaskResults = taskResults,
                Errors = new List<string> { $"Workflow execution failed: {ex.Message}" },
                TotalDuration = stopwatch.Elapsed
            };
        }
        finally
        {
            // Cleanup temporary files created during workflow execution
            foreach (var taskResult in taskResults.Values)
            {
                if (taskResult.Output != null && taskResult.Output.ContainsKey("file_path"))
                {
                    var filePath = taskResult.Output["file_path"]?.ToString();
                    _responseStorage.CleanupTempFile(filePath);
                }
            }
        }
    }

    /// <summary>
    /// Calculate orchestration cost metrics from task execution results
    /// </summary>
    private static OrchestrationCostMetrics CalculateOrchestrationCost(
        DateTime executionStartedAt,
        DateTime executionCompletedAt,
        Dictionary<string, TaskExecutionResult> taskResults,
        List<IterationTiming> iterationTimings,
        TimeSpan totalDuration)
    {
        if (taskResults.Count == 0)
        {
            return new OrchestrationCostMetrics
            {
                ExecutionStartedAt = executionStartedAt,
                ExecutionCompletedAt = executionCompletedAt,
                FirstTaskStartedAt = executionStartedAt,
                LastTaskCompletedAt = executionCompletedAt,
                ExecutionIterations = 0,
                IterationTimings = iterationTimings
            };
        }

        // Find first task start and last task completion
        var tasksWithTimestamps = taskResults.Values
            .Where(t => t.StartedAt != default)
            .ToList();

        var firstTaskStartedAt = tasksWithTimestamps.Any()
            ? tasksWithTimestamps.Min(t => t.StartedAt)
            : executionStartedAt;

        var lastTaskCompletedAt = tasksWithTimestamps.Any()
            ? tasksWithTimestamps.Max(t => t.CompletedAt)
            : executionCompletedAt;

        // Calculate total task execution time (wall-clock time from first start to last completion)
        var totalTaskExecutionTime = lastTaskCompletedAt - firstTaskStartedAt;

        // Calculate scheduling overhead (sum of delays between iterations)
        var schedulingOverhead = iterationTimings
            .Skip(1) // First iteration has no previous iteration
            .Aggregate(TimeSpan.Zero, (acc, iter) => acc + iter.SchedulingDelay);

        // Calculate orchestration cost percentage
        var totalMs = totalDuration.TotalMilliseconds;
        var setupMs = (firstTaskStartedAt - executionStartedAt).TotalMilliseconds;
        var teardownMs = (executionCompletedAt - lastTaskCompletedAt).TotalMilliseconds;
        var schedulingMs = schedulingOverhead.TotalMilliseconds;
        var orchestrationMs = setupMs + teardownMs + schedulingMs;

        var orchestrationCostPercentage = totalMs > 0
            ? (orchestrationMs / totalMs) * 100
            : 0;

        return new OrchestrationCostMetrics
        {
            ExecutionStartedAt = executionStartedAt,
            FirstTaskStartedAt = firstTaskStartedAt,
            LastTaskCompletedAt = lastTaskCompletedAt,
            ExecutionCompletedAt = executionCompletedAt,
            TotalTaskExecutionTime = totalTaskExecutionTime,
            SchedulingOverhead = schedulingOverhead,
            OrchestrationCostPercentage = Math.Round(orchestrationCostPercentage, 2),
            ExecutionIterations = iterationTimings.Count,
            IterationTimings = iterationTimings
        };
    }
}
