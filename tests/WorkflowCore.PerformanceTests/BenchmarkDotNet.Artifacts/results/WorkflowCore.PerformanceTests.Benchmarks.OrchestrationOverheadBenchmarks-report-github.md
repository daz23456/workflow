```

BenchmarkDotNet v0.13.11, macOS Sonoma 14.7.6 (23H626) [Darwin 23.6.0]
Intel Core i9-9880H CPU 2.30GHz, 1 CPU, 16 logical and 8 physical cores
.NET SDK 8.0.414
  [Host]   : .NET 8.0.20 (8.0.2025.41914), X64 RyuJIT AVX2
  .NET 8.0 : .NET 8.0.20 (8.0.2025.41914), X64 RyuJIT AVX2

Job=.NET 8.0  Runtime=.NET 8.0  

```
| Method                        | workflow | taskCount | Mean      | Error     | StdDev    | Ratio | RatioSD | Gen0   | Allocated | Alloc Ratio |
|------------------------------ |--------- |---------- |----------:|----------:|----------:|------:|--------:|-------:|----------:|------------:|
| **MeasureTemplateResolutionOnly** | **?**        | **?**         |  **7.933 μs** | **0.1427 μs** | **0.1527 μs** |     **?** |       **?** | **1.2054** |   **9.93 KB** |           **?** |
|                               |          |           |           |           |           |       |         |        |           |             |
| **MeasureGraphBuildingOnly**      | **?**        | **?**         |        **NA** |        **NA** |        **NA** |     **?** |       **?** |     **NA** |        **NA** |           **?** |
| MeasureGraphBuildingOnly      | ?        | ?         |        NA |        NA |        NA |     ? |       ? |     NA |        NA |           ? |
| MeasureGraphBuildingOnly      | ?        | ?         |        NA |        NA |        NA |     ? |       ? |     NA |        NA |           ? |
| MeasureEndToEndOrchestration  | ?        | ?         |        NA |        NA |        NA |     ? |       ? |     NA |        NA |           ? |
| MeasureEndToEndOrchestration  | ?        | ?         |        NA |        NA |        NA |     ? |       ? |     NA |        NA |           ? |
| MeasureEndToEndOrchestration  | ?        | ?         |        NA |        NA |        NA |     ? |       ? |     NA |        NA |           ? |
|                               |          |           |           |           |           |       |         |        |           |             |
| **MeasureExecutionScheduling**    | **?**        | **10**        |  **6.855 μs** | **0.1322 μs** | **0.1358 μs** |  **1.27** |    **0.05** | **0.2213** |   **1.84 KB** |        **1.16** |
| CompareAgainstDirectExecution | ?        | 10        |  5.351 μs | 0.1064 μs | 0.2290 μs |  1.00 |    0.00 | 0.1907 |   1.59 KB |        1.00 |
|                               |          |           |           |           |           |       |         |        |           |             |
| **MeasureExecutionScheduling**    | **?**        | **20**        | **13.219 μs** | **0.2540 μs** | **0.2252 μs** |     **?** |       **?** | **0.3967** |   **3.33 KB** |           **?** |
|                               |          |           |           |           |           |       |         |        |           |             |
| **MeasureExecutionScheduling**    | **?**        | **50**        | **29.256 μs** | **0.5764 μs** | **0.8803 μs** |     **?** |       **?** | **0.9155** |   **7.54 KB** |           **?** |

Benchmarks with issues:
  OrchestrationOverheadBenchmarks.MeasureGraphBuildingOnly: .NET 8.0(Runtime=.NET 8.0) [workflow=?]
  OrchestrationOverheadBenchmarks.MeasureGraphBuildingOnly: .NET 8.0(Runtime=.NET 8.0) [workflow=?]
  OrchestrationOverheadBenchmarks.MeasureGraphBuildingOnly: .NET 8.0(Runtime=.NET 8.0) [workflow=?]
  OrchestrationOverheadBenchmarks.MeasureEndToEndOrchestration: .NET 8.0(Runtime=.NET 8.0) [workflow=?]
  OrchestrationOverheadBenchmarks.MeasureEndToEndOrchestration: .NET 8.0(Runtime=.NET 8.0) [workflow=?]
  OrchestrationOverheadBenchmarks.MeasureEndToEndOrchestration: .NET 8.0(Runtime=.NET 8.0) [workflow=?]
