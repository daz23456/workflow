using FluentAssertions;
using WorkflowCore.Services;

namespace WorkflowCore.Tests.Services;

public class JsonPathTransformerTests
{
    [Fact]
    public async Task TransformAsync_WithValidJsonPath_ReturnsExpectedResult()
    {
        // Arrange
        var transformer = new JsonPathTransformer();
        var data = new { users = new[] { new { id = 1, name = "Alice" } } };

        // Act
        var result = await transformer.TransformAsync("$.users[0].name", data);

        // Assert
        result.Should().Be("Alice");
    }

    [Fact]
    public async Task TransformAsync_WithNestedObject_ExtractsNestedValue()
    {
        // Arrange
        var transformer = new JsonPathTransformer();
        var data = new
        {
            user = new
            {
                name = "John",
                address = new
                {
                    city = "New York",
                    zip = "10001"
                }
            }
        };

        // Act
        var result = await transformer.TransformAsync("$.user.address.city", data);

        // Assert
        result.Should().Be("New York");
    }

    [Fact]
    public async Task TransformAsync_WithIntegerValue_ReturnsInteger()
    {
        // Arrange
        var transformer = new JsonPathTransformer();
        var data = new { age = 42, count = 100 };

        // Act
        var result = await transformer.TransformAsync("$.age", data);

        // Assert
        result.Should().Be(42);
    }

    [Fact]
    public async Task TransformAsync_WithBooleanValue_ReturnsBoolean()
    {
        // Arrange
        var transformer = new JsonPathTransformer();
        var data = new { isActive = true, isAdmin = false };

        // Act
        var result = await transformer.TransformAsync("$.isActive", data);

        // Assert
        result.Should().Be(true);
    }

    [Fact]
    public async Task TransformAsync_WithDoubleValue_ReturnsDouble()
    {
        // Arrange
        var transformer = new JsonPathTransformer();
        var data = new { price = 29.99, tax = 2.5 };

        // Act
        var result = await transformer.TransformAsync("$.price", data);

        // Assert
        result.Should().Be(29.99);
    }

    [Fact]
    public async Task TransformAsync_WithRootLevelString_ReturnsString()
    {
        // Arrange
        var transformer = new JsonPathTransformer();
        var data = new { name = "Test", description = "A test object" };

        // Act
        var result = await transformer.TransformAsync("$.name", data);

        // Assert
        result.Should().Be("Test");
    }

