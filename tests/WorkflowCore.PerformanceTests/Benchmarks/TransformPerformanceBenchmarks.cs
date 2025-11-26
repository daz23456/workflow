using BenchmarkDotNet.Attributes;
using BenchmarkDotNet.Order;
using WorkflowCore.Models;
using WorkflowCore.Services;

namespace WorkflowCore.PerformanceTests.Benchmarks;

[MemoryDiagnoser]
[Orderer(SummaryOrderPolicy.FastestToSlowest)]
[RankColumn]
public class TransformPerformanceBenchmarks
{
    private TransformTaskExecutor _executor = null!;
    private WorkflowTaskSpec _extractionTaskSpec = null!;
    private WorkflowTaskSpec _filteringTaskSpec = null!;
    private WorkflowTaskSpec _projectionTaskSpec = null!;
    private object _data1K = null!;
    private object _data10K = null!;
    private object _data100K = null!;

    [Params(1_000, 10_000, 100_000)]
    public int RecordCount { get; set; }

    [GlobalSetup]
    public void Setup()
    {
        var transformer = new JsonPathTransformer();
        _executor = new TransformTaskExecutor(transformer);

        // Setup task specs for different query types
        _extractionTaskSpec = new WorkflowTaskSpec
        {
            Type = "transform",
            Transform = new TransformDefinition
            {
                Query = "$.users[*].name"  // Extract all names
            }
        };

        _filteringTaskSpec = new WorkflowTaskSpec
        {
            Type = "transform",
            Transform = new TransformDefinition
            {
                Query = "$.users[?(@.age > 25)]"  // Filter by age
            }
        };

        _projectionTaskSpec = new WorkflowTaskSpec
        {
            Type = "transform",
            Transform = new TransformDefinition
            {
                Query = "$.users[*].address.city"  // Nested property extraction
            }
        };

        // Pre-generate test data for different sizes
        _data1K = GenerateTestData(1_000);
        _data10K = GenerateTestData(10_000);
        _data100K = GenerateTestData(100_000);
    }

    private object GenerateTestData(int count)
    {
        var users = new List<object>();
        for (int i = 0; i < count; i++)
        {
            users.Add(new
            {
                id = i,
                name = $"User{i}",
                age = 20 + (i % 50),  // Age between 20-70
                email = $"user{i}@example.com",
                address = new
                {
                    street = $"{i} Main St",
                    city = $"City{i % 100}",  // 100 unique cities
                    zipcode = $"{10000 + i}"
                }
            });
        }

        return new { users };
    }

    private object GetDataForCurrentSize()
    {
        return RecordCount switch
        {
            1_000 => _data1K,
            10_000 => _data10K,
            100_000 => _data100K,
            _ => _data1K
        };
    }

    [Benchmark(Description = "Simple extraction (names)")]
    public async Task<TaskExecutionResult> SimpleExtraction()
    {
        return await _executor.ExecuteAsync(_extractionTaskSpec, GetDataForCurrentSize());
    }

    [Benchmark(Description = "Array filtering (age > 25)")]
    public async Task<TaskExecutionResult> ArrayFiltering()
    {
        return await _executor.ExecuteAsync(_filteringTaskSpec, GetDataForCurrentSize());
    }

    [Benchmark(Description = "Nested property extraction (cities)")]
    public async Task<TaskExecutionResult> NestedExtraction()
    {
        return await _executor.ExecuteAsync(_projectionTaskSpec, GetDataForCurrentSize());
    }

    [Benchmark(Description = "Sequential transforms (3 transforms)")]
    public async Task<List<TaskExecutionResult>> SequentialTransforms()
    {
        var data = GetDataForCurrentSize();
        var results = new List<TaskExecutionResult>();

        // Transform 1: Extract all users over 25
        var result1 = await _executor.ExecuteAsync(_filteringTaskSpec, data);
        results.Add(result1);

        // Transform 2: From filtered results, extract names
        if (result1.Success && result1.Output != null && result1.Output.ContainsKey("result"))
        {
            var intermediateData = new { users = result1.Output["result"] };
            var result2 = await _executor.ExecuteAsync(_extractionTaskSpec, intermediateData);
            results.Add(result2);

            // Transform 3: Count results (simple query)
            var countTaskSpec = new WorkflowTaskSpec
            {
                Type = "transform",
                Transform = new TransformDefinition
                {
                    Query = "$"  // Return all
                }
            };
            var result3 = await _executor.ExecuteAsync(countTaskSpec, intermediateData);
            results.Add(result3);
        }

        return results;
    }
}

/// <summary>
/// Benchmarks focused on memory allocation and GC pressure
/// </summary>
[MemoryDiagnoser]
[Orderer(SummaryOrderPolicy.FastestToSlowest)]
public class TransformMemoryBenchmarks
{
    private TransformTaskExecutor _executor = null!;
    private WorkflowTaskSpec _taskSpec = null!;
    private object _largeDataset = null!;

    [Params(10_000, 50_000, 100_000)]
    public int RecordCount { get; set; }

    [GlobalSetup]
    public void Setup()
    {
        var transformer = new JsonPathTransformer();
        _executor = new TransformTaskExecutor(transformer);

        _taskSpec = new WorkflowTaskSpec
        {
            Type = "transform",
            Transform = new TransformDefinition
            {
                Query = "$.users[*]"  // Return all users (largest result set)
            }
        };

        // Generate large dataset with nested objects
        var users = new List<object>();
        for (int i = 0; i < RecordCount; i++)
        {
            users.Add(new
            {
                id = i,
                name = $"User{i}",
                age = 20 + (i % 50),
                email = $"user{i}@example.com",
                metadata = new
                {
                    created = DateTime.UtcNow.AddDays(-i),
                    tags = new[] { $"tag{i}", $"tag{i + 1}", $"tag{i + 2}" },
                    settings = new
                    {
                        notifications = true,
                        theme = "dark",
                        language = "en"
                    }
                },
                address = new
                {
                    street = $"{i} Main St",
                    city = $"City{i % 100}",
                    zipcode = $"{10000 + i}",
                    coordinates = new
                    {
                        lat = 40.7128 + (i * 0.001),
                        lon = -74.0060 + (i * 0.001)
                    }
                }
            });
        }

        _largeDataset = new { users };
    }

    [Benchmark(Description = "Full dataset transform (max allocations)")]
    public async Task<TaskExecutionResult> FullDatasetTransform()
    {
        return await _executor.ExecuteAsync(_taskSpec, _largeDataset);
    }

    [Benchmark(Description = "Filter to 10% (selective query)")]
    public async Task<TaskExecutionResult> SelectiveFilter()
    {
        var filterTaskSpec = new WorkflowTaskSpec
        {
            Type = "transform",
            Transform = new TransformDefinition
            {
                Query = "$.users[?(@.age > 60)]"  // ~20% of records (age 61-70)
            }
        };

        return await _executor.ExecuteAsync(filterTaskSpec, _largeDataset);
    }

    [Benchmark(Description = "Extract single field (minimal allocation)")]
    public async Task<TaskExecutionResult> MinimalExtraction()
    {
        var extractTaskSpec = new WorkflowTaskSpec
        {
            Type = "transform",
            Transform = new TransformDefinition
            {
                Query = "$.users[*].id"  // Just IDs (integers, small allocation)
            }
        };

        return await _executor.ExecuteAsync(extractTaskSpec, _largeDataset);
    }
}
