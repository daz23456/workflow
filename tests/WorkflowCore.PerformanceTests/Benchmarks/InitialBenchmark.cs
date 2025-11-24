using BenchmarkDotNet.Attributes;

namespace WorkflowCore.PerformanceTests.Benchmarks;

/// <summary>
/// Initial benchmark to verify BenchmarkDotNet setup is working.
/// This will be replaced with actual orchestration overhead benchmarks.
/// </summary>
[MemoryDiagnoser]
[SimpleJob(BenchmarkDotNet.Jobs.RuntimeMoniker.Net80)]
public class InitialBenchmark
{
    [GlobalSetup]
    public void Setup()
    {
        // Setup will be added when we implement real benchmarks
    }

    [Benchmark]
    public int SimpleCalculation()
    {
        // Simple benchmark to verify setup works
        int result = 0;
        for (int i = 0; i < 1000; i++)
        {
            result += i;
        }
        return result;
    }
}
