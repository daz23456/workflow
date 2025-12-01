using System.Text.Json;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

public interface ITransformDslParser
{
    Task<TransformDslParseResult> ParseAsync(string json);
    Task<TransformDslValidationResult> ValidateAsync(TransformDslDefinition dsl);
}

public class TransformDslParser : ITransformDslParser
{
    private static readonly HashSet<string> ValidOperators = new()
    {
        "eq", "ne", "gt", "lt", "gte", "lte", "contains", "startsWith", "endsWith"
    };

    private static readonly HashSet<string> ValidAggregationFunctions = new()
    {
        "sum", "avg", "count", "min", "max"
    };

    private static readonly HashSet<string> ValidJoinTypes = new()
    {
        "inner", "left", "right"
    };

    private static readonly HashSet<string> ValidSortOrders = new()
    {
        "asc", "desc"
    };

    public async Task<TransformDslParseResult> ParseAsync(string json)
    {
        try
        {
            var dsl = JsonSerializer.Deserialize<TransformDslDefinition>(json);

            if (dsl == null)
            {
                return new TransformDslParseResult
                {
                    IsValid = false,
                    Errors = new List<string> { "Failed to parse DSL: result was null" }
                };
            }

            // Validate the parsed DSL
            var validationResult = await ValidateAsync(dsl);

            return new TransformDslParseResult
            {
                IsValid = validationResult.IsValid,
                Dsl = validationResult.IsValid ? dsl : null,
                Errors = validationResult.Errors
            };
        }
        catch (JsonException ex)
        {
            return new TransformDslParseResult
            {
                IsValid = false,
                Errors = new List<string> { $"Invalid JSON: {ex.Message}" }
            };
        }
        catch (Exception ex)
        {
            return new TransformDslParseResult
            {
                IsValid = false,
                Errors = new List<string> { $"Failed to parse DSL: {ex.Message}" }
            };
        }
    }

    public async Task<TransformDslValidationResult> ValidateAsync(TransformDslDefinition dsl)
    {
        var errors = new List<string>();

        // Validate each operation in the pipeline
        for (int i = 0; i < dsl.Pipeline.Count; i++)
        {
            var operation = dsl.Pipeline[i];
            var operationErrors = ValidateOperation(operation, i);
            errors.AddRange(operationErrors);
        }

        return await Task.FromResult(new TransformDslValidationResult
        {
            IsValid = errors.Count == 0,
            Errors = errors
        });
    }

    private List<string> ValidateOperation(TransformOperation operation, int index)
    {
        var errors = new List<string>();
        var prefix = $"Operation {index} ({operation.OperationType}):";

        switch (operation)
        {
            case FilterOperation filter:
                ValidateFilterOperation(filter, prefix, errors);
                break;
            case SelectOperation select:
                ValidateSelectOperation(select, prefix, errors);
                break;
            case GroupByOperation groupBy:
                ValidateGroupByOperation(groupBy, prefix, errors);
                break;
            case JoinOperation join:
                ValidateJoinOperation(join, prefix, errors);
                break;
            case SortByOperation sortBy:
                ValidateSortByOperation(sortBy, prefix, errors);
                break;
            case LimitOperation limit:
                ValidateLimitOperation(limit, prefix, errors);
                break;
            case SkipOperation skip:
                ValidateSkipOperation(skip, prefix, errors);
                break;
            case MapOperation map:
                ValidateMapOperation(map, prefix, errors);
                break;
            case AggregateOperation aggregate:
                ValidateAggregateOperation(aggregate, prefix, errors);
                break;
                // FlatMapOperation and EnrichOperation don't have required fields currently
        }

        return errors;
    }

