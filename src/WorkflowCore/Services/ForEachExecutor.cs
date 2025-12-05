using System.Collections.Concurrent;
using System.Diagnostics;
using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Executes forEach iterations with parallel execution support.
/// </summary>
public class ForEachExecutor : IForEachExecutor
{
    private readonly ITemplateResolver _templateResolver;

    public ForEachExecutor(ITemplateResolver templateResolver)
    {
        _templateResolver = templateResolver ?? throw new ArgumentNullException(nameof(templateResolver));
    }

    /// <inheritdoc />
    public async Task<ForEachResult> ExecuteAsync(
        ForEachSpec? forEachSpec,
        TemplateContext context,
        ForEachTaskExecutor taskExecutor)
    {
        // Validate spec
        if (forEachSpec == null)
        {
            return ForEachResult.Failure("ForEach specification is null");
        }

        if (string.IsNullOrWhiteSpace(forEachSpec.Items))
        {
            return ForEachResult.Failure("Items template expression is empty");
        }

        if (string.IsNullOrWhiteSpace(forEachSpec.ItemVar))
        {
            return ForEachResult.Failure("ItemVar (variable name) is empty");
        }

        // Resolve the items array
        List<object?> items;
        try
        {
            items = await ResolveItemsAsync(forEachSpec.Items, context);
        }
        catch (Exception ex)
        {
            return ForEachResult.Failure($"Failed to resolve items: {ex.Message}");
        }

        // Handle empty array
        if (items.Count == 0)
        {
            return new ForEachResult
            {
                Success = true,
                ItemCount = 0,
                SuccessCount = 0,
                FailureCount = 0
            };
        }

        // Execute iterations
        var itemResults = new ConcurrentBag<ForEachItemResult>();

        // Use semaphore to limit concurrency if MaxParallel is set
        var maxParallel = forEachSpec.MaxParallel > 0
            ? forEachSpec.MaxParallel
            : int.MaxValue; // No limit

        using var semaphore = new SemaphoreSlim(maxParallel);

        var tasks = items.Select((item, index) => ExecuteItemAsync(
            item,
            index,
            forEachSpec.ItemVar,
            context,
            taskExecutor,
            semaphore,
            itemResults
        )).ToList();

        await Task.WhenAll(tasks);

        // Build result
        var orderedResults = itemResults.OrderBy(r => r.Index).ToList();
        var outputs = orderedResults
            .Where(r => r.Success && r.Output != null)
            .Select(r => r.Output!)
            .ToList();

        var successCount = orderedResults.Count(r => r.Success);
        var failureCount = orderedResults.Count(r => !r.Success);

        return new ForEachResult
        {
            Success = failureCount == 0,
            ItemCount = items.Count,
            SuccessCount = successCount,
            FailureCount = failureCount,
            Outputs = outputs,
            ItemResults = orderedResults
        };
    }

    private async Task ExecuteItemAsync(
        object? item,
        int index,
        string itemVar,
        TemplateContext originalContext,
        ForEachTaskExecutor taskExecutor,
        SemaphoreSlim semaphore,
        ConcurrentBag<ForEachItemResult> results)
    {
        await semaphore.WaitAsync();
        try
        {
            var stopwatch = Stopwatch.StartNew();

            // Create a new context with forEach information
            var itemContext = new TemplateContext
            {
                Input = originalContext.Input,
                TaskOutputs = originalContext.TaskOutputs,
                ForEach = new ForEachContext
                {
                    ItemVar = itemVar,
                    CurrentItem = item,
                    Index = index
                }
            };

            TaskExecutionResult taskResult;
            try
            {
                taskResult = await taskExecutor(itemContext, item, index);
            }
            catch (Exception ex)
            {
                taskResult = new TaskExecutionResult
                {
                    Success = false,
                    Errors = new List<string> { $"Task execution failed: {ex.Message}" }
                };
            }

            stopwatch.Stop();

            // Extract error message from result
            var errorMessage = taskResult.Errors.Count > 0
                ? string.Join("; ", taskResult.Errors)
                : taskResult.ErrorInfo?.ErrorMessage;

            results.Add(new ForEachItemResult
            {
                Index = index,
                Success = taskResult.Success,
                Output = taskResult.Output,
                Error = errorMessage,
                Item = item,
                DurationMs = stopwatch.ElapsedMilliseconds
            });
        }
        finally
        {
            semaphore.Release();
        }
    }

    private async Task<List<object?>> ResolveItemsAsync(string itemsTemplate, TemplateContext context)
    {
        // Resolve the template to get the array value
        var resolved = await _templateResolver.ResolveAsync(itemsTemplate, context);

        // Parse the resolved value as JSON array
        try
        {
            using var doc = JsonDocument.Parse(resolved);
            var root = doc.RootElement;

            if (root.ValueKind != JsonValueKind.Array)
            {
                throw new InvalidOperationException(
                    $"Items must resolve to an array, got {root.ValueKind}");
            }

            var items = new List<object?>();
            foreach (var element in root.EnumerateArray())
            {
                items.Add(ConvertJsonElement(element));
            }
            return items;
        }
        catch (JsonException ex)
        {
            throw new InvalidOperationException(
                $"Failed to parse items as JSON array: {ex.Message}", ex);
        }
    }

    private static object? ConvertJsonElement(JsonElement element)
    {
        return element.ValueKind switch
        {
            JsonValueKind.String => element.GetString(),
            JsonValueKind.Number => element.TryGetInt64(out var l) ? l : element.GetDouble(),
            JsonValueKind.True => true,
            JsonValueKind.False => false,
            JsonValueKind.Null => null,
            JsonValueKind.Object => JsonElementToDictionary(element),
            JsonValueKind.Array => JsonElementToList(element),
            _ => element.GetRawText()
        };
    }

    private static Dictionary<string, object> JsonElementToDictionary(JsonElement element)
    {
        var dict = new Dictionary<string, object>();
        foreach (var prop in element.EnumerateObject())
        {
            var value = ConvertJsonElement(prop.Value);
            if (value != null)
            {
                dict[prop.Name] = value;
            }
        }
        return dict;
    }

    private static List<object?> JsonElementToList(JsonElement element)
    {
        var list = new List<object?>();
        foreach (var item in element.EnumerateArray())
        {
            list.Add(ConvertJsonElement(item));
        }
        return list;
    }
}
