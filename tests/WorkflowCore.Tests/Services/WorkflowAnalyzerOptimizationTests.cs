using FluentAssertions;
using WorkflowCore.Models;
using WorkflowCore.Services;
using Xunit;

namespace WorkflowCore.Tests.Services;

/// <summary>
/// Tests for advanced optimization pattern detection in WorkflowAnalyzer.
/// Stage 14.1: Static Workflow Analyzer
/// </summary>
public class WorkflowAnalyzerOptimizationTests
{
    private readonly IWorkflowAnalyzer _analyzer;

    public WorkflowAnalyzerOptimizationTests()
    {
        _analyzer = new WorkflowAnalyzer();
    }

    #region Filter-Before-Map Detection

    [Fact]
    public void DetectFilterBeforeMap_MapThenFilter_ReturnsCandidate()
    {
        // Arrange - task-a does map, task-b does filter on same data
        // Opportunity: filter first to reduce data volume before expensive map
        var workflow = CreateWorkflowWithTransforms("test-workflow", new List<WorkflowTaskStep>
        {
            new()
            {
                Id = "fetch-data",
                TaskRef = "data-source",
                Input = new()
            },
            new()
            {
                Id = "map-task",
                TaskRef = "transform",
                Input = new()
                {
                    ["data"] = "{{ tasks.fetch-data.output.items }}",
                    ["transform"] = """{"pipeline":[{"operation":"map","mappings":{"fullName":"$.firstName + ' ' + $.lastName"}}]}"""
                },
                DependsOn = ["fetch-data"]
            },
            new()
            {
                Id = "filter-task",
                TaskRef = "transform",
                Input = new()
                {
                    ["data"] = "{{ tasks.map-task.output.result }}",
                    ["transform"] = """{"pipeline":[{"operation":"filter","field":"status","operator":"eq","value":"active"}]}"""
                },
                DependsOn = ["map-task"]
            }
        },
        new Dictionary<string, string> { ["result"] = "{{ tasks.filter-task.output.result }}" });

        // Act
        var result = _analyzer.Analyze(workflow);

        // Assert
        var filterBeforeMapCandidates = result.Candidates.Where(c => c.Type == "filter-reorder").ToList();
        filterBeforeMapCandidates.Should().HaveCount(1);
        filterBeforeMapCandidates[0].Description.Should().Contain("filter");
        filterBeforeMapCandidates[0].Description.Should().Contain("map");
    }

    [Fact]
    public void DetectFilterBeforeMap_FilterThenMap_NoCandidates()
    {
        // Arrange - already optimal: filter first, then map
        var workflow = CreateWorkflowWithTransforms("test-workflow", new List<WorkflowTaskStep>
        {
            new()
            {
                Id = "fetch-data",
                TaskRef = "data-source",
                Input = new()
            },
            new()
            {
                Id = "filter-task",
                TaskRef = "transform",
                Input = new()
                {
                    ["data"] = "{{ tasks.fetch-data.output.items }}",
                    ["transform"] = """{"pipeline":[{"operation":"filter","field":"status","operator":"eq","value":"active"}]}"""
                },
                DependsOn = ["fetch-data"]
            },
            new()
            {
                Id = "map-task",
                TaskRef = "transform",
                Input = new()
                {
                    ["data"] = "{{ tasks.filter-task.output.result }}",
                    ["transform"] = """{"pipeline":[{"operation":"map","mappings":{"fullName":"$.firstName + ' ' + $.lastName"}}]}"""
                },
                DependsOn = ["filter-task"]
            }
        },
        new Dictionary<string, string> { ["result"] = "{{ tasks.map-task.output.result }}" });

        // Act
        var result = _analyzer.Analyze(workflow);

        // Assert
        result.Candidates.Where(c => c.Type == "filter-reorder").Should().BeEmpty();
    }

