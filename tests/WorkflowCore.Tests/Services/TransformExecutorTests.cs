using System.Text.Json;
using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

public class TransformExecutorTests
{
    private readonly TransformExecutor _executor = new();

    [Fact]
    public async Task Execute_SingleOperation_TransformsData()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement(new { name = "Alice", age = 30 }),
            JsonSerializer.SerializeToElement(new { name = "Bob", age = 25 })
        };
        var dsl = new TransformDslDefinition
        {
            Pipeline = new List<TransformOperation>
            {
                new SelectOperation
                {
                    Fields = new Dictionary<string, string> { ["name"] = "$.name" }
                }
            }
        };

        // Act
        var result = await _executor.ExecuteAsync(dsl, data);

        // Assert
        result.Should().HaveCount(2);
        var first = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(result[0]);
        first!["name"].GetString().Should().Be("Alice");
        first.Should().ContainKey("name").And.HaveCount(1);
    }

    [Fact]
    public async Task Execute_MultipleOperations_ExecutesInSequence()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement(new { name = "Alice", age = 30, status = "active" }),
            JsonSerializer.SerializeToElement(new { name = "Bob", age = 25, status = "inactive" }),
            JsonSerializer.SerializeToElement(new { name = "Charlie", age = 35, status = "active" })
        };
        var dsl = new TransformDslDefinition
        {
            Pipeline = new List<TransformOperation>
            {
                // Step 1: Filter for active users
                new FilterOperation { Field = "$.status", Operator = "eq", Value = "active" },
                // Step 2: Select only name and age
                new SelectOperation
                {
                    Fields = new Dictionary<string, string>
                    {
                        ["name"] = "$.name",
                        ["age"] = "$.age"
                    }
                },
                // Step 3: Sort by age descending
                new SortByOperation { Field = "$.age", Order = "desc" }
            }
        };

        // Act
        var result = await _executor.ExecuteAsync(dsl, data);

        // Assert
        result.Should().HaveCount(2); // Only active users
        var first = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(result[0]);
        first!["name"].GetString().Should().Be("Charlie"); // Sorted by age descending
        first["age"].GetInt32().Should().Be(35);
        first.Should().HaveCount(2); // Only name and age fields
    }

    [Fact]
    public async Task Execute_ComplexPipeline_TransformsDataCorrectly()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement(new { customerId = "C1", amount = 100.0, region = "US" }),
            JsonSerializer.SerializeToElement(new { customerId = "C2", amount = 50.0, region = "EU" }),
            JsonSerializer.SerializeToElement(new { customerId = "C1", amount = 150.0, region = "US" }),
            JsonSerializer.SerializeToElement(new { customerId = "C3", amount = 200.0, region = "US" })
        };
        var dsl = new TransformDslDefinition
        {
            Pipeline = new List<TransformOperation>
            {
                // Step 1: Filter for US region
                new FilterOperation { Field = "$.region", Operator = "eq", Value = "US" },
                // Step 2: Group by customerId and sum amounts
                new GroupByOperation
                {
                    Key = "$.customerId",
                    Aggregations = new Dictionary<string, Aggregation>
                    {
                        ["totalAmount"] = new Aggregation { Function = "sum", Field = "$.amount" }
                    }
                },
                // Step 3: Sort by totalAmount descending
                new SortByOperation { Field = "$.totalAmount", Order = "desc" }
            }
        };

        // Act
        var result = await _executor.ExecuteAsync(dsl, data);

        // Assert
        result.Should().HaveCount(2); // C1 and C3 (C2 filtered out)
        var first = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(result[0]);
        first!["key"].GetString().Should().Be("C1"); // Highest total
        first["totalAmount"].GetDouble().Should().Be(250.0);
    }

    [Fact]
    public async Task Execute_EmptyOperations_ReturnsOriginalData()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement(new { id = 1 })
        };
        var dsl = new TransformDslDefinition
        {
            Pipeline = new List<TransformOperation>()
        };

        // Act
        var result = await _executor.ExecuteAsync(dsl, data);

        // Assert
        result.Should().BeEquivalentTo(data);
    }

    [Fact]
    public async Task Execute_EmptyData_ReturnsEmptyResult()
    {
        // Arrange
        var data = Array.Empty<JsonElement>();
        var dsl = new TransformDslDefinition
        {
            Pipeline = new List<TransformOperation>
            {
                new SelectOperation { Fields = new Dictionary<string, string> { ["id"] = "$.id" } }
            }
        };

        // Act
        var result = await _executor.ExecuteAsync(dsl, data);

        // Assert
        result.Should().BeEmpty();
    }

    [Fact]
    public async Task Execute_WithEnrichAndMap_TransformsCorrectly()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement(new { firstName = "Alice", lastName = "Smith", age = 30 })
        };
        var dsl = new TransformDslDefinition
        {
            Pipeline = new List<TransformOperation>
            {
                // Step 1: Enrich with fullName field (derived from existing fields)
                new EnrichOperation
                {
                    Fields = new Dictionary<string, string>
                    {
                        ["first"] = "$.firstName",
                        ["last"] = "$.lastName"
                    }
                },
                // Step 2: Map to new structure
                new MapOperation
                {
                    Mappings = new Dictionary<string, string>
                    {
                        ["name"] = "$.first",
                        ["surname"] = "$.last",
                        ["years"] = "$.age"
                    }
                }
            }
        };

        // Act
        var result = await _executor.ExecuteAsync(dsl, data);

        // Assert
        result.Should().HaveCount(1);
        var first = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(result[0]);
        first!["name"].GetString().Should().Be("Alice");
        first["surname"].GetString().Should().Be("Smith");
        first["years"].GetInt32().Should().Be(30);
        first.Should().HaveCount(3);
    }

    [Fact]
    public async Task Execute_WithFlatMap_FlattensNestedData()
    {
        // Arrange
        var data = new[]
        {
            JsonSerializer.SerializeToElement(new
            {
                orderId = "O1",
                items = new[] { new { product = "A", price = 10.0 }, new { product = "B", price = 20.0 } }
            }),
            JsonSerializer.SerializeToElement(new
            {
                orderId = "O2",
                items = new[] { new { product = "C", price = 30.0 } }
            })
        };
        var dsl = new TransformDslDefinition
        {
            Pipeline = new List<TransformOperation>
            {
                // Step 1: Flatten items array
                new FlatMapOperation { Path = "$.items" },
                // Step 2: Filter for price > 15
                new FilterOperation { Field = "$.price", Operator = "gt", Value = 15.0 }
            }
        };

        // Act
        var result = await _executor.ExecuteAsync(dsl, data);

        // Assert
        result.Should().HaveCount(2); // B and C (A filtered out)
        var products = result.Select(r =>
            JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(r)!["product"].GetString()).ToList();
        products.Should().Equal("B", "C");
    }
}
