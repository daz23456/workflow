using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

/// <summary>
/// Tests for TransformEquivalenceChecker - algebraic rules to verify transform optimizations.
/// Stage 14.2: Transform Equivalence Checker
/// </summary>
public class TransformEquivalenceCheckerTests
{
    private readonly ITransformEquivalenceChecker _checker;

    public TransformEquivalenceCheckerTests()
    {
        _checker = new TransformEquivalenceChecker();
    }

    #region Filter Fusion

    [Fact]
    public void CheckFilterFusion_TwoIndependentFilters_AreEquivalent()
    {
        // Arrange - filter(status == 'active') → filter(age >= 18)
        // Should be equivalent to filter(status == 'active' && age >= 18)
        var filter1 = new FilterOperation { Field = "status", Operator = "eq", Value = "active" };
        var filter2 = new FilterOperation { Field = "age", Operator = "gte", Value = 18 };

        // Act
        var result = _checker.CheckFilterFusion(filter1, filter2);

        // Assert
        result.IsEquivalent.Should().BeTrue();
        result.SafetyLevel.Should().Be(SafetyLevel.Safe);
        result.FusedFilter.Should().NotBeNull();
        result.Proof.Should().Contain("AND");
    }

    [Fact]
    public void CheckFilterFusion_SameFieldFilters_AreEquivalent()
    {
        // Arrange - filter(price > 10) → filter(price < 100)
        // Should be equivalent to filter(price > 10 && price < 100)
        var filter1 = new FilterOperation { Field = "price", Operator = "gt", Value = 10 };
        var filter2 = new FilterOperation { Field = "price", Operator = "lt", Value = 100 };

        // Act
        var result = _checker.CheckFilterFusion(filter1, filter2);

        // Assert
        result.IsEquivalent.Should().BeTrue();
        result.SafetyLevel.Should().Be(SafetyLevel.Safe);
    }

    [Fact]
    public void CheckFilterFusion_ContradictoryFilters_DetectsAlwaysFalse()
    {
        // Arrange - filter(status == 'active') → filter(status == 'inactive')
        // These can never both be true - optimization should detect this
        var filter1 = new FilterOperation { Field = "status", Operator = "eq", Value = "active" };
        var filter2 = new FilterOperation { Field = "status", Operator = "eq", Value = "inactive" };

        // Act
        var result = _checker.CheckFilterFusion(filter1, filter2);

        // Assert
        result.IsEquivalent.Should().BeTrue(); // Still equivalent fusion
        result.Warning.Should().Contain("contradictory"); // But warn about empty result
    }

    #endregion

    #region Map Composition

    [Fact]
    public void CheckMapComposition_SequentialMaps_AreEquivalent()
    {
        // Arrange - map({a: $.x}) → map({b: $.a})
        // Should be equivalent to map({b: $.x})
        var map1 = new MapOperation { Mappings = new() { ["a"] = "$.x" } };
        var map2 = new MapOperation { Mappings = new() { ["b"] = "$.a" } };

        // Act
        var result = _checker.CheckMapComposition(map1, map2);

        // Assert
        result.IsEquivalent.Should().BeTrue();
        result.SafetyLevel.Should().Be(SafetyLevel.Safe);
        result.ComposedMap.Should().NotBeNull();
        result.ComposedMap!.Mappings.Should().ContainKey("b");
    }

    [Fact]
    public void CheckMapComposition_IndependentMappings_Merges()
    {
        // Arrange - map({a: $.x}) → map({b: $.y})
        // Should be equivalent to map({a: $.x, b: $.y})
        var map1 = new MapOperation { Mappings = new() { ["a"] = "$.x" } };
        var map2 = new MapOperation { Mappings = new() { ["b"] = "$.y" } };

        // Act
        var result = _checker.CheckMapComposition(map1, map2);

        // Assert
        result.IsEquivalent.Should().BeTrue();
        result.ComposedMap!.Mappings.Should().HaveCount(2);
    }

