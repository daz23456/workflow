using System.Text.RegularExpressions;
using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Checks algebraic equivalence of transform operations.
/// Implements rules for verifying that optimizations preserve semantics.
/// </summary>
public class TransformEquivalenceChecker : ITransformEquivalenceChecker
{
    // Regex to extract field references from expressions like $.fieldName
    private static readonly Regex FieldReferencePattern = new(
        @"\$\.(\w+)",
        RegexOptions.Compiled);

    /// <summary>
    /// Checks if two consecutive filters can be fused into one.
    /// filter(A) → filter(B) = filter(A && B)
    /// </summary>
    public FilterFusionResult CheckFilterFusion(FilterOperation filter1, FilterOperation filter2)
    {
        // Two filters can always be fused with AND logic
        var fusedFilter = new FilterOperation
        {
            Field = $"({filter1.Field} {filter1.Operator} {FormatValue(filter1.Value)}) AND ({filter2.Field} {filter2.Operator} {FormatValue(filter2.Value)})",
            Operator = "compound",
            Value = null
        };

        // Check for contradictory conditions (same field, equality, different values)
        string? warning = null;
        if (filter1.Field == filter2.Field &&
            filter1.Operator == "eq" && filter2.Operator == "eq" &&
            !Equals(filter1.Value, filter2.Value))
        {
            warning = $"Warning: contradictory filters on '{filter1.Field}' will always produce empty result";
        }

        return new FilterFusionResult(
            IsEquivalent: true,
            SafetyLevel: SafetyLevel.Safe,
            FusedFilter: fusedFilter,
            Proof: $"filter(A) AND filter(B) = filter(A && B). Filters on '{filter1.Field}' and '{filter2.Field}' combined.",
            Warning: warning);
    }

    /// <summary>
    /// Checks if two consecutive maps can be composed into one.
    /// map(f) → map(g) = map(g ∘ f)
    /// </summary>
    public MapCompositionResult CheckMapComposition(MapOperation map1, MapOperation map2)
    {
        var composedMappings = new Dictionary<string, string>();

        // First, copy all mappings from map1
        foreach (var kvp in map1.Mappings)
        {
            composedMappings[kvp.Key] = kvp.Value;
        }

        // Then apply map2, substituting references to map1's outputs
        foreach (var kvp in map2.Mappings)
        {
            var expression = kvp.Value;

            // Check if map2 references fields produced by map1
            var referencedFields = ExtractFieldReferences(expression);
            foreach (var field in referencedFields)
            {
                if (map1.Mappings.TryGetValue(field, out var map1Expression))
                {
                    // Substitute the reference with map1's expression
                    expression = expression.Replace($"$.{field}", $"({map1Expression})");
                }
            }

            // This mapping may overwrite one from map1
            composedMappings[kvp.Key] = expression;
        }

        var composedMap = new MapOperation { Mappings = composedMappings };

        return new MapCompositionResult(
            IsEquivalent: true,
            SafetyLevel: SafetyLevel.Safe,
            ComposedMap: composedMap,
            Proof: $"map(f) ∘ map(g) = map(g(f)). Composed {map1.Mappings.Count} + {map2.Mappings.Count} mappings into {composedMappings.Count}.");
    }

    /// <summary>
    /// Checks if two consecutive selects can be composed into one.
    /// select(A) → select(B) = select(intersection)
    /// </summary>
    public SelectCompositionResult CheckSelectComposition(SelectOperation select1, SelectOperation select2)
    {
        var composedFields = new Dictionary<string, string>();
        string? warning = null;

        // The second select can only use fields that exist after the first select
        foreach (var kvp in select2.Fields)
        {
            var fieldName = kvp.Key;
            var expression = kvp.Value;

            // Check if this field references something from select1
            var referencedFields = ExtractFieldReferences(expression);
            var allFieldsAvailable = true;

            foreach (var refField in referencedFields)
            {
                if (!select1.Fields.ContainsKey(refField))
                {
                    // Field won't be available after first select
                    warning = $"Field '{refField}' referenced by select2 won't exist after select1";
                    allFieldsAvailable = false;
                }
            }

            if (allFieldsAvailable || referencedFields.Count == 0)
            {
                composedFields[fieldName] = expression;
            }
        }

        var composedSelect = new SelectOperation { Fields = composedFields };

        return new SelectCompositionResult(
            IsEquivalent: true,
            SafetyLevel: SafetyLevel.Safe,
            ComposedSelect: composedSelect,
            Proof: $"select(A) → select(B) = select(B ∩ available(A)). Result has {composedFields.Count} fields.",
            Warning: warning);
    }

