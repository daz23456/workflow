using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using WorkflowCore.Data.Repositories;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Controllers;
using WorkflowGateway.Models;
using WorkflowGateway.Services;
using Xunit;

namespace WorkflowGateway.Tests.Controllers;

public class DynamicWorkflowControllerEnhancedTestTests
{
    private readonly Mock<IWorkflowDiscoveryService> _mockDiscoveryService;
    private readonly Mock<IInputValidationService> _mockValidationService;
    private readonly Mock<IWorkflowExecutionService> _mockExecutionService;
    private readonly Mock<IExecutionGraphBuilder> _mockGraphBuilder;
    private readonly Mock<IExecutionRepository> _mockExecutionRepository;
    private readonly DynamicWorkflowController _controller;

    public DynamicWorkflowControllerEnhancedTestTests()
    {
        _mockDiscoveryService = new Mock<IWorkflowDiscoveryService>();
        _mockValidationService = new Mock<IInputValidationService>();
        _mockExecutionService = new Mock<IWorkflowExecutionService>();
        _mockGraphBuilder = new Mock<IExecutionGraphBuilder>();
        _mockExecutionRepository = new Mock<IExecutionRepository>();

        _controller = new DynamicWorkflowController(
            _mockDiscoveryService.Object,
            _mockValidationService.Object,
            _mockExecutionService.Object,
            _mockGraphBuilder.Object,
            _mockExecutionRepository.Object
        );
    }

