using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Controllers;
using WorkflowGateway.Models;
using Xunit;

namespace WorkflowGateway.Tests.Controllers;

public class BlastRadiusEndpointTests
{
    private readonly Mock<ITaskDependencyTracker> _dependencyTrackerMock;
    private readonly Mock<ITaskLifecycleManager> _lifecycleManagerMock;
    private readonly Mock<IBlastRadiusAnalyzer> _blastRadiusAnalyzerMock;
    private readonly TaskImpactController _controller;

    public BlastRadiusEndpointTests()
    {
        _dependencyTrackerMock = new Mock<ITaskDependencyTracker>();
        _lifecycleManagerMock = new Mock<ITaskLifecycleManager>();
        _blastRadiusAnalyzerMock = new Mock<IBlastRadiusAnalyzer>();
        _controller = new TaskImpactController(
            _dependencyTrackerMock.Object,
            _lifecycleManagerMock.Object,
            _blastRadiusAnalyzerMock.Object);
    }

    #region Success Cases

    [Fact]
    public async Task GetBlastRadius_ValidTask_Returns200WithResult()
    {
        // Arrange
        var result = new BlastRadiusResult
        {
            TaskName = "get-user",
            AnalysisDepth = 1,
            TruncatedAtDepth = false,
            AffectedWorkflows = new List<string> { "order-flow" },
            AffectedTasks = new List<string> { "validate-order" },
            ByDepth = new List<BlastRadiusDepthLevel>
            {
                new() { Depth = 1, Workflows = new List<string> { "order-flow" }, Tasks = new List<string> { "validate-order" } }
            },
            Graph = new BlastRadiusGraph
            {
                Nodes = new List<BlastRadiusNode>
                {
                    new() { Id = "task:get-user", Name = "get-user", Type = BlastRadiusNodeType.Task, Depth = 0, IsSource = true }
                },
                Edges = new List<BlastRadiusEdge>()
            }
        };

        _blastRadiusAnalyzerMock
            .Setup(x => x.AnalyzeAsync("get-user", 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(result);

        // Act
        var response = await _controller.GetBlastRadius("get-user");

        // Assert
        var okResult = response.Result.Should().BeOfType<OkObjectResult>().Subject;
        var blastRadius = okResult.Value.Should().BeOfType<BlastRadiusResponse>().Subject;

        blastRadius.TaskName.Should().Be("get-user");
        blastRadius.AnalysisDepth.Should().Be(1);
        blastRadius.Summary.Should().NotBeNull();
        blastRadius.Summary!.TotalAffectedWorkflows.Should().Be(1);
        blastRadius.Graph.Should().NotBeNull();
    }

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(3)]
    public async Task GetBlastRadius_WithDepthParameter_PassesDepthToAnalyzer(int depth)
    {
        // Arrange
        _blastRadiusAnalyzerMock
            .Setup(x => x.AnalyzeAsync("task-a", depth, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new BlastRadiusResult { TaskName = "task-a", AnalysisDepth = depth });

        // Act
        await _controller.GetBlastRadius("task-a", depth: depth);

        // Assert
        _blastRadiusAnalyzerMock.Verify(x => x.AnalyzeAsync("task-a", depth, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetBlastRadius_UnlimitedDepth_PassesMaxValueToAnalyzer()
    {
        // Arrange
        _blastRadiusAnalyzerMock
            .Setup(x => x.AnalyzeAsync("task-a", int.MaxValue, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new BlastRadiusResult { TaskName = "task-a", AnalysisDepth = int.MaxValue });

        // Act
        await _controller.GetBlastRadius("task-a", depth: 0); // 0 or "unlimited" = MaxValue

        // Assert
        _blastRadiusAnalyzerMock.Verify(x => x.AnalyzeAsync("task-a", int.MaxValue, It.IsAny<CancellationToken>()), Times.Once);
    }

    #endregion

    #region Format Parameter Tests

    [Fact]
    public async Task GetBlastRadius_FormatFlat_ReturnsSummaryOnly()
    {
        // Arrange
        _blastRadiusAnalyzerMock
            .Setup(x => x.AnalyzeAsync("task-a", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new BlastRadiusResult
            {
                TaskName = "task-a",
                AffectedWorkflows = new List<string> { "wf-1" },
                Graph = new BlastRadiusGraph { Nodes = new List<BlastRadiusNode>(), Edges = new List<BlastRadiusEdge>() }
            });

        // Act
        var response = await _controller.GetBlastRadius("task-a", format: "flat");

        // Assert
        var okResult = response.Result.Should().BeOfType<OkObjectResult>().Subject;
        var blastRadius = okResult.Value.Should().BeOfType<BlastRadiusResponse>().Subject;

        blastRadius.Summary.Should().NotBeNull();
        blastRadius.Graph.Should().BeNull();
    }

    [Fact]
    public async Task GetBlastRadius_FormatGraph_ReturnsGraphOnly()
    {
        // Arrange
        _blastRadiusAnalyzerMock
            .Setup(x => x.AnalyzeAsync("task-a", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new BlastRadiusResult
            {
                TaskName = "task-a",
                AffectedWorkflows = new List<string> { "wf-1" },
                Graph = new BlastRadiusGraph
                {
                    Nodes = new List<BlastRadiusNode>
                    {
                        new() { Id = "task:task-a", Name = "task-a", Type = BlastRadiusNodeType.Task }
                    },
                    Edges = new List<BlastRadiusEdge>()
                }
            });

        // Act
        var response = await _controller.GetBlastRadius("task-a", format: "graph");

        // Assert
        var okResult = response.Result.Should().BeOfType<OkObjectResult>().Subject;
        var blastRadius = okResult.Value.Should().BeOfType<BlastRadiusResponse>().Subject;

        blastRadius.Summary.Should().BeNull();
        blastRadius.Graph.Should().NotBeNull();
    }

    [Fact]
    public async Task GetBlastRadius_FormatBoth_ReturnsSummaryAndGraph()
    {
        // Arrange
        _blastRadiusAnalyzerMock
            .Setup(x => x.AnalyzeAsync("task-a", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new BlastRadiusResult
            {
                TaskName = "task-a",
                AffectedWorkflows = new List<string> { "wf-1" },
                Graph = new BlastRadiusGraph
                {
                    Nodes = new List<BlastRadiusNode>(),
                    Edges = new List<BlastRadiusEdge>()
                }
            });

        // Act
        var response = await _controller.GetBlastRadius("task-a", format: "both");

        // Assert
        var okResult = response.Result.Should().BeOfType<OkObjectResult>().Subject;
        var blastRadius = okResult.Value.Should().BeOfType<BlastRadiusResponse>().Subject;

        blastRadius.Summary.Should().NotBeNull();
        blastRadius.Graph.Should().NotBeNull();
    }

    #endregion

    #region Edge Cases

    [Fact]
    public async Task GetBlastRadius_EmptyResult_ReturnsEmptyLists()
    {
        // Arrange
        _blastRadiusAnalyzerMock
            .Setup(x => x.AnalyzeAsync("isolated-task", It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new BlastRadiusResult
            {
                TaskName = "isolated-task",
                AnalysisDepth = 1,
                AffectedWorkflows = new List<string>(),
                AffectedTasks = new List<string>(),
                Graph = new BlastRadiusGraph()
            });

        // Act
        var response = await _controller.GetBlastRadius("isolated-task");

        // Assert
        var okResult = response.Result.Should().BeOfType<OkObjectResult>().Subject;
        var blastRadius = okResult.Value.Should().BeOfType<BlastRadiusResponse>().Subject;

        blastRadius.Summary!.TotalAffectedWorkflows.Should().Be(0);
        blastRadius.Summary.TotalAffectedTasks.Should().Be(0);
    }

    [Fact]
    public async Task GetBlastRadius_TruncatedResult_SetsTruncatedFlag()
    {
        // Arrange
        _blastRadiusAnalyzerMock
            .Setup(x => x.AnalyzeAsync("task-a", 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new BlastRadiusResult
            {
                TaskName = "task-a",
                AnalysisDepth = 1,
                TruncatedAtDepth = true
            });

        // Act
        var response = await _controller.GetBlastRadius("task-a", depth: 1);

        // Assert
        var okResult = response.Result.Should().BeOfType<OkObjectResult>().Subject;
        var blastRadius = okResult.Value.Should().BeOfType<BlastRadiusResponse>().Subject;

        blastRadius.TruncatedAtDepth.Should().BeTrue();
    }

    [Fact]
    public async Task GetBlastRadius_DefaultParameters_UsesDepth1AndBothFormat()
    {
        // Arrange
        _blastRadiusAnalyzerMock
            .Setup(x => x.AnalyzeAsync("task-a", 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new BlastRadiusResult
            {
                TaskName = "task-a",
                Graph = new BlastRadiusGraph()
            });

        // Act
        var response = await _controller.GetBlastRadius("task-a");

        // Assert
        _blastRadiusAnalyzerMock.Verify(x => x.AnalyzeAsync("task-a", 1, It.IsAny<CancellationToken>()), Times.Once);

        var okResult = response.Result.Should().BeOfType<OkObjectResult>().Subject;
        var blastRadius = okResult.Value.Should().BeOfType<BlastRadiusResponse>().Subject;

        blastRadius.Summary.Should().NotBeNull();
        blastRadius.Graph.Should().NotBeNull();
    }

    #endregion
}
