# Stage 33.3 Proof: Blast Radius UI

## Stage Overview
- **Stage Number:** 33.3
- **Stage Name:** Blast Radius UI
- **Profile:** FRONTEND_TS
- **Completion Date:** 2025-12-09

## Deliverables

### 1. API Client Hook
- **File:** `src/workflow-ui/lib/api/queries.ts`
- **Hook:** `useBlastRadius(taskName, options?)`
- **Features:**
  - Fetches from `/api/v1/tasks/{taskName}/blast-radius`
  - Configurable depth option
  - Can be disabled with `enabled` option
  - Uses React Query for caching and state management

### 2. Blast Radius Summary Component
- **File:** `src/workflow-ui/components/tasks/blast-radius-summary.tsx`
- **Features:**
  - Displays total affected workflows and tasks counts
  - Groups items by depth level
  - Clickable workflow/task items with navigation
  - Empty state when no impact detected
  - Type badges (workflow/task)

### 3. Blast Radius Graph Component
- **File:** `src/workflow-ui/components/tasks/blast-radius-graph.tsx`
- **Features:**
  - Interactive graph using @xyflow/react
  - Automatic layout using dagre
  - Node colors by type:
    - Red: Source task
    - Blue: Workflows
    - Orange: Affected tasks
  - Click-to-navigate on nodes
  - Legend component

### 4. Blast Radius Panel Component
- **File:** `src/workflow-ui/components/tasks/blast-radius-panel.tsx`
- **Features:**
  - Collapsible section (lazy loading)
  - Depth selector (1, 2, 3, unlimited)
  - View mode toggle (list/graph)
  - Loading, error, and empty states
  - Truncation warning when more levels exist

### 5. Integration
- **File:** `src/workflow-ui/app/tasks/[name]/page.tsx`
- Added BlastRadiusPanel to task detail page

## Test Results

### New Tests Added
- 7 tests for `useBlastRadius` hook
- 5 tests for `BlastRadiusSummary` component
- 3 tests for `BlastRadiusGraph` component
- 1 test for `BlastRadiusGraphLegend` component
- 6 tests for `BlastRadiusPanel` component
- 1 test for `BlastRadiusPanelSkeleton` component
- **Total new tests:** 23 tests

### Full Test Suite
- **Total UI Tests:** 2,012 tests passing
- **Type checking:** Passed

## Files Created

| File | Purpose |
|------|---------|
| `src/workflow-ui/lib/api/queries.ts` | Added `useBlastRadius` hook |
| `src/workflow-ui/lib/api/types.ts` | Added blast radius TypeScript types |
| `src/workflow-ui/lib/mocks/handlers.ts` | Added mock handler for blast radius API |
| `src/workflow-ui/components/tasks/blast-radius-summary.tsx` | Summary list view |
| `src/workflow-ui/components/tasks/blast-radius-graph.tsx` | Graph visualization |
| `src/workflow-ui/components/tasks/blast-radius-panel.tsx` | Main collapsible panel |
| `src/workflow-ui/components/tasks/blast-radius-panel.test.tsx` | Component tests |

## Files Modified

| File | Change |
|------|--------|
| `src/workflow-ui/app/tasks/[name]/page.tsx` | Added BlastRadiusPanel section |
| `src/workflow-ui/lib/api/queries.test.tsx` | Added tests for useBlastRadius hook |

## UI Features

- **Collapsible Panel:** Blast Radius section on task detail page
- **Depth Selector:** Choose analysis depth (1, 2, 3, unlimited)
- **View Toggle:** Switch between list and graph views
- **Click Navigation:** Click items/nodes to navigate to affected workflows/tasks
- **Truncation Warning:** Badge when more levels exist beyond current depth
- **Loading State:** Spinner while fetching analysis
- **Empty State:** Message when no downstream impact detected

## API Integration

```typescript
// Hook usage example
const { data, isLoading, error } = useBlastRadius('task-name', {
  depth: 2,
  enabled: true
});

// Response includes:
// - summary: flat list of affected items by depth
// - graph: nodes and edges for visualization
// - truncatedAtDepth: boolean indicating more levels exist
```

## Notes
- The blast radius panel only fetches data when expanded (lazy loading)
- Graph layout uses the same dagre-based layout utility as workflow-graph-panel
- All navigation uses Next.js router for client-side routing