    private void ValidateFilterOperation(FilterOperation filter, string prefix, List<string> errors)
    {
        if (string.IsNullOrWhiteSpace(filter.Field))
        {
            errors.Add($"{prefix} field is required");
        }

        if (string.IsNullOrWhiteSpace(filter.Operator))
        {
            errors.Add($"{prefix} operator is required");
        }
        else if (!ValidOperators.Contains(filter.Operator))
        {
            errors.Add($"{prefix} operator '{filter.Operator}' is invalid. Valid operators: {string.Join(", ", ValidOperators)}");
        }
    }

    private void ValidateSelectOperation(SelectOperation select, string prefix, List<string> errors)
    {
        if (select.Fields == null || select.Fields.Count == 0)
        {
            errors.Add($"{prefix} fields must contain at least one field");
        }
    }

    private void ValidateGroupByOperation(GroupByOperation groupBy, string prefix, List<string> errors)
    {
        if (string.IsNullOrWhiteSpace(groupBy.Key))
        {
            errors.Add($"{prefix} key is required");
        }

        if (groupBy.Aggregations == null || groupBy.Aggregations.Count == 0)
        {
            errors.Add($"{prefix} aggregations must contain at least one aggregation");
        }
        else
        {
            foreach (var agg in groupBy.Aggregations.Values)
            {
                ValidateAggregation(agg, prefix, errors);
            }
        }
    }

    private void ValidateAggregateOperation(AggregateOperation aggregate, string prefix, List<string> errors)
    {
        if (aggregate.Aggregations == null || aggregate.Aggregations.Count == 0)
        {
            errors.Add($"{prefix} aggregations must contain at least one aggregation");
        }
        else
        {
            foreach (var agg in aggregate.Aggregations.Values)
            {
                ValidateAggregation(agg, prefix, errors);
            }
        }
    }

    private void ValidateAggregation(Aggregation agg, string prefix, List<string> errors)
    {
        if (!ValidAggregationFunctions.Contains(agg.Function))
        {
            errors.Add($"{prefix} aggregation function '{agg.Function}' is invalid. Valid functions: {string.Join(", ", ValidAggregationFunctions)}");
        }
    }

    private void ValidateJoinOperation(JoinOperation join, string prefix, List<string> errors)
    {
        if (string.IsNullOrWhiteSpace(join.LeftKey))
        {
            errors.Add($"{prefix} leftKey is required");
        }

        if (string.IsNullOrWhiteSpace(join.RightKey))
        {
            errors.Add($"{prefix} rightKey is required");
        }

        if (!ValidJoinTypes.Contains(join.JoinType))
        {
            errors.Add($"{prefix} joinType '{join.JoinType}' is invalid. Valid types: {string.Join(", ", ValidJoinTypes)}");
        }
    }

    private void ValidateSortByOperation(SortByOperation sortBy, string prefix, List<string> errors)
    {
        if (string.IsNullOrWhiteSpace(sortBy.Field))
        {
            errors.Add($"{prefix} field is required");
        }

        if (!ValidSortOrders.Contains(sortBy.Order))
        {
            errors.Add($"{prefix} order '{sortBy.Order}' is invalid. Valid orders: {string.Join(", ", ValidSortOrders)}");
        }
    }

    private void ValidateLimitOperation(LimitOperation limit, string prefix, List<string> errors)
    {
        if (limit.Count <= 0)
        {
            errors.Add($"{prefix} count must be a positive integer");
        }
    }

    private void ValidateSkipOperation(SkipOperation skip, string prefix, List<string> errors)
    {
        if (skip.Count < 0)
        {
            errors.Add($"{prefix} count must be a positive integer or zero");
        }
    }

    private void ValidateMapOperation(MapOperation map, string prefix, List<string> errors)
    {
        if (map.Mappings == null || map.Mappings.Count == 0)
        {
            errors.Add($"{prefix} mappings must contain at least one mapping");
        }
    }
}

public class TransformDslParseResult
{
    public bool IsValid { get; set; }
    public TransformDslDefinition? Dsl { get; set; }
    public List<string> Errors { get; set; } = new();
}

public class TransformDslValidationResult
{
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = new();
}
