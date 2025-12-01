# ADR-0001: ExecutionGraph Built Per-Request Without Caching

**Status:** Accepted
**Date:** 2025-11-29
**Deciders:** Architecture Review

## Context

The workflow orchestration engine needs to determine task execution order and parallel execution groups for every workflow execution. This requires building an `ExecutionGraph` that:

1. Maps task dependencies (extracted from `{{tasks.X.output}}` template references)
2. Detects circular dependencies (DFS-based cycle detection)
3. Computes topological execution order
4. Identifies parallel execution groups (BFS-based level detection)

The question arose: **Should the ExecutionGraph be pre-built when Kubernetes CRs are loaded and cached, or built fresh on every API request?**

### Current Implementation

- `ExecutionGraphBuilder` is registered as `AddScoped` (per-request lifetime)
- Graph is built inside `WorkflowOrchestrator.ExecuteAsync()` on every execution
- Graph is built inside `DynamicWorkflowController.Test()` on every dry-run request
- No caching mechanism exists
- Background `WorkflowWatcherService` discovers CRs but does NOT pre-build graphs

### Measured Performance

Graph building for typical workflows (5-20 tasks):
- Dependency extraction (regex): < 0.1ms
- Cycle detection (DFS): < 0.1ms
- Parallel group calculation (BFS): < 0.1ms
- **Total: < 1ms per graph build**

Memory footprint:
- ~100-500 bytes per graph (dictionary of task IDs to dependency sets)
- Immediately eligible for garbage collection after request completes

## Decision

**Build the ExecutionGraph fresh on every API request. Do not implement caching.**

## Rationale

### Why Per-Request Building is Acceptable

| Factor | Analysis |
|--------|----------|
| **Cost is negligible** | < 1ms build time is insignificant vs. actual task HTTP execution (100ms-30s) |
| **Memory is minimal** | ~500 bytes per graph, immediately GC'd |
| **Simplicity** | No cache invalidation logic required |
| **Correctness guaranteed** | Fresh build always reflects current CR state |
| **Concurrency safe** | No shared mutable state between requests |

### Why Caching Would Add Complexity Without Benefit

1. **Cache Invalidation Problem**
   - Would need to detect CR changes and invalidate cached graphs
   - `WorkflowWatcherService` polls every 30s - stale cache risk
   - Race conditions between cache update and request processing

2. **Memory Management**
   - Would need eviction policy for workflows no longer in use
   - Memory pressure from caching graphs for all workflows

3. **Diminishing Returns**
   - Graph build is 0.01% of typical request time
   - Caching saves < 1ms on requests that take 100ms-30s
   - Optimization effort better spent elsewhere

### When This Decision Should Be Revisited

Consider caching if ANY of these become true:

| Condition | Threshold |
|-----------|-----------|
| Workflows have > 100 tasks | Graph build > 10ms |
| Request rate > 10,000/sec | CPU pressure from graph building |
| Graph build appears in profiler | > 1% of request time |
| Complex dependency patterns | Cycle detection becomes expensive |

## Consequences

### Positive

- **Simplicity:** No cache management code to maintain
- **Correctness:** Always uses current workflow definition
- **Testability:** Stateless graph building is easy to unit test
- **Memory efficiency:** No long-lived graph objects
- **Thread safety:** No shared mutable state

### Negative

- **Redundant computation:** Same graph rebuilt for repeated executions of same workflow
- **No warm-up:** First request pays same cost as subsequent requests

### Neutral

- Performance characteristics remain constant regardless of system uptime
- No difference between cold start and warm system

## Alternatives Considered

### 1. Pre-Build on CR Load (Rejected)

```csharp
// In WorkflowWatcherService
private readonly ConcurrentDictionary<string, ExecutionGraph> _graphCache;

private async Task SyncWorkflowsAsync()
{
    foreach (var workflow in workflows)
    {
        var graph = _graphBuilder.Build(workflow);
        _graphCache[workflow.Metadata.Name] = graph.Graph;
    }
}
```

**Rejected because:**
- Adds complexity for < 1ms savings
- Cache invalidation on CR update is error-prone
- Memory overhead for rarely-used workflows

### 2. Lazy Caching with TTL (Rejected)

```csharp
// Using IMemoryCache
public ExecutionGraph GetOrBuild(WorkflowResource workflow)
{
    var key = $"graph:{workflow.Metadata.Name}:{workflow.GetHashCode()}";
    return _cache.GetOrCreate(key, entry =>
    {
        entry.SlidingExpiration = TimeSpan.FromMinutes(5);
        return _graphBuilder.Build(workflow).Graph;
    });
}
```

**Rejected because:**
- Hash-based cache key could miss CR content changes
- Sliding expiration adds unpredictable memory usage
- Complexity not justified by < 1ms improvement

### 3. Request-Scoped Caching (Current Approach - Accepted)

Graph is built once per request and reused within that request (e.g., in orchestrator loop). This is implicitly achieved by the current design where graph is built at start of execution and reused for dependency checks.

## Implementation Details

### Current Code Locations

| Component | File | Line |
|-----------|------|------|
| Graph Model | `src/WorkflowCore/Models/ExecutionGraph.cs` | - |
| Graph Builder | `src/WorkflowCore/Services/ExecutionGraphBuilder.cs` | - |
| DI Registration | `src/WorkflowGateway/Program.cs` | 75 |
| Usage (Execute) | `src/WorkflowCore/Services/WorkflowOrchestrator.cs` | 68 |
| Usage (Test) | `src/WorkflowGateway/Controllers/DynamicWorkflowController.cs` | 129 |

### Request Flow

```
POST /api/v1/workflows/{name}/execute
    │
    ├─► WorkflowDiscoveryService.GetWorkflowAsync()
    │   └─► Returns cached CR (from K8s watch)
    │
    ├─► InputValidationService.ValidateAsync()
    │
    ├─► WorkflowOrchestrator.ExecuteAsync()
    │   │
    │   ├─► ExecutionGraphBuilder.Build()  ◄── GRAPH BUILT HERE
    │   │   ├─► Extract dependencies (regex)
    │   │   ├─► Detect cycles (DFS)
    │   │   └─► Return ExecutionGraph
    │   │
    │   └─► Execute tasks using graph for dependency resolution
    │       └─► Graph reused throughout execution loop
    │
    └─► Return response (graph discarded, GC eligible)
```

## References

- Stage 4 Proof: ExecutionGraph implementation
- Stage 10 Proof: Performance benchmarks showing graph build is negligible
- `src/WorkflowCore/Services/ExecutionGraphBuilder.cs`: Implementation
- `src/WorkflowCore/Models/ExecutionGraph.cs`: Data structure

---

**Review Date:** 2025-11-29
**Next Review:** When workflow complexity exceeds 100 tasks or request rate exceeds 10,000/sec