    [Fact]
    public void DetectFilterBeforeMap_FilterDependsOnMappedField_NoCandidates()
    {
        // Arrange - filter uses a field that was created by the map, so can't reorder
        var workflow = CreateWorkflowWithTransforms("test-workflow", new List<WorkflowTaskStep>
        {
            new()
            {
                Id = "fetch-data",
                TaskRef = "data-source",
                Input = new()
            },
            new()
            {
                Id = "map-task",
                TaskRef = "transform",
                Input = new()
                {
                    ["data"] = "{{ tasks.fetch-data.output.items }}",
                    ["transform"] = """{"pipeline":[{"operation":"map","mappings":{"totalPrice":"$.price * $.quantity"}}]}"""
                },
                DependsOn = ["fetch-data"]
            },
            new()
            {
                Id = "filter-task",
                TaskRef = "transform",
                Input = new()
                {
                    ["data"] = "{{ tasks.map-task.output.result }}",
                    ["transform"] = """{"pipeline":[{"operation":"filter","field":"totalPrice","operator":"gt","value":100}]}"""
                },
                DependsOn = ["map-task"]
            }
        },
        new Dictionary<string, string> { ["result"] = "{{ tasks.filter-task.output.result }}" });

        // Act
        var result = _analyzer.Analyze(workflow);

        // Assert - No candidate because filter uses field created by map
        result.Candidates.Where(c => c.Type == "filter-reorder").Should().BeEmpty();
    }

    #endregion

    #region Transform Fusion Detection

    [Fact]
    public void DetectTransformFusion_ConsecutiveMaps_ReturnsCandidate()
    {
        // Arrange - two consecutive map operations that could be combined
        var workflow = CreateWorkflowWithTransforms("test-workflow", new List<WorkflowTaskStep>
        {
            new()
            {
                Id = "fetch-data",
                TaskRef = "data-source",
                Input = new()
            },
            new()
            {
                Id = "map-task-1",
                TaskRef = "transform",
                Input = new()
                {
                    ["data"] = "{{ tasks.fetch-data.output.items }}",
                    ["transform"] = """{"pipeline":[{"operation":"map","mappings":{"name":"$.firstName"}}]}"""
                },
                DependsOn = ["fetch-data"]
            },
            new()
            {
                Id = "map-task-2",
                TaskRef = "transform",
                Input = new()
                {
                    ["data"] = "{{ tasks.map-task-1.output.result }}",
                    ["transform"] = """{"pipeline":[{"operation":"map","mappings":{"uppercaseName":"uppercase($.name)"}}]}"""
                },
                DependsOn = ["map-task-1"]
            }
        },
        new Dictionary<string, string> { ["result"] = "{{ tasks.map-task-2.output.result }}" });

        // Act
        var result = _analyzer.Analyze(workflow);

        // Assert
        var fusionCandidates = result.Candidates.Where(c => c.Type == "transform-fusion").ToList();
        fusionCandidates.Should().HaveCount(1);
        fusionCandidates[0].Description.Should().Contain("map");
        fusionCandidates[0].Description.Should().Contain("fuse");
    }

    [Fact]
    public void DetectTransformFusion_ConsecutiveSelects_ReturnsCandidate()
    {
        // Arrange - two consecutive select operations that could be combined
        var workflow = CreateWorkflowWithTransforms("test-workflow", new List<WorkflowTaskStep>
        {
            new()
            {
                Id = "fetch-data",
                TaskRef = "data-source",
                Input = new()
            },
            new()
            {
                Id = "select-task-1",
                TaskRef = "transform",
                Input = new()
                {
                    ["data"] = "{{ tasks.fetch-data.output.items }}",
                    ["transform"] = """{"pipeline":[{"operation":"select","fields":{"id":"$.id","name":"$.name","email":"$.email"}}]}"""
                },
                DependsOn = ["fetch-data"]
            },
            new()
            {
                Id = "select-task-2",
                TaskRef = "transform",
                Input = new()
                {
                    ["data"] = "{{ tasks.select-task-1.output.result }}",
                    ["transform"] = """{"pipeline":[{"operation":"select","fields":{"id":"$.id","name":"$.name"}}]}"""
                },
                DependsOn = ["select-task-1"]
            }
        },
        new Dictionary<string, string> { ["result"] = "{{ tasks.select-task-2.output.result }}" });

        // Act
        var result = _analyzer.Analyze(workflow);

        // Assert
        var fusionCandidates = result.Candidates.Where(c => c.Type == "transform-fusion").ToList();
        fusionCandidates.Should().HaveCount(1);
    }

