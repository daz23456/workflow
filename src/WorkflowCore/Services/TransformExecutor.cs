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
    // Random operations
    private readonly RandomOneOperationExecutor _randomOneExecutor = new();
    private readonly RandomNOperationExecutor _randomNExecutor = new();
    private readonly ShuffleOperationExecutor _shuffleExecutor = new();
    // String operations
    private readonly UppercaseOperationExecutor _uppercaseExecutor = new();
    private readonly LowercaseOperationExecutor _lowercaseExecutor = new();
    private readonly TrimOperationExecutor _trimExecutor = new();
    private readonly SplitOperationExecutor _splitExecutor = new();
    private readonly ConcatOperationExecutor _concatExecutor = new();
    private readonly ReplaceOperationExecutor _replaceExecutor = new();
    private readonly SubstringOperationExecutor _substringExecutor = new();
    private readonly TemplateOperationExecutor _templateExecutor = new();
    // Math operations
    private readonly RoundOperationExecutor _roundExecutor = new();
    private readonly FloorOperationExecutor _floorExecutor = new();
    private readonly CeilOperationExecutor _ceilExecutor = new();
    private readonly AbsOperationExecutor _absExecutor = new();
    private readonly ClampOperationExecutor _clampExecutor = new();
    private readonly ScaleOperationExecutor _scaleExecutor = new();
    private readonly PercentageOperationExecutor _percentageExecutor = new();
    // Array operations
    private readonly FirstOperationExecutor _firstExecutor = new();
    private readonly LastOperationExecutor _lastExecutor = new();
    private readonly NthOperationExecutor _nthExecutor = new();
    private readonly ReverseOperationExecutor _reverseExecutor = new();
    private readonly UniqueOperationExecutor _uniqueExecutor = new();
    private readonly FlattenOperationExecutor _flattenExecutor = new();
    private readonly ChunkOperationExecutor _chunkExecutor = new();
    private readonly ZipOperationExecutor _zipExecutor = new();

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
            // Random operations
            RandomOneOperation randomOneOp => await _randomOneExecutor.ExecuteAsync(randomOneOp, data, cancellationToken),
            RandomNOperation randomNOp => await _randomNExecutor.ExecuteAsync(randomNOp, data, cancellationToken),
            ShuffleOperation shuffleOp => await _shuffleExecutor.ExecuteAsync(shuffleOp, data, cancellationToken),
            // String operations
            UppercaseOperation uppercaseOp => await _uppercaseExecutor.ExecuteAsync(uppercaseOp, data, cancellationToken),
            LowercaseOperation lowercaseOp => await _lowercaseExecutor.ExecuteAsync(lowercaseOp, data, cancellationToken),
            TrimOperation trimOp => await _trimExecutor.ExecuteAsync(trimOp, data, cancellationToken),
            SplitOperation splitOp => await _splitExecutor.ExecuteAsync(splitOp, data, cancellationToken),
            ConcatOperation concatOp => await _concatExecutor.ExecuteAsync(concatOp, data, cancellationToken),
            ReplaceOperation replaceOp => await _replaceExecutor.ExecuteAsync(replaceOp, data, cancellationToken),
            SubstringOperation substringOp => await _substringExecutor.ExecuteAsync(substringOp, data, cancellationToken),
            TemplateOperation templateOp => await _templateExecutor.ExecuteAsync(templateOp, data, cancellationToken),
            // Math operations
            RoundOperation roundOp => await _roundExecutor.ExecuteAsync(roundOp, data, cancellationToken),
            FloorOperation floorOp => await _floorExecutor.ExecuteAsync(floorOp, data, cancellationToken),
            CeilOperation ceilOp => await _ceilExecutor.ExecuteAsync(ceilOp, data, cancellationToken),
            AbsOperation absOp => await _absExecutor.ExecuteAsync(absOp, data, cancellationToken),
            ClampOperation clampOp => await _clampExecutor.ExecuteAsync(clampOp, data, cancellationToken),
            ScaleOperation scaleOp => await _scaleExecutor.ExecuteAsync(scaleOp, data, cancellationToken),
            PercentageOperation percentageOp => await _percentageExecutor.ExecuteAsync(percentageOp, data, cancellationToken),
            // Array operations
            FirstOperation firstOp => await _firstExecutor.ExecuteAsync(firstOp, data, cancellationToken),
            LastOperation lastOp => await _lastExecutor.ExecuteAsync(lastOp, data, cancellationToken),
            NthOperation nthOp => await _nthExecutor.ExecuteAsync(nthOp, data, cancellationToken),
            ReverseOperation reverseOp => await _reverseExecutor.ExecuteAsync(reverseOp, data, cancellationToken),
            UniqueOperation uniqueOp => await _uniqueExecutor.ExecuteAsync(uniqueOp, data, cancellationToken),
            FlattenOperation flattenOp => await _flattenExecutor.ExecuteAsync(flattenOp, data, cancellationToken),
            ChunkOperation chunkOp => await _chunkExecutor.ExecuteAsync(chunkOp, data, cancellationToken),
            ZipOperation zipOp => await _zipExecutor.ExecuteAsync(zipOp, data, cancellationToken),
            _ => throw new NotSupportedException($"Operation type {operation.GetType().Name} is not supported")
        };
    }
}
