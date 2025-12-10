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
/// Tests for OptimizationController - optimization discovery and application.
/// </summary>
public class OptimizationControllerTests
{
    private readonly Mock<IWorkflowDiscoveryService> _discoveryServiceMock;
    private readonly Mock<IWorkflowAnalyzer> _analyzerMock;
    private readonly Mock<ITransformEquivalenceChecker> _equivalenceCheckerMock;
    private readonly Mock<IHistoricalReplayEngine> _replayEngineMock;
    private readonly OptimizationController _controller;

    public OptimizationControllerTests()
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
        Action act = () => new OptimizationController(
            null!,
            _analyzerMock.Object,
            _equivalenceCheckerMock.Object,
            _replayEngineMock.Object);

        act.Should().Throw<ArgumentNullException>()
            .WithMessage("*discoveryService*");
    }

    [Fact]
    public void Constructor_WithNullAnalyzer_ShouldThrowArgumentNullException()
    {
        Action act = () => new OptimizationController(
            _discoveryServiceMock.Object,
            null!,
            _equivalenceCheckerMock.Object,
            _replayEngineMock.Object);

        act.Should().Throw<ArgumentNullException>()
            .WithMessage("*analyzer*");
    }

    [Fact]
    public void Constructor_WithNullEquivalenceChecker_ShouldThrowArgumentNullException()
    {
        Action act = () => new OptimizationController(
            _discoveryServiceMock.Object,
            _analyzerMock.Object,
            null!,
            _replayEngineMock.Object);

        act.Should().Throw<ArgumentNullException>()
            .WithMessage("*equivalenceChecker*");
    }

    [Fact]
    public void Constructor_WithNullReplayEngine_ShouldThrowArgumentNullException()
    {
        Action act = () => new OptimizationController(
            _discoveryServiceMock.Object,
            _analyzerMock.Object,
            _equivalenceCheckerMock.Object,
            null!);

        act.Should().Throw<ArgumentNullException>()
            .WithMessage("*replayEngine*");
    }

    #endregion

    #region GetOptimizations Tests

    [Fact]
    public async Task GetOptimizations_WithValidWorkflow_ShouldReturnOptimizationList()
    {
        // Arrange
        var workflowName = "test-workflow";
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = workflowName },
            Spec = new WorkflowSpec()
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync(workflowName, It.IsAny<string?>()))
            .ReturnsAsync(workflow);

        var candidates = new List<OptimizationCandidate>
        {
            new OptimizationCandidate("filter-before-map", "task-1", "Move filter before map", 0.8),
            new OptimizationCandidate("dead-task", "task-2", "Remove dead task", 0.2)
        };

        _analyzerMock
            .Setup(x => x.Analyze(workflow))
            .Returns(new WorkflowAnalysisResult(workflowName, candidates, new Dictionary<string, HashSet<string>>()));

        _equivalenceCheckerMock
            .Setup(x => x.AssessOptimizationSafety(It.IsAny<OptimizationCandidate>()))
            .Returns(SafetyLevel.Safe);

        // Act
        var result = await _controller.GetOptimizations(workflowName);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<OptimizationListResponse>().Subject;
        response.WorkflowName.Should().Be(workflowName);
        response.Suggestions.Should().HaveCount(2);
        response.Suggestions[0].Type.Should().Be("filter-before-map");
        response.Suggestions[0].EstimatedImpact.Should().Be("High");
        response.Suggestions[1].EstimatedImpact.Should().Be("Low");
    }

    [Fact]
    public async Task GetOptimizations_WithNonExistentWorkflow_ShouldReturn404()
    {
        // Arrange
        var workflowName = "non-existent";

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync(workflowName, It.IsAny<string?>()))
            .ReturnsAsync((WorkflowResource?)null);

        // Act
        var result = await _controller.GetOptimizations(workflowName);

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task GetOptimizations_ShouldMapEstimatedImpactCorrectly()
    {
        // Arrange
        var workflowName = "impact-workflow";
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = workflowName },
            Spec = new WorkflowSpec()
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync(workflowName, It.IsAny<string?>()))
            .ReturnsAsync(workflow);

        var candidates = new List<OptimizationCandidate>
        {
            new OptimizationCandidate("a", "t1", "High impact", 0.9),  // High
            new OptimizationCandidate("b", "t2", "Medium impact", 0.5),  // Medium
            new OptimizationCandidate("c", "t3", "Low impact", 0.1)   // Low
        };

        _analyzerMock
            .Setup(x => x.Analyze(workflow))
            .Returns(new WorkflowAnalysisResult(workflowName, candidates, new Dictionary<string, HashSet<string>>()));

        _equivalenceCheckerMock
            .Setup(x => x.AssessOptimizationSafety(It.IsAny<OptimizationCandidate>()))
            .Returns(SafetyLevel.Safe);

        // Act
        var result = await _controller.GetOptimizations(workflowName);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<OptimizationListResponse>().Subject;
        response.Suggestions[0].EstimatedImpact.Should().Be("High");
        response.Suggestions[1].EstimatedImpact.Should().Be("Medium");
        response.Suggestions[2].EstimatedImpact.Should().Be("Low");
    }

    #endregion

    #region TestOptimization Tests

    [Fact]
    public async Task TestOptimization_WithValidOptimization_ShouldReturnReplayResults()
    {
        // Arrange
        var workflowName = "test-workflow";
        var optimizationId = "opt-1-filter-before-map-task-1";
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = workflowName },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "task-ref-1" }
                }
            }
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync(workflowName, It.IsAny<string?>()))
            .ReturnsAsync(workflow);

        _discoveryServiceMock
            .Setup(x => x.DiscoverTasksAsync(It.IsAny<string?>()))
            .ReturnsAsync(new List<WorkflowTaskResource>());

        var candidates = new List<OptimizationCandidate>
        {
            new OptimizationCandidate("filter-before-map", "task-1", "Optimization", 0.5)
        };

        _analyzerMock
            .Setup(x => x.Analyze(workflow))
            .Returns(new WorkflowAnalysisResult(workflowName, candidates, new Dictionary<string, HashSet<string>>()));

        _replayEngineMock
            .Setup(x => x.ReplayWorkflowAsync(
                It.IsAny<WorkflowResource>(),
                It.IsAny<WorkflowResource>(),
                It.IsAny<Dictionary<string, WorkflowTaskResource>>(),
                It.IsAny<int>(),
                It.IsAny<ReplayOptions>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ReplayResult(
                TotalReplays: 100,
                MatchingOutputs: 95,
                Mismatches: new List<ReplayMismatch>
                {
                    new ReplayMismatch("exec-123", "task-1", "Output difference")
                },
                AverageTimeDelta: TimeSpan.FromMilliseconds(-50)
            ));

        var request = new OptimizationTestRequest
        {
            ReplayCount = 100,
            DryRun = false
        };

        // Act
        var result = await _controller.TestOptimization(workflowName, optimizationId, request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<OptimizationTestResponse>().Subject;
        response.OptimizationId.Should().Be(optimizationId);
        response.ConfidenceScore.Should().Be(0.95);
        response.TotalReplays.Should().Be(100);
        response.MatchingOutputs.Should().Be(95);
        response.AverageTimeDeltaMs.Should().Be(-50);
        response.Mismatches.Should().HaveCount(1);
    }

    [Fact]
    public async Task TestOptimization_WithNonExistentWorkflow_ShouldReturn404()
    {
        // Arrange
        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync(It.IsAny<string>(), It.IsAny<string?>()))
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
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = workflowName },
            Spec = new WorkflowSpec()
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync(workflowName, It.IsAny<string?>()))
            .ReturnsAsync(workflow);

        _discoveryServiceMock
            .Setup(x => x.DiscoverTasksAsync(It.IsAny<string?>()))
            .ReturnsAsync(new List<WorkflowTaskResource>());

        _analyzerMock
            .Setup(x => x.Analyze(workflow))
            .Returns(new WorkflowAnalysisResult(workflowName, new List<OptimizationCandidate>(), new Dictionary<string, HashSet<string>>()));

        // Act
        var result = await _controller.TestOptimization(workflowName, "opt-99-invalid", new OptimizationTestRequest());

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion

    #region ApplyOptimization Tests

    [Fact]
    public async Task ApplyOptimization_WithSafeOptimization_ShouldReturnOptimizedWorkflow()
    {
        // Arrange
        var workflowName = "test-workflow";
        var optimizationId = "opt-1-filter-before-map-task-1";
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = workflowName },
            Spec = new WorkflowSpec
            {
                Description = "Original workflow",
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "task-ref-1" },
                    new WorkflowTaskStep { Id = "task-2", TaskRef = "task-ref-2" }
                }
            }
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync(workflowName, It.IsAny<string?>()))
            .ReturnsAsync(workflow);

        var candidates = new List<OptimizationCandidate>
        {
            new OptimizationCandidate("filter-before-map", "task-1", "Optimization", 0.5)
        };

        _analyzerMock
            .Setup(x => x.Analyze(workflow))
            .Returns(new WorkflowAnalysisResult(workflowName, candidates, new Dictionary<string, HashSet<string>>()));

        _equivalenceCheckerMock
            .Setup(x => x.AssessOptimizationSafety(It.IsAny<OptimizationCandidate>()))
            .Returns(SafetyLevel.Safe);

        // Act
        var result = await _controller.ApplyOptimization(workflowName, optimizationId);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<OptimizationApplyResponse>().Subject;
        response.OptimizationId.Should().Be(optimizationId);
        response.Applied.Should().BeTrue();
        response.OptimizedWorkflow.Should().NotBeNull();
        response.Warning.Should().BeNull();
    }

    [Fact]
    public async Task ApplyOptimization_WithUnsafeOptimization_ShouldReturn400()
    {
        // Arrange
        var workflowName = "test-workflow";
        var optimizationId = "opt-1-dead-task-task-1";
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = workflowName },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "task-ref-1" }
                }
            }
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync(workflowName, It.IsAny<string?>()))
            .ReturnsAsync(workflow);

        var candidates = new List<OptimizationCandidate>
        {
            new OptimizationCandidate("dead-task", "task-1", "Remove task", 0.5)
        };

        _analyzerMock
            .Setup(x => x.Analyze(workflow))
            .Returns(new WorkflowAnalysisResult(workflowName, candidates, new Dictionary<string, HashSet<string>>()));

        _equivalenceCheckerMock
            .Setup(x => x.AssessOptimizationSafety(It.IsAny<OptimizationCandidate>()))
            .Returns(SafetyLevel.Unsafe);

        // Act
        var result = await _controller.ApplyOptimization(workflowName, optimizationId);

        // Assert
        result.Should().BeOfType<BadRequestObjectResult>();
    }

    [Fact]
    public async Task ApplyOptimization_WithUnsafeOptimizationAndForce_ShouldApplyWithWarning()
    {
        // Arrange
        var workflowName = "test-workflow";
        var optimizationId = "opt-1-dead-task-task-1";
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = workflowName },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task-1", TaskRef = "task-ref-1" }
                }
            }
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync(workflowName, It.IsAny<string?>()))
            .ReturnsAsync(workflow);

        var candidates = new List<OptimizationCandidate>
        {
            new OptimizationCandidate("dead-task", "task-1", "Remove task", 0.5)
        };

        _analyzerMock
            .Setup(x => x.Analyze(workflow))
            .Returns(new WorkflowAnalysisResult(workflowName, candidates, new Dictionary<string, HashSet<string>>()));

        _equivalenceCheckerMock
            .Setup(x => x.AssessOptimizationSafety(It.IsAny<OptimizationCandidate>()))
            .Returns(SafetyLevel.Unsafe);

        // Act
        var result = await _controller.ApplyOptimization(workflowName, optimizationId, force: true);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeOfType<OptimizationApplyResponse>().Subject;
        response.Applied.Should().BeTrue();
        response.Warning.Should().NotBeNull();
        response.Warning.Should().Contain("unsafe");
    }

    [Fact]
    public async Task ApplyOptimization_WithNonExistentWorkflow_ShouldReturn404()
    {
        // Arrange
        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync(It.IsAny<string>(), It.IsAny<string?>()))
            .ReturnsAsync((WorkflowResource?)null);

        // Act
        var result = await _controller.ApplyOptimization("non-existent", "opt-1");

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    [Fact]
    public async Task ApplyOptimization_WithNonExistentOptimization_ShouldReturn404()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "test" },
            Spec = new WorkflowSpec()
        };

        _discoveryServiceMock
            .Setup(x => x.GetWorkflowByNameAsync(It.IsAny<string>(), It.IsAny<string?>()))
            .ReturnsAsync(workflow);

        _analyzerMock
            .Setup(x => x.Analyze(workflow))
            .Returns(new WorkflowAnalysisResult("test", new List<OptimizationCandidate>(), new Dictionary<string, HashSet<string>>()));

        // Act
        var result = await _controller.ApplyOptimization("test", "opt-99-invalid");

        // Assert
        result.Should().BeOfType<NotFoundObjectResult>();
    }

    #endregion
}
