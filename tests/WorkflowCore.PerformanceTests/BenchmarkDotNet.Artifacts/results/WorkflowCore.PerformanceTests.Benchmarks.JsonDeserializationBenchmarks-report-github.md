```

BenchmarkDotNet v0.13.11, macOS Sonoma 14.7.6 (23H626) [Darwin 23.6.0]
Intel Core i9-9880H CPU 2.30GHz, 1 CPU, 16 logical and 8 physical cores
.NET SDK 8.0.414
  [Host]     : .NET 8.0.20 (8.0.2025.41914), X64 RyuJIT AVX2
  Job-JHFEJK : .NET 8.0.20 (8.0.2025.41914), X64 RyuJIT AVX2

IterationCount=10  WarmupCount=3  

```
| Method                                         | Mean         | Error        | StdDev       | Gen0     | Gen1     | Gen2    | Allocated |
|----------------------------------------------- |-------------:|-------------:|-------------:|---------:|---------:|--------:|----------:|
| &#39;Small: Full Deserialize then Serialize&#39;       |   1,724.9 ns |     48.66 ns |     32.19 ns |   0.1640 |        - |       - |    1384 B |
| &#39;Small: Keep Raw String (no deserialize)&#39;      |     502.1 ns |     47.96 ns |     31.72 ns |   0.0086 |        - |       - |      72 B |
| &#39;Medium: Full Deserialize then Serialize&#39;      |  71,848.0 ns |  1,625.87 ns |    850.36 ns |   5.8594 |   0.4883 |  0.1221 |   49242 B |
| &#39;Medium: Keep Raw String (no deserialize)&#39;     |  27,212.5 ns |    654.86 ns |    433.15 ns |        - |        - |       - |      73 B |
| &#39;Large: Full Deserialize then Serialize&#39;       | 502,087.3 ns | 17,278.28 ns | 11,428.51 ns | 140.6250 | 140.6250 | 23.4375 |  209781 B |
| &#39;Large: Keep Raw String (no deserialize)&#39;      | 193,731.1 ns | 12,022.46 ns |  7,952.11 ns |        - |        - |       - |     120 B |
| &#39;Weather: Full Deserialize + Navigate to city&#39; |   5,239.1 ns |    160.04 ns |    105.86 ns |   0.2747 |        - |       - |    2320 B |
| &#39;Weather: JsonDocument Navigate to city&#39;       |   2,966.8 ns |     86.02 ns |     56.90 ns |   0.0114 |        - |       - |     112 B |
| &#39;Weather: Full Deserialize + Navigate to temp&#39; |   5,181.8 ns |    116.91 ns |     61.14 ns |   0.2747 |        - |       - |    2312 B |
| &#39;Weather: JsonDocument Navigate to temp&#39;       |   2,789.2 ns |     68.57 ns |     40.80 ns |   0.0114 |        - |       - |     104 B |
