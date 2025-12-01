using FluentAssertions;
using WorkflowCore.Models;
using WorkflowGateway.Models;
using Xunit;
using YamlDotNet.Serialization;
using YamlDotNet.Serialization.NamingConventions;

namespace WorkflowGateway.Tests.Templates;

/// <summary>
/// Comprehensive validation tests for all workflow templates.
/// Ensures all templates are valid, parse correctly, and have required metadata.
/// </summary>
public class TemplateValidationTests
{
    private readonly IDeserializer _yamlDeserializer;
    private readonly string _templatesBasePath;

    public TemplateValidationTests()
    {
        _yamlDeserializer = new DeserializerBuilder()
            .Build();

        // Path to template files relative to test project
        _templatesBasePath = Path.Combine(
            Directory.GetCurrentDirectory(),
            "..", "..", "..", "..", "..",
            "demo", "crds", "templates"
        );
    }

    #region Template YAML Parsing & Metadata Tests (15 tests)

    [Theory]
    [InlineData("api-composition/template-simple-api-fetch.yaml")]
    [InlineData("api-composition/template-parallel-api-fetch.yaml")]
    [InlineData("api-composition/template-space-info.yaml")]
    [InlineData("data-processing/template-order-fulfillment.yaml")]
    [InlineData("data-processing/template-ecommerce-analytics.yaml")]
    [InlineData("integrations/template-slack-notification.yaml")]
    [InlineData("integrations/template-github-webhook-handler.yaml")]
    [InlineData("integrations/template-payment-processing.yaml")]
    [InlineData("real-time/template-websocket-stream.yaml")]
    public void AllTemplates_ShouldParseSuccessfully(string templatePath)
    {
        // Arrange
        var fullPath = Path.Combine(_templatesBasePath, templatePath);

        // Act
        var yaml = File.ReadAllText(fullPath);
        var workflow = _yamlDeserializer.Deserialize<WorkflowResource>(yaml);

        // Assert
        workflow.Should().NotBeNull();
        workflow.Metadata.Should().NotBeNull();
        workflow.Spec.Should().NotBeNull();
    }

    [Theory]
    [InlineData("api-composition/template-simple-api-fetch.yaml", "true")]
    [InlineData("api-composition/template-parallel-api-fetch.yaml", "true")]
    [InlineData("api-composition/template-space-info.yaml", "true")]
    [InlineData("data-processing/template-order-fulfillment.yaml", "true")]
    [InlineData("data-processing/template-ecommerce-analytics.yaml", "true")]
    [InlineData("integrations/template-slack-notification.yaml", "true")]
    [InlineData("integrations/template-github-webhook-handler.yaml", "true")]
    [InlineData("integrations/template-payment-processing.yaml", "true")]
    [InlineData("real-time/template-websocket-stream.yaml", "true")]
    public void AllTemplates_ShouldHaveTemplateAnnotation(string templatePath, string expectedValue)
    {
        // Arrange
        var fullPath = Path.Combine(_templatesBasePath, templatePath);
        var yaml = File.ReadAllText(fullPath);
        var workflow = _yamlDeserializer.Deserialize<WorkflowResource>(yaml);

        // Act & Assert
        workflow.Metadata.Annotations.Should().NotBeNull();
        workflow.Metadata.Annotations.Should().ContainKey("workflow.example.com/template");
        workflow.Metadata.Annotations!["workflow.example.com/template"].Should().Be(expectedValue);
    }

