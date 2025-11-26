using System.Diagnostics;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

public interface ITransformTaskExecutor
{
    Task<TaskExecutionResult> ExecuteAsync(WorkflowTaskSpec taskSpec, object data, CancellationToken cancellationToken = default);
}

public class TransformTaskExecutor : ITransformTaskExecutor
{
    private readonly IDataTransformer _dataTransformer;

    public TransformTaskExecutor(IDataTransformer dataTransformer)
    {
        _dataTransformer = dataTransformer ?? throw new ArgumentNullException(nameof(dataTransformer));
    }

    public async Task<TaskExecutionResult> ExecuteAsync(
        WorkflowTaskSpec taskSpec,
        object data,
        CancellationToken cancellationToken = default)
    {
        if (taskSpec.Transform == null)
        {
            return new TaskExecutionResult
            {
                Success = false,
                Errors = new List<string> { "Transform definition is null" }
            };
        }

        var stopwatch = Stopwatch.StartNew();

        try
        {
            // Use JsonPath property, fallback to Query for backward compatibility
            var jsonPath = taskSpec.Transform.JsonPath ?? taskSpec.Transform.Query;

            if (string.IsNullOrWhiteSpace(jsonPath))
            {
                return new TaskExecutionResult
                {
                    Success = false,
                    Errors = new List<string> { "Transform definition missing 'jsonPath' or 'query' property" }
                };
            }

            object dataToTransform = data;

            // Stage 1: If 'input' path is specified, extract that data first
            if (!string.IsNullOrWhiteSpace(taskSpec.Transform.Input))
            {
                dataToTransform = await _dataTransformer.TransformAsync(taskSpec.Transform.Input, data);

                if (dataToTransform == null)
                {
                    return new TaskExecutionResult
                    {
                        Success = false,
                        Errors = new List<string> { $"Input path '{taskSpec.Transform.Input}' did not match any data" }
                    };
                }
            }

            // Stage 2: Apply the main JSONPath transformation
            var result = await _dataTransformer.TransformAsync(jsonPath, dataToTransform);

            stopwatch.Stop();

            // Wrap result in dictionary format expected by TaskExecutionResult
            var output = new Dictionary<string, object>();
            if (result != null)
            {
                output["result"] = result;
            }

            return new TaskExecutionResult
            {
                Success = true,
                Output = output,
                Duration = stopwatch.Elapsed
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();

            return new TaskExecutionResult
            {
                Success = false,
                Errors = new List<string> { $"Transform execution failed: {ex.Message}" },
                Duration = stopwatch.Elapsed
            };
        }
    }
}
