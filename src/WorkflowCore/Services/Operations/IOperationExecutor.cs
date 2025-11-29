using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services.Operations;

/// <summary>
/// Base interface for transform operation executors
/// </summary>
public interface IOperationExecutor<TOperation> where TOperation : TransformOperation
{
    Task<JsonElement[]> ExecuteAsync(TOperation operation, JsonElement[] data, CancellationToken cancellationToken = default);
}