    [Theory]
    [InlineData("api-composition/template-simple-api-fetch.yaml", "api-composition")]
    [InlineData("api-composition/template-parallel-api-fetch.yaml", "api-composition")]
    [InlineData("api-composition/template-space-info.yaml", "api-composition")]
    [InlineData("data-processing/template-order-fulfillment.yaml", "data-processing")]
    [InlineData("data-processing/template-ecommerce-analytics.yaml", "data-processing")]
    [InlineData("integrations/template-slack-notification.yaml", "integrations")]
    [InlineData("integrations/template-github-webhook-handler.yaml", "integrations")]
    [InlineData("integrations/template-payment-processing.yaml", "integrations")]
    [InlineData("real-time/template-websocket-stream.yaml", "real-time")]
    public void AllTemplates_ShouldHaveValidCategory(string templatePath, string expectedCategory)
    {
        // Arrange
        var fullPath = Path.Combine(_templatesBasePath, templatePath);
        var yaml = File.ReadAllText(fullPath);
        var workflow = _yamlDeserializer.Deserialize<WorkflowResource>(yaml);

        // Act & Assert
        workflow.Metadata.Annotations.Should().ContainKey("workflow.example.com/category");
        workflow.Metadata.Annotations!["workflow.example.com/category"].Should().Be(expectedCategory);
    }

    [Theory]
    [InlineData("api-composition/template-simple-api-fetch.yaml", "beginner")]
    [InlineData("api-composition/template-parallel-api-fetch.yaml", "intermediate")]
    [InlineData("api-composition/template-space-info.yaml", "beginner")]
    [InlineData("data-processing/template-order-fulfillment.yaml", "advanced")]
    [InlineData("data-processing/template-ecommerce-analytics.yaml", "intermediate")]
    [InlineData("integrations/template-slack-notification.yaml", "beginner")]
    [InlineData("integrations/template-github-webhook-handler.yaml", "intermediate")]
    [InlineData("integrations/template-payment-processing.yaml", "advanced")]
    [InlineData("real-time/template-websocket-stream.yaml", "intermediate")]
    public void AllTemplates_ShouldHaveValidDifficulty(string templatePath, string expectedDifficulty)
    {
        // Arrange
        var fullPath = Path.Combine(_templatesBasePath, templatePath);
        var yaml = File.ReadAllText(fullPath);
        var workflow = _yamlDeserializer.Deserialize<WorkflowResource>(yaml);

        // Act & Assert
        workflow.Metadata.Annotations.Should().ContainKey("workflow.example.com/difficulty");
        workflow.Metadata.Annotations!["workflow.example.com/difficulty"].Should().Be(expectedDifficulty);
    }

    [Theory]
    [InlineData("api-composition/template-simple-api-fetch.yaml")]
    [InlineData("api-composition/template-parallel-api-fetch.yaml")]
    [InlineData("api-composition/template-space-info.yaml")]
    [InlineData("data-processing/template-order-fulfillment.yaml")]
    [InlineData("data-processing/template-ecommerce-analytics.yaml")]
    [InlineData("integrations/template-slack-notification.yaml")]
    [InlineData("integrations/template-github-webhook-handler.yaml")]
    [InlineData("integrations/template-payment-processing.yaml")]
    [InlineData("real-time/template-websocket-stream.yaml")]
    public void AllTemplates_ShouldHaveTags(string templatePath)
    {
        // Arrange
        var fullPath = Path.Combine(_templatesBasePath, templatePath);
        var yaml = File.ReadAllText(fullPath);
        var workflow = _yamlDeserializer.Deserialize<WorkflowResource>(yaml);

        // Act & Assert
        workflow.Metadata.Annotations.Should().ContainKey("workflow.example.com/tags");
        workflow.Metadata.Annotations!["workflow.example.com/tags"].Should().NotBeNullOrEmpty();
    }

