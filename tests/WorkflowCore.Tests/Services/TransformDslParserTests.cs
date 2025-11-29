using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class TransformDslParserTests
{
    private readonly ITransformDslParser _parser;

    public TransformDslParserTests()
    {
        _parser = new TransformDslParser();
    }

    [Fact]
    public async Task ParseAsync_ValidDsl_ShouldSucceed()
    {
        // Arrange
        var json = @"{
            ""version"": ""1.0"",
            ""input"": ""$.orders"",
            ""pipeline"": [
                {""operation"": ""filter"", ""field"": ""$.status"", ""operator"": ""eq"", ""value"": ""completed""}
            ]
        }";

        // Act
        var result = await _parser.ParseAsync(json);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Dsl.Should().NotBeNull();
        result.Dsl!.Version.Should().Be("1.0");
        result.Dsl.Input.Should().Be("$.orders");
        result.Dsl.Pipeline.Should().HaveCount(1);
    }

    [Fact]
    public async Task ParseAsync_InvalidJson_ShouldReturnError()
    {
        // Arrange
        var json = "{ invalid json";

        // Act
        var result = await _parser.ParseAsync(json);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("Invalid JSON"));
    }

    [Fact]
    public async Task ParseAsync_MissingVersion_ShouldUseDefault()
    {
        // Arrange
        var json = @"{""pipeline"": []}";

        // Act
        var result = await _parser.ParseAsync(json);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Dsl!.Version.Should().Be("1.0");
    }

    [Fact]
    public async Task ParseAsync_EmptyPipeline_ShouldBeValid()
    {
        // Arrange
        var json = @"{""version"": ""1.0"", ""pipeline"": []}";

        // Act
        var result = await _parser.ParseAsync(json);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Dsl!.Pipeline.Should().BeEmpty();
    }

    [Fact]
    public async Task ParseAsync_UnknownOperation_ShouldReturnError()
    {
        // Arrange
        var json = @"{
            ""pipeline"": [
                {""operation"": ""unknown"", ""field"": ""$.test""}
            ]
        }";

        // Act
        var result = await _parser.ParseAsync(json);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("unknown"));
    }

    [Fact]
    public async Task ValidateAsync_FilterOperationMissingField_ShouldReturnError()
    {
        // Arrange
        var dsl = new TransformDslDefinition
        {
            Pipeline = new List<TransformOperation>
            {
                new FilterOperation { Operator = "eq", Value = "test" } // Missing Field
            }
        };

        // Act
        var result = await _parser.ValidateAsync(dsl);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("field") && e.Contains("required"));
    }

    [Fact]
    public async Task ValidateAsync_FilterOperationMissingOperator_ShouldReturnError()
    {
        // Arrange
        var dsl = new TransformDslDefinition
        {
            Pipeline = new List<TransformOperation>
            {
                new FilterOperation { Field = "$.status", Value = "test" } // Missing Operator
            }
        };

        // Act
        var result = await _parser.ValidateAsync(dsl);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("operator") && e.Contains("required"));
    }

    [Fact]
    public async Task ValidateAsync_FilterOperationInvalidOperator_ShouldReturnError()
    {
        // Arrange
        var dsl = new TransformDslDefinition
        {
            Pipeline = new List<TransformOperation>
            {
                new FilterOperation
                {
                    Field = "$.status",
                    Operator = "invalid_op",
                    Value = "test"
                }
            }
        };

        // Act
        var result = await _parser.ValidateAsync(dsl);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("operator") && e.Contains("invalid"));
    }

    [Fact]
    public async Task ValidateAsync_SelectOperationEmptyFields_ShouldReturnError()
    {
        // Arrange
        var dsl = new TransformDslDefinition
        {
            Pipeline = new List<TransformOperation>
            {
                new SelectOperation { Fields = new Dictionary<string, string>() }
            }
        };

        // Act
        var result = await _parser.ValidateAsync(dsl);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("fields") && e.Contains("at least one"));
    }

    [Fact]
    public async Task ValidateAsync_GroupByOperationMissingKey_ShouldReturnError()
    {
        // Arrange
        var dsl = new TransformDslDefinition
        {
            Pipeline = new List<TransformOperation>
            {
                new GroupByOperation
                {
                    Aggregations = new Dictionary<string, Aggregation>
                    {
                        ["count"] = new Aggregation { Function = "count", Field = "$.id" }
                    }
                }
            }
        };

        // Act
        var result = await _parser.ValidateAsync(dsl);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("key") && e.Contains("required"));
    }

    [Fact]
    public async Task ValidateAsync_GroupByOperationMissingAggregations_ShouldReturnError()
    {
        // Arrange
        var dsl = new TransformDslDefinition
        {
            Pipeline = new List<TransformOperation>
            {
                new GroupByOperation
                {
                    Key = "$.customerId",
                    Aggregations = new Dictionary<string, Aggregation>()
                }
            }
        };

        // Act
        var result = await _parser.ValidateAsync(dsl);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("aggregation") && e.Contains("at least one"));
    }

    [Fact]
    public async Task ValidateAsync_AggregationInvalidFunction_ShouldReturnError()
    {
        // Arrange
        var dsl = new TransformDslDefinition
        {
            Pipeline = new List<TransformOperation>
            {
                new GroupByOperation
                {
                    Key = "$.customerId",
                    Aggregations = new Dictionary<string, Aggregation>
                    {
                        ["test"] = new Aggregation { Function = "invalid_func", Field = "$.amount" }
                    }
                }
            }
        };

        // Act
        var result = await _parser.ValidateAsync(dsl);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("function") && e.Contains("invalid"));
    }

    [Fact]
    public async Task ValidateAsync_JoinOperationMissingKeys_ShouldReturnError()
    {
        // Arrange
        var dsl = new TransformDslDefinition
        {
            Pipeline = new List<TransformOperation>
            {
                new JoinOperation { JoinType = "inner" }
            }
        };

        // Act
        var result = await _parser.ValidateAsync(dsl);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("leftKey") || e.Contains("rightKey"));
    }

    [Fact]
    public async Task ValidateAsync_JoinOperationInvalidJoinType_ShouldReturnError()
    {
        // Arrange
        var dsl = new TransformDslDefinition
        {
            Pipeline = new List<TransformOperation>
            {
                new JoinOperation
                {
                    LeftKey = "$.id",
                    RightKey = "$.userId",
                    JoinType = "invalid_type"
                }
            }
        };

        // Act
        var result = await _parser.ValidateAsync(dsl);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("joinType") && e.Contains("invalid"));
    }

    [Fact]
    public async Task ValidateAsync_SortByOperationMissingField_ShouldReturnError()
    {
        // Arrange
        var dsl = new TransformDslDefinition
        {
            Pipeline = new List<TransformOperation>
            {
                new SortByOperation { Order = "asc" }
            }
        };

        // Act
        var result = await _parser.ValidateAsync(dsl);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("field") && e.Contains("required"));
    }

    [Fact]
    public async Task ValidateAsync_SortByOperationInvalidOrder_ShouldReturnError()
    {
        // Arrange
        var dsl = new TransformDslDefinition
        {
            Pipeline = new List<TransformOperation>
            {
                new SortByOperation
                {
                    Field = "$.createdAt",
                    Order = "invalid_order"
                }
            }
        };

        // Act
        var result = await _parser.ValidateAsync(dsl);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("order") && e.Contains("invalid"));
    }

    [Fact]
    public async Task ValidateAsync_LimitOperationNegativeCount_ShouldReturnError()
    {
        // Arrange
        var dsl = new TransformDslDefinition
        {
            Pipeline = new List<TransformOperation>
            {
                new LimitOperation { Count = -10 }
            }
        };

        // Act
        var result = await _parser.ValidateAsync(dsl);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("count") && e.Contains("positive"));
    }

    [Fact]
    public async Task ValidateAsync_SkipOperationNegativeCount_ShouldReturnError()
    {
        // Arrange
        var dsl = new TransformDslDefinition
        {
            Pipeline = new List<TransformOperation>
            {
                new SkipOperation { Count = -5 }
            }
        };

        // Act
        var result = await _parser.ValidateAsync(dsl);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().Contain(e => e.Contains("count") && e.Contains("positive"));
    }

    [Fact]
    public async Task ValidateAsync_MultipleOperations_AllValid_ShouldSucceed()
    {
        // Arrange
        var dsl = new TransformDslDefinition
        {
            Pipeline = new List<TransformOperation>
            {
                new FilterOperation { Field = "$.status", Operator = "eq", Value = "active" },
                new SelectOperation { Fields = new Dictionary<string, string> { ["id"] = "$.userId" } },
                new SortByOperation { Field = "$.createdAt", Order = "desc" },
                new LimitOperation { Count = 10 }
            }
        };

        // Act
        var result = await _parser.ValidateAsync(dsl);

        // Assert
        result.IsValid.Should().BeTrue();
        result.Errors.Should().BeEmpty();
    }

    [Fact]
    public async Task ValidateAsync_MultipleErrors_ShouldReturnAll()
    {
        // Arrange
        var dsl = new TransformDslDefinition
        {
            Pipeline = new List<TransformOperation>
            {
                new FilterOperation { Operator = "eq" }, // Missing field
                new SelectOperation { Fields = new Dictionary<string, string>() }, // Empty fields
                new LimitOperation { Count = -1 } // Negative count
            }
        };

        // Act
        var result = await _parser.ValidateAsync(dsl);

        // Assert
        result.IsValid.Should().BeFalse();
        result.Errors.Should().HaveCountGreaterThanOrEqualTo(3);
    }
}
