using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Controllers;
using WorkflowGateway.Models;
using WorkflowGateway.Services;
using Xunit;

namespace WorkflowGateway.Tests.Controllers;

/// <summary>
/// Tests for FieldUsageController - REST API for field usage analysis.
/// </summary>
public class FieldUsageControllerTests
{
    private readonly Mock<IFieldUsageAnalyzer> _analyzerMock;
    private readonly Mock<IConsumerContractValidator> _validatorMock;
    private readonly Mock<IWorkflowDiscoveryService> _discoveryMock;
    private readonly FieldUsageController _controller;

    public FieldUsageControllerTests()
    {
        _analyzerMock = new Mock<IFieldUsageAnalyzer>();
        _validatorMock = new Mock<IConsumerContractValidator>();
        _discoveryMock = new Mock<IWorkflowDiscoveryService>();
        _controller = new FieldUsageController(
            _analyzerMock.Object,
            _validatorMock.Object,
            _discoveryMock.Object);
    }

    [Fact]
    public async Task GetFieldUsage_ReturnsUsageInfo_WhenTaskExists()
    {
        // Arrange
        var fieldInfoList = new List<FieldUsageInfo>
        {
            new()
            {
                FieldName = "email",
                FieldType = FieldType.Output,
            }
        };
        fieldInfoList[0].UsedByWorkflows.Add("workflow-a");

        _analyzerMock
            .Setup(x => x.GetAllFieldUsage("get-user"))
            .Returns(fieldInfoList);

        // Act
        var result = await _controller.GetFieldUsage("get-user");

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<FieldUsageResponse>().Subject;
        response.TaskName.Should().Be("get-user");
        response.Fields.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetFieldUsage_ReturnsEmptyList_WhenNoUsage()
    {
        // Arrange
        _analyzerMock
            .Setup(x => x.GetAllFieldUsage("unused-task"))
            .Returns(new List<FieldUsageInfo>());

        // Act
        var result = await _controller.GetFieldUsage("unused-task");

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<FieldUsageResponse>().Subject;
        response.Fields.Should().BeEmpty();
    }

    [Fact]
    public async Task GetFieldImpact_ReturnsImpactAnalysis()
    {
        // Arrange
        var fieldInfo = new FieldUsageInfo
        {
            FieldName = "email",
            FieldType = FieldType.Output
        };
        fieldInfo.UsedByWorkflows.Add("workflow-a");
        fieldInfo.UsedByWorkflows.Add("workflow-b");

        _analyzerMock
            .Setup(x => x.GetFieldUsageInfo("get-user", "email", FieldType.Output))
            .Returns(fieldInfo);

        _analyzerMock
            .Setup(x => x.IsFieldRemovalSafe("get-user", "email", FieldType.Output))
            .Returns(false);

        // Act
        var result = await _controller.GetFieldImpact("get-user", "email", "output");

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<FieldImpactResponse>().Subject;
        response.FieldName.Should().Be("email");
        response.IsRemovalSafe.Should().BeFalse();
        response.AffectedWorkflows.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetFieldImpact_ReturnsSafe_WhenFieldUnused()
    {
        // Arrange
        var fieldInfo = new FieldUsageInfo
        {
            FieldName = "unusedField",
            FieldType = FieldType.Output
        };

        _analyzerMock
            .Setup(x => x.GetFieldUsageInfo("get-user", "unusedField", FieldType.Output))
            .Returns(fieldInfo);

        _analyzerMock
            .Setup(x => x.IsFieldRemovalSafe("get-user", "unusedField", FieldType.Output))
            .Returns(true);

        // Act
        var result = await _controller.GetFieldImpact("get-user", "unusedField", "output");

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<FieldImpactResponse>().Subject;
        response.IsRemovalSafe.Should().BeTrue();
        response.AffectedWorkflows.Should().BeEmpty();
    }

    [Fact]
    public async Task AnalyzeWorkflowUsage_AnalyzesAndRegistersUsage()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test-workflow" },
            Spec = new WorkflowSpec()
        };

        var usages = new List<WorkflowTaskUsage>
        {
            new()
            {
                TaskName = "get-user",
                WorkflowName = "test-workflow"
            }
        };

        _discoveryMock
            .Setup(x => x.GetWorkflowByNameAsync("test-workflow", null))
            .ReturnsAsync(workflow);

        _analyzerMock
            .Setup(x => x.AnalyzeWorkflow(workflow))
            .Returns(usages);

        // Act
        var result = await _controller.AnalyzeWorkflowUsage("test-workflow");

        // Assert
        var okResult = result.Result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<WorkflowUsageAnalysisResponse>().Subject;
        response.WorkflowName.Should().Be("test-workflow");
        response.TaskUsages.Should().HaveCount(1);
    }

    [Fact]
    public async Task AnalyzeWorkflowUsage_ReturnsNotFound_WhenWorkflowMissing()
    {
        // Arrange
        _discoveryMock
            .Setup(x => x.GetWorkflowByNameAsync("non-existent", null))
            .ReturnsAsync((WorkflowResource?)null);

        // Act
        var result = await _controller.AnalyzeWorkflowUsage("non-existent");

        // Assert
        result.Result.Should().BeOfType<NotFoundObjectResult>();
    }
}
