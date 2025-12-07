using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

/// <summary>
/// Tests for FieldUsageAnalyzer service - analyzes workflow field usage patterns.
/// </summary>
public class FieldUsageAnalyzerTests
{
    private readonly FieldUsageAnalyzer _analyzer;

    public FieldUsageAnalyzerTests()
    {
        _analyzer = new FieldUsageAnalyzer();
    }

    [Fact]
    public void AnalyzeWorkflow_ExtractsInputFieldUsage()
    {
        // Arrange
        var workflow = CreateWorkflowWithTask("get-user", "{{ input.userId }}");

        // Act
        var usages = _analyzer.AnalyzeWorkflow(workflow);

        // Assert
        usages.Should().HaveCount(1);
        usages[0].TaskName.Should().Be("get-user");
        usages[0].UsedInputFields.Should().Contain("userId");
    }

    [Fact]
    public void AnalyzeWorkflow_ExtractsOutputFieldUsage()
    {
        // Arrange
        var workflow = CreateWorkflowWithOutputMapping("get-user", "{{ tasks.get-user.output.name }}");

        // Act
        var usages = _analyzer.AnalyzeWorkflow(workflow);

        // Assert
        usages.Should().ContainSingle(u => u.TaskName == "get-user");
        var usage = usages.First(u => u.TaskName == "get-user");
        usage.UsedOutputFields.Should().Contain("name");
    }

    [Fact]
    public void AnalyzeWorkflow_TracksMultipleFieldsPerTask()
    {
        // Arrange
        var workflow = CreateWorkflowWithMultipleFields(
            "get-user",
            new[] { "userId", "includeDetails" },
            new[] { "name", "email", "phone" });

        // Act
        var usages = _analyzer.AnalyzeWorkflow(workflow);

        // Assert
        var usage = usages.First(u => u.TaskName == "get-user");
        usage.UsedInputFields.Should().HaveCount(2);
        usage.UsedOutputFields.Should().HaveCount(3);
    }

    [Fact]
    public void RegisterUsage_StoresUsageForTask()
    {
        // Arrange
        var usage = new WorkflowTaskUsage
        {
            TaskName = "get-user",
            WorkflowName = "user-profile"
        };
        usage.UsedOutputFields.Add("email");

        // Act
        _analyzer.RegisterUsage(usage);
        var retrieved = _analyzer.GetTaskUsage("get-user");

        // Assert
        retrieved.Should().HaveCount(1);
        retrieved[0].WorkflowName.Should().Be("user-profile");
    }

    [Fact]
    public void GetFieldUsageInfo_ReturnsAllWorkflowsUsingField()
    {
        // Arrange
        var usage1 = new WorkflowTaskUsage
        {
            TaskName = "get-user",
            WorkflowName = "workflow-a"
        };
        usage1.UsedOutputFields.Add("email");

        var usage2 = new WorkflowTaskUsage
        {
            TaskName = "get-user",
            WorkflowName = "workflow-b"
        };
        usage2.UsedOutputFields.Add("email");

        _analyzer.RegisterUsage(usage1);
        _analyzer.RegisterUsage(usage2);

        // Act
        var fieldInfo = _analyzer.GetFieldUsageInfo("get-user", "email", FieldType.Output);

        // Assert
        fieldInfo.UsedByWorkflows.Should().HaveCount(2);
        fieldInfo.UsedByWorkflows.Should().Contain(new[] { "workflow-a", "workflow-b" });
    }

    [Fact]
    public void GetFieldUsageInfo_ReturnsEmptyForUnusedField()
    {
        // Act
        var fieldInfo = _analyzer.GetFieldUsageInfo("get-user", "unusedField", FieldType.Output);

        // Assert
        fieldInfo.IsUnused.Should().BeTrue();
        fieldInfo.UsedByWorkflows.Should().BeEmpty();
    }

    [Fact]
    public void IsFieldRemovalSafe_ReturnsTrue_WhenFieldUnused()
    {
        // Act
        var isSafe = _analyzer.IsFieldRemovalSafe("get-user", "unusedField", FieldType.Output);

        // Assert
        isSafe.Should().BeTrue();
    }

    [Fact]
    public void IsFieldRemovalSafe_ReturnsFalse_WhenFieldInUse()
    {
        // Arrange
        var usage = new WorkflowTaskUsage
        {
            TaskName = "get-user",
            WorkflowName = "some-workflow"
        };
        usage.UsedOutputFields.Add("email");
        _analyzer.RegisterUsage(usage);

        // Act
        var isSafe = _analyzer.IsFieldRemovalSafe("get-user", "email", FieldType.Output);

        // Assert
        isSafe.Should().BeFalse();
    }

    [Fact]
    public void GetAllFieldUsage_ReturnsCompleteFieldMap()
    {
        // Arrange
        var usage = new WorkflowTaskUsage
        {
            TaskName = "get-user",
            WorkflowName = "workflow-1"
        };
        usage.UsedInputFields.Add("userId");
        usage.UsedOutputFields.Add("name");
        usage.UsedOutputFields.Add("email");
        _analyzer.RegisterUsage(usage);

        // Act
        var allUsage = _analyzer.GetAllFieldUsage("get-user");

        // Assert
        allUsage.Should().HaveCount(3);
        allUsage.Should().ContainSingle(f => f.FieldName == "userId" && f.FieldType == FieldType.Input);
        allUsage.Should().ContainSingle(f => f.FieldName == "name" && f.FieldType == FieldType.Output);
        allUsage.Should().ContainSingle(f => f.FieldName == "email" && f.FieldType == FieldType.Output);
    }

    private static WorkflowResource CreateWorkflowWithTask(string taskRef, string inputTemplate)
    {
        return new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new()
                    {
                        Id = "step-1",
                        TaskRef = taskRef,
                        Input = new Dictionary<string, string>
                        {
                            ["param"] = inputTemplate
                        }
                    }
                }
            }
        };
    }

    private static WorkflowResource CreateWorkflowWithOutputMapping(string taskRef, string outputTemplate)
    {
        return new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new()
                    {
                        Id = "step-1",
                        TaskRef = taskRef
                    }
                },
                Output = new Dictionary<string, string>
                {
                    ["result"] = outputTemplate
                }
            }
        };
    }

    private static WorkflowResource CreateWorkflowWithMultipleFields(
        string taskRef,
        string[] inputFields,
        string[] outputFields)
    {
        var inputDict = new Dictionary<string, string>();
        foreach (var field in inputFields)
        {
            inputDict[field] = $"{{{{ input.{field} }}}}";
        }

        var outputMapping = new Dictionary<string, string>();
        foreach (var field in outputFields)
        {
            outputMapping[field] = $"{{{{ tasks.step-1.output.{field} }}}}";
        }

        return new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new()
                    {
                        Id = "step-1",
                        TaskRef = taskRef,
                        Input = inputDict
                    }
                },
                Output = outputMapping
            }
        };
    }
}
