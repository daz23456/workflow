# Workflow Components

This directory contains components for displaying and managing workflows.

## Components

### `WorkflowList`
Main container component that orchestrates the workflow list page.

**Features:**
- Real-time filtering (search, namespace, sort)
- Keyboard shortcuts (/ for search, Esc to clear)
- Loading skeletons
- Empty states
- Responsive grid layout
- Accessibility (ARIA live regions, screen reader support)

**Usage:**
```tsx
import { WorkflowList } from '@/components/workflows/workflow-list';

export default function WorkflowsPage() {
  return <WorkflowList />;
}

// With default filters
<WorkflowList defaultFilters={{ search: 'user', namespace: 'production' }} />
```

### `WorkflowCard`
Displays individual workflow summary with stats.

**Features:**
- Success rate with trend indicators
- Namespace color coding
- Never-executed visual indicator
- Hover prefetching for performance
- Tooltips on stats
- Fully accessible (keyboard navigation, ARIA labels)

**Usage:**
```tsx
import { WorkflowCard } from '@/components/workflows/workflow-card';

<WorkflowCard
  workflow={workflow}
  onClick={(name) => router.push(`/workflows/${name}`)}
/>
```

### `WorkflowFilters`
Filter controls for search, namespace, and sorting.

**Features:**
- Debounced search (300ms)
- Namespace dropdown
- Sort options with direction indicators
- Disabled state during loading
- Keyboard accessibility

**Usage:**
```tsx
import { WorkflowFilters } from '@/components/workflows/workflow-filters';

<WorkflowFilters
  namespaces={['default', 'production']}
  onFilterChange={(filters) => console.log(filters)}
  defaultValues={{ search: '', namespace: undefined, sort: 'name' }}
  isLoading={false}
/>
```

### `WorkflowCardSkeleton`
Loading placeholder for workflow cards.

**Usage:**
```tsx
import { WorkflowCardSkeleton } from '@/components/workflows/workflow-card-skeleton';

{Array.from({ length: 6 }).map((_, i) => (
  <WorkflowCardSkeleton key={i} />
))}
```

### `EmptyState`
Displays message when no workflows are found.

**Usage:**
```tsx
import { EmptyState } from '@/components/workflows/empty-state';

<EmptyState
  title="No workflows yet"
  description="Get started by creating your first workflow."
/>
```

## Testing

All components have comprehensive test coverage:
- Unit tests with Vitest + React Testing Library
- Integration tests for user flows
- Accessibility tests with jest-axe
- Visual regression tests with Playwright
- Edge case handling

Run tests:
```bash
npm test                  # Run all tests
npm run test:coverage     # With coverage report
npx playwright test       # E2E tests
```

## Accessibility

All components meet WCAG AA standards:
- Keyboard navigation support
- Screen reader announcements (ARIA live regions)
- Sufficient color contrast (audited)
- Focus indicators
- Semantic HTML

## Performance

- Debounced search input
- Prefetching on card hover
- Efficient React Query caching
- Responsive image loading (when implemented)
