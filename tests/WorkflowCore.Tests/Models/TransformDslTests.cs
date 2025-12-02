using System.Text.Json;
using FluentAssertions;
using WorkflowCore.Models;
using Xunit;

namespace WorkflowCore.Tests.Models;

public class TransformDslDefinitionTests
{
    [Fact]
    public void TransformDslDefinition_ShouldSerializeToJson()
    {
        // Arrange
        var dsl = new TransformDslDefinition
        {
            Version = "1.0",
            Input = "$.orders",
            Pipeline = new List<TransformOperation>
            {
                new FilterOperation
                {
                    Field = "$.status",
                    Operator = "eq",
                    Value = "completed"
                }
            }
        };

        // Act
        var json = JsonSerializer.Serialize(dsl);

        // Assert
        json.Should().Contain("\"version\":\"1.0\"");
        json.Should().Contain("\"input\":\"$.orders\"");
        json.Should().Contain("\"pipeline\"");
    }

    [Fact]
    public void TransformDslDefinition_ShouldDeserializeFromJson()
    {
        // Arrange
        var json = @"{
            ""version"": ""1.0"",
            ""input"": ""$.users"",
            ""pipeline"": [
                {
                    ""operation"": ""filter"",
                    ""field"": ""$.age"",
                    ""operator"": ""gt"",
                    ""value"": 18
                }
            ]
        }";

        // Act
        var dsl = JsonSerializer.Deserialize<TransformDslDefinition>(json);

        // Assert
        dsl.Should().NotBeNull();
        dsl!.Version.Should().Be("1.0");
        dsl.Input.Should().Be("$.users");
        dsl.Pipeline.Should().HaveCount(1);
    }

    [Fact]
    public void TransformDslDefinition_WithoutInput_ShouldUseEntireDataset()
    {
        // Arrange
        var json = @"{
            ""version"": ""1.0"",
            ""pipeline"": []
        }";

        // Act
        var dsl = JsonSerializer.Deserialize<TransformDslDefinition>(json);

        // Assert
        dsl.Should().NotBeNull();
        dsl!.Input.Should().BeNull();
    }
}

public class FilterOperationTests
{
    [Fact]
    public void FilterOperation_ShouldSerializeWithOperationType()
    {
        // Arrange
        var operation = new FilterOperation
        {
            Field = "$.status",
            Operator = "eq",
            Value = "active"
        };

        // Act - serialize as base type to include polymorphic discriminator
        var json = JsonSerializer.Serialize<TransformOperation>(operation);

        // Assert
        json.Should().Contain("\"operation\":\"filter\"");
        json.Should().Contain("\"field\":\"$.status\"");
        json.Should().Contain("\"operator\":\"eq\"");
    }

    [Fact]
    public void FilterOperation_ShouldSupportAllOperators()
    {
        // Arrange
        var operators = new[] { "eq", "ne", "gt", "lt", "gte", "lte", "contains", "startsWith", "endsWith" };

        foreach (var op in operators)
        {
            var operation = new FilterOperation
            {
                Field = "$.value",
                Operator = op,
                Value = 10
            };

            // Act
            var json = JsonSerializer.Serialize<TransformOperation>(operation);

            // Assert
            json.Should().Contain($"\"operator\":\"{op}\"");
        }
    }
}

public class SelectOperationTests
{
    [Fact]
    public void SelectOperation_ShouldSerializeFieldList()
    {
        // Arrange
        var operation = new SelectOperation
        {
            Fields = new Dictionary<string, string>
            {
                ["email"] = "$.user.email",
                ["name"] = "$.user.fullName"
            }
        };

        // Act - serialize as base type to include polymorphic discriminator
        var json = JsonSerializer.Serialize<TransformOperation>(operation);

        // Assert
        json.Should().Contain("\"operation\":\"select\"");
        json.Should().Contain("\"email\"");
        json.Should().Contain("\"$.user.email\"");
    }
}

public class GroupByOperationTests
{
    [Fact]
    public void GroupByOperation_ShouldSerializeWithAggregations()
    {
        // Arrange
        var operation = new GroupByOperation
        {
            Key = "$.customerId",
            Aggregations = new Dictionary<string, Aggregation>
            {
                ["totalSpent"] = new Aggregation { Function = "sum", Field = "$.amount" },
                ["orderCount"] = new Aggregation { Function = "count", Field = "$.orderId" }
            }
        };

        // Act - serialize as base type to include polymorphic discriminator
        var json = JsonSerializer.Serialize<TransformOperation>(operation);

        // Assert
        json.Should().Contain("\"operation\":\"groupBy\"");
        json.Should().Contain("\"key\":\"$.customerId\"");
        json.Should().Contain("\"totalSpent\"");
        json.Should().Contain("\"sum\"");
    }
}

public class MapOperationTests
{
    [Fact]
    public void MapOperation_ShouldSerializeFieldMappings()
    {
        // Arrange
        var operation = new MapOperation
        {
            Mappings = new Dictionary<string, string>
            {
                ["fullName"] = "concat($.firstName, ' ', $.lastName)",
                ["age"] = "$.userAge"
            }
        };

        // Act - serialize as base type to include polymorphic discriminator
        var json = JsonSerializer.Serialize<TransformOperation>(operation);

        // Assert
        json.Should().Contain("\"operation\":\"map\"");
        json.Should().Contain("\"fullName\"");
    }
}