    [Fact]
    public async Task Test_ShouldReturnEnhancedExecutionPlan_WithGraphVisualization()
    {
        // Arrange
        var workflowName = "enhanced-test-workflow";
        var workflow = CreateTestWorkflow(workflowName);
        var request = new WorkflowTestRequest
        {
            Input = new Dictionary<string, object> { ["userId"] = 123 }
        };

        _mockDiscoveryService.Setup(s => s.GetWorkflowByNameAsync(workflowName, null))
            .ReturnsAsync(workflow);
        _mockValidationService.Setup(s => s.ValidateAsync(workflow, request.Input))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        var graph = new ExecutionGraph();
        graph.AddNode("task1");
        graph.AddNode("task2");
        graph.AddDependency("task2", "task1");

        _mockGraphBuilder.Setup(b => b.Build(workflow))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = graph });

        // Act
        var result = await _controller.Test(workflowName, request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeAssignableTo<WorkflowTestResponse>().Subject;

        response.Valid.Should().BeTrue();
        response.ExecutionPlan.Should().NotBeNull();

        var enhancedPlan = response.ExecutionPlan.Should().BeOfType<EnhancedExecutionPlan>().Subject;
        enhancedPlan.Nodes.Should().HaveCount(2);
        enhancedPlan.Edges.Should().HaveCount(1);
        enhancedPlan.ParallelGroups.Should().HaveCount(2);
        enhancedPlan.ExecutionOrder.Should().HaveCount(2);
    }

    [Fact]
    public async Task Test_ShouldIncludeParallelGroups_InEnhancedPlan()
    {
        // Arrange
        var workflowName = "parallel-workflow";
        var workflow = CreateTestWorkflow(workflowName);
        var request = new WorkflowTestRequest { Input = new Dictionary<string, object>() };

        _mockDiscoveryService.Setup(s => s.GetWorkflowByNameAsync(workflowName, null))
            .ReturnsAsync(workflow);
        _mockValidationService.Setup(s => s.ValidateAsync(workflow, request.Input))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        var graph = new ExecutionGraph();
        graph.AddNode("fetch-user");
        graph.AddNode("fetch-settings");
        graph.AddNode("merge");
        graph.AddDependency("merge", "fetch-user");
        graph.AddDependency("merge", "fetch-settings");

        _mockGraphBuilder.Setup(b => b.Build(workflow))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = graph });

        // Act
        var result = await _controller.Test(workflowName, request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeAssignableTo<WorkflowTestResponse>().Subject;
        var enhancedPlan = response.ExecutionPlan.Should().BeOfType<EnhancedExecutionPlan>().Subject;

        enhancedPlan.ParallelGroups.Should().HaveCount(2);
        enhancedPlan.ParallelGroups[0].Level.Should().Be(0);
        enhancedPlan.ParallelGroups[0].TaskIds.Should().HaveCount(2);
        enhancedPlan.ParallelGroups[0].TaskIds.Should().Contain(new[] { "fetch-settings", "fetch-user" });
        enhancedPlan.ParallelGroups[1].Level.Should().Be(1);
        enhancedPlan.ParallelGroups[1].TaskIds.Should().ContainSingle().Which.Should().Be("merge");
    }

    [Fact]
    public async Task Test_ShouldIncludeGraphNodes_WithLevelInformation()
    {
        // Arrange
        var workflowName = "graph-nodes-workflow";
        var workflow = CreateWorkflowWithTaskRefs();
        var request = new WorkflowTestRequest { Input = new Dictionary<string, object>() };

        _mockDiscoveryService.Setup(s => s.GetWorkflowByNameAsync(workflowName, null))
            .ReturnsAsync(workflow);
        _mockValidationService.Setup(s => s.ValidateAsync(workflow, request.Input))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        var graph = new ExecutionGraph();
        graph.AddNode("step1");
        graph.AddNode("step2");
        graph.AddDependency("step2", "step1");

        _mockGraphBuilder.Setup(b => b.Build(workflow))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = graph });

        // Act
        var result = await _controller.Test(workflowName, request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeAssignableTo<WorkflowTestResponse>().Subject;
        var enhancedPlan = response.ExecutionPlan.Should().BeOfType<EnhancedExecutionPlan>().Subject;

        var step1Node = enhancedPlan.Nodes.Should().ContainSingle(n => n.Id == "step1").Subject;
        step1Node.Level.Should().Be(0);
        step1Node.TaskRef.Should().Be("fetch-user");

        var step2Node = enhancedPlan.Nodes.Should().ContainSingle(n => n.Id == "step2").Subject;
        step2Node.Level.Should().Be(1);
        step2Node.TaskRef.Should().Be("process-user");
    }

    [Fact]
    public async Task Test_ShouldIncludeGraphEdges_RepresentingDependencies()
    {
        // Arrange
        var workflowName = "graph-edges-workflow";
        var workflow = CreateTestWorkflow(workflowName);
        var request = new WorkflowTestRequest { Input = new Dictionary<string, object>() };

        _mockDiscoveryService.Setup(s => s.GetWorkflowByNameAsync(workflowName, null))
            .ReturnsAsync(workflow);
        _mockValidationService.Setup(s => s.ValidateAsync(workflow, request.Input))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        var graph = new ExecutionGraph();
        graph.AddNode("task1");
        graph.AddNode("task2");
        graph.AddNode("task3");
        graph.AddDependency("task2", "task1");
        graph.AddDependency("task3", "task2");

        _mockGraphBuilder.Setup(b => b.Build(workflow))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = graph });

        // Act
        var result = await _controller.Test(workflowName, request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeAssignableTo<WorkflowTestResponse>().Subject;
        var enhancedPlan = response.ExecutionPlan.Should().BeOfType<EnhancedExecutionPlan>().Subject;

        enhancedPlan.Edges.Should().HaveCount(2);
        enhancedPlan.Edges.Should().Contain(e => e.From == "task2" && e.To == "task1");
        enhancedPlan.Edges.Should().Contain(e => e.From == "task3" && e.To == "task2");
    }

    [Fact]
    public async Task Test_ShouldIncludeExecutionOrder_FromTopologicalSort()
    {
        // Arrange
        var workflowName = "execution-order-workflow";
        var workflow = CreateTestWorkflow(workflowName);
        var request = new WorkflowTestRequest { Input = new Dictionary<string, object>() };

        _mockDiscoveryService.Setup(s => s.GetWorkflowByNameAsync(workflowName, null))
            .ReturnsAsync(workflow);
        _mockValidationService.Setup(s => s.ValidateAsync(workflow, request.Input))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        var graph = new ExecutionGraph();
        graph.AddNode("start");
        graph.AddNode("middle");
        graph.AddNode("end");
        graph.AddDependency("middle", "start");
        graph.AddDependency("end", "middle");

        _mockGraphBuilder.Setup(b => b.Build(workflow))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = graph });

        // Act
        var result = await _controller.Test(workflowName, request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeAssignableTo<WorkflowTestResponse>().Subject;
        var enhancedPlan = response.ExecutionPlan.Should().BeOfType<EnhancedExecutionPlan>().Subject;

        enhancedPlan.ExecutionOrder.Should().Equal("start", "middle", "end");
    }

    [Fact]
    public async Task Test_ShouldIncludeValidationResult_WhenInvalid()
    {
        // Arrange
        var workflowName = "invalid-workflow";
        var workflow = CreateTestWorkflow(workflowName);
        var request = new WorkflowTestRequest { Input = new Dictionary<string, object>() };

        _mockDiscoveryService.Setup(s => s.GetWorkflowByNameAsync(workflowName, null))
            .ReturnsAsync(workflow);
        _mockValidationService.Setup(s => s.ValidateAsync(workflow, request.Input))
            .ReturnsAsync(new ValidationResult
            {
                IsValid = false,
                Errors = new List<ValidationError> { new ValidationError { Message = "Invalid input" } }
            });

        // Act
        var result = await _controller.Test(workflowName, request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeAssignableTo<WorkflowTestResponse>().Subject;

        response.Valid.Should().BeFalse();
        response.ValidationErrors.Should().Contain("Invalid input");
    }

    private WorkflowResource CreateTestWorkflow(string name)
    {
        return new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = name, Namespace = "default" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task1", TaskRef = "test-task" }
                }
            }
        };
    }

    private WorkflowResource CreateWorkflowWithTaskRefs()
    {
        return new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "workflow-with-refs", Namespace = "default" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "step1", TaskRef = "fetch-user" },
                    new WorkflowTaskStep { Id = "step2", TaskRef = "process-user" }
                }
            }
        };
    }
}
