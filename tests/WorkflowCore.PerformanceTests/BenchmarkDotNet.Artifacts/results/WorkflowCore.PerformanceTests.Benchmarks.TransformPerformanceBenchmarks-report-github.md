```

BenchmarkDotNet v0.13.11, macOS Sonoma 14.7.6 (23H626) [Darwin 23.6.0]
Intel Core i9-9880H CPU 2.30GHz, 1 CPU, 16 logical and 8 physical cores
.NET SDK 8.0.414
  [Host]     : .NET 8.0.20 (8.0.2025.41914), X64 RyuJIT AVX2
  DefaultJob : .NET 8.0.20 (8.0.2025.41914), X64 RyuJIT AVX2


```
| Method                                 | RecordCount | Mean         | Error      | StdDev      | Rank | Gen0        | Gen1       | Gen2       | Allocated  |
|--------------------------------------- |------------ |-------------:|-----------:|------------:|-----:|------------:|-----------:|-----------:|-----------:|
| &#39;Simple extraction (names)&#39;            | 1000        |     4.803 ms |  0.0950 ms |   0.1535 ms |    1 |    484.3750 |   210.9375 |    15.6250 |     4.4 MB |
| &#39;Nested property extraction (cities)&#39;  | 1000        |     7.674 ms |  0.1461 ms |   0.2401 ms |    2 |    765.6250 |   328.1250 |    15.6250 |    6.63 MB |
| &#39;Array filtering (age &gt; 25)&#39;           | 1000        |     9.609 ms |  0.1890 ms |   0.2943 ms |    3 |   1000.0000 |   484.3750 |    15.6250 |    8.48 MB |
| &#39;Sequential transforms (3 transforms)&#39; | 1000        |    25.567 ms |  0.5081 ms |   0.9418 ms |    4 |   1718.7500 |   625.0000 |   125.0000 |   15.11 MB |
| &#39;Simple extraction (names)&#39;            | 10000       |    95.230 ms |  1.0989 ms |   2.1172 ms |    5 |   5200.0000 |  2600.0000 |  1200.0000 |    52.1 MB |
| &#39;Nested property extraction (cities)&#39;  | 10000       |   139.051 ms |  2.7113 ms |   2.7843 ms |    6 |   8500.0000 |  3000.0000 |  1750.0000 |   74.37 MB |
| &#39;Array filtering (age &gt; 25)&#39;           | 10000       |   144.477 ms |  2.8327 ms |   4.1521 ms |    7 |  10000.0000 |  3000.0000 |  1000.0000 |    92.8 MB |
| &#39;Sequential transforms (3 transforms)&#39; | 10000       |   354.866 ms |  7.0768 ms |  14.2954 ms |    8 |  20000.0000 | 13000.0000 |  4000.0000 |  166.66 MB |
| &#39;Simple extraction (names)&#39;            | 100000      |   867.218 ms | 12.4608 ms |  11.6558 ms |    9 |  52000.0000 | 17000.0000 |  5000.0000 |   505.7 MB |
| &#39;Nested property extraction (cities)&#39;  | 100000      | 1,293.939 ms | 25.8018 ms |  43.8135 ms |   10 |  88000.0000 | 32000.0000 |  8000.0000 |  728.41 MB |
| &#39;Array filtering (age &gt; 25)&#39;           | 100000      | 1,908.546 ms | 20.7282 ms |  17.3090 ms |   11 | 113000.0000 | 35000.0000 | 10000.0000 |  912.82 MB |
| &#39;Sequential transforms (3 transforms)&#39; | 100000      | 4,415.871 ms | 86.0407 ms | 126.1173 ms |   12 | 187000.0000 | 66000.0000 | 19000.0000 | 1701.27 MB |