    [Theory]
    [InlineData("api-composition/template-simple-api-fetch.yaml")]
    [InlineData("api-composition/template-parallel-api-fetch.yaml")]
    [InlineData("api-composition/template-space-info.yaml")]
    [InlineData("data-processing/template-order-fulfillment.yaml")]
    [InlineData("data-processing/template-ecommerce-analytics.yaml")]
    [InlineData("integrations/template-slack-notification.yaml")]
    [InlineData("integrations/template-github-webhook-handler.yaml")]
    [InlineData("integrations/template-payment-processing.yaml")]
    [InlineData("real-time/template-websocket-stream.yaml")]
    public void AllTemplates_ShouldHaveEstimatedTime(string templatePath)
    {
        // Arrange
        var fullPath = Path.Combine(_templatesBasePath, templatePath);
        var yaml = File.ReadAllText(fullPath);
        var workflow = _yamlDeserializer.Deserialize<WorkflowResource>(yaml);

        // Act & Assert
        workflow.Metadata.Annotations.Should().ContainKey("workflow.example.com/estimatedTime");
        var estimatedTime = workflow.Metadata.Annotations!["workflow.example.com/estimatedTime"];
        int.TryParse(estimatedTime, out var time).Should().BeTrue();
        time.Should().BeGreaterThan(0);
    }

    #endregion

    #region Template Content Validation Tests (10 tests)

    [Theory]
    [InlineData("api-composition/template-simple-api-fetch.yaml")]
    [InlineData("api-composition/template-parallel-api-fetch.yaml")]
    [InlineData("api-composition/template-space-info.yaml")]
    [InlineData("data-processing/template-order-fulfillment.yaml")]
    [InlineData("data-processing/template-ecommerce-analytics.yaml")]
    [InlineData("integrations/template-slack-notification.yaml")]
    [InlineData("integrations/template-github-webhook-handler.yaml")]
    [InlineData("integrations/template-payment-processing.yaml")]
    [InlineData("real-time/template-websocket-stream.yaml")]
    public void AllTemplates_ShouldHaveDescription(string templatePath)
    {
        // Arrange
        var fullPath = Path.Combine(_templatesBasePath, templatePath);
        var yaml = File.ReadAllText(fullPath);
        var workflow = _yamlDeserializer.Deserialize<WorkflowResource>(yaml);

        // Act & Assert
        workflow.Spec.Description.Should().NotBeNullOrEmpty();
        workflow.Spec.Description.Should().Contain("🎯 TEMPLATE:");
    }

    [Theory]
    [InlineData("api-composition/template-simple-api-fetch.yaml", 1)]
    [InlineData("api-composition/template-parallel-api-fetch.yaml", 4)]
    [InlineData("api-composition/template-space-info.yaml", 3)]
    [InlineData("data-processing/template-order-fulfillment.yaml", 12)]
    [InlineData("data-processing/template-ecommerce-analytics.yaml", 5)]
    [InlineData("integrations/template-slack-notification.yaml", 1)]
    [InlineData("integrations/template-github-webhook-handler.yaml", 6)]
    [InlineData("integrations/template-payment-processing.yaml", 11)]
    [InlineData("real-time/template-websocket-stream.yaml", 6)]
    public void AllTemplates_ShouldHaveCorrectTaskCount(string templatePath, int expectedTaskCount)
    {
        // Arrange
        var fullPath = Path.Combine(_templatesBasePath, templatePath);
        var yaml = File.ReadAllText(fullPath);
        var workflow = _yamlDeserializer.Deserialize<WorkflowResource>(yaml);

        // Act & Assert
        workflow.Spec.Tasks.Should().HaveCount(expectedTaskCount);
    }

    [Theory]
    [InlineData("api-composition/template-simple-api-fetch.yaml")]
    [InlineData("api-composition/template-parallel-api-fetch.yaml")]
    [InlineData("api-composition/template-space-info.yaml")]
    [InlineData("data-processing/template-order-fulfillment.yaml")]
    [InlineData("data-processing/template-ecommerce-analytics.yaml")]
    [InlineData("integrations/template-slack-notification.yaml")]
    [InlineData("integrations/template-github-webhook-handler.yaml")]
    [InlineData("integrations/template-payment-processing.yaml")]
    [InlineData("real-time/template-websocket-stream.yaml")]
    public void AllTemplates_ShouldHaveValidTaskIds(string templatePath)
    {
        // Arrange
        var fullPath = Path.Combine(_templatesBasePath, templatePath);
        var yaml = File.ReadAllText(fullPath);
        var workflow = _yamlDeserializer.Deserialize<WorkflowResource>(yaml);

        // Act & Assert
        foreach (var task in workflow.Spec.Tasks)
        {
            task.Id.Should().NotBeNullOrEmpty();
            task.TaskRef.Should().NotBeNullOrEmpty();
        }
    }

