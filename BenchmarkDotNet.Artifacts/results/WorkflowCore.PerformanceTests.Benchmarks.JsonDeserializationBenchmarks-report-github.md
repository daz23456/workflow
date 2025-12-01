```

BenchmarkDotNet v0.13.11, macOS Sonoma 14.7.6 (23H626) [Darwin 23.6.0]
Intel Core i9-9880H CPU 2.30GHz, 1 CPU, 16 logical and 8 physical cores
.NET SDK 8.0.414
  [Host]     : .NET 8.0.20 (8.0.2025.41914), X64 RyuJIT AVX2
  Job-HXWKHB : .NET 8.0.20 (8.0.2025.41914), X64 RyuJIT AVX2

IterationCount=10  WarmupCount=3  

```
| Method                                         | Mean         | Error        | StdDev       | Gen0     | Gen1     | Gen2    | Allocated |
|----------------------------------------------- |-------------:|-------------:|-------------:|---------:|---------:|--------:|----------:|
| &#39;Small: Full Deserialize then Serialize&#39;       |   1,639.4 ns |     56.35 ns |     33.54 ns |   0.1640 |        - |       - |    1384 B |
| &#39;Small: Keep Raw String (no deserialize)&#39;      |     490.5 ns |     19.61 ns |     12.97 ns |   0.0086 |        - |       - |      72 B |
| &#39;Medium: Full Deserialize then Serialize&#39;      |  84,751.9 ns | 21,815.80 ns | 14,429.80 ns |   5.8594 |   0.4883 |       - |   49234 B |
| &#39;Medium: Keep Raw String (no deserialize)&#39;     |  29,568.5 ns |  1,986.30 ns |  1,313.82 ns |        - |        - |       - |      73 B |
| &#39;Large: Full Deserialize then Serialize&#39;       | 508,059.2 ns | 20,254.27 ns | 13,396.94 ns | 135.7422 | 135.7422 | 23.4375 |  209781 B |
| &#39;Large: Keep Raw String (no deserialize)&#39;      | 196,141.9 ns |  5,771.20 ns |  3,434.35 ns |        - |        - |       - |     120 B |
| &#39;Weather: Full Deserialize + Navigate to city&#39; |   5,383.2 ns |    183.34 ns |    109.10 ns |   0.2747 |        - |       - |    2320 B |
| &#39;Weather: JsonDocument Navigate to city&#39;       |   2,901.9 ns |     74.63 ns |     49.36 ns |   0.0114 |        - |       - |     112 B |
| &#39;Weather: Full Deserialize + Navigate to temp&#39; |   5,359.2 ns |    181.61 ns |    120.12 ns |   0.2747 |        - |       - |    2312 B |
| &#39;Weather: JsonDocument Navigate to temp&#39;       |   3,018.2 ns |     59.48 ns |     39.34 ns |   0.0114 |        - |       - |     104 B |
