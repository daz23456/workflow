```

BenchmarkDotNet v0.13.11, macOS Sonoma 14.7.6 (23H626) [Darwin 23.6.0]
Intel Core i9-9880H CPU 2.30GHz, 1 CPU, 16 logical and 8 physical cores
.NET SDK 8.0.414
  [Host]     : .NET 8.0.20 (8.0.2025.41914), X64 RyuJIT AVX2
  DefaultJob : .NET 8.0.20 (8.0.2025.41914), X64 RyuJIT AVX2


```
| Method                                      | RecordCount | Mean       | Error     | StdDev    | Median     | Gen0        | Gen1       | Gen2       | Allocated |
|-------------------------------------------- |------------ |-----------:|----------:|----------:|-----------:|------------:|-----------:|-----------:|----------:|
| &#39;Extract single field (minimal allocation)&#39; | 10000       |   121.3 ms |   2.41 ms |   3.05 ms |   121.2 ms |   7500.0000 |  5000.0000 |  1500.0000 |  69.84 MB |
| &#39;Filter to 10% (selective query)&#39;           | 10000       |   167.2 ms |   3.28 ms |   4.26 ms |   166.4 ms |  14000.0000 |  9000.0000 |  2000.0000 |  98.67 MB |
| &#39;Full dataset transform (max allocations)&#39;  | 10000       |   269.3 ms |   5.35 ms |  14.09 ms |   265.8 ms |  14000.0000 | 10000.0000 |  2000.0000 | 101.49 MB |
| &#39;Extract single field (minimal allocation)&#39; | 50000       |   649.1 ms |   8.30 ms |   7.36 ms |   650.1 ms |  33000.0000 | 15000.0000 |  4000.0000 | 334.14 MB |
| &#39;Filter to 10% (selective query)&#39;           | 50000       |   958.3 ms |  13.37 ms |  11.85 ms |   959.6 ms |  52000.0000 | 18000.0000 |  5000.0000 | 478.67 MB |
| &#39;Extract single field (minimal allocation)&#39; | 100000      | 1,394.7 ms |  18.84 ms |  15.73 ms | 1,395.8 ms |  59000.0000 | 23000.0000 |  6000.0000 |  669.6 MB |
| &#39;Full dataset transform (max allocations)&#39;  | 50000       | 2,002.1 ms |  52.13 ms | 153.71 ms | 2,046.8 ms |  58000.0000 | 35000.0000 | 10000.0000 | 492.41 MB |
| &#39;Filter to 10% (selective query)&#39;           | 100000      | 2,163.0 ms |  41.77 ms |  52.83 ms | 2,135.0 ms |  94000.0000 | 27000.0000 | 10000.0000 | 958.67 MB |
| &#39;Full dataset transform (max allocations)&#39;  | 100000      | 4,501.9 ms | 154.08 ms | 454.29 ms | 4,649.5 ms | 106000.0000 | 59000.0000 | 14000.0000 | 986.21 MB |