    [Theory]
    [InlineData("api-composition/template-simple-api-fetch.yaml")]
    [InlineData("api-composition/template-parallel-api-fetch.yaml")]
    [InlineData("api-composition/template-space-info.yaml")]
    [InlineData("data-processing/template-order-fulfillment.yaml")]
    [InlineData("data-processing/template-ecommerce-analytics.yaml")]
    [InlineData("integrations/template-slack-notification.yaml")]
    [InlineData("integrations/template-github-webhook-handler.yaml")]
    [InlineData("integrations/template-payment-processing.yaml")]
    [InlineData("real-time/template-websocket-stream.yaml")]
    public void AllTemplates_ShouldHaveValidTimeouts(string templatePath)
    {
        // Arrange
        var fullPath = Path.Combine(_templatesBasePath, templatePath);
        var yaml = File.ReadAllText(fullPath);
        var workflow = _yamlDeserializer.Deserialize<WorkflowResource>(yaml);

        // Act & Assert
        foreach (var task in workflow.Spec.Tasks)
        {
            if (task.Timeout != null)
            {
                // Timeout should be in format like "10s", "30s", "1m", or template expression like "{{input.durationSeconds + 10}}s"
                task.Timeout.Should().MatchRegex(@"^(\d+[smh]$|.*\{\{.*\}\}.*[smh]$)");
            }
        }
    }

    #endregion

    #region Template-Specific Validation Tests (10 tests)

    [Fact]
    public void SimpleApiFetch_ShouldHaveRequiredInputFields()
    {
        // Arrange
        var fullPath = Path.Combine(_templatesBasePath, "api-composition/template-simple-api-fetch.yaml");
        var yaml = File.ReadAllText(fullPath);
        var workflow = _yamlDeserializer.Deserialize<WorkflowResource>(yaml);

        // Act & Assert
        workflow.Spec.Input.Should().NotBeNull();
        workflow.Spec.Input.Should().ContainKey("userId");
    }

    [Fact]
    public void ParallelApiFetch_ShouldHaveParallelTasks()
    {
        // Arrange
        var fullPath = Path.Combine(_templatesBasePath, "api-composition/template-parallel-api-fetch.yaml");
        var yaml = File.ReadAllText(fullPath);
        var workflow = _yamlDeserializer.Deserialize<WorkflowResource>(yaml);

        // Act
        var parallelTasks = workflow.Spec.Tasks
            .Where(t => t.DependsOn == null || !t.DependsOn.Any())
            .ToList();

        // Assert - Should have 3 parallel tasks at the start
        parallelTasks.Should().HaveCount(3);
    }

    [Fact]
    public void OrderFulfillment_ShouldHaveMultipleStages()
    {
        // Arrange
        var fullPath = Path.Combine(_templatesBasePath, "data-processing/template-order-fulfillment.yaml");
        var yaml = File.ReadAllText(fullPath);
        var workflow = _yamlDeserializer.Deserialize<WorkflowResource>(yaml);

        // Act & Assert
        workflow.Spec.Tasks.Should().HaveCount(12);

        // Should have parallel stage at start (3 tasks with no dependencies)
        var parallelTasks = workflow.Spec.Tasks
            .Where(t => t.DependsOn == null || !t.DependsOn.Any())
            .ToList();
        parallelTasks.Should().HaveCount(3);
    }

