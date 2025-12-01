using System.Diagnostics;
using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

public interface ITransformTaskExecutor
{
    Task<TaskExecutionResult> ExecuteAsync(WorkflowTaskSpec taskSpec, object data, CancellationToken cancellationToken = default);
}

public class TransformTaskExecutor : ITransformTaskExecutor
{
    private readonly IDataTransformer _dataTransformer;
    private readonly ITransformExecutor? _transformExecutor;

    public TransformTaskExecutor(IDataTransformer dataTransformer)
        : this(dataTransformer, null)
    {
    }

    public TransformTaskExecutor(IDataTransformer dataTransformer, ITransformExecutor? transformExecutor)
    {
        _dataTransformer = dataTransformer ?? throw new ArgumentNullException(nameof(dataTransformer));
        _transformExecutor = transformExecutor;
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
            // Check if Pipeline is specified (takes precedence over JsonPath/Query)
            if (taskSpec.Transform.Pipeline.HasValue && taskSpec.Transform.Pipeline.Value.ValueKind != JsonValueKind.Undefined)
            {
                return await ExecutePipelineAsync(taskSpec, data, stopwatch, cancellationToken);
            }

            // Legacy mode: Use JsonPath property, fallback to Query for backward compatibility
            var jsonPath = !string.IsNullOrWhiteSpace(taskSpec.Transform.JsonPath)
                ? taskSpec.Transform.JsonPath
                : taskSpec.Transform.Query;

            if (string.IsNullOrWhiteSpace(jsonPath))
            {
                return new TaskExecutionResult
                {
                    Success = false,
                    Errors = new List<string> { "Transform definition missing 'jsonPath', 'query', or 'pipeline' property" }
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

    private async Task<TaskExecutionResult> ExecutePipelineAsync(
        WorkflowTaskSpec taskSpec,
        object data,
        Stopwatch stopwatch,
        CancellationToken cancellationToken)
    {
        if (_transformExecutor == null)
        {
            return new TaskExecutionResult
            {
                Success = false,
                Errors = new List<string> { "Pipeline transforms require TransformExecutor to be configured" }
            };
        }

        try
        {
            // Stage 1: Extract input data
            var inputPath = !string.IsNullOrWhiteSpace(taskSpec.Transform!.Input)
                ? taskSpec.Transform.Input
                : "$";

            var inputData = await _dataTransformer.TransformAsync(inputPath, data);

            if (inputData == null)
            {
                return new TaskExecutionResult
                {
                    Success = false,
                    Errors = new List<string> { $"Input path '{inputPath}' did not match any data" }
                };
            }

            // Convert to JsonElement array for pipeline execution
            JsonElement[] pipelineInput;
            if (inputData is JsonElement jsonElement)
            {
                if (jsonElement.ValueKind == JsonValueKind.Array)
                {
                    pipelineInput = jsonElement.EnumerateArray().ToArray();
                }
                else
                {
                    pipelineInput = new[] { jsonElement };
                }
            }
            else
            {
                var serialized = JsonSerializer.SerializeToElement(inputData);
                if (serialized.ValueKind == JsonValueKind.Array)
                {
                    pipelineInput = serialized.EnumerateArray().ToArray();
                }
                else
                {
                    pipelineInput = new[] { serialized };
                }
            }

            // Stage 2: Execute pipeline
            // Parse the raw JSON pipeline to typed operations
            var pipelineJson = taskSpec.Transform.Pipeline!.Value.GetRawText();
            var pipelineOperations = JsonSerializer.Deserialize<List<TransformOperation>>(pipelineJson)
                ?? new List<TransformOperation>();

            var dsl = new TransformDslDefinition
            {
                Pipeline = pipelineOperations
            };

            var pipelineResult = await _transformExecutor.ExecuteAsync(dsl, pipelineInput, cancellationToken);

            stopwatch.Stop();

            // Wrap result
            var output = new Dictionary<string, object>
            {
                ["result"] = JsonSerializer.SerializeToElement(pipelineResult)
            };

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
                Errors = new List<string> { $"Pipeline execution failed: {ex.Message}" },
                Duration = stopwatch.Elapsed
            };
        }
    }
}
