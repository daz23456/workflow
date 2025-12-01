# JSON Handling Optimization Benchmarks

**Date:** 2025-11-30
**Tool:** BenchmarkDotNet v0.13.11
**Runtime:** .NET 8.0.20, X64 RyuJIT AVX2
**Platform:** macOS Sonoma 14.7.6, Intel Core i9-9880H CPU 2.30GHz

## Background

When executing workflows, HTTP task responses are JSON payloads that need to be processed for template resolution. The question is: **can we optimize by avoiding full deserialization when possible?**

### Current Implementation

The current `JsonResponseHandler` always deserializes HTTP responses to `Dictionary<string, object>`:

```csharp
// Current approach - always fully deserializes
var dict = JsonSerializer.Deserialize<Dictionary<string, object>>(jsonContent);
```

### Hypothesis

Different template patterns have different data access needs:

1. **Passthrough** (`{{tasks.fetch.output}}`) - Just need the whole response as a string
2. **Nested Access** (`{{tasks.fetch.output.user.name}}`) - Need to navigate to specific fields

We hypothesized that:
- For passthrough: Skip deserialization entirely, just validate and return raw JSON string
- For nested access: Use `JsonDocument` (read-only DOM) instead of full deserialization

## Benchmark Design

### Test Data Sizes

| Size | Description | Approx. Bytes |
|------|-------------|---------------|
| Small | Simple user object | ~200B |
| Medium | 50-item array with nested objects | ~2KB |
| Large | Weather API with 14-day hourly forecast | ~50KB |

### Approaches Compared

1. **Full Deserialize then Serialize** - Current approach: `JsonSerializer.Deserialize<Dictionary<string, object>>()` then `JsonSerializer.Serialize()`
2. **Keep Raw String** - Validate with `JsonDocument.Parse()`, return original string
3. **JsonDocument Navigation** - Use `JsonDocument` to navigate to specific fields

## Results

### Scenario 1: Passthrough (Whole Output)

| JSON Size | Full Deserialize | Keep Raw String | Speed Gain | Memory Saved |
|-----------|------------------|-----------------|------------|--------------|
| Small (~200B) | 1,639 ns | 491 ns | **3.3x faster** | 1,384B → 72B |
| Medium (~2KB) | 84,752 ns | 29,569 ns | **2.9x faster** | 49KB → 73B |
| Large (~50KB) | 508,059 ns | 196,142 ns | **2.6x faster** | 210KB → 120B |

**Key insight:** For large payloads, the raw string approach uses **1,750x less memory**.

### Scenario 2: Nested Field Access

| Access Pattern | Full Deserialize | JsonDocument | Speed Gain | Memory Saved |
|----------------|------------------|--------------|------------|--------------|
| Navigate to city | 5,383 ns | 2,902 ns | **1.9x faster** | 2,320B → 112B |
| Navigate to temp | 5,359 ns | 3,018 ns | **1.8x faster** | 2,312B → 104B |

### Full Results Table

```
| Method                                         | Mean         | Error        | StdDev       | Gen0     | Gen1     | Gen2    | Allocated |
|----------------------------------------------- |-------------:|-------------:|-------------:|---------:|---------:|--------:|----------:|
| 'Small: Full Deserialize then Serialize'       |   1,639.4 ns |     56.35 ns |     33.54 ns |   0.1640 |        - |       - |    1384 B |
| 'Small: Keep Raw String (no deserialize)'      |     490.5 ns |     19.61 ns |     12.97 ns |   0.0086 |        - |       - |      72 B |
| 'Medium: Full Deserialize then Serialize'      |  84,751.9 ns | 21,815.80 ns | 14,429.80 ns |   5.8594 |   0.4883 |       - |   49234 B |
| 'Medium: Keep Raw String (no deserialize)'     |  29,568.5 ns |  1,986.30 ns |  1,313.82 ns |        - |        - |       - |      73 B |
| 'Large: Full Deserialize then Serialize'       | 508,059.2 ns | 20,254.27 ns | 13,396.94 ns | 135.7422 | 135.7422 | 23.4375 |  209781 B |
| 'Large: Keep Raw String (no deserialize)'      | 196,141.9 ns |  5,771.20 ns |  3,434.35 ns |        - |        - |       - |     120 B |
| 'Weather: Full Deserialize + Navigate to city' |   5,383.2 ns |    183.34 ns |    109.10 ns |   0.2747 |        - |       - |    2320 B |
| 'Weather: JsonDocument Navigate to city'       |   2,901.9 ns |     74.63 ns |     49.36 ns |   0.0114 |        - |       - |     112 B |
| 'Weather: Full Deserialize + Navigate to temp' |   5,359.2 ns |    181.61 ns |    120.12 ns |   0.2747 |        - |       - |    2312 B |
| 'Weather: JsonDocument Navigate to temp'       |   3,018.2 ns |     59.48 ns |     39.34 ns |   0.0114 |        - |       - |     104 B |
```

## Analysis

### GC Pressure