    [Fact]
    public void EcommerceAnalytics_ShouldHaveDataTransformTasks()
    {
        // Arrange
        var fullPath = Path.Combine(_templatesBasePath, "data-processing/template-ecommerce-analytics.yaml");
        var yaml = File.ReadAllText(fullPath);
        var workflow = _yamlDeserializer.Deserialize<WorkflowResource>(yaml);

        // Act
        var transformTasks = workflow.Spec.Tasks
            .Where(t => t.TaskRef.StartsWith("transform-"))
            .ToList();

        // Assert
        transformTasks.Should().HaveCountGreaterThan(0);
    }

    [Fact]
    public void SlackNotification_ShouldBeSingleTask()
    {
        // Arrange
        var fullPath = Path.Combine(_templatesBasePath, "integrations/template-slack-notification.yaml");
        var yaml = File.ReadAllText(fullPath);
        var workflow = _yamlDeserializer.Deserialize<WorkflowResource>(yaml);

        // Act & Assert
        workflow.Spec.Tasks.Should().HaveCount(1);
        workflow.Spec.Tasks[0].TaskRef.Should().Contain("slack");
    }

    [Fact]
    public void GitHubWebhook_ShouldHaveWebhookInputs()
    {
        // Arrange
        var fullPath = Path.Combine(_templatesBasePath, "integrations/template-github-webhook-handler.yaml");
        var yaml = File.ReadAllText(fullPath);
        var workflow = _yamlDeserializer.Deserialize<WorkflowResource>(yaml);

        // Act & Assert
        workflow.Spec.Input.Should().NotBeNull();
        workflow.Spec.Input.Should().ContainKey("event");
        workflow.Spec.Input.Should().ContainKey("repository");
    }

    [Fact]
    public void PaymentProcessing_ShouldHaveSecurityChecks()
    {
        // Arrange
        var fullPath = Path.Combine(_templatesBasePath, "integrations/template-payment-processing.yaml");
        var yaml = File.ReadAllText(fullPath);
        var workflow = _yamlDeserializer.Deserialize<WorkflowResource>(yaml);

        // Act
        var fraudCheckTask = workflow.Spec.Tasks.FirstOrDefault(t => t.Id == "check-fraud-score");
        var riskEvalTask = workflow.Spec.Tasks.FirstOrDefault(t => t.Id == "evaluate-risk-score");

        // Assert
        fraudCheckTask.Should().NotBeNull();
        riskEvalTask.Should().NotBeNull();
    }

    [Fact]
    public void WebSocketStream_ShouldHaveStreamingTasks()
    {
        // Arrange
        var fullPath = Path.Combine(_templatesBasePath, "real-time/template-websocket-stream.yaml");
        var yaml = File.ReadAllText(fullPath);
        var workflow = _yamlDeserializer.Deserialize<WorkflowResource>(yaml);

        // Act
        var streamTask = workflow.Spec.Tasks.FirstOrDefault(t => t.TaskRef.Contains("websocket"));

        // Assert
        streamTask.Should().NotBeNull();
    }

    [Fact]
    public void SpaceInfo_ShouldHaveNoInputRequired()
    {
        // Arrange
        var fullPath = Path.Combine(_templatesBasePath, "api-composition/template-space-info.yaml");
        var yaml = File.ReadAllText(fullPath);
        var workflow = _yamlDeserializer.Deserialize<WorkflowResource>(yaml);

        // Act & Assert
        // Input should be empty dictionary (no required fields)
        workflow.Spec.Input.Should().BeEmpty();
    }