    [Fact]
    public void CheckMapComposition_OverwritingField_PreservesLatest()
    {
        // Arrange - map({a: $.x}) → map({a: $.y})
        // Second map overwrites first
        var map1 = new MapOperation { Mappings = new() { ["a"] = "$.x" } };
        var map2 = new MapOperation { Mappings = new() { ["a"] = "$.y" } };

        // Act
        var result = _checker.CheckMapComposition(map1, map2);

        // Assert
        result.IsEquivalent.Should().BeTrue();
        result.ComposedMap!.Mappings["a"].Should().Be("$.y");
    }

    #endregion

    #region Select Composition

    [Fact]
    public void CheckSelectComposition_NestedSelects_AreEquivalent()
    {
        // Arrange - select({id, name, email}) → select({id, name})
        // Should be equivalent to select({id, name})
        var select1 = new SelectOperation
        {
            Fields = new() { ["id"] = "$.id", ["name"] = "$.name", ["email"] = "$.email" }
        };
        var select2 = new SelectOperation
        {
            Fields = new() { ["id"] = "$.id", ["name"] = "$.name" }
        };

        // Act
        var result = _checker.CheckSelectComposition(select1, select2);

        // Assert
        result.IsEquivalent.Should().BeTrue();
        result.SafetyLevel.Should().Be(SafetyLevel.Safe);
        result.ComposedSelect!.Fields.Should().HaveCount(2);
    }

    [Fact]
    public void CheckSelectComposition_FirstSelectRedundant_DetectsOptimization()
    {
        // Arrange - select({id, name}) → select({id, name, email})
        // First select is a subset, second tries to add field that doesn't exist
        var select1 = new SelectOperation
        {
            Fields = new() { ["id"] = "$.id", ["name"] = "$.name" }
        };
        var select2 = new SelectOperation
        {
            Fields = new() { ["id"] = "$.id", ["name"] = "$.name", ["email"] = "$.email" }
        };

        // Act
        var result = _checker.CheckSelectComposition(select1, select2);

        // Assert
        result.IsEquivalent.Should().BeTrue();
        result.Warning.Should().Contain("email"); // Field won't exist after first select
    }

    #endregion

    #region Filter-Map Commutativity

    [Fact]
    public void CheckFilterMapCommutativity_FilterOnOriginalField_CanReorder()
    {
        // Arrange - map({fullName: $.firstName}) → filter(status == 'active')
        // Filter uses 'status' which is not produced by map, so reordering is safe
        var map = new MapOperation { Mappings = new() { ["fullName"] = "$.firstName" } };
        var filter = new FilterOperation { Field = "status", Operator = "eq", Value = "active" };

        // Act
        var result = _checker.CheckFilterMapCommutativity(filter, map);

        // Assert
        result.CanReorder.Should().BeTrue();
        result.SafetyLevel.Should().Be(SafetyLevel.Safe);
        result.Proof.Should().Contain("independent");
    }

    [Fact]
    public void CheckFilterMapCommutativity_FilterOnMappedField_CannotReorder()
    {
        // Arrange - map({totalPrice: $.price * $.qty}) → filter(totalPrice > 100)
        // Filter uses 'totalPrice' which is computed by map, cannot reorder
        var map = new MapOperation { Mappings = new() { ["totalPrice"] = "$.price * $.qty" } };
        var filter = new FilterOperation { Field = "totalPrice", Operator = "gt", Value = 100 };

        // Act
        var result = _checker.CheckFilterMapCommutativity(filter, map);

        // Assert
        result.CanReorder.Should().BeFalse();
        result.SafetyLevel.Should().Be(SafetyLevel.Unsafe);
        result.Proof.Should().Contain("depends on computed field");
    }

    [Fact]
    public void CheckFilterMapCommutativity_FilterOnPassthroughField_CanReorder()
    {
        // Arrange - map passes through status unchanged
        // filter(status == 'active') can run before or after
        var map = new MapOperation { Mappings = new() { ["name"] = "$.firstName" } };
        var filter = new FilterOperation { Field = "status", Operator = "eq", Value = "active" };

        // Act
        var result = _checker.CheckFilterMapCommutativity(filter, map);

        // Assert
        result.CanReorder.Should().BeTrue();
    }