    [Fact]
    public void DetectTransformFusion_NonConsecutiveMaps_NoCandidates()
    {
        // Arrange - maps separated by filter, can't fuse directly
        var workflow = CreateWorkflowWithTransforms("test-workflow", new List<WorkflowTaskStep>
        {
            new()
            {
                Id = "fetch-data",
                TaskRef = "data-source",
                Input = new()
            },
            new()
            {
                Id = "map-task-1",
                TaskRef = "transform",
                Input = new()
                {
                    ["data"] = "{{ tasks.fetch-data.output.items }}",
                    ["transform"] = """{"pipeline":[{"operation":"map","mappings":{"price":"$.amount"}}]}"""
                },
                DependsOn = ["fetch-data"]
            },
            new()
            {
                Id = "filter-task",
                TaskRef = "transform",
                Input = new()
                {
                    ["data"] = "{{ tasks.map-task-1.output.result }}",
                    ["transform"] = """{"pipeline":[{"operation":"filter","field":"price","operator":"gt","value":10}]}"""
                },
                DependsOn = ["map-task-1"]
            },
            new()
            {
                Id = "map-task-2",
                TaskRef = "transform",
                Input = new()
                {
                    ["data"] = "{{ tasks.filter-task.output.result }}",
                    ["transform"] = """{"pipeline":[{"operation":"map","mappings":{"formattedPrice":"'$' + $.price"}}]}"""
                },
                DependsOn = ["filter-task"]
            }
        },
        new Dictionary<string, string> { ["result"] = "{{ tasks.map-task-2.output.result }}" });

        // Act
        var result = _analyzer.Analyze(workflow);

        // Assert - maps are not consecutive, so no fusion candidate
        result.Candidates.Where(c => c.Type == "transform-fusion").Should().BeEmpty();
    }

    [Fact]
    public void DetectTransformFusion_ThreeConsecutiveMaps_ReturnsTwoCandidates()
    {
        // Arrange - three consecutive maps
        var workflow = CreateWorkflowWithTransforms("test-workflow", new List<WorkflowTaskStep>
        {
            new()
            {
                Id = "fetch-data",
                TaskRef = "data-source",
                Input = new()
            },
            new()
            {
                Id = "map-task-1",
                TaskRef = "transform",
                Input = new()
                {
                    ["data"] = "{{ tasks.fetch-data.output.items }}",
                    ["transform"] = """{"pipeline":[{"operation":"map","mappings":{"a":"$.x"}}]}"""
                },
                DependsOn = ["fetch-data"]
            },
            new()
            {
                Id = "map-task-2",
                TaskRef = "transform",
                Input = new()
                {
                    ["data"] = "{{ tasks.map-task-1.output.result }}",
                    ["transform"] = """{"pipeline":[{"operation":"map","mappings":{"b":"$.a"}}]}"""
                },
                DependsOn = ["map-task-1"]
            },
            new()
            {
                Id = "map-task-3",
                TaskRef = "transform",
                Input = new()
                {
                    ["data"] = "{{ tasks.map-task-2.output.result }}",
                    ["transform"] = """{"pipeline":[{"operation":"map","mappings":{"c":"$.b"}}]}"""
                },
                DependsOn = ["map-task-2"]
            }
        },
        new Dictionary<string, string> { ["result"] = "{{ tasks.map-task-3.output.result }}" });

        // Act
        var result = _analyzer.Analyze(workflow);

        // Assert - two fusion opportunities: (1,2) and (2,3)
        var fusionCandidates = result.Candidates.Where(c => c.Type == "transform-fusion").ToList();
        fusionCandidates.Should().HaveCount(2);
    }

    #endregion

    #region Redundant Select Detection

    [Fact]
    public void DetectRedundantSelect_SelectAfterMapIgnoringFields_ReturnsCandidate()
    {
        // Arrange - map creates field that select ignores
        var workflow = CreateWorkflowWithTransforms("test-workflow", new List<WorkflowTaskStep>
        {
            new()
            {
                Id = "fetch-data",
                TaskRef = "data-source",
                Input = new()
            },
            new()
            {
                Id = "map-task",
                TaskRef = "transform",
                Input = new()
                {
                    ["data"] = "{{ tasks.fetch-data.output.items }}",
                    ["transform"] = """{"pipeline":[{"operation":"map","mappings":{"computedField":"$.a * $.b","anotherField":"$.c + $.d"}}]}"""
                },
                DependsOn = ["fetch-data"]
            },
            new()
            {
                Id = "select-task",
                TaskRef = "transform",
                Input = new()
                {
                    ["data"] = "{{ tasks.map-task.output.result }}",
                    ["transform"] = """{"pipeline":[{"operation":"select","fields":{"id":"$.id"}}]}"""
                },
                DependsOn = ["map-task"]
            }
        },
        new Dictionary<string, string> { ["result"] = "{{ tasks.select-task.output.result }}" });

        // Act
        var result = _analyzer.Analyze(workflow);

        // Assert
        var redundantCandidates = result.Candidates.Where(c => c.Type == "redundant-transform").ToList();
        redundantCandidates.Should().HaveCount(1);
        redundantCandidates[0].Description.Should().Contain("computed");
    }

