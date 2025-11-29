using System.Text.Json;
using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services.Operations;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class SelectOperationExecutorTests
{
    private readonly SelectOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_ExtractsSingleField()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement(new { name = "Alice", age = 30, city = "NYC" }),
            JsonSerializer.SerializeToElement(new { name = "Bob", age = 25, city = "LA" })
        };
        var operation = new SelectOperation
        {
            Fields = new Dictionary<string, string> { ["name"] = "$.name" }
        };

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert
        result.Should().HaveCount(2);
        var first = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(result[0]);
        first!["name"].GetString().Should().Be("Alice");
        first.Should().ContainKey("name").And.HaveCount(1);
    }

    [Fact]
    public async Task Execute_ExtractsMultipleFields()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement(new { name = "Alice", age = 30, city = "NYC", country = "USA" })
        };
        var operation = new SelectOperation
        {
            Fields = new Dictionary<string, string>
            {
                ["userName"] = "$.name",
                ["userAge"] = "$.age"
            }
        };

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert
        var first = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(result[0]);
        first!["userName"].GetString().Should().Be("Alice");
        first["userAge"].GetInt32().Should().Be(30);
        first.Should().HaveCount(2);
    }

    [Fact]
    public async Task Execute_HandlesNestedPaths()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement(new
            {
                user = new { profile = new { email = "alice@test.com" } }
            })
        };
        var operation = new SelectOperation
        {
            Fields = new Dictionary<string, string> { ["email"] = "$.user.profile.email" }
        };

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert
        var first = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(result[0]);
        first!["email"].GetString().Should().Be("alice@test.com");
    }
}

public class FilterOperationExecutorTests
{
    private readonly FilterOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_EqualsOperator_FiltersCorrectly()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement(new { status = "active", id = 1 }),
            JsonSerializer.SerializeToElement(new { status = "inactive", id = 2 }),
            JsonSerializer.SerializeToElement(new { status = "active", id = 3 })
        };
        var operation = new FilterOperation
        {
            Field = "$.status",
            Operator = "eq",
            Value = "active"
        };

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert
        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task Execute_GreaterThanOperator_FiltersNumbers()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement(new { age = 25 }),
            JsonSerializer.SerializeToElement(new { age = 30 }),
            JsonSerializer.SerializeToElement(new { age = 35 })
        };
        var operation = new FilterOperation
        {
            Field = "$.age",
            Operator = "gt",
            Value = 28
        };

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert
        result.Should().HaveCount(2);
    }

    [Fact]
    public async Task Execute_ContainsOperator_FiltersStrings()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement(new { email = "alice@gmail.com" }),
            JsonSerializer.SerializeToElement(new { email = "bob@yahoo.com" }),
            JsonSerializer.SerializeToElement(new { email = "charlie@gmail.com" })
        };
        var operation = new FilterOperation
        {
            Field = "$.email",
            Operator = "contains",
            Value = "gmail"
        };

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert
        result.Should().HaveCount(2);
    }
}

public class GroupByOperationExecutorTests
{
    private readonly GroupByOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_GroupsByKeyAndAggregates()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement(new { customerId = "C1", amount = 100.0 }),
            JsonSerializer.SerializeToElement(new { customerId = "C2", amount = 50.0 }),
            JsonSerializer.SerializeToElement(new { customerId = "C1", amount = 150.0 })
        };
        var operation = new GroupByOperation
        {
            Key = "$.customerId",
            Aggregations = new Dictionary<string, Aggregation>
            {
                ["total"] = new Aggregation { Function = "sum", Field = "$.amount" },
                ["count"] = new Aggregation { Function = "count", Field = "$.amount" }
            }
        };

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert
        result.Should().HaveCount(2);
        var groups = result.Select(r => JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(r)).ToList();
        var c1Group = groups.First(g => g!["key"].GetString() == "C1");
        c1Group!["total"].GetDouble().Should().Be(250.0);
        c1Group["count"].GetInt32().Should().Be(2);
    }

    [Fact]
    public async Task Execute_SupportsMultipleAggregations()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement(new { category = "A", price = 10.0 }),
            JsonSerializer.SerializeToElement(new { category = "A", price = 20.0 }),
            JsonSerializer.SerializeToElement(new { category = "A", price = 30.0 })
        };
        var operation = new GroupByOperation
        {
            Key = "$.category",
            Aggregations = new Dictionary<string, Aggregation>
            {
                ["sum"] = new Aggregation { Function = "sum", Field = "$.price" },
                ["avg"] = new Aggregation { Function = "avg", Field = "$.price" },
                ["min"] = new Aggregation { Function = "min", Field = "$.price" },
                ["max"] = new Aggregation { Function = "max", Field = "$.price" }
            }
        };

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert
        var group = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(result[0]);
        group!["sum"].GetDouble().Should().Be(60.0);
        group["avg"].GetDouble().Should().BeApproximately(20.0, 0.01);
        group["min"].GetDouble().Should().Be(10.0);
        group["max"].GetDouble().Should().Be(30.0);
    }
}

