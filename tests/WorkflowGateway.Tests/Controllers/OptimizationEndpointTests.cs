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

public class OptimizationEndpointTests
{
    private readonly Mock<IWorkflowDiscoveryService> _discoveryServiceMock;
    private readonly Mock<IWorkflowAnalyzer> _analyzerMock;
    private readonly Mock<ITransformEquivalenceChecker> _equivalenceCheckerMock;
    private readonly Mock<IHistoricalReplayEngine> _replayEngineMock;
    private readonly OptimizationController _controller;

    public OptimizationEndpointTests()
    {
        _discoveryServiceMock = new Mock<IWorkflowDiscoveryService>();
        _analyzerMock = new Mock<IWorkflowAnalyzer>();
        _equivalenceCheckerMock = new Mock<ITransformEquivalenceChecker>();
        _replayEngineMock = new Mock<IHistoricalReplayEngine>();

        _controller = new OptimizationController(
            _discoveryServiceMock.Object,
            _analyzerMock.Object,
            _equivalenceCheckerMock.Object,
            _replayEngineMock.Object);
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_WithNullDiscoveryService_ShouldThrowArgumentNullException()
    {
        Assert.Throws<ArgumentNullException>(() => new OptimizationController(
            null!,
            _analyzerMock.Object,
            _equivalenceCheckerMock.Object,
            _replayEngineMock.Object));
    }

    [Fact]
    public void Constructor_WithNullAnalyzer_ShouldThrowArgumentNullException()
    {
        Assert.Throws<ArgumentNullException>(() => new OptimizationController(
            _discoveryServiceMock.Object,
            null!,
            _equivalenceCheckerMock.Object,
            _replayEngineMock.Object));
    }

    [Fact]
    public void Constructor_WithNullEquivalenceChecker_ShouldThrowArgumentNullException()
    {
        Assert.Throws<ArgumentNullException>(() => new OptimizationController(
            _discoveryServiceMock.Object,
            _analyzerMock.Object,
            null!,
            _replayEngineMock.Object));
    }

    [Fact]
    public void Constructor_WithNullReplayEngine_ShouldThrowArgumentNullException()
    {
        Assert.Throws<ArgumentNullException>(() => new OptimizationController(
            _discoveryServiceMock.Object,
            _analyzerMock.Object,
            _equivalenceCheckerMock.Object,
            null!));
    }

    #endregion

    #region GET /workflows/{name}/optimizations

    [Fact]
    public async Task GetOptimizations_WithValidWorkflow_ShouldReturnOptimizationSuggestions()
    {
        // Arrange
        var workflowName = "test-workflow";
        var workflow = CreateTestWorkflow(workflowName);

        _discoveryServiceMock
            .Setup(s => s.GetWorkflowByNameAsync(workflowName, null))
            .ReturnsAsync(workflow);

        var analysisResult = new WorkflowAnalysisResult(
            workflowName,
            new List<OptimizationCandidate>
            {
                new OptimizationCandidate(
                    "filter-before-map",
                    "task1",
                    "Filter should run before transform to reduce data volume",
                    0.8)
            },
            new Dictionary<string, HashSet<string>>());

        _analyzerMock
            .Setup(a => a.Analyze(workflow))
            .Returns(analysisResult);

        _equivalenceCheckerMock
            .Setup(e => e.AssessOptimizationSafety(It.IsAny<OptimizationCandidate>()))
            .Returns(SafetyLevel.Safe);

        // Act
        var result = await _controller.GetOptimizations(workflowName);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<OptimizationListResponse>().Subject;
        response.WorkflowName.Should().Be(workflowName);
        response.Suggestions.Should().HaveCount(1);
        response.Suggestions[0].Id.Should().Be("opt-1-filter-before-map-task1");
        response.Suggestions[0].Type.Should().Be("filter-before-map");
        response.Suggestions[0].SafetyLevel.Should().Be("Safe");
    }

    [Fact]
    public async Task GetOptimizations_WithNonExistentWorkflow_ShouldReturn404()
    {
        // Arrange
        _discoveryServiceMock
            .Setup(s => s.GetWorkflowByNameAsync("non-existent", null))
            .ReturnsAsync((WorkflowResource?)null);

        // Act
        var result = await _controller.GetOptimizations("non-existent");

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task GetOptimizations_WithNoOptimizations_ShouldReturnEmptyList()
    {
        // Arrange
        var workflowName = "optimized-workflow";
        var workflow = CreateTestWorkflow(workflowName);

        _discoveryServiceMock
            .Setup(s => s.GetWorkflowByNameAsync(workflowName, null))
            .ReturnsAsync(workflow);

        _analyzerMock
            .Setup(a => a.Analyze(workflow))
            .Returns(new WorkflowAnalysisResult(
                workflowName,
                new List<OptimizationCandidate>(),
                new Dictionary<string, HashSet<string>>()));

        // Act
        var result = await _controller.GetOptimizations(workflowName);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<OptimizationListResponse>().Subject;
        response.Suggestions.Should().BeEmpty();
    }

    #endregion

    #region POST /workflows/{name}/optimizations/{id}/test

    [Fact]
    public async Task TestOptimization_WithValidOptimization_ShouldReturnReplayResult()
    {
        // Arrange
        var workflowName = "test-workflow";
        var optimizationId = "opt-1-filter-before-map-task1";
        var workflow = CreateTestWorkflow(workflowName);
        var tasks = new List<WorkflowTaskResource> { CreateTestTask("task1") };

        _discoveryServiceMock
            .Setup(s => s.GetWorkflowByNameAsync(workflowName, null))
            .ReturnsAsync(workflow);
        _discoveryServiceMock
            .Setup(s => s.DiscoverTasksAsync(null))
            .ReturnsAsync(tasks);

        var analysisResult = new WorkflowAnalysisResult(
            workflowName,
            new List<OptimizationCandidate>
            {
                new OptimizationCandidate("filter-before-map", "task1", "Filter optimization", 0.8)
            },
            new Dictionary<string, HashSet<string>>());

        _analyzerMock
            .Setup(a => a.Analyze(workflow))
            .Returns(analysisResult);

        var replayResult = new ReplayResult(
            TotalReplays: 10,
            MatchingOutputs: 9,
            Mismatches: new List<ReplayMismatch>
            {
                new("exec-1", "task2", "Output mismatch")
            },
            AverageTimeDelta: TimeSpan.FromMilliseconds(-50));

        _replayEngineMock
            .Setup(r => r.ReplayWorkflowAsync(
                workflow,
                It.IsAny<WorkflowResource>(),
                It.IsAny<Dictionary<string, WorkflowTaskResource>>(),
                It.IsAny<int>(),
                It.IsAny<ReplayOptions>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(replayResult);

        // Act
        var result = await _controller.TestOptimization(workflowName, optimizationId, new OptimizationTestRequest { ReplayCount = 10 });

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<OptimizationTestResponse>().Subject;
        response.OptimizationId.Should().Be(optimizationId);
        response.ConfidenceScore.Should().Be(0.9);
        response.TotalReplays.Should().Be(10);
        response.MatchingOutputs.Should().Be(9);
        response.AverageTimeDeltaMs.Should().Be(-50);
    }

    [Fact]
    public async Task TestOptimization_WithNonExistentWorkflow_ShouldReturn404()
    {
        // Arrange
        _discoveryServiceMock
            .Setup(s => s.GetWorkflowByNameAsync("non-existent", null))
            .ReturnsAsync((WorkflowResource?)null);

        // Act
        var result = await _controller.TestOptimization("non-existent", "opt-1", new OptimizationTestRequest());

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task TestOptimization_WithNonExistentOptimization_ShouldReturn404()
    {
        // Arrange
        var workflowName = "test-workflow";
        var workflow = CreateTestWorkflow(workflowName);
        var tasks = new List<WorkflowTaskResource> { CreateTestTask("task1") };

        _discoveryServiceMock
            .Setup(s => s.GetWorkflowByNameAsync(workflowName, null))
            .ReturnsAsync(workflow);
        _discoveryServiceMock
            .Setup(s => s.DiscoverTasksAsync(null))
            .ReturnsAsync(tasks);

        _analyzerMock
            .Setup(a => a.Analyze(workflow))
            .Returns(new WorkflowAnalysisResult(
                workflowName,
                new List<OptimizationCandidate>(),
                new Dictionary<string, HashSet<string>>()));

        // Act
        var result = await _controller.TestOptimization(workflowName, "non-existent-opt", new OptimizationTestRequest());

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task TestOptimization_WithDryRunMode_ShouldPassDryRunToReplayEngine()
    {
        // Arrange
        var workflowName = "test-workflow";
        var optimizationId = "opt-1-filter-before-map-task1";
        var workflow = CreateTestWorkflow(workflowName);
        var tasks = new List<WorkflowTaskResource> { CreateTestTask("task1") };

        _discoveryServiceMock
            .Setup(s => s.GetWorkflowByNameAsync(workflowName, null))
            .ReturnsAsync(workflow);
        _discoveryServiceMock
            .Setup(s => s.DiscoverTasksAsync(null))
            .ReturnsAsync(tasks);

        var analysisResult = new WorkflowAnalysisResult(
            workflowName,
            new List<OptimizationCandidate>
            {
                new OptimizationCandidate("filter-before-map", "task1", "Filter optimization", 0.8)
            },
            new Dictionary<string, HashSet<string>>());

        _analyzerMock
            .Setup(a => a.Analyze(workflow))
            .Returns(analysisResult);

        ReplayOptions? capturedOptions = null;
        var replayResult = new ReplayResult(
            TotalReplays: 1,
            MatchingOutputs: 1,
            Mismatches: new List<ReplayMismatch>(),
            AverageTimeDelta: TimeSpan.Zero);

        _replayEngineMock
            .Setup(r => r.ReplayWorkflowAsync(
                workflow,
                It.IsAny<WorkflowResource>(),
                It.IsAny<Dictionary<string, WorkflowTaskResource>>(),
                It.IsAny<int>(),
                It.IsAny<ReplayOptions>(),
                It.IsAny<CancellationToken>()))
            .Callback<WorkflowResource, WorkflowResource, Dictionary<string, WorkflowTaskResource>, int, ReplayOptions?, CancellationToken>(
                (_, _, _, _, options, _) => capturedOptions = options)
            .ReturnsAsync(replayResult);

        // Act
        var result = await _controller.TestOptimization(
            workflowName,
            optimizationId,
            new OptimizationTestRequest { DryRun = true });

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        capturedOptions.Should().NotBeNull();
        capturedOptions!.DryRun.Should().BeTrue();
    }

    #endregion

    #region POST /workflows/{name}/optimizations/{id}/apply

    [Fact]
    public async Task ApplyOptimization_WithValidOptimization_ShouldReturnOptimizedWorkflow()
    {
        // Arrange
        var workflowName = "test-workflow";
        var optimizationId = "opt-1-filter-before-map-task1";
        var workflow = CreateTestWorkflow(workflowName);

        _discoveryServiceMock
            .Setup(s => s.GetWorkflowByNameAsync(workflowName, null))
            .ReturnsAsync(workflow);

        var analysisResult = new WorkflowAnalysisResult(
            workflowName,
            new List<OptimizationCandidate>
            {
                new OptimizationCandidate("filter-before-map", "task1", "Filter optimization", 0.8)
            },
            new Dictionary<string, HashSet<string>>());

        _analyzerMock
            .Setup(a => a.Analyze(workflow))
            .Returns(analysisResult);

        _equivalenceCheckerMock
            .Setup(e => e.AssessOptimizationSafety(It.IsAny<OptimizationCandidate>()))
            .Returns(SafetyLevel.Safe);

        // Act
        var result = await _controller.ApplyOptimization(workflowName, optimizationId);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<OptimizationApplyResponse>().Subject;
        response.OptimizationId.Should().Be(optimizationId);
        response.Applied.Should().BeTrue();
        response.OptimizedWorkflow.Should().NotBeNull();
    }

    [Fact]
    public async Task ApplyOptimization_WithUnsafeOptimization_ShouldReturn400()
    {
        // Arrange
        var workflowName = "test-workflow";
        var optimizationId = "opt-1-limit-reorder-task1";
        var workflow = CreateTestWorkflow(workflowName);

        _discoveryServiceMock
            .Setup(s => s.GetWorkflowByNameAsync(workflowName, null))
            .ReturnsAsync(workflow);

        var analysisResult = new WorkflowAnalysisResult(
            workflowName,
            new List<OptimizationCandidate>
            {
                new OptimizationCandidate("limit-reorder", "task1", "Limit reorder", 0.5)
            },
            new Dictionary<string, HashSet<string>>());

        _analyzerMock
            .Setup(a => a.Analyze(workflow))
            .Returns(analysisResult);

        _equivalenceCheckerMock
            .Setup(e => e.AssessOptimizationSafety(It.IsAny<OptimizationCandidate>()))
            .Returns(SafetyLevel.Unsafe);

        // Act
        var result = await _controller.ApplyOptimization(workflowName, optimizationId);

        // Assert
        var badRequestResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
        var response = badRequestResult.Value.Should().BeAssignableTo<object>().Subject;
        response.ToString().Should().Contain("unsafe");
    }

    [Fact]
    public async Task ApplyOptimization_WithForceFlag_ShouldApplyUnsafeOptimization()
    {
        // Arrange
        var workflowName = "test-workflow";
        var optimizationId = "opt-1-limit-reorder-task1";
        var workflow = CreateTestWorkflow(workflowName);

        _discoveryServiceMock
            .Setup(s => s.GetWorkflowByNameAsync(workflowName, null))
            .ReturnsAsync(workflow);

        var analysisResult = new WorkflowAnalysisResult(
            workflowName,
            new List<OptimizationCandidate>
            {
                new OptimizationCandidate("limit-reorder", "task1", "Limit reorder", 0.5)
            },
            new Dictionary<string, HashSet<string>>());

        _analyzerMock
            .Setup(a => a.Analyze(workflow))
            .Returns(analysisResult);

        _equivalenceCheckerMock
            .Setup(e => e.AssessOptimizationSafety(It.IsAny<OptimizationCandidate>()))
            .Returns(SafetyLevel.Unsafe);

        // Act
        var result = await _controller.ApplyOptimization(workflowName, optimizationId, force: true);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<OptimizationApplyResponse>().Subject;
        response.Applied.Should().BeTrue();
        response.Warning.Should().Contain("unsafe");
    }

    #endregion

    #region Helper Methods

    private static WorkflowResource CreateTestWorkflow(string name)
    {
        return new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = name },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new() { Id = "task1", TaskRef = "task1" },
                    new() { Id = "task2", TaskRef = "task2", DependsOn = new List<string> { "task1" } }
                }
            }
        };
    }

    private static WorkflowTaskResource CreateTestTask(string name)
    {
        return new WorkflowTaskResource
        {
            Metadata = new ResourceMetadata { Name = name },
            Spec = new WorkflowTaskSpec
            {
                Http = new HttpRequestDefinition { Url = "http://example.com" }
            }
        };
    }

    #endregion
}