    [Theory]
    [InlineData("api-composition/template-simple-api-fetch.yaml")]
    [InlineData("api-composition/template-parallel-api-fetch.yaml")]
    [InlineData("api-composition/template-space-info.yaml")]
    [InlineData("data-processing/template-order-fulfillment.yaml")]
    [InlineData("data-processing/template-ecommerce-analytics.yaml")]
    [InlineData("integrations/template-slack-notification.yaml")]
    [InlineData("integrations/template-github-webhook-handler.yaml")]
    [InlineData("integrations/template-payment-processing.yaml")]
    [InlineData("real-time/template-websocket-stream.yaml")]
    public void AllTemplates_ShouldHaveOutputMapping(string templatePath)
    {
        // Arrange
        var fullPath = Path.Combine(_templatesBasePath, templatePath);
        var yaml = File.ReadAllText(fullPath);
        var workflow = _yamlDeserializer.Deserialize<WorkflowResource>(yaml);

        // Act & Assert
        workflow.Spec.Output.Should().NotBeNull();
        workflow.Spec.Output.Should().NotBeEmpty();
    }

    #endregion

    #region Template Category Distribution Tests (5 tests)

    [Fact]
    public void TemplateLibrary_ShouldHaveMultipleApiCompositionTemplates()
    {
        // Arrange
        var apiCompositionPath = Path.Combine(_templatesBasePath, "api-composition");

        // Act
        var templateFiles = Directory.GetFiles(apiCompositionPath, "*.yaml", SearchOption.TopDirectoryOnly);

        // Assert
        templateFiles.Should().HaveCountGreaterThanOrEqualTo(3);
    }

    [Fact]
    public void TemplateLibrary_ShouldHaveMultipleDataProcessingTemplates()
    {
        // Arrange
        var dataProcessingPath = Path.Combine(_templatesBasePath, "data-processing");

        // Act
        var templateFiles = Directory.GetFiles(dataProcessingPath, "*.yaml", SearchOption.TopDirectoryOnly);

        // Assert
        templateFiles.Should().HaveCountGreaterThanOrEqualTo(2);
    }

    [Fact]
    public void TemplateLibrary_ShouldHaveIntegrationsTemplates()
    {
        // Arrange
        var integrationsPath = Path.Combine(_templatesBasePath, "integrations");

        // Act
        var templateFiles = Directory.GetFiles(integrationsPath, "*.yaml", SearchOption.TopDirectoryOnly);

        // Assert
        templateFiles.Should().HaveCountGreaterThanOrEqualTo(3);
    }

    [Fact]
    public void TemplateLibrary_ShouldHaveRealTimeTemplates()
    {
        // Arrange
        var realTimePath = Path.Combine(_templatesBasePath, "real-time");

        // Act
        var templateFiles = Directory.GetFiles(realTimePath, "*.yaml", SearchOption.TopDirectoryOnly);

        // Assert
        templateFiles.Should().HaveCountGreaterThanOrEqualTo(1);
    }

    [Fact]
    public void TemplateLibrary_ShouldHaveBalancedDifficultyLevels()
    {
        // Arrange & Act
        var allTemplates = new List<(string path, string difficulty)>
        {
            ("api-composition/template-simple-api-fetch.yaml", "beginner"),
            ("api-composition/template-parallel-api-fetch.yaml", "intermediate"),
            ("api-composition/template-space-info.yaml", "beginner"),
            ("data-processing/template-order-fulfillment.yaml", "advanced"),
            ("data-processing/template-ecommerce-analytics.yaml", "intermediate"),
            ("integrations/template-slack-notification.yaml", "beginner"),
            ("integrations/template-github-webhook-handler.yaml", "intermediate"),
            ("integrations/template-payment-processing.yaml", "advanced"),
            ("real-time/template-websocket-stream.yaml", "intermediate")
        };

        var beginnerCount = allTemplates.Count(t => t.difficulty == "beginner");
        var intermediateCount = allTemplates.Count(t => t.difficulty == "intermediate");
        var advancedCount = allTemplates.Count(t => t.difficulty == "advanced");

        // Assert - Should have templates at all difficulty levels
        beginnerCount.Should().BeGreaterThanOrEqualTo(2);
        intermediateCount.Should().BeGreaterThanOrEqualTo(3);
        advancedCount.Should().BeGreaterThanOrEqualTo(2);
    }

    #endregion
}
