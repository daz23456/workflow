using WorkflowCore.Models;

namespace WorkflowCore.Services;

/// <summary>
/// Safety level for transform optimizations.
/// </summary>
public enum SafetyLevel
{
    /// <summary>Optimization is always safe to apply.</summary>
    Safe,

    /// <summary>Optimization is safe only under certain conditions.</summary>
    Conditional,

    /// <summary>Optimization may change semantics - do not apply automatically.</summary>
    Unsafe
}

/// <summary>
/// Result of checking filter fusion equivalence.
/// </summary>
public record FilterFusionResult(
    bool IsEquivalent,
    SafetyLevel SafetyLevel,
    FilterOperation? FusedFilter,
    string Proof,
    string? Warning = null);

/// <summary>
/// Result of checking map composition equivalence.
/// </summary>
public record MapCompositionResult(
    bool IsEquivalent,
    SafetyLevel SafetyLevel,
    MapOperation? ComposedMap,
    string Proof,
    string? Warning = null);

/// <summary>
/// Result of checking select composition equivalence.
/// </summary>
public record SelectCompositionResult(
    bool IsEquivalent,
    SafetyLevel SafetyLevel,
    SelectOperation? ComposedSelect,
    string Proof,
    string? Warning = null);

/// <summary>
/// Result of checking operation commutativity (can operations be reordered).
/// </summary>
public record CommutativityResult(
    bool CanReorder,
    SafetyLevel SafetyLevel,
    string Proof);

/// <summary>
/// Checks algebraic equivalence of transform operations.
/// Used to verify that optimizations preserve semantics.
/// </summary>
public interface ITransformEquivalenceChecker
{
    /// <summary>
    /// Checks if two consecutive filters can be fused into one.
    /// filter(A) → filter(B) = filter(A && B)
    /// </summary>
    FilterFusionResult CheckFilterFusion(FilterOperation filter1, FilterOperation filter2);

    /// <summary>
    /// Checks if two consecutive maps can be composed into one.
    /// map(f) → map(g) = map(g ∘ f)
    /// </summary>
    MapCompositionResult CheckMapComposition(MapOperation map1, MapOperation map2);

    /// <summary>
    /// Checks if two consecutive selects can be composed into one.
    /// select(A) → select(B) = select(intersection)
    /// </summary>
    SelectCompositionResult CheckSelectComposition(SelectOperation select1, SelectOperation select2);

    /// <summary>
    /// Checks if a filter and map can be reordered.
    /// Safe if filter doesn't depend on fields computed by map.
    /// </summary>
    CommutativityResult CheckFilterMapCommutativity(FilterOperation filter, MapOperation map);

    /// <summary>
    /// Checks if limit and filter can be reordered.
    /// Generally NOT safe - limit(N) → filter ≠ filter → limit(N)
    /// </summary>
    CommutativityResult CheckLimitFilterCommutativity(LimitOperation limit, FilterOperation filter);

    /// <summary>
    /// Checks if limit and map can be reordered.
    /// Safe because map is count-preserving.
    /// </summary>
    CommutativityResult CheckLimitMapCommutativity(LimitOperation limit, MapOperation map);

    /// <summary>
    /// Checks if two operations are semantically equivalent.
    /// </summary>
    bool AreOperationsEquivalent(TransformOperation op1, TransformOperation op2);

    /// <summary>
    /// Assesses the safety level of an optimization candidate.
    /// </summary>
    SafetyLevel AssessOptimizationSafety(OptimizationCandidate candidate);
}
