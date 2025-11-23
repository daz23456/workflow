using System.Diagnostics;
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
    private readonly IHttpTaskExecutor _taskExecutor;

    public WorkflowOrchestrator(
        IExecutionGraphBuilder graphBuilder,
        IHttpTaskExecutor taskExecutor)
    {
        _graphBuilder = graphBuilder ?? throw new ArgumentNullException(nameof(graphBuilder));
        _taskExecutor = taskExecutor ?? throw new ArgumentNullException(nameof(taskExecutor));
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

                    // Execute task
                    var taskResult = await _taskExecutor.ExecuteAsync(taskSpec, context, cancellationToken);
                    return (taskId, taskResult);
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
                        var resolvedValue = ResolveOutputExpression(outputMapping.Value, context);
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

    private object ResolveOutputExpression(string expression, TemplateContext context)
    {
        // Remove {{ and }} if present
        var cleanExpression = expression.Trim();
        if (cleanExpression.StartsWith("{{") && cleanExpression.EndsWith("}}"))
        {
            cleanExpression = cleanExpression.Substring(2, cleanExpression.Length - 4).Trim();
        }

        var parts = cleanExpression.Split('.');

        if (parts.Length < 2)
        {
            throw new InvalidOperationException($"Invalid output expression: {expression}");
        }

        // Handle {{input.fieldName}} or {{input.nested.field}}
        if (parts[0] == "input")
        {
            var path = parts.Skip(1).ToArray();
            return ResolvePathInDictionary(path, context.Input, expression);
        }

        // Handle {{tasks.taskId.output.fieldName}} or {{tasks.taskId.output.nested.field}}
        if (parts[0] == "tasks" && parts.Length >= 3 && parts[2] == "output")
        {
            var taskId = parts[1];

            if (!context.TaskOutputs.ContainsKey(taskId))
            {
                throw new InvalidOperationException($"Task '{taskId}' output not found in execution context for expression: {expression}");
            }

            var taskOutput = context.TaskOutputs[taskId];
            var path = parts.Skip(3).ToArray();
            return ResolvePathInDictionary(path, taskOutput, expression);
        }

        throw new InvalidOperationException($"Unknown output expression type: {expression}");
    }

    private object ResolvePathInDictionary(string[] path, Dictionary<string, object> data, string originalExpression)
    {
        object current = data;

        foreach (var part in path)
        {
            if (current is Dictionary<string, object> dict)
            {
                if (!dict.ContainsKey(part))
                {
                    throw new InvalidOperationException($"Field '{part}' not found for expression: {originalExpression}");
                }
                current = dict[part];
            }
            else
            {
                throw new InvalidOperationException($"Cannot navigate path '{string.Join(".", path)}' in expression: {originalExpression}");
            }
        }

        return current;
    }
}
