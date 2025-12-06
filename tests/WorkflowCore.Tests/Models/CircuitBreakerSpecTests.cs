using System.Text.Json;
using FluentAssertions;
using WorkflowCore.Models;
using Xunit;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace WorkflowCore.Tests.Models;

public class CircuitBreakerSpecTests
{
    // ========== DEFAULT VALUES ==========

    [Fact]
    public void CircuitBreakerSpec_ShouldInitializeWithDefaultValues()
    {
        // Act
        var spec = new CircuitBreakerSpec();

        // Assert
        spec.FailureThreshold.Should().Be(5);
        spec.SamplingDuration.Should().Be("60s");
        spec.BreakDuration.Should().Be("30s");
        spec.HalfOpenRequests.Should().Be(3);
    }

    [Fact]
    public void CircuitBreakerSpec_ShouldAllowSettingAllProperties()
    {
        // Act
        var spec = new CircuitBreakerSpec
        {
            FailureThreshold = 10,
            SamplingDuration = "120s",
            BreakDuration = "60s",
            HalfOpenRequests = 5
        };

        // Assert
        spec.FailureThreshold.Should().Be(10);
        spec.SamplingDuration.Should().Be("120s");
        spec.BreakDuration.Should().Be("60s");
        spec.HalfOpenRequests.Should().Be(5);
    }

    // ========== YAML DESERIALIZATION ==========

    [Fact]
    public void CircuitBreakerSpec_ShouldDeserializeFromYaml()
    {
        // Arrange
        var yaml = @"
failureThreshold: 5
samplingDuration: 60s
breakDuration: 30s
halfOpenRequests: 3
";

        // Act
        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .Build();
        var spec = deserializer.Deserialize<CircuitBreakerSpec>(yaml);

        // Assert
        spec.Should().NotBeNull();
        spec.FailureThreshold.Should().Be(5);
        spec.SamplingDuration.Should().Be("60s");
        spec.BreakDuration.Should().Be("30s");
        spec.HalfOpenRequests.Should().Be(3);
    }

    [Fact]
    public void CircuitBreakerSpec_ShouldDeserializeFromYaml_WithCustomValues()
    {
        // Arrange
        var yaml = @"
failureThreshold: 10
samplingDuration: 2m
breakDuration: 45s
halfOpenRequests: 5
";

        // Act
        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .Build();
        var spec = deserializer.Deserialize<CircuitBreakerSpec>(yaml);

        // Assert
        spec.Should().NotBeNull();
        spec.FailureThreshold.Should().Be(10);
        spec.SamplingDuration.Should().Be("2m");
        spec.BreakDuration.Should().Be("45s");
        spec.HalfOpenRequests.Should().Be(5);
    }

    // ========== JSON DESERIALIZATION ==========

    [Fact]
    public void CircuitBreakerSpec_ShouldDeserializeFromJson()
    {
        // Arrange
        var json = @"{
            ""failureThreshold"": 5,
            ""samplingDuration"": ""60s"",
            ""breakDuration"": ""30s"",
            ""halfOpenRequests"": 3
        }";

        // Act
        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
        var spec = JsonSerializer.Deserialize<CircuitBreakerSpec>(json, options);

        // Assert
        spec.Should().NotBeNull();
        spec!.FailureThreshold.Should().Be(5);
        spec.SamplingDuration.Should().Be("60s");
        spec.BreakDuration.Should().Be("30s");
        spec.HalfOpenRequests.Should().Be(3);
    }
}

public class FallbackSpecTests
{
    // ========== DEFAULT VALUES ==========

    [Fact]
    public void FallbackSpec_ShouldInitializeWithDefaultValues()
    {
        // Act
        var spec = new FallbackSpec();

        // Assert
        spec.TaskRef.Should().Be(string.Empty);
        spec.Input.Should().NotBeNull();
        spec.Input.Should().BeEmpty();
    }

    [Fact]
    public void FallbackSpec_ShouldAllowSettingAllProperties()
    {
        // Act
        var spec = new FallbackSpec
        {
            TaskRef = "fallback-task",
            Input = new Dictionary<string, string>
            {
                ["key"] = "{{input.cacheKey}}",
                ["userId"] = "{{input.userId}}"
            }
        };

        // Assert
        spec.TaskRef.Should().Be("fallback-task");
        spec.Input.Should().HaveCount(2);
        spec.Input["key"].Should().Be("{{input.cacheKey}}");
        spec.Input["userId"].Should().Be("{{input.userId}}");
    }