public class SortByOperationExecutorTests
{
    private readonly SortByOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_SortsAscending()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement(new { name = "Charlie", age = 35 }),
            JsonSerializer.SerializeToElement(new { name = "Alice", age = 25 }),
            JsonSerializer.SerializeToElement(new { name = "Bob", age = 30 })
        };
        var operation = new SortByOperation { Field = "$.age", Order = "asc" };

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert
        var ages = result.Select(r => JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(r)!["age"].GetInt32()).ToList();
        ages.Should().Equal(25, 30, 35);
    }

    [Fact]
    public async Task Execute_SortsDescending()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement(new { score = 85 }),
            JsonSerializer.SerializeToElement(new { score = 95 }),
            JsonSerializer.SerializeToElement(new { score = 75 })
        };
        var operation = new SortByOperation { Field = "$.score", Order = "desc" };

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert
        var scores = result.Select(r => JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(r)!["score"].GetInt32()).ToList();
        scores.Should().Equal(95, 85, 75);
    }
}

public class LimitOperationExecutorTests
{
    private readonly LimitOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_LimitsResults()
    {
        // Arrange
        var data = Enumerable.Range(1, 10).Select(i => JsonSerializer.SerializeToElement(new { id = i })).ToArray();
        var operation = new LimitOperation { Count = 3 };

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert
        result.Should().HaveCount(3);
    }
}

public class SkipOperationExecutorTests
{
    private readonly SkipOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_SkipsRecords()
    {
        // Arrange
        var data = Enumerable.Range(1, 10).Select(i => JsonSerializer.SerializeToElement(new { id = i })).ToArray();
        var operation = new SkipOperation { Count = 5 };

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert
        result.Should().HaveCount(5);
        var first = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(result[0]);
        first!["id"].GetInt32().Should().Be(6);
    }
}

public class MapOperationExecutorTests
{
    private readonly MapOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_RemapsFields()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement(new { firstName = "Alice", lastName = "Smith" }),
            JsonSerializer.SerializeToElement(new { firstName = "Bob", lastName = "Jones" })
        };
        var operation = new MapOperation
        {
            Mappings = new Dictionary<string, string>
            {
                ["name"] = "$.firstName",
                ["surname"] = "$.lastName"
            }
        };

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert
        result.Should().HaveCount(2);
        var first = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(result[0]);
        first!["name"].GetString().Should().Be("Alice");
        first["surname"].GetString().Should().Be("Smith");
        first.Should().HaveCount(2);
    }
}

public class FlatMapOperationExecutorTests
{
    private readonly FlatMapOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_FlattensNestedArrays()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement(new
            {
                orderId = "O1",
                items = new[] { new { product = "A" }, new { product = "B" } }
            }),
            JsonSerializer.SerializeToElement(new
            {
                orderId = "O2",
                items = new[] { new { product = "C" } }
            })
        };
        var operation = new FlatMapOperation { Path = "$.items" };

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert
        result.Should().HaveCount(3);
        var products = result.Select(r =>
            JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(r)!["product"].GetString()).ToList();
        products.Should().Equal("A", "B", "C");
    }
}

public class JoinOperationExecutorTests
{
    private readonly JoinOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_InnerJoin_MergesMatchingRecords()
    {
        // Arrange
        var leftData = new[]
        {
            JsonSerializer.SerializeToElement(new { userId = "U1", name = "Alice" }),
            JsonSerializer.SerializeToElement(new { userId = "U2", name = "Bob" })
        };
        var rightData = new[]
        {
            new { userId = "U1", city = "NYC" },
            new { userId = "U2", city = "LA" }
        };
        var operation = new JoinOperation
        {
            LeftKey = "$.userId",
            RightKey = "$.userId",
            RightData = rightData,
            JoinType = "inner"
        };

        // Act
        var result = await _executor.ExecuteAsync(operation, leftData);

        // Assert
        result.Should().HaveCount(2);
        var first = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(result[0]);
        first!["userId"].GetString().Should().Be("U1");
        first["name"].GetString().Should().Be("Alice");
        first["city"].GetString().Should().Be("NYC");
    }
}

public class EnrichOperationExecutorTests
{
    private readonly EnrichOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_AddsComputedFields()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement(new { firstName = "Alice", lastName = "Smith" }),
            JsonSerializer.SerializeToElement(new { firstName = "Bob", lastName = "Jones" })
        };
        var operation = new EnrichOperation
        {
            Fields = new Dictionary<string, string>
            {
                ["first"] = "$.firstName",
                ["last"] = "$.lastName"
            }
        };

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert
        result.Should().HaveCount(2);
        var first = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(result[0]);
        first!["firstName"].GetString().Should().Be("Alice");
        first["lastName"].GetString().Should().Be("Smith");
        first["first"].GetString().Should().Be("Alice");
        first["last"].GetString().Should().Be("Smith");
        first.Should().HaveCount(4); // Original 2 + 2 enriched
    }
}

public class AggregateOperationExecutorTests
{
    private readonly AggregateOperationExecutor _executor = new();

    [Fact]
    public async Task Execute_AggregatesEntireDataset()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement(new { amount = 100.0 }),
            JsonSerializer.SerializeToElement(new { amount = 200.0 }),
            JsonSerializer.SerializeToElement(new { amount = 300.0 })
        };
        var operation = new AggregateOperation
        {
            Aggregations = new Dictionary<string, Aggregation>
            {
                ["total"] = new Aggregation { Function = "sum", Field = "$.amount" },
                ["average"] = new Aggregation { Function = "avg", Field = "$.amount" },
                ["count"] = new Aggregation { Function = "count", Field = "$.amount" }
            }
        };

        // Act
        var result = await _executor.ExecuteAsync(operation, data);

        // Assert
        result.Should().HaveCount(1); // Single aggregated result
        var aggregated = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(result[0]);
        aggregated!["total"].GetDouble().Should().Be(600.0);
        aggregated["average"].GetDouble().Should().Be(200.0);
        aggregated["count"].GetInt32().Should().Be(3);
    }
}
