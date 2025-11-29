using System.Text.Json;
using WorkflowCore.Models;
using WorkflowCore.Services.Operations;

namespace WorkflowCore.Services;

public interface ITransformExecutor
{
    Task<JsonElement[]> ExecuteAsync(TransformDslDefinition dsl, JsonElement[] data, CancellationToken cancellationToken = default);
}

public class TransformExecutor : ITransformExecutor
{
    private readonly SelectOperationExecutor _selectExecutor = new();
    private readonly FilterOperationExecutor _filterExecutor = new();
    private readonly MapOperationExecutor _mapExecutor = new();
    private readonly FlatMapOperationExecutor _flatMapExecutor = new();
    private readonly GroupByOperationExecutor _groupByExecutor = new();
    private readonly JoinOperationExecutor _joinExecutor = new();
    private readonly SortByOperationExecutor _sortByExecutor = new();
    private readonly EnrichOperationExecutor _enrichExecutor = new();
    private readonly AggregateOperationExecutor _aggregateExecutor = new();
    private readonly LimitOperationExecutor _limitExecutor = new();
    private readonly SkipOperationExecutor _skipExecutor = new();

    public async Task<JsonElement[]> ExecuteAsync(TransformDslDefinition dsl, JsonElement[] data, CancellationToken cancellationToken = default)
    {
        var currentData = data;

        foreach (var operation in dsl.Pipeline)
        {
            currentData = await ExecuteOperationAsync(operation, currentData, cancellationToken);
        }

        return currentData;
    }

    private async Task<JsonElement[]> ExecuteOperationAsync(TransformOperation operation, JsonElement[] data, CancellationToken cancellationToken)
    {
        return operation switch
        {
            SelectOperation selectOp => await _selectExecutor.ExecuteAsync(selectOp, data, cancellationToken),
            FilterOperation filterOp => await _filterExecutor.ExecuteAsync(filterOp, data, cancellationToken),
            MapOperation mapOp => await _mapExecutor.ExecuteAsync(mapOp, data, cancellationToken),
            FlatMapOperation flatMapOp => await _flatMapExecutor.ExecuteAsync(flatMapOp, data, cancellationToken),
            GroupByOperation groupByOp => await _groupByExecutor.ExecuteAsync(groupByOp, data, cancellationToken),
            JoinOperation joinOp => await _joinExecutor.ExecuteAsync(joinOp, data, cancellationToken),
            SortByOperation sortByOp => await _sortByExecutor.ExecuteAsync(sortByOp, data, cancellationToken),
            EnrichOperation enrichOp => await _enrichExecutor.ExecuteAsync(enrichOp, data, cancellationToken),
            AggregateOperation aggregateOp => await _aggregateExecutor.ExecuteAsync(aggregateOp, data, cancellationToken),
            LimitOperation limitOp => await _limitExecutor.ExecuteAsync(limitOp, data, cancellationToken),
            SkipOperation skipOp => await _skipExecutor.ExecuteAsync(skipOp, data, cancellationToken),
            _ => throw new NotSupportedException($"Operation type {operation.GetType().Name} is not supported")
        };
    }
}