    [Fact]
    public void DetectRedundantSelect_SelectUsingAllMappedFields_NoCandidates()
    {
        // Arrange - select uses all fields created by map
        var workflow = CreateWorkflowWithTransforms("test-workflow", new List<WorkflowTaskStep>
        {
            new()
            {
                Id = "fetch-data",
                TaskRef = "data-source",
                Input = new()
            },
            new()
            {
                Id = "map-task",
                TaskRef = "transform",
                Input = new()
                {
                    ["data"] = "{{ tasks.fetch-data.output.items }}",
                    ["transform"] = """{"pipeline":[{"operation":"map","mappings":{"fullName":"$.firstName + ' ' + $.lastName"}}]}"""
                },
                DependsOn = ["fetch-data"]
            },
            new()
            {
                Id = "select-task",
                TaskRef = "transform",
                Input = new()
                {
                    ["data"] = "{{ tasks.map-task.output.result }}",
                    ["transform"] = """{"pipeline":[{"operation":"select","fields":{"name":"$.fullName"}}]}"""
                },
                DependsOn = ["map-task"]
            }
        },
        new Dictionary<string, string> { ["result"] = "{{ tasks.select-task.output.result }}" });

        // Act
        var result = _analyzer.Analyze(workflow);

        // Assert - mapped field is used, so no redundancy
        result.Candidates.Where(c => c.Type == "redundant-transform").Should().BeEmpty();
    }

    #endregion

    #region Consecutive Filter Fusion

    [Fact]
    public void DetectFilterFusion_ConsecutiveFilters_ReturnsCandidate()
    {
        // Arrange - two consecutive filters that could be combined with AND
        var workflow = CreateWorkflowWithTransforms("test-workflow", new List<WorkflowTaskStep>
        {
            new()
            {
                Id = "fetch-data",
                TaskRef = "data-source",
                Input = new()
            },
            new()
            {
                Id = "filter-task-1",
                TaskRef = "transform",
                Input = new()
                {
                    ["data"] = "{{ tasks.fetch-data.output.items }}",
                    ["transform"] = """{"pipeline":[{"operation":"filter","field":"status","operator":"eq","value":"active"}]}"""
                },
                DependsOn = ["fetch-data"]
            },
            new()
            {
                Id = "filter-task-2",
                TaskRef = "transform",
                Input = new()
                {
                    ["data"] = "{{ tasks.filter-task-1.output.result }}",
                    ["transform"] = """{"pipeline":[{"operation":"filter","field":"age","operator":"gte","value":18}]}"""
                },
                DependsOn = ["filter-task-1"]
            }
        },
        new Dictionary<string, string> { ["result"] = "{{ tasks.filter-task-2.output.result }}" });

        // Act
        var result = _analyzer.Analyze(workflow);

        // Assert
        var filterFusionCandidates = result.Candidates.Where(c => c.Type == "filter-fusion").ToList();
        filterFusionCandidates.Should().HaveCount(1);
        filterFusionCandidates[0].Description.Should().Contain("filter");
        filterFusionCandidates[0].Description.Should().Contain("combine");
    }

    #endregion

    #region Pipeline Optimization Detection

    [Fact]
    public void DetectPipelineOptimization_LimitAfterExpensiveOperations_ReturnsCandidate()
    {
        // Arrange - limit could be applied earlier to reduce processing
        var workflow = CreateWorkflowWithTransforms("test-workflow", new List<WorkflowTaskStep>
        {
            new()
            {
                Id = "fetch-data",
                TaskRef = "data-source",
                Input = new()
            },
            new()
            {
                Id = "map-task",
                TaskRef = "transform",
                Input = new()
                {
                    ["data"] = "{{ tasks.fetch-data.output.items }}",
                    ["transform"] = """{"pipeline":[{"operation":"map","mappings":{"fullName":"$.firstName + ' ' + $.lastName"}}]}"""
                },
                DependsOn = ["fetch-data"]
            },
            new()
            {
                Id = "limit-task",
                TaskRef = "transform",
                Input = new()
                {
                    ["data"] = "{{ tasks.map-task.output.result }}",
                    ["transform"] = """{"pipeline":[{"operation":"limit","count":10}]}"""
                },
                DependsOn = ["map-task"]
            }
        },
        new Dictionary<string, string> { ["result"] = "{{ tasks.limit-task.output.result }}" });

        // Act
        var result = _analyzer.Analyze(workflow);

        // Assert
        var limitCandidates = result.Candidates.Where(c => c.Type == "early-limit").ToList();
        limitCandidates.Should().HaveCount(1);
        limitCandidates[0].Description.Should().Contain("limit");
    }

