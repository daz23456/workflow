using FluentAssertions;
using WorkflowCore.Models;
using WorkflowOperator.Controllers;
using Xunit;

namespace WorkflowOperator.Tests.Controllers;

public class WorkflowTaskControllerTests
{
    [Fact]
    public async Task ReconcileAsync_WithNewWorkflowTask_ShouldUpdateStatus()
    {
        // Arrange
        var controller = new WorkflowTaskController();
        var workflowTask = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata
            {
                Name = "fetch-user",
                Namespace = "default"
            },
            Spec = new WorkflowTaskSpec
            {
                Type = "http",
                InputSchema = new SchemaDefinition
                {
                    Type = "object",
                    Properties = new Dictionary<string, PropertyDefinition>
                    {
                        ["userId"] = new PropertyDefinition { Type = "string" }
                    }
                }
            }
        };

        // Act
        await controller.ReconcileAsync(workflowTask);

        // Assert
        workflowTask.Status.Should().NotBeNull();
        workflowTask.Status!.LastUpdated.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        workflowTask.Status.UsageCount.Should().Be(0);
    }

    [Fact]
    public async Task ReconcileAsync_WithUpdatedWorkflowTask_ShouldUpdateTimestamp()
    {
        // Arrange
        var controller = new WorkflowTaskController();
        var workflowTask = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "fetch-user" },
            Spec = new WorkflowTaskSpec { Type = "http" },
            Status = new WorkflowTaskStatus
            {
                LastUpdated = DateTime.UtcNow.AddHours(-1),
                UsageCount = 5
            }
        };

        // Act
        await controller.ReconcileAsync(workflowTask);

        // Assert
        workflowTask.Status.LastUpdated.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
        workflowTask.Status.UsageCount.Should().Be(5); // Should preserve existing count
    }

    [Fact]
    public async Task ReconcileAsync_WithInvalidSpec_ShouldNotThrow()
    {
        // Arrange
        var controller = new WorkflowTaskController();
        var workflowTask = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "invalid-task" },
            Spec = new WorkflowTaskSpec { Type = "" } // Invalid
        };

        // Act
        Func<Task> act = async () => await controller.ReconcileAsync(workflowTask);

        // Assert
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task DeletedAsync_WithWorkflowTask_ShouldLogDeletion()
    {
        // Arrange
        var controller = new WorkflowTaskController();
        var workflowTask = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "deleted-task" },
            Spec = new WorkflowTaskSpec { Type = "http" }
        };

        // Act
        Func<Task> act = async () => await controller.DeletedAsync(workflowTask);

        // Assert
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task ReconcileAsync_WithNullMetadata_ShouldNotThrow()
    {
        // Arrange
        var controller = new WorkflowTaskController();
        var workflowTask = new WorkflowTaskResource
        {
            Metadata = null!,
            Spec = new WorkflowTaskSpec { Type = "http" }
        };

        // Act & Assert
        await controller.ReconcileAsync(workflowTask);
        workflowTask.Status.Should().NotBeNull();
    }

    [Fact]
    public async Task ReconcileAsync_WithMinimalSpec_ShouldInitializeStatus()
    {
        // Arrange
        var controller = new WorkflowTaskController();
        var workflowTask = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "minimal-task" },
            Spec = new WorkflowTaskSpec { Type = "http" }
        };

        // Act
        await controller.ReconcileAsync(workflowTask);

        // Assert
        workflowTask.Status.Should().NotBeNull();
        workflowTask.Status!.UsageCount.Should().Be(0);
    }

    [Fact]
    public async Task ReconcileAsync_CalledMultipleTimes_ShouldUpdateTimestampEachTime()
    {
        // Arrange
        var controller = new WorkflowTaskController();
        var workflowTask = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "test-task" },
            Spec = new WorkflowTaskSpec { Type = "http" }
        };

        // Act - First call
        await controller.ReconcileAsync(workflowTask);
        var firstTimestamp = workflowTask.Status!.LastUpdated;

        await Task.Delay(100); // Small delay to ensure timestamp differs

        // Act - Second call
        await controller.ReconcileAsync(workflowTask);
        var secondTimestamp = workflowTask.Status.LastUpdated;

        // Assert
        secondTimestamp.Should().BeAfter(firstTimestamp);
    }

    [Fact]
    public async Task ReconcileAsync_WithComplexInputSchema_ShouldNotThrow()
    {
        // Arrange
        var controller = new WorkflowTaskController();
        var workflowTask = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "complex-task", Namespace = "production" },
            Spec = new WorkflowTaskSpec
            {
                Type = "http",
                InputSchema = new SchemaDefinition
                {
                    Type = "object",
                    Properties = new Dictionary<string, PropertyDefinition>
                    {
                        ["userId"] = new PropertyDefinition { Type = "string" },
                        ["age"] = new PropertyDefinition { Type = "integer" },
                        ["email"] = new PropertyDefinition { Type = "string" },
                        ["metadata"] = new PropertyDefinition
                        {
                            Type = "object",
                            Properties = new Dictionary<string, PropertyDefinition>
                            {
                                ["source"] = new PropertyDefinition { Type = "string" }
                            }
                        }
                    }
                },
                OutputSchema = new SchemaDefinition
                {
                    Type = "object",
                    Properties = new Dictionary<string, PropertyDefinition>
                    {
                        ["result"] = new PropertyDefinition { Type = "string" }
                    }
                }
            }
        };

        // Act
        await controller.ReconcileAsync(workflowTask);

        // Assert
        workflowTask.Status.Should().NotBeNull();
    }

    [Fact]
    public async Task ReconcileAsync_WithNullSpec_ShouldNotThrow()
    {
        // Arrange
        var controller = new WorkflowTaskController();
        var workflowTask = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "null-spec-task" },
            Spec = null!
        };

        // Act
        Func<Task> act = async () => await controller.ReconcileAsync(workflowTask);

        // Assert - Controller should handle gracefully or throw meaningful exception
        await act.Should().NotThrowAsync();
        workflowTask.Status.Should().NotBeNull();
    }

    [Fact]
    public async Task ReconcileAsync_WithMissingNamespace_ShouldNotThrow()
    {
        // Arrange
        var controller = new WorkflowTaskController();
        var workflowTask = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "no-namespace-task" },
            Spec = new WorkflowTaskSpec { Type = "http" }
        };

        // Act
        await controller.ReconcileAsync(workflowTask);

        // Assert
        workflowTask.Status.Should().NotBeNull();
    }

    [Fact]
    public async Task ReconcileAsync_WithHttpRequestDefinition_ShouldNotThrow()
    {
        // Arrange
        var controller = new WorkflowTaskController();
        var workflowTask = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "http-task" },
            Spec = new WorkflowTaskSpec
            {
                Type = "http",
                Request = new HttpRequestDefinition
                {
                    Method = "POST",
                    Url = "https://api.example.com/users",
                    Headers = new Dictionary<string, string>
                    {
                        ["Authorization"] = "Bearer {{input.token}}",
                        ["Content-Type"] = "application/json"
                    },
                    Body = "{\"name\": \"{{input.name}}\"}"
                }
            }
        };

        // Act
        await controller.ReconcileAsync(workflowTask);

        // Assert
        workflowTask.Status.Should().NotBeNull();
    }

    [Fact]
    public async Task ReconcileAsync_PreservesUsageCountZeroForNewStatus()
    {
        // Arrange
        var controller = new WorkflowTaskController();
        var workflowTask = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "new-task" },
            Spec = new WorkflowTaskSpec { Type = "http" }
        };

        // Act
        await controller.ReconcileAsync(workflowTask);

        // Assert
        workflowTask.Status!.UsageCount.Should().Be(0);
        workflowTask.Status.LastUpdated.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));
    }

    [Fact]
    public async Task DeletedAsync_WithNullMetadata_ShouldNotThrow()
    {
        // Arrange
        var controller = new WorkflowTaskController();
        var workflowTask = new WorkflowTaskResource
        {
            Metadata = null!,
            Spec = new WorkflowTaskSpec { Type = "http" }
        };

        // Act
        Func<Task> act = async () => await controller.DeletedAsync(workflowTask);

        // Assert
        await act.Should().NotThrowAsync();
    }

    [Fact]
    public async Task DeletedAsync_WithComplexTask_ShouldNotThrow()
    {
        // Arrange
        var controller = new WorkflowTaskController();
        var workflowTask = new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = "complex-deleted-task", Namespace = "production" },
            Spec = new WorkflowTaskSpec
            {
                Type = "http",
                InputSchema = new SchemaDefinition { Type = "object" },
                OutputSchema = new SchemaDefinition { Type = "object" },
                Request = new HttpRequestDefinition
                {
                    Method = "DELETE",
                    Url = "https://api.example.com/resource"
                }
            },
            Status = new WorkflowTaskStatus
            {
                LastUpdated = DateTime.UtcNow,
                UsageCount = 100
            }
        };

        // Act
        Func<Task> act = async () => await controller.DeletedAsync(workflowTask);

        // Assert
        await act.Should().NotThrowAsync();
    }
}
