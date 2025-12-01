# Database Optimizations

**Date:** 2025-11-30
**Status:** Implemented

This document covers database-level optimizations for the workflow execution engine, including index design and query patterns.

---

## Table of Contents

1. [Index Design](#index-design)
2. [Query Pattern Analysis](#query-pattern-analysis)
3. [SQL Aggregation Refactoring](#sql-aggregation-refactoring)
4. [Delta-Based Statistics (High-Volume Solution)](#delta-based-statistics-high-volume-solution)
5. [Performance Recommendations](#performance-recommendations)

---

## Index Design

### Current Indexes

The following indexes are defined in `WorkflowDbContext.cs`:

#### ExecutionRecords Table

| Index Name | Columns | Purpose |
|------------|---------|---------|
| Primary Key | `Id` | Unique execution lookup |
| `IX_ExecutionRecords_WorkflowName_StartedAt_Status` | `WorkflowName`, `StartedAt`, `Status` | Composite index for filtered queries with date ranges |
| `IX_ExecutionRecords_Status` | `Status` | Status-only filtering |

#### TaskExecutionRecords Table

| Index Name | Columns | Purpose |
|------------|---------|---------|
| Primary Key | `Id` | Unique task record lookup |
| Foreign Key | `ExecutionId` | Join to parent execution |
| `IX_TaskExecutionRecords_TaskRef_StartedAt_Status` | `TaskRef`, `StartedAt`, `Status` | Composite index for task queries with date ranges |

#### WorkflowVersions Table

| Index Name | Columns | Purpose |
|------------|---------|---------|
| `IX_WorkflowVersions_WorkflowName` | `WorkflowName` | Lookup versions by workflow |
| `IX_WorkflowVersions_CreatedAt` | `CreatedAt` | Time-based version queries |

### Index Design Principles

1. **Composite indexes** are ordered by selectivity (most selective first)
2. **Covering indexes** include columns used in WHERE, ORDER BY, and SELECT
3. **No redundant indexes** - single-column indexes only where composite doesn't help

---

## Query Pattern Analysis

### Covered Queries (Use Indexes Efficiently)

| Method | Query Pattern | Index Used |
|--------|--------------|------------|
| `GetExecutionAsync` | `WHERE Id = X` | Primary Key |
| `ListExecutionsAsync` | `WHERE WorkflowName, Status ORDER BY StartedAt` | Composite |
| `GetAverageTaskDurationsAsync` | `WHERE WorkflowName, Status, StartedAt >=` | Composite |
| `GetTaskExecutionsAsync` | `WHERE TaskRef ORDER BY StartedAt` | Composite |
| `GetWorkflowDurationTrendsAsync` | `WHERE WorkflowName, StartedAt >=, Status` | Composite |
| `GetTaskDurationTrendsAsync` | `WHERE TaskRef, StartedAt >=, Status` | Composite |
| `GetTaskStatisticsAsync` | `WHERE TaskRef GROUP BY` | Composite |
| `GetWorkflowStatisticsAsync` | `WHERE WorkflowName GROUP BY` | Composite |

### Full Table Scans (Expected)

| Method | Query Pattern | Notes |
|--------|--------------|-------|
| `GetAllWorkflowStatisticsAsync` | `GROUP BY WorkflowName` | Aggregates entire table - no index helps |
| `GetAllTaskStatisticsAsync` | `GROUP BY TaskRef` | Aggregates entire table - no index helps |

These full scans are expected for "get all" operations. For high-volume systems, consider:
- Materialized views or summary tables
- Caching layer for frequently-accessed statistics
- Background job to pre-compute statistics

---

## SQL Aggregation Refactoring

### Problem

Two methods were loading all records into memory before calculating statistics:

```csharp
// BEFORE: Inefficient - loads ALL records into memory
public async Task<TaskStatistics?> GetTaskStatisticsAsync(string taskName)
{
    var taskExecutions = await _context.TaskExecutionRecords
        .Where(t => t.TaskRef == taskName)
        .ToListAsync();  // <-- Loads ALL matching records!

    // Calculate statistics in C#...
    var totalExecutions = taskExecutions.Count;
    var successCount = taskExecutions.Where(t => t.Status == "Succeeded").Count();
    // ...etc
}
```

**Impact:**
- Memory usage: O(n) where n = number of records
- Network transfer: All record data sent from DB to app
- GC pressure: Creates many intermediate objects

### Solution

Refactored to use SQL aggregation:

```csharp
// AFTER: Efficient - SQL computes aggregates, returns single row
public async Task<TaskStatistics?> GetTaskStatisticsAsync(string taskName)
{
    var stats = await _context.TaskExecutionRecords
        .Where(t => t.TaskRef == taskName)
        .GroupBy(t => t.TaskRef)
        .Select(g => new
        {
            TotalExecutions = g.Count(),
            SuccessCount = g.Count(t => t.Status == "Succeeded"),
            AvgDurationMs = g.Where(t => t.Status == "Succeeded" && t.Duration.HasValue)
                             .Select(t => (double?)t.Duration!.Value.TotalMilliseconds)
                             .Average() ?? 0,
            LastExecuted = g.Max(t => (DateTime?)t.StartedAt)
        })
        .FirstOrDefaultAsync();  // <-- Returns single aggregated row!

    // ...
}
```

**Impact:**
- Memory usage: O(1) - only aggregated result stored
- Network transfer: Single row with 4 values
- GC pressure: Minimal

### Methods Refactored

| Method | Before | After |
|--------|--------|-------|
| `GetTaskStatisticsAsync` | `ToListAsync()` + C# aggregation | SQL `GroupBy` + `Select` |
| `GetWorkflowStatisticsAsync` | `ToListAsync()` + C# aggregation | SQL `GroupBy` + `Select` |

### Generated SQL (Approximate)

```sql
-- GetTaskStatisticsAsync (refactored)
SELECT
    COUNT(*) AS TotalExecutions,
    COUNT(CASE WHEN Status = 'Succeeded' THEN 1 END) AS SuccessCount,
    AVG(CASE WHEN Status = 'Succeeded' AND Duration IS NOT NULL
        THEN Duration END) AS AvgDurationMs,
    MAX(StartedAt) AS LastExecuted
FROM TaskExecutionRecords
WHERE TaskRef = @taskName
GROUP BY TaskRef
LIMIT 1;
```

---

## Delta-Based Statistics (High-Volume Solution)

### Problem

For high-volume systems, even optimized SQL aggregation queries become problematic:

- **Full table scans** - `GetAllWorkflowStatisticsAsync` and `GetAllTaskStatisticsAsync` must scan all records
- **Background worker scans** - Periodic refresh via background worker still requires full scans
- **Scalability issues** - As execution count grows (millions), scans become expensive

### Solution: Delta-Based Incremental Updates

Instead of periodic full-table scans, update statistics **incrementally** when each execution completes:

```
When workflow completes → update that workflow's summary (O(1))
When task completes → update that task's summary (O(1))
Reading all stats → query summary tables (O(n) where n = unique workflows/tasks)
```

### Implementation

#### Summary Tables

Two pre-computed summary tables store aggregated statistics:

```sql
-- WorkflowStatisticsSummaries
CREATE TABLE WorkflowStatisticsSummaries (
    WorkflowName VARCHAR(255) PRIMARY KEY,
    TotalExecutions INT,
    SuccessCount INT,
    FailureCount INT,
    TotalDurationMs BIGINT,      -- Running total for accurate average
    AverageDurationMs BIGINT,    -- Computed: TotalDurationMs / SuccessCount
    SuccessRate DOUBLE,          -- Computed: SuccessCount / TotalExecutions * 100
    LastExecutedAt TIMESTAMP,
    UpdatedAt TIMESTAMP
);

-- TaskStatisticsSummaries
CREATE TABLE TaskStatisticsSummaries (
    TaskRef VARCHAR(255) PRIMARY KEY,
    TotalExecutions INT,
    SuccessCount INT,
    FailureCount INT,
    TotalDurationMs BIGINT,
    AverageDurationMs BIGINT,
    SuccessRate DOUBLE,
    LastExecutedAt TIMESTAMP,
    UpdatedAt TIMESTAMP
);
```

#### StatisticsAggregationService

The service provides delta-based update methods:

```csharp
// O(1) update when workflow completes
await statisticsService.RecordWorkflowExecutionAsync(
    workflowName: "my-workflow",
    status: ExecutionStatus.Succeeded,
    durationMs: 5000,
    executedAt: DateTime.UtcNow);

// O(1) update when task completes
await statisticsService.RecordTaskExecutionAsync(
    taskRef: "fetch-user",
    status: "Succeeded",
    durationMs: 500,
    executedAt: DateTime.UtcNow);

// O(n) read where n = unique workflows (NOT total executions)
var stats = await statisticsService.GetAllWorkflowStatisticsAsync();
```

#### Running Average Calculation

To maintain accurate averages without full scans, we track:
- `TotalDurationMs` - Sum of all successful execution durations
- `SuccessCount` - Number of successful executions
- `AverageDurationMs` = `TotalDurationMs / SuccessCount`

This ensures the average remains accurate even after millions of incremental updates.

### Complexity Analysis

| Operation | Before (Full Scan) | After (Delta) |
|-----------|-------------------|---------------|
| Record workflow execution | N/A | O(1) |
| Record task execution | N/A | O(1) |
| Get all workflow stats | O(n) executions | O(w) workflows |
| Get all task stats | O(n) executions | O(t) tasks |
| Background worker needed | Yes (periodic scan) | No |

Where:
- n = total execution count (millions)
- w = unique workflow count (hundreds)
- t = unique task count (thousands)

### Integration Points

The delta updates should be called from:

1. **WorkflowOrchestrator** - After workflow completes
2. **HttpTaskExecutor** - After each task completes (optional, for task-level stats)

```csharp
// In WorkflowOrchestrator.ExecuteAsync()
var result = await ExecuteWorkflowAsync(workflow, input);

// Record statistics incrementally
await _statisticsService.RecordWorkflowExecutionAsync(
    workflow.Metadata.Name,
    result.Success ? ExecutionStatus.Succeeded : ExecutionStatus.Failed,
    (long)result.Duration.TotalMilliseconds,
    DateTime.UtcNow);
```

### Benefits

1. **No full table scans** - Even "get all" queries only scan summary tables
2. **No background worker** - Statistics updated in real-time
3. **Consistent performance** - O(1) updates regardless of history size
4. **Accurate averages** - Running totals ensure mathematical precision
5. **Lower database load** - No periodic heavy queries

### Test Coverage

12 unit tests cover the delta-based approach:
- First execution creates summary
- Subsequent executions update summary incrementally
- Failed executions don't affect duration average
- Multiple workflows tracked separately
- Task statistics aggregated across workflows
- Running totals maintain accurate averages

---

## Performance Recommendations

### Current State

| Category | Status | Notes |
|----------|--------|-------|
| Index coverage | ✅ Good | All common queries use indexes |
| Query patterns | ✅ Good | SQL aggregation used appropriately |
| Delta-based stats | ✅ Implemented | O(1) updates, no full scans |
| Summary tables | ✅ Implemented | Pre-computed for fast reads |

### Future Optimizations (If Needed)

1. **Partitioning** - For time-series data:
   ```sql
   -- Partition ExecutionRecords by month
   CREATE TABLE ExecutionRecords (
       ...
   ) PARTITION BY RANGE (StartedAt);
   ```

3. **Read Replicas** - For read-heavy analytics:
   - Route statistics queries to read replica
   - Keep write operations on primary

4. **Caching** - For frequently-accessed statistics:
   ```csharp
   // Redis/Memory cache with TTL
   var stats = await _cache.GetOrCreateAsync(
       $"workflow-stats:{workflowName}",
       async () => await _repository.GetWorkflowStatisticsAsync(workflowName),
       TimeSpan.FromMinutes(5));
   ```

### Monitoring Queries

Use these queries to monitor database performance:

```sql
-- Find slow queries (PostgreSQL)
SELECT query, calls, mean_time, total_time
FROM pg_stat_statements
WHERE query LIKE '%ExecutionRecords%'
ORDER BY mean_time DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes
WHERE tablename IN ('ExecutionRecords', 'TaskExecutionRecords')
ORDER BY idx_scan DESC;

-- Find unused indexes
SELECT schemaname, tablename, indexname
FROM pg_stat_user_indexes
WHERE idx_scan = 0;
```

---

## Related Documentation

- [JSON Optimization Benchmarks](./JSON_OPTIMIZATION_BENCHMARKS.md) - Template resolution performance
- [WorkflowDbContext.cs](../src/WorkflowCore/Data/WorkflowDbContext.cs) - Index definitions
- [ExecutionRepository.cs](../src/WorkflowCore/Data/Repositories/ExecutionRepository.cs) - Query implementations
- [StatisticsAggregationService.cs](../src/WorkflowCore/Services/StatisticsAggregationService.cs) - Delta-based statistics
- [WorkflowStatisticsSummary.cs](../src/WorkflowCore/Models/WorkflowStatisticsSummary.cs) - Workflow summary model
- [TaskStatisticsSummary.cs](../src/WorkflowCore/Models/TaskStatisticsSummary.cs) - Task summary model
- [StatisticsAggregationServiceTests.cs](../tests/WorkflowCore.Tests/Services/StatisticsAggregationServiceTests.cs) - TDD tests

---

## Changelog

| Date | Change |
|------|--------|
| 2025-11-30 | Initial index design and query analysis |
| 2025-11-30 | Refactored `GetTaskStatisticsAsync` to use SQL aggregation |
| 2025-11-30 | Refactored `GetWorkflowStatisticsAsync` to use SQL aggregation |
| 2025-11-30 | Implemented delta-based statistics with summary tables (TDD: 12 tests) |
| 2025-11-30 | Added `WorkflowStatisticsSummary` and `TaskStatisticsSummary` models |
| 2025-11-30 | Added `TotalDurationMs` for accurate running average calculation |