    [Fact]
    public void DetectPipelineOptimization_LimitAfterFilter_NoCandidates()
    {
        // Arrange - limit after filter is correct (filter may change count)
        var workflow = CreateWorkflowWithTransforms("test-workflow", new List<WorkflowTaskStep>
        {
            new()
            {
                Id = "fetch-data",
                TaskRef = "data-source",
                Input = new()
            },
            new()
            {
                Id = "filter-task",
                TaskRef = "transform",
                Input = new()
                {
                    ["data"] = "{{ tasks.fetch-data.output.items }}",
                    ["transform"] = """{"pipeline":[{"operation":"filter","field":"status","operator":"eq","value":"active"}]}"""
                },
                DependsOn = ["fetch-data"]
            },
            new()
            {
                Id = "limit-task",
                TaskRef = "transform",
                Input = new()
                {
                    ["data"] = "{{ tasks.filter-task.output.result }}",
                    ["transform"] = """{"pipeline":[{"operation":"limit","count":10}]}"""
                },
                DependsOn = ["filter-task"]
            }
        },
        new Dictionary<string, string> { ["result"] = "{{ tasks.limit-task.output.result }}" });

        // Act
        var result = _analyzer.Analyze(workflow);

        // Assert - limit after filter is semantically different, so not an optimization
        result.Candidates.Where(c => c.Type == "early-limit").Should().BeEmpty();
    }

    #endregion

    #region Combined Optimization Detection

    [Fact]
    public void Analyze_WorkflowWithMultipleOptimizations_ReturnsAllCandidates()
    {
        // Arrange - workflow with dead task, parallel promotion, and transform optimization
        var workflow = CreateWorkflowWithTransforms("test-workflow", new List<WorkflowTaskStep>
        {
            new()
            {
                Id = "unused-task",
                TaskRef = "data-source",
                Input = new()
            },
            new()
            {
                Id = "fetch-data",
                TaskRef = "data-source",
                Input = new()
            },
            new()
            {
                Id = "filter-task-1",
                TaskRef = "transform",
                Input = new()
                {
                    ["data"] = "{{ tasks.fetch-data.output.items }}",
                    ["transform"] = """{"pipeline":[{"operation":"filter","field":"a","operator":"eq","value":1}]}"""
                },
                DependsOn = ["fetch-data"]
            },
            new()
            {
                Id = "filter-task-2",
                TaskRef = "transform",
                Input = new()
                {
                    ["data"] = "{{ tasks.filter-task-1.output.result }}",
                    ["transform"] = """{"pipeline":[{"operation":"filter","field":"b","operator":"eq","value":2}]}"""
                },
                DependsOn = ["filter-task-1"]
            }
        },
        new Dictionary<string, string> { ["result"] = "{{ tasks.filter-task-2.output.result }}" });

        // Act
        var result = _analyzer.Analyze(workflow);

        // Assert - should find dead-task and filter-fusion
        result.Candidates.Should().HaveCountGreaterOrEqualTo(2);
        result.Candidates.Should().Contain(c => c.Type == "dead-task");
        result.Candidates.Should().Contain(c => c.Type == "filter-fusion");
    }

    #endregion

    #region Helper Methods

    private static WorkflowResource CreateWorkflowWithTransforms(
        string name,
        List<WorkflowTaskStep> tasks,
        Dictionary<string, string>? output)
    {
        return new WorkflowResource
        {
            ApiVersion = "workflow.io/v1",
            Kind = "Workflow",
            Metadata = new ResourceMetadata { Name = name },
            Spec = new WorkflowSpec
            {
                Tasks = tasks,
                Output = output
            }
        };
    }

    #endregion
}