    // ========== YAML DESERIALIZATION ==========

    [Fact]
    public void FallbackSpec_ShouldDeserializeFromYaml()
    {
        // Arrange
        var yaml = @"
taskRef: get-cached-data
input:
  key: '{{input.cacheKey}}'
";

        // Act
        var deserializer = new DeserializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .Build();
        var spec = deserializer.Deserialize<FallbackSpec>(yaml);

        // Assert
        spec.Should().NotBeNull();
        spec.TaskRef.Should().Be("get-cached-data");
        spec.Input.Should().ContainKey("key");
        spec.Input["key"].Should().Be("{{input.cacheKey}}");
    }

    // ========== JSON DESERIALIZATION ==========

    [Fact]
    public void FallbackSpec_ShouldDeserializeFromJson()
    {
        // Arrange
        var json = @"{
            ""taskRef"": ""get-cached-data"",
            ""input"": {
                ""key"": ""{{input.cacheKey}}""
            }
        }";

        // Act
        var options = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
        var spec = JsonSerializer.Deserialize<FallbackSpec>(json, options);

        // Assert
        spec.Should().NotBeNull();
        spec!.TaskRef.Should().Be("get-cached-data");
        spec.Input.Should().ContainKey("key");
    }
}

public class CircuitStateTests
{
    [Fact]
    public void CircuitState_Enum_ShouldHaveCorrectValues()
    {
        // Assert - Verify enum values exist
        CircuitState.Closed.Should().BeDefined();
        CircuitState.Open.Should().BeDefined();
        CircuitState.HalfOpen.Should().BeDefined();
    }

    [Fact]
    public void CircuitStateInfo_ShouldInitializeWithDefaultValues()
    {
        // Act
        var info = new CircuitStateInfo();

        // Assert
        info.State.Should().Be(CircuitState.Closed);
        info.FailureCount.Should().Be(0);
        info.HalfOpenSuccessCount.Should().Be(0);
        info.LastFailureTime.Should().BeNull();
        info.CircuitOpenedAt.Should().BeNull();
        info.LastStateTransitionAt.Should().BeNull();
    }

    [Fact]
    public void CircuitStateInfo_ShouldAllowSettingAllProperties()
    {
        // Arrange
        var now = DateTime.UtcNow;

        // Act
        var info = new CircuitStateInfo
        {
            State = CircuitState.Open,
            FailureCount = 5,
            HalfOpenSuccessCount = 2,
            LastFailureTime = now,
            CircuitOpenedAt = now.AddSeconds(-30),
            LastStateTransitionAt = now.AddSeconds(-30)
        };

        // Assert
        info.State.Should().Be(CircuitState.Open);
        info.FailureCount.Should().Be(5);
        info.HalfOpenSuccessCount.Should().Be(2);
        info.LastFailureTime.Should().Be(now);
        info.CircuitOpenedAt.Should().Be(now.AddSeconds(-30));
        info.LastStateTransitionAt.Should().Be(now.AddSeconds(-30));
    }
}

public class CircuitBreakerOptionsTests
{
    [Fact]
    public void CircuitBreakerOptions_ShouldInitializeWithDefaultValues()
    {
        // Act
        var options = new CircuitBreakerOptions();

        // Assert
        options.FailureThreshold.Should().Be(5);
        options.SamplingDuration.Should().Be(TimeSpan.FromSeconds(60));
        options.BreakDuration.Should().Be(TimeSpan.FromSeconds(30));
        options.HalfOpenRequests.Should().Be(3);
    }

    [Fact]
    public void CircuitBreakerOptions_ShouldAllowSettingAllProperties()
    {
        // Act
        var options = new CircuitBreakerOptions
        {
            FailureThreshold = 10,
            SamplingDuration = TimeSpan.FromMinutes(2),
            BreakDuration = TimeSpan.FromMinutes(1),
            HalfOpenRequests = 5
        };

        // Assert
        options.FailureThreshold.Should().Be(10);
        options.SamplingDuration.Should().Be(TimeSpan.FromMinutes(2));
        options.BreakDuration.Should().Be(TimeSpan.FromMinutes(1));
        options.HalfOpenRequests.Should().Be(5);
    }
}