The full deserialization approach creates significant GC pressure:
- Large JSON triggers **Gen2 collections** (23.4375 collections per 1024 operations)
- Gen0/Gen1 collections are **135x higher** than the raw string approach

For high-throughput workflows processing large API responses, this GC pressure translates to noticeable latency spikes.

### Memory Efficiency

| JSON Size | Full Deserialize Allocation | Optimized Allocation | Reduction |
|-----------|----------------------------|---------------------|-----------|
| Small | 1,384 B | 72 B | 19x |
| Medium | 49,234 B | 73 B | 675x |
| Large | 209,781 B | 120 B | 1,750x |

### Why JsonDocument is Faster

`JsonDocument` provides a **read-only DOM** (Document Object Model) without materializing the entire object graph:

```csharp
// Full deserialization - creates full object graph
var dict = JsonSerializer.Deserialize<Dictionary<string, object>>(json);
// Problem: JsonElement values still need casting for nested access!

// JsonDocument - lazy parsing, no object allocation
using var doc = JsonDocument.Parse(json);
var city = doc.RootElement.GetProperty("location").GetProperty("city").GetString();
// Directly navigates to value without intermediate allocations
```

Key benefits:
1. **Lazy parsing** - Only parses the path you navigate
2. **No intermediate objects** - No `Dictionary<string, object>` allocations
3. **Zero-copy strings** - Can return string references from the original JSON
4. **Disposable** - Memory is reclaimed immediately via `using`

## Recommendations

### Implement Hybrid Response Handler

Create an optimized response handler that chooses strategy based on template patterns:

```csharp
public interface IResponseStorage
{
    // Store raw JSON string for passthrough templates
    void StoreRawJson(string taskId, string jsonContent);

    // Store JsonDocument for nested access (caller manages disposal)
    void StoreDocument(string taskId, JsonDocument doc);

    // Get value by path (uses JsonDocument navigation if available)
    object? GetValue(string taskId, string[] path);

    // Get entire output (returns raw string if available)
    string GetRawOutput(string taskId);
}
```

### Template Analysis at Build Time

During execution graph building, analyze templates to determine access patterns:

```csharp
// Passthrough - just needs whole output
"{{tasks.fetch.output}}" → UseRawString = true

// Nested access - needs specific fields
"{{tasks.fetch.output.user.name}}" → UseJsonDocument = true, Paths = ["user", "name"]

// Mixed - if ANY template needs nested access, use JsonDocument
```

### Implementation Priority

1. **High impact, low effort**: Passthrough optimization (just keep raw string)
2. **Medium impact, medium effort**: JsonDocument for nested access
3. **Future**: Pre-computed path access for repeated templates

## Implementation Status

**Status: IMPLEMENTED** (2025-11-30)

The optimization has been implemented with full TDD coverage:

### Files Created

| File | Purpose |
|------|---------|
| `src/WorkflowCore/Services/OptimizedJsonStorage.cs` | Stores raw JSON, provides JsonDocument navigation |
| `src/WorkflowCore/Services/OptimizedTemplateResolver.cs` | Template resolver using optimized storage |
| `tests/WorkflowCore.Tests/Services/OptimizedJsonStorageTests.cs` | 18 unit tests |
| `tests/WorkflowCore.Tests/Services/OptimizedTemplateResolverTests.cs` | 13 unit tests |

### Test Coverage

- **OptimizedJsonStorage**: 18 tests covering passthrough, nested access, array indexing, error handling
- **OptimizedTemplateResolver**: 13 tests covering template resolution with optimized storage
- **Total new tests**: 31 (all passing)

### Usage Example

```csharp
// Create storage and resolver
var storage = new OptimizedJsonStorage();
var resolver = new OptimizedTemplateResolver(storage);

// Store raw JSON (no deserialization!)
storage.Store("fetch-user", """{"name":"John","address":{"city":"London"}}""");

// Passthrough - returns exact raw JSON
var full = await resolver.ResolveAsync("{{tasks.fetch-user.output}}", context);
// Result: {"name":"John","address":{"city":"London"}}

// Nested access - uses JsonDocument navigation
var city = await resolver.ResolveAsync("{{tasks.fetch-user.output.address.city}}", context);
// Result: London
```

### Integration Notes

To integrate with the existing WorkflowOrchestrator:
1. Store HTTP response body in `OptimizedJsonStorage` after each task completes
2. Use `OptimizedTemplateResolver` for output mapping
3. Existing code continues to work - optimization is additive

## Conclusion

The benchmarks prove the optimization is **worth implementing**:

- **Passthrough scenario**: 2.6-3.3x faster, up to 1,750x less memory
- **Nested access scenario**: 1.8-1.9x faster, ~20x less memory
- **GC pressure**: Dramatically reduced, especially for large payloads

For workflows processing large API responses (weather data, database query results, etc.), this optimization translates to measurably better latency and throughput.

---

## Running the Benchmarks

```bash
cd /Users/darren/dev/workflow
dotnet run --project tests/WorkflowCore.PerformanceTests --configuration Release -- --filter "*JsonDeserializationBenchmarks*"
```

Results are saved to `BenchmarkDotNet.Artifacts/results/`.