    [Fact]
    public async Task TransformAsync_WithNonExistentPath_ReturnsNull()
    {
        // Arrange
        var transformer = new JsonPathTransformer();
        var data = new { name = "Test" };

        // Act
        var result = await transformer.TransformAsync("$.nonexistent", data);

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task TransformAsync_WithFilterByNumericCondition_ReturnsFilteredArray()
    {
        // Arrange
        var transformer = new JsonPathTransformer();
        var data = new
        {
            users = new[]
            {
                new { name = "Alice", age = 30 },
                new { name = "Bob", age = 25 },
                new { name = "Charlie", age = 35 }
            }
        };

        // Act
        var result = await transformer.TransformAsync("$.users[?(@.age > 25)]", data);

        // Assert
        var users = result as List<object>;
        users.Should().NotBeNull();
        users.Should().HaveCount(2); // Alice and Charlie
    }

    [Fact]
    public async Task TransformAsync_WithFilterByBooleanProperty_ReturnsFilteredArray()
    {
        // Arrange
        var transformer = new JsonPathTransformer();
        var data = new
        {
            users = new[]
            {
                new { name = "Alice", isActive = true },
                new { name = "Bob", isActive = false },
                new { name = "Charlie", isActive = true }
            }
        };

        // Act
        var result = await transformer.TransformAsync("$.users[?(@.isActive == true)]", data);

        // Assert
        var users = result as List<object>;
        users.Should().NotBeNull();
        users.Should().HaveCount(2); // Alice and Charlie
    }

    [Fact]
    public async Task TransformAsync_WithFilterByStringEquality_ReturnsFilteredArray()
    {
        // Arrange
        var transformer = new JsonPathTransformer();
        var data = new
        {
            users = new[]
            {
                new { name = "Alice", role = "admin" },
                new { name = "Bob", role = "user" },
                new { name = "Charlie", role = "admin" }
            }
        };

        // Act
        var result = await transformer.TransformAsync("$.users[?(@.role == 'admin')]", data);

        // Assert
        var users = result as List<object>;
        users.Should().NotBeNull();
        users.Should().HaveCount(2); // Alice and Charlie
    }

    [Fact]
    public async Task TransformAsync_WithFilterNoMatches_ReturnsNull()
    {
        // Arrange
        var transformer = new JsonPathTransformer();
        var data = new
        {
            users = new[]
            {
                new { name = "Alice", age = 20 },
                new { name = "Bob", age = 22 }
            }
        };

        // Act
        var result = await transformer.TransformAsync("$.users[?(@.age > 100)]", data);

        // Assert
        result.Should().BeNull(); // No matches
    }

    [Fact]
    public async Task TransformAsync_WithWildcardProjection_ReturnsArrayOfValues()
    {
        // Arrange
        var transformer = new JsonPathTransformer();
        var data = new
        {
            users = new[]
            {
                new { name = "Alice", age = 30 },
                new { name = "Bob", age = 25 },
                new { name = "Charlie", age = 35 }
            }
        };

        // Act
        var result = await transformer.TransformAsync("$.users[*].name", data);

        // Assert
        var names = result as List<object>;
        names.Should().NotBeNull();
        names.Should().HaveCount(3);
        names.Should().Contain("Alice");
        names.Should().Contain("Bob");
        names.Should().Contain("Charlie");
    }

    [Fact]
    public async Task TransformAsync_WithRecursiveDescent_FindsAllMatchingFields()
    {
        // Arrange
        var transformer = new JsonPathTransformer();
        var data = new
        {
            user = new
            {
                name = "Alice",
                address = new
                {
                    city = new { name = "New York" }
                }
            }
        };

        // Act
        var result = await transformer.TransformAsync("$..name", data);

        // Assert
        var names = result as List<object>;
        names.Should().NotBeNull();
        names.Should().HaveCount(2); // "Alice" and "New York"
        names.Should().Contain("Alice");
        names.Should().Contain("New York");
    }

    [Fact]
    public async Task TransformAsync_WithArraySlice_ReturnsSlicedArray()
    {
        // Arrange
        var transformer = new JsonPathTransformer();
        var data = new
        {
            items = new[] { 1, 2, 3, 4, 5 }
        };

        // Act
        var result = await transformer.TransformAsync("$.items[0:3]", data);

        // Assert
        var items = result as List<object>;
        items.Should().NotBeNull();
        items.Should().HaveCount(3);
        items.Should().Equal(1, 2, 3);
    }

    [Fact]
    public async Task TransformAsync_WithNullQuery_ThrowsArgumentException()
    {
        // Arrange
        var transformer = new JsonPathTransformer();
        var data = new { name = "Test" };

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(async () =>
            await transformer.TransformAsync(null!, data));
    }

    [Fact]
    public async Task TransformAsync_WithEmptyQuery_ThrowsArgumentException()
    {
        // Arrange
        var transformer = new JsonPathTransformer();
        var data = new { name = "Test" };

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(async () =>
            await transformer.TransformAsync("", data));
    }

    [Fact]
    public async Task TransformAsync_WithWhitespaceQuery_ThrowsArgumentException()
    {
        // Arrange
        var transformer = new JsonPathTransformer();
        var data = new { name = "Test" };

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(async () =>
            await transformer.TransformAsync("   ", data));
    }

    [Fact]
    public async Task TransformAsync_WithNullData_ThrowsArgumentNullException()
    {
        // Arrange
        var transformer = new JsonPathTransformer();

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentNullException>(async () =>
            await transformer.TransformAsync("$.name", null!));
    }
}
