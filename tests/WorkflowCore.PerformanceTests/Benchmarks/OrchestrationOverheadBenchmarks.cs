using BenchmarkDotNet.Attributes;
using Moq;
using WorkflowCore.Interfaces;
using WorkflowCore.Models;
using WorkflowCore.Services;

namespace WorkflowCore.PerformanceTests.Benchmarks;

/// <summary>
/// CRITICAL BENCHMARK: Measures the overhead of generic graph-based orchestration.
/// Goal: Prove orchestration overhead is minimal (<10ms total, <5% of execution time).
/// </summary>
[MemoryDiagnoser]
[SimpleJob(BenchmarkDotNet.Jobs.RuntimeMoniker.Net80)]
public class OrchestrationOverheadBenchmarks
{
    private ExecutionGraphBuilder? _graphBuilder;
    private TemplateResolver? _templateResolver;
    private Dictionary<string, object>? _inputs;
    private TemplateContext? _context;

    [Params(10, 20, 50)]
    public int WorkflowSize { get; set; }

    [GlobalSetup]
    public void Setup()
    {
        _graphBuilder = new ExecutionGraphBuilder();
        _templateResolver = new TemplateResolver();

        // Create test inputs
        _inputs = new Dictionary<string, object>
        {
            ["userId"] = "user-12345",
            ["email"] = "test@example.com",
            ["amount"] = 100.50
        };

        // Create template context with mock task outputs
        _context = new TemplateContext
        {
            Input = _inputs,
            TaskOutputs = new System.Collections.Concurrent.ConcurrentDictionary<string, Dictionary<string, object>>()
        };

        // Add mock task outputs for template resolution
        for (int i = 0; i < 50; i++)
        {
            _context.TaskOutputs[$"task{i}"] = new Dictionary<string, object>
            {
                ["id"] = $"result-{i}",
                ["status"] = "success",
                ["timestamp"] = DateTime.UtcNow
            };
        }
    }

    /// <summary>
    /// Measure pure graph building overhead (no execution).
    /// Target: <1ms for 10 tasks, <5ms for 50 tasks.
    /// </summary>
    [Benchmark]
    public ExecutionGraphResult MeasureGraphBuildingOnly()
    {
        var workflow = CreateWorkflow($"test-{WorkflowSize}-tasks", WorkflowSize, DependencyPattern.Sequential);
        return _graphBuilder!.Build(workflow);
    }

    /// <summary>
    /// Measure template resolution overhead for multiple templates.
    /// Target: <100μs per template, <1ms for 10 templates.
    /// </summary>
    [Benchmark]
    public async Task<List<string>> MeasureTemplateResolutionOnly()
    {
        var templates = new List<string>
        {
            "{{input.userId}}",
            "{{input.email}}",
            "{{tasks.task0.output.id}}",
            "{{tasks.task1.output.status}}",
            "{{tasks.task2.output.timestamp}}",
            "{{tasks.task3.output.id}}",
            "{{tasks.task4.output.status}}",
            "{{tasks.task5.output.timestamp}}",
            "{{tasks.task6.output.id}}",
            "{{tasks.task7.output.status}}"
        };

        var results = new List<string>();
        foreach (var template in templates)
        {
            var resolved = await _templateResolver!.ResolveAsync(template, _context!);
            results.Add(resolved);
        }

        return results;
    }

    /// <summary>
    /// Measure parallel execution scheduling overhead (Task.WhenAll + SemaphoreSlim).
    /// Target: <2ms for coordinating 10 parallel tasks.
    /// </summary>
    [Benchmark]
    [Arguments(10)]
    [Arguments(20)]
    [Arguments(50)]
    public async Task<int> MeasureExecutionScheduling(int taskCount)
    {
        var semaphore = new SemaphoreSlim(10, 10);
        var tasks = new List<Task<int>>();

        for (int i = 0; i < taskCount; i++)
        {
            tasks.Add(ExecuteMockTaskAsync(semaphore, i));
        }

        var results = await Task.WhenAll(tasks);
        return results.Sum();
    }

    private async Task<int> ExecuteMockTaskAsync(SemaphoreSlim semaphore, int taskId)
    {
        await semaphore.WaitAsync();
        try
        {
            // Simulate minimal task execution (no actual HTTP call)
            await Task.Yield();
            return taskId;
        }
        finally
        {
            semaphore.Release();
        }
    }

