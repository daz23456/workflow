using System.Text.Json;
using FluentAssertions;
using WorkflowCore.Models;
using Xunit;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace WorkflowCore.Tests.Models;

public class WorkflowMetadataTests
{
    private readonly IDeserializer _yamlDeserializer;
    private readonly JsonSerializerOptions _jsonOptions;

    public WorkflowMetadataTests()
    {
        _yamlDeserializer = new DeserializerBuilder()
            .WithNamingConvention(CamelCaseNamingConvention.Instance)
            .Build();
        _jsonOptions = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
    }

    #region WorkflowSpec Categories Tests

    [Fact]
    public void WorkflowSpec_Categories_CanBeSet()
    {
        var spec = new WorkflowSpec
        {
            Categories = new List<string> { "orders", "payments" }
        };

        spec.Categories.Should().HaveCount(2);
        spec.Categories.Should().Contain("orders");
        spec.Categories.Should().Contain("payments");
    }

    [Fact]
    public void WorkflowSpec_Categories_CanBeNull()
    {
        var spec = new WorkflowSpec();
        spec.Categories.Should().BeNull();
    }

    [Fact]
    public void WorkflowSpec_Categories_DeserializesFromYaml()
    {
        var yaml = @"
categories:
  - orders
  - payments
  - notifications
";
        var spec = _yamlDeserializer.Deserialize<WorkflowSpec>(yaml);

        spec.Categories.Should().HaveCount(3);
        spec.Categories.Should().Contain("orders");
        spec.Categories.Should().Contain("payments");
        spec.Categories.Should().Contain("notifications");
    }

    [Fact]
    public void WorkflowSpec_Categories_SerializesToJson()
    {
        var spec = new WorkflowSpec
        {
            Categories = new List<string> { "orders", "payments" }
        };

        var json = JsonSerializer.Serialize(spec);
        var deserialized = JsonSerializer.Deserialize<WorkflowSpec>(json, _jsonOptions);

        deserialized!.Categories.Should().HaveCount(2);
        deserialized.Categories.Should().Contain("orders");
    }

    #endregion

    #region WorkflowSpec Tags Tests

    [Fact]
    public void WorkflowSpec_Tags_CanBeSet()
    {
        var spec = new WorkflowSpec
        {
            Tags = new List<string> { "v2", "production", "critical" }
        };

        spec.Tags.Should().HaveCount(3);
        spec.Tags.Should().Contain("v2");
        spec.Tags.Should().Contain("production");
    }

    [Fact]
    public void WorkflowSpec_Tags_CanBeNull()
    {
        var spec = new WorkflowSpec();
        spec.Tags.Should().BeNull();
    }

    [Fact]
    public void WorkflowSpec_Tags_DeserializesFromYaml()
    {
        var yaml = @"
tags:
  - v2
  - production
";
        var spec = _yamlDeserializer.Deserialize<WorkflowSpec>(yaml);

        spec.Tags.Should().HaveCount(2);
        spec.Tags.Should().Contain("v2");
        spec.Tags.Should().Contain("production");
    }

    #endregion

    #region WorkflowSpec Examples Tests

    [Fact]
    public void WorkflowSpec_Examples_CanBeSet()
    {
        var spec = new WorkflowSpec
        {
            Examples = new List<WorkflowExample>
            {
                new WorkflowExample
                {
                    Name = "Happy path",
                    Description = "Standard order processing",
                    Input = new Dictionary<string, object> { { "orderId", "123" } },
                    ExpectedOutput = new Dictionary<string, object> { { "status", "completed" } }
                }
            }
        };

        spec.Examples.Should().HaveCount(1);
        spec.Examples![0].Name.Should().Be("Happy path");
        spec.Examples[0].Description.Should().Be("Standard order processing");
    }

    [Fact]
    public void WorkflowSpec_Examples_CanBeNull()
    {
        var spec = new WorkflowSpec();
        spec.Examples.Should().BeNull();
    }

    [Fact]
    public void WorkflowSpec_Examples_DeserializesFromYaml()
    {
        var yaml = @"
examples:
  - name: Happy path
    description: Standard order processing
    input:
      orderId: '123'
      customerId: '456'
    expectedOutput:
      status: completed
  - name: Error case
    input:
      orderId: 'invalid'
";
        var spec = _yamlDeserializer.Deserialize<WorkflowSpec>(yaml);

        spec.Examples.Should().HaveCount(2);
        spec.Examples![0].Name.Should().Be("Happy path");
        spec.Examples[0].Description.Should().Be("Standard order processing");
        spec.Examples[1].Name.Should().Be("Error case");
        spec.Examples[1].Description.Should().BeNull();
    }

