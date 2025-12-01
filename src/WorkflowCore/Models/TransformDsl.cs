using System.Text.Json;
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
// Random operations
[JsonDerivedType(typeof(RandomOneOperation), "randomOne")]
[JsonDerivedType(typeof(RandomNOperation), "randomN")]
[JsonDerivedType(typeof(ShuffleOperation), "shuffle")]
// String operations
[JsonDerivedType(typeof(UppercaseOperation), "uppercase")]
[JsonDerivedType(typeof(LowercaseOperation), "lowercase")]
[JsonDerivedType(typeof(TrimOperation), "trim")]
[JsonDerivedType(typeof(SplitOperation), "split")]
[JsonDerivedType(typeof(ConcatOperation), "concat")]
[JsonDerivedType(typeof(ReplaceOperation), "replace")]
[JsonDerivedType(typeof(SubstringOperation), "substring")]
[JsonDerivedType(typeof(TemplateOperation), "template")]
// Math operations
[JsonDerivedType(typeof(RoundOperation), "round")]
[JsonDerivedType(typeof(FloorOperation), "floor")]
[JsonDerivedType(typeof(CeilOperation), "ceil")]
[JsonDerivedType(typeof(AbsOperation), "abs")]
[JsonDerivedType(typeof(ClampOperation), "clamp")]
[JsonDerivedType(typeof(ScaleOperation), "scale")]
[JsonDerivedType(typeof(PercentageOperation), "percentage")]
// Array operations
[JsonDerivedType(typeof(FirstOperation), "first")]
[JsonDerivedType(typeof(LastOperation), "last")]
[JsonDerivedType(typeof(NthOperation), "nth")]
[JsonDerivedType(typeof(ReverseOperation), "reverse")]
[JsonDerivedType(typeof(UniqueOperation), "unique")]
[JsonDerivedType(typeof(FlattenOperation), "flatten")]
[JsonDerivedType(typeof(ChunkOperation), "chunk")]
[JsonDerivedType(typeof(ZipOperation), "zip")]
public abstract class TransformOperation
{
    // Note: OperationType is ignored during JSON deserialization because
    // "operation" is already used as the polymorphic type discriminator.
    // The derived type is determined by the discriminator, not this property.
    [JsonIgnore]
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

/// <summary>
/// RandomOne operation - Select a single random element from the array
/// </summary>
public class RandomOneOperation : TransformOperation
{
    public override string OperationType => "randomOne";

    /// <summary>
    /// Optional seed for reproducible random selection
    /// </summary>
    [JsonPropertyName("seed")]
    public int? Seed { get; set; }
}

/// <summary>
/// RandomN operation - Select N random elements from the array (without duplicates)
/// </summary>
public class RandomNOperation : TransformOperation
{
    public override string OperationType => "randomN";

    /// <summary>
    /// Number of random elements to select
    /// </summary>
    [JsonPropertyName("count")]
    public int Count { get; set; }

    /// <summary>
    /// Optional seed for reproducible random selection
    /// </summary>
    [JsonPropertyName("seed")]
    public int? Seed { get; set; }
}

/// <summary>
/// Shuffle operation - Randomly reorder all elements in the array
/// </summary>
public class ShuffleOperation : TransformOperation
{
    public override string OperationType => "shuffle";

    /// <summary>
    /// Optional seed for reproducible shuffling
    /// </summary>
    [JsonPropertyName("seed")]
    public int? Seed { get; set; }
}

// ============ String Operations ============

/// <summary>
/// Uppercase operation - Convert strings to uppercase
/// </summary>
public class UppercaseOperation : TransformOperation
{
    public override string OperationType => "uppercase";
}

/// <summary>
/// Lowercase operation - Convert strings to lowercase
/// </summary>
public class LowercaseOperation : TransformOperation
{
    public override string OperationType => "lowercase";
}

/// <summary>
/// Trim operation - Remove leading and trailing whitespace from strings
/// </summary>
public class TrimOperation : TransformOperation
{
    public override string OperationType => "trim";
}

/// <summary>
/// Split operation - Split strings into arrays by delimiter
/// </summary>
public class SplitOperation : TransformOperation
{
    public override string OperationType => "split";

    [JsonPropertyName("delimiter")]
    public string Delimiter { get; set; } = ",";
}

/// <summary>
/// Concat operation - Join array elements into a string with delimiter
/// </summary>
public class ConcatOperation : TransformOperation
{
    public override string OperationType => "concat";