    /// <summary>
    /// Checks if a filter and map can be reordered.
    /// Safe if filter doesn't depend on fields computed by map.
    /// </summary>
    public CommutativityResult CheckFilterMapCommutativity(FilterOperation filter, MapOperation map)
    {
        var filterField = filter.Field;
        var mapProducedFields = map.Mappings.Keys.ToHashSet();

        // If filter uses a field that map produces, cannot reorder
        if (mapProducedFields.Contains(filterField))
        {
            return new CommutativityResult(
                CanReorder: false,
                SafetyLevel: SafetyLevel.Unsafe,
                Proof: $"Filter on '{filterField}' depends on computed field from map. Cannot reorder.");
        }

        // Filter uses an original field, not one computed by map - safe to reorder
        return new CommutativityResult(
            CanReorder: true,
            SafetyLevel: SafetyLevel.Safe,
            Proof: $"Filter on '{filterField}' is independent of map's computed fields ({string.Join(", ", mapProducedFields)}). Safe to reorder.");
    }

    /// <summary>
    /// Checks if limit and filter can be reordered.
    /// Generally NOT safe - limit(N) → filter ≠ filter → limit(N)
    /// </summary>
    public CommutativityResult CheckLimitFilterCommutativity(LimitOperation limit, FilterOperation filter)
    {
        // Limit before filter: take first N, then filter (may get < N results)
        // Filter before limit: filter all, then take first N
        // These are NOT equivalent!
        return new CommutativityResult(
            CanReorder: false,
            SafetyLevel: SafetyLevel.Unsafe,
            Proof: $"limit({limit.Count}) → filter changes result count differently than filter → limit({limit.Count}). Cannot reorder.");
    }

    /// <summary>
    /// Checks if limit and map can be reordered.
    /// Safe because map is count-preserving.
    /// </summary>
    public CommutativityResult CheckLimitMapCommutativity(LimitOperation limit, MapOperation map)
    {
        // Map is count-preserving: it transforms each element without adding/removing
        // So limit(N) → map = map → limit(N) (both produce N mapped elements)
        return new CommutativityResult(
            CanReorder: true,
            SafetyLevel: SafetyLevel.Safe,
            Proof: $"Map is count-preserving. limit({limit.Count}) → map = map → limit({limit.Count}). Safe to reorder.");
    }

    /// <summary>
    /// Checks if two operations are semantically equivalent.
    /// </summary>
    public bool AreOperationsEquivalent(TransformOperation op1, TransformOperation op2)
    {
        if (op1.GetType() != op2.GetType())
            return false;

        return (op1, op2) switch
        {
            (FilterOperation f1, FilterOperation f2) =>
                f1.Field == f2.Field &&
                f1.Operator == f2.Operator &&
                Equals(f1.Value, f2.Value),

            (MapOperation m1, MapOperation m2) =>
                m1.Mappings.Count == m2.Mappings.Count &&
                m1.Mappings.All(kvp =>
                    m2.Mappings.TryGetValue(kvp.Key, out var v) && v == kvp.Value),

            (SelectOperation s1, SelectOperation s2) =>
                s1.Fields.Count == s2.Fields.Count &&
                s1.Fields.All(kvp =>
                    s2.Fields.TryGetValue(kvp.Key, out var v) && v == kvp.Value),

            (LimitOperation l1, LimitOperation l2) =>
                l1.Count == l2.Count,

            _ => false
        };
    }

    /// <summary>
    /// Assesses the safety level of an optimization candidate.
    /// </summary>
    public SafetyLevel AssessOptimizationSafety(OptimizationCandidate candidate)
    {
        return candidate.Type switch
        {
            // Always safe optimizations
            "filter-fusion" => SafetyLevel.Safe,
            "transform-fusion" => SafetyLevel.Safe,
            "dead-task" => SafetyLevel.Safe,

            // Conditionally safe - depends on field dependencies
            "filter-reorder" => SafetyLevel.Conditional,
            "redundant-transform" => SafetyLevel.Conditional,
            "parallel-promotion" => SafetyLevel.Conditional,

            // May change semantics
            "early-limit" => SafetyLevel.Conditional,

            // Unknown optimization type
            _ => SafetyLevel.Unsafe
        };
    }

    /// <summary>
    /// Extracts field references from an expression like $.fieldName
    /// </summary>
    private HashSet<string> ExtractFieldReferences(string expression)
    {
        var fields = new HashSet<string>();
        var matches = FieldReferencePattern.Matches(expression);

        foreach (Match match in matches)
        {
            if (match.Groups.Count > 1)
            {
                fields.Add(match.Groups[1].Value);
            }
        }

        return fields;
    }

    /// <summary>
    /// Formats a value for display in proof strings.
    /// </summary>
    private static string FormatValue(object? value)
    {
        return value switch
        {
            null => "null",
            string s => $"'{s}'",
            _ => value.ToString() ?? "null"
        };
    }
}