public class SortByOperationTests
{
    [Fact]
    public void SortByOperation_DefaultsToAscending()
    {
        // Arrange
        var operation = new SortByOperation
        {
            Field = "$.createdAt"
        };

        // Act - serialize as base type to include polymorphic discriminator
        var json = JsonSerializer.Serialize<TransformOperation>(operation);

        // Assert
        json.Should().Contain("\"order\":\"asc\"");
    }

    [Fact]
    public void SortByOperation_SupportsDescending()
    {
        // Arrange
        var operation = new SortByOperation
        {
            Field = "$.amount",
            Order = "desc"
        };

        // Act - serialize as base type to include polymorphic discriminator
        var json = JsonSerializer.Serialize<TransformOperation>(operation);

        // Assert
        json.Should().Contain("\"order\":\"desc\"");
    }
}

public class JoinOperationTests
{
    [Fact]
    public void JoinOperation_ShouldSerializeWithKeys()
    {
        // Arrange
        var operation = new JoinOperation
        {
            LeftKey = "$.userId",
            RightKey = "$.id",
            JoinType = "left"
        };

        // Act - serialize as base type to include polymorphic discriminator
        var json = JsonSerializer.Serialize<TransformOperation>(operation);

        // Assert
        json.Should().Contain("\"operation\":\"join\"");
        json.Should().Contain("\"leftKey\":\"$.userId\"");
        json.Should().Contain("\"joinType\":\"left\"");
    }
}

public class LimitOperationTests
{
    [Fact]
    public void LimitOperation_ShouldSerializeCount()
    {
        // Arrange
        var operation = new LimitOperation { Count = 10 };

        // Act - serialize as base type to include polymorphic discriminator
        var json = JsonSerializer.Serialize<TransformOperation>(operation);

        // Assert
        json.Should().Contain("\"operation\":\"limit\"");
        json.Should().Contain("\"count\":10");
    }
}

public class SkipOperationTests
{
    [Fact]
    public void SkipOperation_ShouldSerializeCount()
    {
        // Arrange
        var operation = new SkipOperation { Count = 20 };

        // Act - serialize as base type to include polymorphic discriminator
        var json = JsonSerializer.Serialize<TransformOperation>(operation);

        // Assert
        json.Should().Contain("\"operation\":\"skip\"");
        json.Should().Contain("\"count\":20");
    }
}

public class AggregateOperationTests
{
    [Fact]
    public void AggregateOperation_ShouldSerializeMultipleAggregations()
    {
        // Arrange
        var operation = new AggregateOperation
        {
            Aggregations = new Dictionary<string, Aggregation>
            {
                ["totalRevenue"] = new Aggregation { Function = "sum", Field = "$.revenue" },
                ["avgOrderValue"] = new Aggregation { Function = "avg", Field = "$.orderValue" },
                ["maxAmount"] = new Aggregation { Function = "max", Field = "$.amount" }
            }
        };

        // Act - serialize as base type to include polymorphic discriminator
        var json = JsonSerializer.Serialize<TransformOperation>(operation);

        // Assert
        json.Should().Contain("\"operation\":\"aggregate\"");
        json.Should().Contain("\"totalRevenue\"");
        json.Should().Contain("\"sum\"");
        json.Should().Contain("\"avg\"");
    }
}

public class PolymorphicSerializationTests
{
    [Fact]
    public void TransformOperation_ShouldDeserializeToCorrectType_Filter()
    {
        // Arrange
        var json = @"{""operation"": ""filter"", ""field"": ""$.status"", ""operator"": ""eq"", ""value"": ""active""}";

        // Act
        var operation = JsonSerializer.Deserialize<TransformOperation>(json);

        // Assert
        operation.Should().BeOfType<FilterOperation>();
        var filterOp = operation as FilterOperation;
        filterOp!.Field.Should().Be("$.status");
    }

    [Fact]
    public void TransformOperation_ShouldDeserializeToCorrectType_Select()
    {
        // Arrange
        var json = @"{""operation"": ""select"", ""fields"": {""email"": ""$.user.email""}}";

        // Act
        var operation = JsonSerializer.Deserialize<TransformOperation>(json);

        // Assert
        operation.Should().BeOfType<SelectOperation>();
    }

    [Fact]
    public void Pipeline_ShouldDeserializeMultipleOperationTypes()
    {
        // Arrange
        var json = @"{
            ""version"": ""1.0"",
            ""pipeline"": [
                {""operation"": ""filter"", ""field"": ""$.active"", ""operator"": ""eq"", ""value"": true},
                {""operation"": ""select"", ""fields"": {""id"": ""$.userId""}},
                {""operation"": ""limit"", ""count"": 10}
            ]
        }";

        // Act
        var dsl = JsonSerializer.Deserialize<TransformDslDefinition>(json);

        // Assert
        dsl.Should().NotBeNull();
        dsl!.Pipeline.Should().HaveCount(3);
        dsl.Pipeline[0].Should().BeOfType<FilterOperation>();
        dsl.Pipeline[1].Should().BeOfType<SelectOperation>();
        dsl.Pipeline[2].Should().BeOfType<LimitOperation>();
    }
}