    [JsonPropertyName("delimiter")]
    public string Delimiter { get; set; } = "";
}

/// <summary>
/// Replace operation - Replace substrings in strings
/// </summary>
public class ReplaceOperation : TransformOperation
{
    public override string OperationType => "replace";

    [JsonPropertyName("oldValue")]
    public string OldValue { get; set; } = string.Empty;

    [JsonPropertyName("newValue")]
    public string NewValue { get; set; } = string.Empty;
}

/// <summary>
/// Substring operation - Extract a substring from strings
/// </summary>
public class SubstringOperation : TransformOperation
{
    public override string OperationType => "substring";

    [JsonPropertyName("start")]
    public int Start { get; set; }

    [JsonPropertyName("length")]
    public int? Length { get; set; }
}

/// <summary>
/// Template operation - String interpolation with placeholders
/// </summary>
public class TemplateOperation : TransformOperation
{
    public override string OperationType => "template";

    [JsonPropertyName("template")]
    public string Template { get; set; } = string.Empty;
}

// ============ Math Operations ============

/// <summary>
/// Round operation - Round numbers to specified decimal places
/// </summary>
public class RoundOperation : TransformOperation
{
    public override string OperationType => "round";

    [JsonPropertyName("decimals")]
    public int Decimals { get; set; } = 0;
}

/// <summary>
/// Floor operation - Round numbers down to nearest integer
/// </summary>
public class FloorOperation : TransformOperation
{
    public override string OperationType => "floor";
}

/// <summary>
/// Ceil operation - Round numbers up to nearest integer
/// </summary>
public class CeilOperation : TransformOperation
{
    public override string OperationType => "ceil";
}

/// <summary>
/// Abs operation - Get absolute value of numbers
/// </summary>
public class AbsOperation : TransformOperation
{
    public override string OperationType => "abs";
}

/// <summary>
/// Clamp operation - Constrain numbers to a range
/// </summary>
public class ClampOperation : TransformOperation
{
    public override string OperationType => "clamp";

    [JsonPropertyName("min")]
    public double Min { get; set; }

    [JsonPropertyName("max")]
    public double Max { get; set; }
}

/// <summary>
/// Scale operation - Multiply numbers by a factor
/// </summary>
public class ScaleOperation : TransformOperation
{
    public override string OperationType => "scale";

    [JsonPropertyName("factor")]
    public double Factor { get; set; } = 1;
}

/// <summary>
/// Percentage operation - Calculate percentage of a total
/// </summary>
public class PercentageOperation : TransformOperation
{
    public override string OperationType => "percentage";

    [JsonPropertyName("total")]
    public double Total { get; set; } = 100;
}

// ============ Array Operations ============

/// <summary>
/// First operation - Get first element from array
/// </summary>
public class FirstOperation : TransformOperation
{
    public override string OperationType => "first";
}

/// <summary>
/// Last operation - Get last element from array
/// </summary>
public class LastOperation : TransformOperation
{
    public override string OperationType => "last";
}

/// <summary>
/// Nth operation - Get element at specific index
/// </summary>
public class NthOperation : TransformOperation
{
    public override string OperationType => "nth";

    [JsonPropertyName("index")]
    public int Index { get; set; }
}

/// <summary>
/// Reverse operation - Reverse array order
/// </summary>
public class ReverseOperation : TransformOperation
{
    public override string OperationType => "reverse";
}

/// <summary>
/// Unique operation - Remove duplicate elements
/// </summary>
public class UniqueOperation : TransformOperation
{
    public override string OperationType => "unique";
}

/// <summary>
/// Flatten operation - Flatten nested arrays one level
/// </summary>
public class FlattenOperation : TransformOperation
{
    public override string OperationType => "flatten";
}

/// <summary>
/// Chunk operation - Split array into chunks of specified size
/// </summary>
public class ChunkOperation : TransformOperation
{
    public override string OperationType => "chunk";

    [JsonPropertyName("size")]
    public int Size { get; set; } = 1;
}

/// <summary>
/// Zip operation - Combine two arrays element-wise
/// </summary>
public class ZipOperation : TransformOperation
{
    public override string OperationType => "zip";

    [JsonPropertyName("withArray")]
    public JsonElement WithArray { get; set; }
}