    #endregion

    #region Limit Commutativity

    [Fact]
    public void CheckLimitFilterCommutativity_LimitBeforeFilter_NotEquivalent()
    {
        // Arrange - limit(10) → filter(status == 'active')
        // vs filter(status == 'active') → limit(10)
        // These are NOT equivalent! Different results.
        var limit = new LimitOperation { Count = 10 };
        var filter = new FilterOperation { Field = "status", Operator = "eq", Value = "active" };

        // Act
        var result = _checker.CheckLimitFilterCommutativity(limit, filter);

        // Assert
        result.CanReorder.Should().BeFalse();
        result.SafetyLevel.Should().Be(SafetyLevel.Unsafe);
        result.Proof.Should().Contain("changes result count");
    }

    [Fact]
    public void CheckLimitMapCommutativity_LimitBeforeMap_IsEquivalent()
    {
        // Arrange - limit(10) → map({name: $.firstName})
        // vs map({name: $.firstName}) → limit(10)
        // These ARE equivalent - map doesn't change count
        var limit = new LimitOperation { Count = 10 };
        var map = new MapOperation { Mappings = new() { ["name"] = "$.firstName" } };

        // Act
        var result = _checker.CheckLimitMapCommutativity(limit, map);

        // Assert
        result.CanReorder.Should().BeTrue();
        result.SafetyLevel.Should().Be(SafetyLevel.Safe);
        result.Proof.Should().Contain("count-preserving");
    }

    #endregion

    #region General Equivalence Check

    [Fact]
    public void CheckEquivalence_SameOperations_AreEquivalent()
    {
        // Arrange
        var op1 = new FilterOperation { Field = "status", Operator = "eq", Value = "active" };
        var op2 = new FilterOperation { Field = "status", Operator = "eq", Value = "active" };

        // Act
        var result = _checker.AreOperationsEquivalent(op1, op2);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public void CheckEquivalence_DifferentOperations_NotEquivalent()
    {
        // Arrange
        var op1 = new FilterOperation { Field = "status", Operator = "eq", Value = "active" };
        var op2 = new FilterOperation { Field = "status", Operator = "eq", Value = "inactive" };

        // Act
        var result = _checker.AreOperationsEquivalent(op1, op2);

        // Assert
        result.Should().BeFalse();
    }

    #endregion

    #region Safety Level Assessment

    [Fact]
    public void AssessSafety_FilterFusion_IsSafe()
    {
        // Arrange
        var optimization = new OptimizationCandidate(
            Type: "filter-fusion",
            TaskId: "task-1",
            Description: "Fuse filters",
            EstimatedImpact: 0.2);

        // Act
        var safety = _checker.AssessOptimizationSafety(optimization);

        // Assert
        safety.Should().Be(SafetyLevel.Safe);
    }

    [Fact]
    public void AssessSafety_FilterReorder_IsConditional()
    {
        // Arrange - filter reorder is safe only if filter doesn't use computed fields
        var optimization = new OptimizationCandidate(
            Type: "filter-reorder",
            TaskId: "task-1",
            Description: "Reorder filter before map",
            EstimatedImpact: 0.4);

        // Act
        var safety = _checker.AssessOptimizationSafety(optimization);

        // Assert
        safety.Should().Be(SafetyLevel.Conditional);
    }

    [Fact]
    public void AssessSafety_EarlyLimit_IsConditional()
    {
        // Arrange - early limit may change semantics
        var optimization = new OptimizationCandidate(
            Type: "early-limit",
            TaskId: "task-1",
            Description: "Move limit earlier",
            EstimatedImpact: 0.35);

        // Act
        var safety = _checker.AssessOptimizationSafety(optimization);

        // Assert
        safety.Should().Be(SafetyLevel.Conditional);
    }

    #endregion
}