    /// <summary>
    /// Measure end-to-end orchestration overhead with mock task execution.
    /// This represents the pure orchestration cost without HTTP/network latency.
    /// Target: <10ms total for 10-task workflow.
    /// </summary>
    [Benchmark]
    public async Task<WorkflowExecutionResult> MeasureEndToEndOrchestration()
    {
        var workflow = CreateWorkflow($"test-{WorkflowSize}-tasks", WorkflowSize, DependencyPattern.Sequential);
        // Create mock task executor that returns instantly (no HTTP)
        var mockExecutor = new Mock<IHttpTaskExecutor>();
        mockExecutor
            .Setup(x => x.ExecuteAsync(
                It.IsAny<WorkflowTaskSpec>(),
                It.IsAny<TemplateContext>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TaskExecutionResult
            {
                Success = true,
                Output = new Dictionary<string, object> { ["result"] = "success" },
                Duration = TimeSpan.FromMilliseconds(1)
            });

        var mockResponseStorage = new Mock<IResponseStorage>();
        var orchestrator = new WorkflowOrchestrator(_graphBuilder!, mockExecutor.Object, _templateResolver!, mockResponseStorage.Object);

        // Create mock available tasks
        var availableTasks = new Dictionary<string, WorkflowTaskResource>();
        foreach (var task in workflow.Spec.Tasks)
        {
            availableTasks[task.TaskRef] = new WorkflowTaskResource
            {
                Metadata = new ResourceMetadata
                {
                    Name = task.TaskRef,
                    Namespace = "default"
                },
                Spec = new WorkflowTaskSpec
                {
                    Type = "http",
                    Request = new HttpRequestDefinition
                    {
                        Url = "http://localhost/mock",
                        Method = "GET"
                    },
                    InputSchema = new SchemaDefinition { Type = "object" },
                    OutputSchema = new SchemaDefinition { Type = "object" }
                }
            };
        }

        return await orchestrator.ExecuteAsync(workflow, availableTasks, _inputs!, CancellationToken.None);
    }

    /// <summary>
    /// Baseline: Direct task execution without orchestration framework.
    /// This is used to calculate overhead percentage.
    /// </summary>
    [Benchmark(Baseline = true)]
    [Arguments(10)]
    public async Task<int> CompareAgainstDirectExecution(int taskCount)
    {
        var tasks = new List<Task<int>>();

        for (int i = 0; i < taskCount; i++)
        {
            tasks.Add(DirectTaskExecutionAsync(i));
        }

        var results = await Task.WhenAll(tasks);
        return results.Sum();
    }

    private async Task<int> DirectTaskExecutionAsync(int taskId)
    {
        // Minimal async work (no orchestration, no graph, no templates)
        await Task.Yield();
        return taskId;
    }

    // Test data generation
    private enum DependencyPattern
    {
        Sequential,  // Each task depends on previous
        Parallel,    // No dependencies
        Diamond      // Mixed dependencies
    }

    private WorkflowResource CreateWorkflow(string name, int taskCount, DependencyPattern pattern)
    {
        var tasks = new List<WorkflowTaskStep>();

        for (int i = 0; i < taskCount; i++)
        {
            var input = new Dictionary<string, string>();

            // Add dependencies based on pattern
            if (pattern == DependencyPattern.Sequential && i > 0)
            {
                // Each task depends on previous task
                input["previousResult"] = $"{{{{tasks.task{i - 1}.output.result}}}}";
            }
            else if (pattern == DependencyPattern.Diamond && i > 0)
            {
                // More complex dependency pattern
                if (i % 3 == 0 && i > 2)
                {
                    input["dep1"] = $"{{{{tasks.task{i - 2}.output.result}}}}";
                    input["dep2"] = $"{{{{tasks.task{i - 3}.output.result}}}}";
                }
                else if (i % 2 == 0 && i > 1)
                {
                    input["dep"] = $"{{{{tasks.task{i - 2}.output.result}}}}";
                }
            }

            // Add input templates
            if (i == 0)
            {
                input["userId"] = "{{input.userId}}";
                input["email"] = "{{input.email}}";
            }

            tasks.Add(new WorkflowTaskStep
            {
                Id = $"task{i}",
                TaskRef = $"mock-task",
                Input = input
            });
        }

        return new WorkflowResource
        {
            Metadata = new ResourceMetadata
            {
                Name = name,
                Namespace = "default"
            },
            Spec = new WorkflowSpec
            {
                Input = new Dictionary<string, WorkflowInputParameter>
                {
                    ["userId"] = new WorkflowInputParameter { Type = "string", Required = true },
                    ["email"] = new WorkflowInputParameter { Type = "string", Required = true },
                    ["amount"] = new WorkflowInputParameter { Type = "number", Required = false }
                },
                Tasks = tasks,
                Output = new Dictionary<string, string>
                {
                    ["finalResult"] = $"{{{{tasks.task{taskCount - 1}.output.result}}}}"
                }
            }
        };
    }
}
