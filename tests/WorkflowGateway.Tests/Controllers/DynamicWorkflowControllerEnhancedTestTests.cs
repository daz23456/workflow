using FluentAssertions;
using Microsoft.AspNetCore.Mvc;
using Moq;
using System.Text.Json;
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
    private readonly Mock<ITemplatePreviewService> _mockTemplatePreviewService;
    private readonly Mock<IWorkflowYamlParser> _mockYamlParser;
    private readonly DynamicWorkflowController _controller;

    public DynamicWorkflowControllerEnhancedTestTests()
    {
        _mockDiscoveryService = new Mock<IWorkflowDiscoveryService>();
        _mockValidationService = new Mock<IInputValidationService>();
        _mockExecutionService = new Mock<IWorkflowExecutionService>();
        _mockGraphBuilder = new Mock<IExecutionGraphBuilder>();
        _mockExecutionRepository = new Mock<IExecutionRepository>();
        _mockTemplatePreviewService = new Mock<ITemplatePreviewService>();
        _mockYamlParser = new Mock<IWorkflowYamlParser>();

        // Setup default mocks for new functionality (can be overridden in tests)
        _mockExecutionRepository
            .Setup(r => r.GetAverageTaskDurationsAsync(It.IsAny<string>(), It.IsAny<int>()))
            .ReturnsAsync(new Dictionary<string, long>());

        _mockTemplatePreviewService
            .Setup(s => s.PreviewTemplate(It.IsAny<string>(), It.IsAny<JsonElement>()))
            .Returns(new Dictionary<string, string>());

        _controller = new DynamicWorkflowController(
            _mockDiscoveryService.Object,
            _mockValidationService.Object,
            _mockExecutionService.Object,
            _mockGraphBuilder.Object,
            _mockExecutionRepository.Object,
            _mockTemplatePreviewService.Object,
            _mockYamlParser.Object
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
        // Edges go from prerequisite (Source) to dependent (Target)
        // task2 depends on task1, so edge is task1 -> task2
        // task3 depends on task2, so edge is task2 -> task3
        enhancedPlan.Edges.Should().Contain(e => e.Source == "task1" && e.Target == "task2");
        enhancedPlan.Edges.Should().Contain(e => e.Source == "task2" && e.Target == "task3");
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

    [Fact]
    public async Task Test_ShouldIncludeEstimatedDuration_FromHistoricalData()
    {
        // Arrange
        var workflowName = "timed-workflow";
        var workflow = CreateWorkflowWithTasks();
        var request = new WorkflowTestRequest
        {
            Input = new Dictionary<string, object> { ["userId"] = 123 }
        };

        _mockDiscoveryService.Setup(s => s.GetWorkflowByNameAsync(workflowName, null))
            .ReturnsAsync(workflow);
        _mockValidationService.Setup(s => s.ValidateAsync(workflow, request.Input))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        var graph = new ExecutionGraph();
        graph.AddNode("fetch-user");
        graph.AddNode("process-user");

        _mockGraphBuilder.Setup(b => b.Build(workflow))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = graph });

        // Mock historical duration data: fetch-user takes 100ms, process-user takes 250ms
        var historicalDurations = new Dictionary<string, long>
        {
            ["fetch-user-task"] = 100,
            ["process-user-task"] = 250
        };

        _mockExecutionRepository.Setup(r => r.GetAverageTaskDurationsAsync(workflowName, 30))
            .ReturnsAsync(historicalDurations);

        // Act
        var result = await _controller.Test(workflowName, request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeAssignableTo<WorkflowTestResponse>().Subject;
        var enhancedPlan = response.ExecutionPlan.Should().BeOfType<EnhancedExecutionPlan>().Subject;

        enhancedPlan.EstimatedDurationMs.Should().Be(350); // 100 + 250
    }

    [Fact]
    public async Task Test_ShouldIncludeTemplatePreview_ForAllTasks()
    {
        // Arrange
        var workflowName = "template-preview-workflow";
        var workflow = CreateWorkflowWithTemplates();
        var inputData = new Dictionary<string, object> { ["userId"] = 123, ["email"] = "test@example.com" };
        var request = new WorkflowTestRequest { Input = inputData };

        _mockDiscoveryService.Setup(s => s.GetWorkflowByNameAsync(workflowName, null))
            .ReturnsAsync(workflow);
        _mockValidationService.Setup(s => s.ValidateAsync(workflow, request.Input))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        var graph = new ExecutionGraph();
        graph.AddNode("task1");
        graph.AddNode("task2");

        _mockGraphBuilder.Setup(b => b.Build(workflow))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = graph });

        _mockExecutionRepository.Setup(r => r.GetAverageTaskDurationsAsync(workflowName, 30))
            .ReturnsAsync(new Dictionary<string, long>());

        // Mock template preview responses
        _mockTemplatePreviewService.Setup(s => s.PreviewTemplate(
            It.Is<string>(str => str.Contains("{{input.userId}}")),
            It.IsAny<JsonElement>()))
            .Returns(new Dictionary<string, string> { ["{{input.userId}}"] = "123" });

        _mockTemplatePreviewService.Setup(s => s.PreviewTemplate(
            It.Is<string>(str => str.Contains("{{tasks.task1.output.data}}")),
            It.IsAny<JsonElement>()))
            .Returns(new Dictionary<string, string> { ["{{tasks.task1.output.data}}"] = "<will-resolve-from-task1.output.data>" });

        // Act
        var result = await _controller.Test(workflowName, request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeAssignableTo<WorkflowTestResponse>().Subject;
        var enhancedPlan = response.ExecutionPlan.Should().BeOfType<EnhancedExecutionPlan>().Subject;

        enhancedPlan.TemplatePreviews.Should().ContainKey("task1");
        enhancedPlan.TemplatePreviews.Should().ContainKey("task2");
        enhancedPlan.TemplatePreviews.Count.Should().Be(2);
    }

    [Fact]
    public async Task Test_EstimatedDuration_ShouldBeNull_WhenNoHistoricalData()
    {
        // Arrange
        var workflowName = "new-workflow";
        var workflow = CreateWorkflowWithTasks();
        var request = new WorkflowTestRequest
        {
            Input = new Dictionary<string, object> { ["userId"] = 123 }
        };

        _mockDiscoveryService.Setup(s => s.GetWorkflowByNameAsync(workflowName, null))
            .ReturnsAsync(workflow);
        _mockValidationService.Setup(s => s.ValidateAsync(workflow, request.Input))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        var graph = new ExecutionGraph();
        graph.AddNode("fetch-user");
        graph.AddNode("process-user");

        _mockGraphBuilder.Setup(b => b.Build(workflow))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = graph });

        // No historical data available
        _mockExecutionRepository.Setup(r => r.GetAverageTaskDurationsAsync(workflowName, 30))
            .ReturnsAsync(new Dictionary<string, long>());

        // Act
        var result = await _controller.Test(workflowName, request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeAssignableTo<WorkflowTestResponse>().Subject;
        var enhancedPlan = response.ExecutionPlan.Should().BeOfType<EnhancedExecutionPlan>().Subject;

        enhancedPlan.EstimatedDurationMs.Should().BeNull();
    }

    [Fact]
    public async Task Test_TemplatePreview_ShouldResolveInputTemplates()
    {
        // Arrange
        var workflowName = "input-template-workflow";
        var workflow = CreateWorkflowWithInputTemplate();
        var inputData = new Dictionary<string, object> { ["userId"] = 999 };
        var request = new WorkflowTestRequest { Input = inputData };

        _mockDiscoveryService.Setup(s => s.GetWorkflowByNameAsync(workflowName, null))
            .ReturnsAsync(workflow);
        _mockValidationService.Setup(s => s.ValidateAsync(workflow, request.Input))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        var graph = new ExecutionGraph();
        graph.AddNode("fetch-task");

        _mockGraphBuilder.Setup(b => b.Build(workflow))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = graph });

        _mockExecutionRepository.Setup(r => r.GetAverageTaskDurationsAsync(workflowName, 30))
            .ReturnsAsync(new Dictionary<string, long>());

        // Mock template preview to return resolved input value
        _mockTemplatePreviewService.Setup(s => s.PreviewTemplate(
            "{{input.userId}}",
            It.IsAny<JsonElement>()))
            .Returns(new Dictionary<string, string> { ["{{input.userId}}"] = "999" });

        // Act
        var result = await _controller.Test(workflowName, request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeAssignableTo<WorkflowTestResponse>().Subject;
        var enhancedPlan = response.ExecutionPlan.Should().BeOfType<EnhancedExecutionPlan>().Subject;

        enhancedPlan.TemplatePreviews.Should().ContainKey("fetch-task");
        enhancedPlan.TemplatePreviews["fetch-task"].Should().ContainKey("{{input.userId}}");
        enhancedPlan.TemplatePreviews["fetch-task"]["{{input.userId}}"].Should().Be("999");
    }

    [Fact]
    public async Task Test_TemplatePreview_ShouldShowPlaceholders_ForTaskOutputs()
    {
        // Arrange
        var workflowName = "task-output-template-workflow";
        var workflow = CreateWorkflowWithTaskOutputTemplate();
        var request = new WorkflowTestRequest { Input = new Dictionary<string, object>() };

        _mockDiscoveryService.Setup(s => s.GetWorkflowByNameAsync(workflowName, null))
            .ReturnsAsync(workflow);
        _mockValidationService.Setup(s => s.ValidateAsync(workflow, request.Input))
            .ReturnsAsync(new ValidationResult { IsValid = true });

        var graph = new ExecutionGraph();
        graph.AddNode("task1");
        graph.AddNode("task2");

        _mockGraphBuilder.Setup(b => b.Build(workflow))
            .Returns(new ExecutionGraphResult { IsValid = true, Graph = graph });

        _mockExecutionRepository.Setup(r => r.GetAverageTaskDurationsAsync(workflowName, 30))
            .ReturnsAsync(new Dictionary<string, long>());

        // Mock template preview to return placeholder for task output
        _mockTemplatePreviewService.Setup(s => s.PreviewTemplate(
            "{{tasks.task1.output.result}}",
            It.IsAny<JsonElement>()))
            .Returns(new Dictionary<string, string> { ["{{tasks.task1.output.result}}"] = "<will-resolve-from-task1.output.result>" });

        // Act
        var result = await _controller.Test(workflowName, request);

        // Assert
        var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
        var response = okResult.Value.Should().BeAssignableTo<WorkflowTestResponse>().Subject;
        var enhancedPlan = response.ExecutionPlan.Should().BeOfType<EnhancedExecutionPlan>().Subject;

        enhancedPlan.TemplatePreviews.Should().ContainKey("task2");
        enhancedPlan.TemplatePreviews["task2"].Should().ContainKey("{{tasks.task1.output.result}}");
        enhancedPlan.TemplatePreviews["task2"]["{{tasks.task1.output.result}}"].Should().Be("<will-resolve-from-task1.output.result>");
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

    private WorkflowResource CreateWorkflowWithTasks()
    {
        return new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "workflow-with-tasks", Namespace = "default" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "fetch-user", TaskRef = "fetch-user-task" },
                    new WorkflowTaskStep { Id = "process-user", TaskRef = "process-user-task" }
                }
            }
        };
    }

    private WorkflowResource CreateWorkflowWithTemplates()
    {
        return new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "template-workflow", Namespace = "default" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "task1",
                        TaskRef = "test-task",
                        Input = new Dictionary<string, string> { ["userId"] = "{{input.userId}}" }
                    },
                    new WorkflowTaskStep
                    {
                        Id = "task2",
                        TaskRef = "test-task",
                        Input = new Dictionary<string, string> { ["data"] = "{{tasks.task1.output.data}}" }
                    }
                }
            }
        };
    }

    private WorkflowResource CreateWorkflowWithInputTemplate()
    {
        return new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "input-template-workflow", Namespace = "default" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep
                    {
                        Id = "fetch-task",
                        TaskRef = "fetch-task",
                        Input = new Dictionary<string, string> { ["userId"] = "{{input.userId}}" }
                    }
                }
            }
        };
    }

    private WorkflowResource CreateWorkflowWithTaskOutputTemplate()
    {
        return new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "task-output-workflow", Namespace = "default" },
            Spec = new WorkflowSpec
            {
                Tasks = new List<WorkflowTaskStep>
                {
                    new WorkflowTaskStep { Id = "task1", TaskRef = "first-task" },
                    new WorkflowTaskStep
                    {
                        Id = "task2",
                        TaskRef = "second-task",
                        Input = new Dictionary<string, string> { ["result"] = "{{tasks.task1.output.result}}" }
                    }
                }
            }
        };
    }
}
