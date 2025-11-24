using BenchmarkDotNet.Running;

namespace WorkflowCore.PerformanceTests;

/// <summary>
/// Entry point for BenchmarkDotNet performance tests.
/// Usage: dotnet run -c Release --project tests/WorkflowCore.PerformanceTests
/// </summary>
public class Program
{
    public static void Main(string[] args)
    {
        // Run all benchmarks in the assembly
        BenchmarkSwitcher.FromAssembly(typeof(Program).Assembly).Run(args);
    }
}