    [Fact]
    public void WorkflowExample_RequiredFields_AreSet()
    {
        var example = new WorkflowExample
        {
            Name = "Test example",
            Input = new Dictionary<string, object> { { "key", "value" } }
        };

        example.Name.Should().NotBeNullOrEmpty();
        example.Input.Should().NotBeEmpty();
    }

    [Fact]
    public void WorkflowExample_ExpectedOutput_IsOptional()
    {
        var example = new WorkflowExample
        {
            Name = "Test example",
            Input = new Dictionary<string, object> { { "key", "value" } }
        };

        example.ExpectedOutput.Should().BeNull();
    }

    #endregion

    #region WorkflowTaskSpec Metadata Tests

    [Fact]
    public void WorkflowTaskSpec_Description_CanBeSet()
    {
        var spec = new WorkflowTaskSpec
        {
            Description = "Fetches user profile from the database"
        };

        spec.Description.Should().Be("Fetches user profile from the database");
    }

    [Fact]
    public void WorkflowTaskSpec_Description_CanBeNull()
    {
        var spec = new WorkflowTaskSpec();
        spec.Description.Should().BeNull();
    }

    [Fact]
    public void WorkflowTaskSpec_Description_DeserializesFromYaml()
    {
        var yaml = @"
type: http
description: Fetches user profile from the database
";
        var spec = _yamlDeserializer.Deserialize<WorkflowTaskSpec>(yaml);

        spec.Description.Should().Be("Fetches user profile from the database");
    }

    [Fact]
    public void WorkflowTaskSpec_Category_CanBeSet()
    {
        var spec = new WorkflowTaskSpec
        {
            Category = "http"
        };

        spec.Category.Should().Be("http");
    }

    [Fact]
    public void WorkflowTaskSpec_Category_CanBeNull()
    {
        var spec = new WorkflowTaskSpec();
        spec.Category.Should().BeNull();
    }

    [Fact]
    public void WorkflowTaskSpec_Category_DeserializesFromYaml()
    {
        var yaml = @"
type: http
category: external-api
";
        var spec = _yamlDeserializer.Deserialize<WorkflowTaskSpec>(yaml);

        spec.Category.Should().Be("external-api");
    }

    [Fact]
    public void WorkflowTaskSpec_Tags_CanBeSet()
    {
        var spec = new WorkflowTaskSpec
        {
            Tags = new List<string> { "external-api", "idempotent", "cacheable" }
        };

        spec.Tags.Should().HaveCount(3);
        spec.Tags.Should().Contain("external-api");
        spec.Tags.Should().Contain("idempotent");
    }

    [Fact]
    public void WorkflowTaskSpec_Tags_CanBeNull()
    {
        var spec = new WorkflowTaskSpec();
        spec.Tags.Should().BeNull();
    }

    [Fact]
    public void WorkflowTaskSpec_Tags_DeserializesFromYaml()
    {
        var yaml = @"
type: http
tags:
  - external-api
  - idempotent
";
        var spec = _yamlDeserializer.Deserialize<WorkflowTaskSpec>(yaml);

        spec.Tags.Should().HaveCount(2);
        spec.Tags.Should().Contain("external-api");
        spec.Tags.Should().Contain("idempotent");
    }

    #endregion

    #region Backward Compatibility Tests

    [Fact]
    public void WorkflowSpec_WithoutMetadata_DeserializesSuccessfully()
    {
        var yaml = @"
description: A simple workflow
input:
  userId:
    type: string
    required: true
tasks:
  - id: fetch-user
    taskRef: get-user
    input:
      id: '{{input.userId}}'
";
        var spec = _yamlDeserializer.Deserialize<WorkflowSpec>(yaml);

        spec.Description.Should().Be("A simple workflow");
        spec.Categories.Should().BeNull();
        spec.Tags.Should().BeNull();
        spec.Examples.Should().BeNull();
    }

    [Fact]
    public void WorkflowTaskSpec_WithoutMetadata_DeserializesSuccessfully()
    {
        var yaml = @"
type: http
timeout: 30s
";
        var spec = _yamlDeserializer.Deserialize<WorkflowTaskSpec>(yaml);

        spec.Type.Should().Be("http");
        spec.Description.Should().BeNull();
        spec.Category.Should().BeNull();
        spec.Tags.Should().BeNull();
    }

    #endregion
}
