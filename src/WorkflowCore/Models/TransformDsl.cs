using System.Text.Json.Serialization;

namespace WorkflowCore.Models;

/// <summary>
/// Transform DSL specification for declarative data transformations
/// </summary>
public class TransformDslDefinition
{
    [JsonPropertyName("version")]
    public string Version { get; set; } = "1.0";

    [JsonPropertyName("input")]
    public string? Input { get; set; }

    [JsonPropertyName("pipeline")]
    public List<TransformOperation> Pipeline { get; set; } = new();
}

/// <summary>
/// Base class for all transform operations
/// </summary>
[JsonPolymorphic(TypeDiscriminatorPropertyName = "operation")]
[JsonDerivedType(typeof(SelectOperation), "select")]
[JsonDerivedType(typeof(FilterOperation), "filter")]
[JsonDerivedType(typeof(MapOperation), "map")]
[JsonDerivedType(typeof(FlatMapOperation), "flatMap")]
[JsonDerivedType(typeof(GroupByOperation), "groupBy")]
[JsonDerivedType(typeof(JoinOperation), "join")]
[JsonDerivedType(typeof(SortByOperation), "sortBy")]
[JsonDerivedType(typeof(EnrichOperation), "enrich")]
[JsonDerivedType(typeof(AggregateOperation), "aggregate")]
[JsonDerivedType(typeof(LimitOperation), "limit")]
[JsonDerivedType(typeof(SkipOperation), "skip")]
public abstract class TransformOperation
{
    [JsonPropertyName("operation")]
    public abstract string OperationType { get; }
}

/// <summary>
/// Select operation - Extract/project specific fields
/// </summary>
public class SelectOperation : TransformOperation
{
    public override string OperationType => "select";

    [JsonPropertyName("fields")]
    public Dictionary<string, string> Fields { get; set; } = new();
}

/// <summary>
/// Filter operation - Filter records by condition
/// </summary>
public class FilterOperation : TransformOperation
{
    public override string OperationType => "filter";

    [JsonPropertyName("field")]
    public string Field { get; set; } = string.Empty;

    [JsonPropertyName("operator")]
    public string Operator { get; set; } = string.Empty;

    [JsonPropertyName("value")]
    public object? Value { get; set; }
}

/// <summary>
/// Map operation - Transform each record
/// </summary>
public class MapOperation : TransformOperation
{
    public override string OperationType => "map";

    [JsonPropertyName("mappings")]
    public Dictionary<string, string> Mappings { get; set; } = new();
}

/// <summary>
/// FlatMap operation - Flatten nested arrays
/// </summary>
public class FlatMapOperation : TransformOperation
{
    public override string OperationType => "flatMap";

    [JsonPropertyName("path")]
    public string Path { get; set; } = string.Empty;
}

/// <summary>
/// GroupBy operation - Group and aggregate data
/// </summary>
public class GroupByOperation : TransformOperation
{
    public override string OperationType => "groupBy";

    [JsonPropertyName("key")]
    public string Key { get; set; } = string.Empty;

    [JsonPropertyName("aggregations")]
    public Dictionary<string, Aggregation> Aggregations { get; set; } = new();
}

/// <summary>
/// Join operation - Join two datasets
/// </summary>
public class JoinOperation : TransformOperation
{
    public override string OperationType => "join";

    [JsonPropertyName("leftKey")]
    public string LeftKey { get; set; } = string.Empty;

    [JsonPropertyName("rightKey")]
    public string RightKey { get; set; } = string.Empty;

    [JsonPropertyName("rightData")]
    public object? RightData { get; set; }

    [JsonPropertyName("joinType")]
    public string JoinType { get; set; } = "inner"; // inner, left, right
}

/// <summary>
/// SortBy operation - Sort records
/// </summary>
public class SortByOperation : TransformOperation
{
    public override string OperationType => "sortBy";

    [JsonPropertyName("field")]
    public string Field { get; set; } = string.Empty;

    [JsonPropertyName("order")]
    public string Order { get; set; } = "asc"; // asc or desc
}

/// <summary>
/// Enrich operation - Add computed fields
/// </summary>
public class EnrichOperation : TransformOperation
{
    public override string OperationType => "enrich";

    [JsonPropertyName("fields")]
    public Dictionary<string, string> Fields { get; set; } = new();
}

/// <summary>
/// Aggregate operation - Aggregate entire dataset
/// </summary>
public class AggregateOperation : TransformOperation
{
    public override string OperationType => "aggregate";

    [JsonPropertyName("aggregations")]
    public Dictionary<string, Aggregation> Aggregations { get; set; } = new();
}

/// <summary>
/// Limit operation - Take first N records
/// </summary>
public class LimitOperation : TransformOperation
{
    public override string OperationType => "limit";

    [JsonPropertyName("count")]
    public int Count { get; set; }
}

/// <summary>
/// Skip operation - Skip first N records
/// </summary>
public class SkipOperation : TransformOperation
{
    public override string OperationType => "skip";

    [JsonPropertyName("count")]
    public int Count { get; set; }
}

/// <summary>
/// Aggregation function specification
/// </summary>
public class Aggregation
{
    [JsonPropertyName("function")]
    public string Function { get; set; } = string.Empty; // sum, avg, count, min, max

    [JsonPropertyName("field")]
    public string Field { get; set; } = string.Empty;
}
