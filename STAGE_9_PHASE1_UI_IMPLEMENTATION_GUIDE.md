# Stage 9-Phase1: UI Prototype Implementation Guide

**Goal:** Build a production-quality UI prototype with comprehensive mocked data to validate UX/design, with easy migration path to real APIs.

**Status:** Planning
**Estimated Time:** 35-45 hours (4.5-6 days)
**Dependencies:** None (works with mocked data)
**Quality:** Production-ready (TDD, Storybook, Visual Regression)

---

## Table of Contents

1. [Technology Stack](#technology-stack)
2. [TDD & Testing Strategy](#tdd--testing-strategy)
3. [Storybook Component Library](#storybook-component-library)
4. [Visual Regression Testing](#visual-regression-testing)
5. [Visual Design Specification](#visual-design-specification)
6. [Project Structure](#project-structure)
7. [Mock Data Strategy](#mock-data-strategy)
8. [Implementation Phases](#implementation-phases)
9. [Component Specifications](#component-specifications)
10. [Migration Path to Real APIs](#migration-path-to-real-apis)
11. [Success Criteria](#success-criteria)

---

## Technology Stack

### Core Framework
- **Next.js 14** (App Router) - React framework with SSR/SSG
- **TypeScript** - Type safety
- **React 18** - UI library

### Styling & Components
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful, accessible component library
- **Lucide Icons** - Icon library (pairs with shadcn)

### Workflow Visualization
- **React Flow** - Interactive workflow DAG visualization
- **Dagre** - Auto-layout algorithm for graph positioning

### Data Management
- **TanStack Query (React Query)** - Data fetching/caching/state management
- **MSW (Mock Service Worker)** - API mocking in browser
- **Zod** - Schema validation
- **React Hook Form** - Form handling

### Testing & Documentation (Production-Ready)
- **Storybook 8** - Component library & documentation
- **Jest + React Testing Library** - Unit/component tests (TDD)
- **Vitest** - Fast unit test runner (optional alternative to Jest)
- **Playwright** - E2E tests
- **Chromatic** - Visual regression testing
- **@storybook/test-runner** - Automated Storybook testing
- **MSW** - API mocking (dev + Storybook + tests)

---

## TDD & Testing Strategy

### Test-Driven Development Philosophy

**RED → GREEN → REFACTOR** for every component:

1. **RED**: Write failing test first
2. **GREEN**: Write minimum code to pass
3. **REFACTOR**: Clean up while keeping tests green

### Testing Pyramid

```
           ┌─────────────┐
           │   E2E (5%)  │  Playwright - Critical user journeys
           ├─────────────┤
           │ Integration │  React Testing Library - Component integration
           │   (20%)     │
           ├─────────────┤
           │    Unit     │  Jest/Vitest - Business logic, utilities
           │   (75%)     │
           └─────────────┘
```

### Test Coverage Requirements

- **Minimum**: 90% code coverage (enforced)
- **Utilities/Logic**: 100% coverage
- **Components**: 85%+ coverage
- **E2E**: Critical paths only (workflow execution flow)

### Testing Workflow

**For Every Component:**

```bash
# 1. Write Storybook story first (visual spec)
# components/workflows/workflow-card.stories.tsx

# 2. Write failing test (RED)
npm run test:watch
# components/workflows/workflow-card.test.tsx

# 3. Write component (GREEN)
# components/workflows/workflow-card.tsx

# 4. Refactor while keeping tests green

# 5. Run all tests + coverage
npm run test:coverage

# 6. Visual regression test
npm run chromatic
```

### Test File Organization

```
components/
├── workflows/
│   ├── workflow-card.tsx          # Component
│   ├── workflow-card.test.tsx     # Unit tests
│   ├── workflow-card.stories.tsx  # Storybook stories
│   └── __snapshots__/             # Snapshot tests
│       └── workflow-card.test.tsx.snap
```

### Example TDD Cycle: WorkflowCard

**Step 1: Write Storybook Story (Visual Spec)**
```typescript
// components/workflows/workflow-card.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { WorkflowCard } from './workflow-card';

const meta: Meta<typeof WorkflowCard> = {
  title: 'Workflows/WorkflowCard',
  component: WorkflowCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    workflow: {
      name: 'user-onboarding',
      description: 'Create user account and send welcome email',
      taskCount: 5,
      inputSchemaPreview: 'email, name, plan',
      stats: {
        totalExecutions: 127,
        successRate: 98.4,
        avgDurationMs: 1250,
        lastExecuted: '2025-11-23T10:30:00Z',
      },
    },
  },
};

export const HighSuccessRate: Story = {
  args: {
    workflow: {
      ...Default.args.workflow,
      stats: {
        ...Default.args.workflow.stats,
        successRate: 99.9,
      },
    },
  },
};

export const LowSuccessRate: Story = {
  args: {
    workflow: {
      ...Default.args.workflow,
      stats: {
        ...Default.args.workflow.stats,
        successRate: 75.2,
      },
    },
  },
};
```

**Step 2: Write Failing Test (RED)**
```typescript
// components/workflows/workflow-card.test.tsx
import { render, screen } from '@testing-library/react';
import { WorkflowCard } from './workflow-card';

describe('WorkflowCard', () => {
  const mockWorkflow = {
    name: 'user-onboarding',
    description: 'Create user account',
    taskCount: 5,
    stats: {
      totalExecutions: 127,
      successRate: 98.4,
      avgDurationMs: 1250,
    },
  };

  it('renders workflow name and description', () => {
    render(<WorkflowCard workflow={mockWorkflow} />);

    expect(screen.getByText('user-onboarding')).toBeInTheDocument();
    expect(screen.getByText('Create user account')).toBeInTheDocument();
  });

  it('displays task count badge', () => {
    render(<WorkflowCard workflow={mockWorkflow} />);

    expect(screen.getByText('5 tasks')).toBeInTheDocument();
  });

  it('shows success rate with correct variant', () => {
    render(<WorkflowCard workflow={mockWorkflow} />);

    const badge = screen.getByText(/98.4% success/);
    expect(badge).toBeInTheDocument();
    // Badge should be green variant for >95% success
    expect(badge).toHaveClass('variant-success');
  });

  it('displays average duration', () => {
    render(<WorkflowCard workflow={mockWorkflow} />);

    expect(screen.getByText(/1250ms/)).toBeInTheDocument();
  });

  it('shows warning badge for low success rate', () => {
    const lowSuccessWorkflow = {
      ...mockWorkflow,
      stats: { ...mockWorkflow.stats, successRate: 75.2 },
    };

    render(<WorkflowCard workflow={lowSuccessWorkflow} />);

    const badge = screen.getByText(/75.2% success/);
    expect(badge).toHaveClass('variant-warning');
  });
});
```

**Step 3: Write Component (GREEN)**
```typescript
// components/workflows/workflow-card.tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface WorkflowCardProps {
  workflow: WorkflowListItem;
}

export function WorkflowCard({ workflow }: WorkflowCardProps) {
  const successVariant = workflow.stats.successRate > 95 ? 'success' : 'warning';

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader>
        <CardTitle>{workflow.name}</CardTitle>
        <CardDescription>{workflow.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{workflow.taskCount} tasks</Badge>
          <Badge variant={successVariant} className={`variant-${successVariant}`}>
            {workflow.stats.successRate.toFixed(1)}% success
          </Badge>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Avg: {workflow.stats.avgDurationMs}ms
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full">View Details</Button>
      </CardFooter>
    </Card>
  );
}
```

**Step 4: Refactor**
- Extract badge variant logic
- Add accessibility attributes
- Improve semantic HTML

**Step 5: Run Tests**
```bash
npm run test:coverage
# Verify 90%+ coverage
```

---

## Storybook Component Library

### Purpose
- **Living Documentation**: Auto-generated component docs
- **Visual Testing**: See all component states in isolation
- **Development Environment**: Build components in isolation
- **Design System**: Single source of truth for components
- **Collaboration**: Designers/PMs can review components before integration

### Storybook Configuration

**Install Storybook:**
```bash
npx storybook@latest init
```

**Configure for Next.js + Tailwind:**
```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  stories: ['../components/**/*.stories.@(js|jsx|ts|tsx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',          // Accessibility testing
    '@chromatic-com/storybook',       // Visual regression
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  staticDirs: ['../public'],
};

export default config;
```

**Tailwind Support:**
```typescript
// .storybook/preview.ts
import type { Preview } from '@storybook/react';
import '../styles/globals.css'; // Import Tailwind

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;
```

**MSW Integration (Mock APIs in Storybook):**
```typescript
// .storybook/preview.ts
import { initialize, mswDecorator } from 'msw-storybook-addon';
import { handlers } from '../lib/mocks/handlers';

initialize();

export const decorators = [mswDecorator];
export const parameters = {
  msw: {
    handlers,
  },
};
```

### Story Organization

**Folder Structure:**
```
components/
├── ui/                     # shadcn/ui primitives
│   ├── button.stories.tsx
│   ├── card.stories.tsx
│   └── ...
├── workflows/
│   ├── workflow-card.stories.tsx
│   ├── workflow-list.stories.tsx
│   └── workflow-filters.stories.tsx
├── graph/
│   ├── custom-node.stories.tsx
│   ├── custom-edge.stories.tsx
│   └── workflow-graph.stories.tsx
├── execution/
│   ├── execution-form.stories.tsx
│   ├── execution-results.stories.tsx
│   └── task-timeline.stories.tsx
└── validation/
    ├── validation-banner.stories.tsx
    └── schema-comparison.stories.tsx
```

### Advanced Story Patterns

**1. Component States (All Variants)**
```typescript
export const AllStates: Story = {
  render: () => (
    <div className="space-y-4">
      <WorkflowCard workflow={defaultWorkflow} />
      <WorkflowCard workflow={highSuccessWorkflow} />
      <WorkflowCard workflow={lowSuccessWorkflow} />
      <WorkflowCard workflow={noExecutionsWorkflow} />
    </div>
  ),
};
```

**2. Interactive Stories (With Controls)**
```typescript
export const Interactive: Story = {
  args: {
    workflow: defaultWorkflow,
  },
  argTypes: {
    'workflow.stats.successRate': {
      control: { type: 'range', min: 0, max: 100, step: 0.1 },
    },
  },
};
```

**3. With API Mocking**
```typescript
export const WithAPIData: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/v1/workflows/:name', () => {
          return HttpResponse.json(mockWorkflow);
        }),
      ],
    },
  },
};
```

**4. Interaction Testing (User Flows)**
```typescript
import { userEvent, within } from '@storybook/testing-library';
import { expect } from '@storybook/jest';

export const ClickToViewDetails: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button', { name: /view details/i });

    await userEvent.click(button);

    // Verify navigation or modal opened
    await expect(canvas.getByText('Workflow Details')).toBeInTheDocument();
  },
};
```

### Storybook Scripts

```json
// package.json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "test-storybook": "test-storybook",
    "chromatic": "chromatic --project-token=YOUR_TOKEN"
  }
}
```

---

## Visual Regression Testing

### Chromatic Setup

**Why Chromatic:**
- Automated visual regression testing
- Catches UI bugs before deployment
- Integrates with Storybook
- Review UI changes like code changes
- CI/CD integration

**Setup:**
```bash
npm install --save-dev chromatic
npx chromatic --project-token=<your-token>
```

**Configuration:**
```json
// package.json
{
  "scripts": {
    "chromatic": "chromatic --exit-zero-on-changes",
    "chromatic:ci": "chromatic --exit-once-uploaded"
  }
}
```

**CI Integration (GitHub Actions):**
```yaml
# .github/workflows/chromatic.yml
name: 'Chromatic'
on: push

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build-storybook
      - uses: chromaui/action@v1
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          exitZeroOnChanges: true
```

### Visual Testing Workflow

**1. Baseline Creation**
```bash
# First run creates baseline snapshots
npm run chromatic
# Review and approve baselines in Chromatic UI
```

**2. Detect Changes**
```bash
# Subsequent runs compare against baseline
npm run chromatic
# Changes flagged for review
```

**3. Review UI Changes**
- Chromatic shows side-by-side diffs
- Accept changes (update baseline) or reject (fix code)
- Prevents unintended UI regressions

**4. Test Coverage**
- Every Storybook story = visual regression test
- Test all component states (loading, error, success, etc.)
- Test responsive breakpoints

### Snapshot Testing Patterns

**Critical Components to Test:**
```typescript
// components/graph/workflow-graph.stories.tsx
export const EmptyGraph: Story = { /* ... */ };
export const SimpleLinearGraph: Story = { /* ... */ };
export const ComplexParallelGraph: Story = { /* ... */ };
export const GraphWithErrors: Story = { /* ... */ };
export const GraphDuringExecution: Story = { /* ... */ };
export const GraphAfterSuccess: Story = { /* ... */ };
export const GraphAfterFailure: Story = { /* ... */ };
export const DarkMode: Story = {
  parameters: { theme: 'dark' },
  /* ... */
};
export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  /* ... */
};
```

### Accessibility Testing in Storybook

**Install a11y addon:**
```bash
npm install --save-dev @storybook/addon-a11y
```

**Configure:**
```typescript
// .storybook/main.ts
export default {
  addons: ['@storybook/addon-a11y'],
};
```

**Stories automatically tested for:**
- Keyboard navigation
- ARIA attributes
- Color contrast
- Screen reader support
- Focus management

---

## Visual Design Specification

### Design Philosophy
- **Clean & Minimal** - Lots of whitespace, clear hierarchy, no clutter
- **Advanced Under the Hood** - React Flow for powerful graph manipulation
- **Progressive Disclosure** - Simple at first glance, power features revealed when needed
- **Fast & Responsive** - Instant feedback, smooth animations

### Inspiration
- **Vercel Dashboard** - Clean, fast, minimal
- **Linear** - Beautiful, purposeful design
- **Raycast** - Fast, keyboard-driven

---

### 1. Workflow Graph Visualization (Hybrid Approach)

#### Static View (Clean & Minimal)

**Layout:** Horizontal Swim Lanes
```
┌─ Workflow: User Onboarding ────────────────────────────┐
│                                                          │
│  L0  │  ┌─────────────────┐                            │
│      │  │  Validate Input │                            │
│      │  └────────┬────────┘                            │
│           ┌──────┴──────┬────────────┐                 │
│  L1  │  ┌┴────────────┐ ┌┴────────┐ ┌┴──────────┐     │
│      │  │ Create User │ │Send Email│ │Log Event  │     │ ← Same level = parallel
│      │  └┬────────────┘ └┬────────┘ └┬──────────┘     │
│           └──────┬───────┴────────────┘                 │
│  L2  │         ┌┴────────────┐                          │
│      │         │ Return Token│                          │
│      │         └─────────────┘                          │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Visual Elements:**
- Tasks arranged in horizontal levels (L0, L1, L2...) - calculated by topological sort
- Tasks at same level = parallel execution capability
- Very subtle alternating background per level (almost invisible - just for visual separation)
- Level indicators on left margin (subtle, gray)
- Clean arrows showing dependencies
- Minimal node design: task name, small icon, subtle border

**Interactions:**
- Hover task → subtle highlight of all tasks at same level
- Hover edge → show data flow info
- Click task → open detail panel (slide from right)
- Click edge → show data transfer details
- Zoom/pan controls (React Flow built-in)

#### Dynamic Execution View

**During Execution:**
```
│  L1  │  ┌┴────────────┐ ┌┴────────┐ ┢┴──────────┐     │
│      │  │ Create User │ │Send Email│ │Log Event  │     │
│      │  │  🔵 Running │ │ 🔵 Running│ │ 🔵 Running│    │ ← All pulse together!
│      │  │    ●●●50%   │ │   ●●30%  │ │   ●●●75%  │     │
│      │  └┬────────────┘ └┬────────┘ └┬──────────┘     │
│           │  1.2s elapsed │  0.8s    │  0.5s          │
```

**Animations:**
- Parallel tasks **pulse in sync** (same color, same timing)
- Progress rings on running tasks
- Color-coded status:
  - Pending: Gray
  - Running: Blue (pulsing)
  - Success: Green
  - Failed: Red
  - Skipped: Yellow
- Timeline below graph: "Level 1: 3 tasks running in parallel"

---

### 2. Animated Data Flow Visualization

**Concept:** Particles flowing along edges showing data transfer in real-time

#### Static State (Before/After Execution)
```
[Task A] ────→ [Task B]
         gray arrow showing direction
```

#### During Execution (Data Flowing)
```
[Task A] ─●──→ [Task B]
          ↑
     Blue particle animating from A to B
     Shows data currently being transferred
```

#### After Execution (Successful Transfer)
```
[Task A] ════→ [Task B]
         green edge (data transferred successfully)
```

**Particle Details:**
- **Color:** Blue for objects, green for strings, yellow for numbers
- **Speed:** Slower for larger payloads, faster for small data
- **Multiple particles:** If multiple data points flowing simultaneously
- **Hover particle:** Tooltip shows actual data being passed

**Edge Click Details:**
```
┌─ Data Transfer Details ─────────────────────┐
│ From: validate-input                         │
│ To: create-user                              │
│                                              │
│ Data Transferred:                            │
│ {                                            │
│   "valid": true,                             │
│   "email": "user@example.com",               │
│   "sanitizedEmail": "user@example.com"       │
│ }                                            │
│                                              │
│ Timestamp: 2025-11-23T10:30:00.250Z         │
│ Size: 156 bytes                             │
│ Transfer Time: 2ms                          │
└──────────────────────────────────────────────┘
```

---

### 3. Schema Mismatch Visual Indicators

**Multi-Level Warning System:**

#### Level 1: Edge-Level Warnings
```
[Task A] ───⚠️───→ [Task B]
            ↑
      Yellow badge = type mismatch warning
```

**Hover Warning Badge:**
```
┌─ Schema Mismatch ────────────────────────────┐
│                                              │
│ Task A outputs:     Task B expects:         │
│ {                   {                       │
│   "userId": number    "userId": string  ❌  │
│   "email": string     "email": string   ✓   │
│ }                   }                       │
│                                              │
│ Severity: Error (will fail at runtime)      │
│                                              │
│ Suggested Fix:                              │
│ Update Task A output schema to return       │
│ userId as string, OR update Task B input    │
│ schema to accept userId as number.          │
│                                              │
│ Template Fix:                               │
│ "userId": "{{tasks.taskA.output.userId |    │
│            toString}}"                       │
│                                              │
│ [View Task A Schema] [View Task B Schema]   │
└──────────────────────────────────────────────┘
```

#### Level 2: Node-Level Indicators

**Node Border Colors:**
- **Green:** All connections valid
- **Yellow:** Warning (might work but risky)
- **Red:** Error (will definitely fail)

**Small warning icon in node corner if it has mismatches**

#### Level 3: Graph-Wide Overview

**Top of graph banner:**
```
┌─────────────────────────────────────────────────────────┐
│ Workflow: user-onboarding                               │
│ ✓ 5 tasks   ⚠️ 2 warnings   ❌ 1 error                  │
│ [Show All Issues ▼]                                     │
└─────────────────────────────────────────────────────────┘
```

**Expanded Issues Panel:**
```
┌─ Validation Issues ─────────────────────────────────────┐
│                                                          │
│ ❌ 1 Error                                               │
│                                                          │
│ 1. Type Mismatch: validate → create-user                │
│    Edge: validate-input → create-user                   │
│    • Output: userId (integer)                           │
│    • Expected: userId (string)                          │
│    • Fix: Cast to string in template                    │
│    [Jump to Edge] [Suggest Fix]                         │
│                                                          │
│ ⚠️ 2 Warnings                                            │
│                                                          │
│ 1. Missing Field: create-user → send-email              │
│    • Required field "templateId" missing                │
│    • Severity: Warning (has default value)              │
│    [Jump to Edge] [View Schema]                         │
│                                                          │
│ 2. Optional Field: send-email → log-event               │
│    • Optional field "metadata" not provided             │
│    • Severity: Info                                     │
│    [Dismiss]                                            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

#### Level 4: Split-View Schema Comparison

**When clicking on a mismatched edge:**
```
┌─ Schema Comparison ──────────────────────────────────────┐
│                                                           │
│ Task A: validate-input   →   Task B: create-user         │
│                                                           │
│ Output Schema:               Input Schema:                │
│ ┌─────────────────────┐     ┌──────────────────────┐    │
│ │ {                   │     │ {                    │    │
│ │   "userId": number ◄┼──❌─┼→ "userId": string   │    │
│ │   "email": string  ◄┼──✓──┼→ "email": string    │    │
│ │   "valid": boolean  │     │   "name": string     │    │
│ │   "timestamp": date │     │   "templateId": str  │    │
│ │ }                   │     │ }                    │    │
│ └─────────────────────┘     └──────────────────────┘    │
│                                                           │
│ Legend:                                                   │
│ ✓ Compatible   ❌ Type mismatch   ⚠️ Missing   ! Extra   │
│                                                           │
│ Issues:                                                   │
│ 1. ❌ userId: number → string (type mismatch)             │
│ 2. ⚠️ name: missing from Task A output                    │
│ 3. ⚠️ templateId: missing from Task A output              │
│ 4. ! valid: not used by Task B (extra field)             │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

---

### 4. Execution Timeline with Playback

**Bottom panel during/after execution:**
```
┌─ Execution Timeline ─────────────────────────────────────────────────┐
│                                                                       │
│ Timeline (1250ms total):                                             │
│                                                                       │
│ 0ms    250ms   500ms   750ms   1000ms  1250ms                       │
│ ├───────┼───────┼───────┼───────┼───────┼──────┤                   │
│ │       │       │       │       │       │      │                    │
│ ███     │       │       │       │       │      │  validate-input    │
│    ███████████████      │       │       │      │  create-user       │
│    █████████████████████│       │       │      │  send-email        │
│         │       │       ████████│       │      │  log-event         │
│         │       │       │       │   ████│      │  return-response   │
│         │       │       │       │       │      │                    │
│ Data Flow Events:                               │                    │
│         ●───────────────●       │       │      │  validate → create │
│         ●───────────────●       │       │      │  validate → send   │
│                 ●───────────────●──────●      │  create → log      │
│                                                 │                    │
│ Current: 1250ms (complete)                     │                    │
│ [▶ Replay] [⏸ Pause] [Speed: 1x ▼] [◀ Prev] [Next ▶]              │
│ Progress: ████████████████████████████████████ 100%                 │
└───────────────────────────────────────────────────────────────────────┘
```

**Features:**
- Horizontal bars show task execution duration
- Color-coded by status (blue=running, green=success, red=failed)
- Dots on timeline show data flow events
- Scrubber to replay execution (graph updates in sync)
- Speed control (0.5x, 1x, 2x, 5x)
- Click timeline → jump to that moment
- Hover bar → tooltip with task details

**Playback Mode:**
- Click "Replay" → graph animation replays from start
- As scrubber moves, graph updates to show state at that time
- Particles flow along edges at correct timestamps
- Task nodes change color as they execute

---

### 5. Template Resolution Preview

**In Execution Form (Real-Time):**
```
┌─ Input Form ────────────────────────────────────────────┐
│ Email: user@example.com                                 │
│ Name: John Doe                                          │
│ Plan: premium                                           │
└─────────────────────────────────────────────────────────┘

┌─ Template Resolution Preview ──────────────────────────┐
│                                                         │
│ Task: validate-input                                   │
│ Template: "email": "{{input.email}}"                   │
│ Resolves: "email": "user@example.com"  ✓               │
│                                                         │
│ Task: create-user                                      │
│ Template: {                                            │
│   "email": "{{input.email}}",                          │
│   "name": "{{input.name}}",                            │
│   "plan": "{{input.plan}}"                             │
│ }                                                       │
│ Resolves: {                                            │
│   "email": "user@example.com",  ✓                      │
│   "name": "John Doe",  ✓                               │
│   "plan": "premium"  ✓                                 │
│ }                                                       │
│                                                         │
│ Task: send-email                                       │
│ Template: {                                            │
│   "to": "{{input.email}}",                             │
│   "userId": "{{tasks.create-user.output.id}}"          │
│ }                                                       │
│ Resolves: {                                            │
│   "to": "user@example.com",  ✓                         │
│   "userId": ⏳ (depends on create-user execution)      │
│ }                                                       │
│                                                         │
│ [Toggle Preview]                                       │
└─────────────────────────────────────────────────────────┘
```

**Features:**
- Updates in real-time as user types in form
- Shows which templates are already resolvable vs depend on task outputs
- Validates template syntax (red if invalid reference)
- Highlights missing required fields

---

## Project Structure

```
src/WorkflowUI.Frontend/
├── .storybook/                  # Storybook configuration
│   ├── main.ts                 # Storybook config
│   ├── preview.ts              # Global decorators & parameters
│   └── test-runner.ts          # Test runner config
│
├── app/                          # Next.js App Router
│   ├── layout.tsx               # Root layout with providers, nav
│   ├── page.tsx                 # Dashboard/home page
│   ├── workflows/
│   │   ├── page.tsx            # Workflow list page
│   │   └── [name]/
│   │       └── page.tsx        # Workflow detail + execution page
│   └── history/
│       └── page.tsx             # Execution history page
│
├── components/
│   ├── ui/                      # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── button.test.tsx     # Tests
│   │   ├── button.stories.tsx  # Storybook stories
│   │   ├── card.tsx
│   │   ├── card.test.tsx
│   │   ├── card.stories.tsx
│   │   └── ... (other shadcn components with tests + stories)
│   │
│   ├── layout/                 # App shell components
│   │   ├── app-shell.tsx
│   │   ├── app-shell.test.tsx
│   │   ├── app-shell.stories.tsx
│   │   ├── sidebar.tsx
│   │   ├── sidebar.test.tsx
│   │   ├── sidebar.stories.tsx
│   │   └── ... (all with tests + stories)
│   │
│   ├── workflows/              # Workflow-specific components
│   │   ├── workflow-list.tsx
│   │   ├── workflow-list.test.tsx
│   │   ├── workflow-list.stories.tsx
│   │   ├── workflow-card.tsx
│   │   ├── workflow-card.test.tsx
│   │   ├── workflow-card.stories.tsx
│   │   └── ... (all with tests + stories)
│   │
│   ├── graph/                  # React Flow graph components
│   │   ├── workflow-graph.tsx
│   │   ├── workflow-graph.test.tsx
│   │   ├── workflow-graph.stories.tsx
│   │   ├── custom-node.tsx
│   │   ├── custom-node.test.tsx
│   │   ├── custom-node.stories.tsx
│   │   └── ... (all with tests + stories)
│   │
│   ├── execution/              # Execution interface components
│   │   ├── execution-form.tsx
│   │   ├── execution-form.test.tsx
│   │   ├── execution-form.stories.tsx
│   │   └── ... (all with tests + stories)
│   │
│   ├── validation/             # Schema validation UI
│   │   └── ... (all with tests + stories)
│   │
│   └── history/                # Execution history components
│       └── ... (all with tests + stories)
│
├── lib/
│   ├── api/                    # API client
│   │   ├── client.ts
│   │   ├── client.test.ts      # Tests
│   │   ├── queries.ts
│   │   ├── queries.test.ts
│   │   └── types.ts
│   │
│   ├── mocks/                  # MSW mock data
│   │   ├── handlers.ts
│   │   ├── handlers.test.ts
│   │   ├── workflows.ts
│   │   ├── executions.ts
│   │   └── browser.ts
│   │
│   ├── graph/                  # Graph utilities
│   │   ├── builder.ts
│   │   ├── builder.test.ts     # 100% coverage required
│   │   ├── layout.ts
│   │   ├── layout.test.ts
│   │   ├── dependency-parser.ts
│   │   ├── dependency-parser.test.ts
│   │   ├── parallel-detector.ts
│   │   ├── parallel-detector.test.ts
│   │   ├── validator.ts
│   │   └── validator.test.ts
│   │
│   ├── utils.ts
│   └── utils.test.ts
│
├── hooks/                       # Custom React hooks
│   ├── use-workflow-graph.ts
│   ├── use-workflow-graph.test.ts
│   └── ... (all with tests)
│
├── types/                       # TypeScript types
│   ├── workflow.ts
│   ├── execution.ts
│   ├── graph.ts
│   └── schema.ts
│
├── e2e/                         # Playwright E2E tests
│   ├── workflow-execution.spec.ts
│   ├── workflow-browsing.spec.ts
│   └── dark-mode.spec.ts
│
├── styles/
│   └── globals.css
│
├── public/
│   └── mockServiceWorker.js    # MSW service worker
│
├── jest.config.js               # Jest configuration
├── jest.setup.js                # Jest setup (RTL, MSW)
├── playwright.config.ts         # Playwright configuration
└── package.json
```

---

## Mock Data Strategy

### Approach
- Create **comprehensive mock data** that represents what APIs will return after Stages 7.8-7.9
- Use **MSW** to intercept API calls and return realistic mocked responses
- Design data structures for **ideal API responses**, not limited by current APIs
- Easy migration: swap MSW handlers for real fetch calls (1-line change)

---

### Mock Data Types

#### 1. Workflow List Item
```typescript
interface WorkflowListItem {
  name: string;
  namespace: string;
  description: string;
  taskCount: number;
  inputSchemaPreview: string; // "email, name, plan"
  endpoint: string;

  // Execution stats (future Stage 7.8)
  stats: {
    totalExecutions: number;
    successRate: number;  // 0-100
    avgDurationMs: number;
    lastExecuted: string; // ISO timestamp
  };
}
```

#### 2. Workflow Detail (with Graph Data)
```typescript
interface WorkflowDetail {
  name: string;
  namespace: string;
  description: string;

  inputSchema: JSONSchema;
  outputSchema: Record<string, string>; // Template expressions

  tasks: TaskDetail[];

  // Graph data for React Flow
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    parallelGroups: ParallelGroup[];
  };

  endpoints: {
    execute: string;
    test: string;
    details: string;
  };
}

interface TaskDetail {
  id: string;
  taskRef: string;
  description: string;
  input: Record<string, string>; // Template expressions
  inputSchema: JSONSchema;
  outputSchema: JSONSchema;
  httpRequest?: {
    method: string;
    url: string;
    headers: Record<string, string>;
    bodyTemplate: string;
  };
  timeout?: string; // "30s"
  condition?: string;
}

interface GraphNode {
  id: string;
  type: 'task';
  data: {
    label: string;
    taskRef: string;
    level: number; // Execution level for swim lanes
    description?: string;
  };
  position: { x: number; y: number }; // Auto-calculated
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: 'dependency';
  label?: string;
  // Validation info
  hasWarning?: boolean;
  hasError?: boolean;
  validationIssues?: ValidationIssue[];
}

interface ParallelGroup {
  level: number;
  taskIds: string[];
}

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  sourceField?: string;
  targetField?: string;
  suggestedFix?: string;
}
```

#### 3. Execution Response
```typescript
interface WorkflowExecutionResponse {
  executionId: string;
  workflowName: string;
  success: boolean;
  output: Record<string, any>;

  // Task-level details (future Stage 7.8)
  tasks: TaskExecutionDetail[];

  executionTimeMs: number;
  startedAt: string; // ISO
  completedAt?: string; // ISO
  error?: string;
}

interface TaskExecutionDetail {
  taskId: string;
  taskRef: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';

  startedAt?: string;
  completedAt?: string;
  durationMs: number;

  output?: any;
  error?: string;
  retryCount: number;

  httpResponse?: {
    statusCode: number;
    headers: Record<string, string>;
    body: any;
  };
}
```

#### 4. Execution History
```typescript
interface ExecutionHistoryItem {
  executionId: string;
  workflowName: string;
  status: 'success' | 'failed' | 'running';
  startedAt: string;
  completedAt?: string;
  durationMs: number;
  inputSnapshot: Record<string, any>;
  outputSnapshot?: Record<string, any>;
}
```

---

### Mock Workflow Examples

**Create 4-5 realistic workflows:**

1. **user-signup** (Simple - Linear flow)
   - validate-input → create-user → send-welcome-email → return-token
   - 4 tasks, no parallelism, ~1.2s execution

2. **order-processing** (Moderate - Some parallel tasks)
   - validate-order → [check-inventory, verify-payment, check-fraud] → create-shipment → send-confirmation
   - 6 tasks, 3 parallel at level 2, ~2.5s execution

3. **data-pipeline** (Complex - Nested dependencies)
   - fetch-data → [transform-data, validate-schema, enrich-data] → [save-to-db, send-to-queue] → trigger-webhook
   - 7 tasks, multiple parallel groups, ~4.2s execution

4. **user-onboarding** (Real-world - With schema mismatches for testing)
   - validate-input → [create-account, send-email, log-event] → update-analytics → return-response
   - 6 tasks, 3 parallel, includes 1 intentional schema mismatch, ~1.8s execution

5. **payment-flow** (Complex - Error scenarios)
   - validate-card → authorize-payment → [update-balance, send-receipt, update-ledger] → notify-merchant
   - 6 tasks, includes retry scenarios, ~3.1s execution

---

## Implementation Phases

### Phase 1: Project Setup (3-4 hours)

**Task 1.1: Initialize Next.js Project**
```bash
npx create-next-app@latest workflow-ui --typescript --tailwind --app
cd workflow-ui
```

**Task 1.2: Install Core Dependencies**
```bash
# shadcn/ui
npx shadcn-ui@latest init

# React Flow
npm install reactflow

# TanStack Query
npm install @tanstack/react-query

# MSW
npm install msw --save-dev
npx msw init public/ --save

# Form handling
npm install react-hook-form zod @hookform/resolvers

# Dagre layout
npm install dagre
npm install --save-dev @types/dagre

# Icons
npm install lucide-react
```

**Task 1.2b: Install Testing Dependencies**
```bash
# Jest + React Testing Library
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev @testing-library/user-event jest-environment-jsdom

# Storybook
npx storybook@latest init

# Storybook addons
npm install --save-dev @storybook/addon-a11y @chromatic-com/storybook
npm install --save-dev msw-storybook-addon @storybook/test-runner

# Chromatic (Visual Regression)
npm install --save-dev chromatic

# Playwright (E2E)
npm install --save-dev @playwright/test
npx playwright install

# Coverage
npm install --save-dev @coverage-istanbul/nyc
```

**Task 1.3: Install shadcn/ui Components**
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
npx shadcn-ui@latest add input
npx shadcn-ui@latest add table
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add tabs
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add select
npx shadcn-ui@latest add form
npx shadcn-ui@latest add alert
npx shadcn-ui@latest add sheet
npx shadcn-ui@latest add calendar
```

**Task 1.4: Configure Testing Infrastructure**

**Jest Configuration** (`jest.config.js`):
```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    '!**/*.stories.tsx',
    '!**/*.test.tsx',
  ],
  coverageThresholds: {
    global: {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
```

**Jest Setup** (`jest.setup.js`):
```javascript
import '@testing-library/jest-dom';
import { server } from './lib/mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**Storybook Configuration** (`.storybook/main.ts` - shown earlier)

**Playwright Configuration** (`playwright.config.ts`):
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Package.json Scripts**:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",

    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --maxWorkers=2",

    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build",
    "test-storybook": "test-storybook",

    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui",

    "chromatic": "chromatic --exit-zero-on-changes",
    "chromatic:ci": "chromatic --exit-once-uploaded",

    "type-check": "tsc --noEmit",
    "format": "prettier --write ."
  }
}
```

**Task 1.5: Project Configuration**
- Configure TypeScript paths in `tsconfig.json`
- Set up Tailwind custom colors/themes
- Configure ESLint, Prettier
- Set up TanStack Query provider
- Configure MSW for browser (lib/mocks/browser.ts)
- Configure MSW for Node (lib/mocks/server.ts for tests)

**Task 1.6: Create Type Definitions**
- Create `types/workflow.ts`, `types/execution.ts`, `types/graph.ts`, `types/schema.ts`
- Define all core interfaces

**Task 1.7: App Layout (TDD)**
- Write tests first for each layout component
- Write Storybook stories
- Implement components:
  - Root layout with sidebar navigation
  - Header with breadcrumbs
  - Responsive mobile menu
  - Dark mode toggle
  - Theme provider

---

### Phase 2: Mock Data Layer (3 hours)

**Task 2.1: Create Mock Workflows**
File: `lib/mocks/workflows.ts`

- Define 5 realistic workflow mock objects
- Include full schemas, task details, HTTP configs
- Generate graph data (nodes, edges, parallel groups)
- Add intentional schema mismatches for testing validation

**Task 2.2: Create Mock Execution Data**
File: `lib/mocks/executions.ts`

- Mock execution responses with task-level details
- Include various scenarios: success, failure, running
- Mock 15-20 historical executions
- Realistic timing data

**Task 2.3: MSW Handlers**
File: `lib/mocks/handlers.ts`

```typescript
import { http, HttpResponse } from 'msw';
import { workflows, executions } from './workflows';

export const handlers = [
  // GET /api/v1/workflows
  http.get('/api/v1/workflows', () => {
    return HttpResponse.json({ workflows });
  }),

  // GET /api/v1/workflows/:name
  http.get('/api/v1/workflows/:name', ({ params }) => {
    const workflow = workflows.find(w => w.name === params.name);
    return workflow
      ? HttpResponse.json(workflow)
      : new HttpResponse(null, { status: 404 });
  }),

  // POST /api/v1/workflows/:name/execute
  http.post('/api/v1/workflows/:name/execute', async ({ params, request }) => {
    // Simulate execution with realistic delay
    await delay(1500);
    const execution = mockExecution(params.name);
    return HttpResponse.json(execution);
  }),

  // POST /api/v1/workflows/:name/test (dry-run)
  http.post('/api/v1/workflows/:name/test', async ({ params }) => {
    await delay(300);
    const plan = mockExecutionPlan(params.name);
    return HttpResponse.json(plan);
  }),

  // GET /api/v1/executions (history)
  http.get('/api/v1/executions', () => {
    return HttpResponse.json({ executions });
  }),
];

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

**Task 2.4: API Client + TanStack Query Hooks**
File: `lib/api/queries.ts`

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: async () => {
      const res = await fetch('/api/v1/workflows');
      return res.json();
    },
  });
}

export function useWorkflowDetail(name: string) {
  return useQuery({
    queryKey: ['workflows', name],
    queryFn: async () => {
      const res = await fetch(`/api/v1/workflows/${name}`);
      return res.json();
    },
    enabled: !!name,
  });
}

export function useExecuteWorkflow(name: string) {
  return useMutation({
    mutationFn: async (input: Record<string, any>) => {
      const res = await fetch(`/api/v1/workflows/${name}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      return res.json();
    },
  });
}

export function useExecutionHistory(workflowName?: string) {
  return useQuery({
    queryKey: ['executions', workflowName],
    queryFn: async () => {
      const url = workflowName
        ? `/api/v1/executions?workflow=${workflowName}`
        : '/api/v1/executions';
      const res = await fetch(url);
      return res.json();
    },
  });
}
```

---

### Phase 3: Workflow List Page (3 hours)

**Task 3.1: Workflow List Component**
File: `components/workflows/workflow-list.tsx`

- Grid layout (responsive: 1 col mobile, 2 cols tablet, 3 cols desktop)
- Uses `useWorkflows()` hook
- Loading skeletons
- Empty state

**Task 3.2: Workflow Card**
File: `components/workflows/workflow-card.tsx`

```typescript
interface WorkflowCardProps {
  workflow: WorkflowListItem;
}

export function WorkflowCard({ workflow }: WorkflowCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader>
        <CardTitle>{workflow.name}</CardTitle>
        <CardDescription>{workflow.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{workflow.taskCount} tasks</Badge>
          <Badge variant={workflow.stats.successRate > 95 ? 'success' : 'warning'}>
            {workflow.stats.successRate.toFixed(1)}% success
          </Badge>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Avg: {workflow.stats.avgDurationMs}ms
          {workflow.stats.lastExecuted && (
            <> • Last run: {formatRelative(workflow.stats.lastExecuted)}</>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full">View Details</Button>
      </CardFooter>
    </Card>
  );
}
```

**Task 3.3: Search/Filter**
File: `components/workflows/workflow-filters.tsx`

- Search input (debounced)
- Namespace filter dropdown
- Client-side filtering

**Task 3.4: Page Implementation**
File: `app/workflows/page.tsx`

---

### Phase 4: React Flow Graph Visualization (5 hours)

**Task 4.1: Graph Builder Utility**
File: `lib/graph/builder.ts`

```typescript
import dagre from 'dagre';

export function buildWorkflowGraph(workflow: WorkflowDetail) {
  const { tasks } = workflow;

  // 1. Extract dependencies from template expressions
  const dependencies = extractDependencies(tasks);

  // 2. Calculate execution levels (topological sort)
  const levels = calculateLevels(tasks, dependencies);

  // 3. Detect parallel groups
  const parallelGroups = detectParallelGroups(tasks, levels, dependencies);

  // 4. Build React Flow nodes
  const nodes: GraphNode[] = tasks.map((task, index) => ({
    id: task.id,
    type: 'task',
    data: {
      label: task.id,
      taskRef: task.taskRef,
      level: levels[task.id],
      description: task.description,
    },
    position: { x: 0, y: 0 }, // Will be calculated by layout
  }));

  // 5. Build React Flow edges
  const edges: GraphEdge[] = dependencies.map((dep, index) => ({
    id: `e${index}`,
    source: dep.from,
    target: dep.to,
    type: 'dependency',
  }));

  // 6. Apply Dagre layout
  const layouted = applyDagreLayout(nodes, edges);

  return {
    nodes: layouted.nodes,
    edges: layouted.edges,
    parallelGroups,
  };
}

function applyDagreLayout(nodes: GraphNode[], edges: GraphEdge[]) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({
    rankdir: 'TB',   // Top to bottom
    ranksep: 100,    // Vertical spacing between levels
    nodesep: 80,     // Horizontal spacing between parallel tasks
  });

  nodes.forEach(node => {
    dagreGraph.setNode(node.id, { width: 180, height: 60 });
  });

  edges.forEach(edge => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map(node => {
    const pos = dagreGraph.node(node.id);
    return {
      ...node,
      position: { x: pos.x - 90, y: pos.y - 30 },
    };
  });

  return { nodes: layoutedNodes, edges };
}

function extractDependencies(tasks: TaskDetail[]) {
  const dependencies: { from: string; to: string }[] = [];

  tasks.forEach(task => {
    // Parse template expressions in task.input
    const refs = extractTemplateReferences(task.input);

    refs.forEach(ref => {
      // ref = "tasks.some-task.output.field"
      const match = ref.match(/^tasks\.([^.]+)\.output/);
      if (match) {
        const sourceTaskId = match[1];
        dependencies.push({ from: sourceTaskId, to: task.id });
      }
    });
  });

  return dependencies;
}

function extractTemplateReferences(input: Record<string, string>): string[] {
  const refs: string[] = [];
  const templateRegex = /\{\{([^}]+)\}\}/g;

  Object.values(input).forEach(value => {
    let match;
    while ((match = templateRegex.exec(value)) !== null) {
      refs.push(match[1].trim());
    }
  });

  return refs;
}

function calculateLevels(
  tasks: TaskDetail[],
  dependencies: { from: string; to: string }[]
) {
  const levels: Record<string, number> = {};
  const inDegree: Record<string, number> = {};
  const adjList: Record<string, string[]> = {};

  // Initialize
  tasks.forEach(task => {
    levels[task.id] = 0;
    inDegree[task.id] = 0;
    adjList[task.id] = [];
  });

  // Build adjacency list and in-degrees
  dependencies.forEach(({ from, to }) => {
    adjList[from].push(to);
    inDegree[to]++;
  });

  // Topological sort with level calculation
  const queue: string[] = [];
  tasks.forEach(task => {
    if (inDegree[task.id] === 0) {
      queue.push(task.id);
      levels[task.id] = 0;
    }
  });

  while (queue.length > 0) {
    const current = queue.shift()!;

    adjList[current].forEach(neighbor => {
      levels[neighbor] = Math.max(levels[neighbor], levels[current] + 1);
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    });
  }

  return levels;
}

function detectParallelGroups(
  tasks: TaskDetail[],
  levels: Record<string, number>,
  dependencies: { from: string; to: string }[]
): ParallelGroup[] {
  const groups: Record<number, string[]> = {};

  // Group tasks by level
  tasks.forEach(task => {
    const level = levels[task.id];
    if (!groups[level]) groups[level] = [];
    groups[level].push(task.id);
  });

  // Only include groups with 2+ tasks (parallel)
  return Object.entries(groups)
    .filter(([_, taskIds]) => taskIds.length > 1)
    .map(([level, taskIds]) => ({
      level: parseInt(level),
      taskIds,
    }));
}
```

**Task 4.2: Custom Task Node**
File: `components/graph/custom-node.tsx`

```typescript
import { Handle, Position, NodeProps } from 'reactflow';
import { Badge } from '@/components/ui/badge';

export function TaskNode({ data }: NodeProps) {
  const statusColor = {
    pending: 'bg-gray-200',
    running: 'bg-blue-500 animate-pulse',
    success: 'bg-green-500',
    failed: 'bg-red-500',
    skipped: 'bg-yellow-500',
  }[data.status || 'pending'];

  return (
    <div className="relative">
      <Handle type="target" position={Position.Top} />

      <div className={`
        px-4 py-3 rounded-lg border-2 bg-white
        ${statusColor}
        hover:shadow-lg transition-shadow
        min-w-[180px]
      `}>
        <div className="font-medium text-sm">{data.label}</div>
        <div className="text-xs text-muted-foreground mt-1">
          {data.taskRef}
        </div>

        {data.status === 'running' && data.progress !== undefined && (
          <div className="mt-2">
            <div className="text-xs text-muted-foreground">{data.progress}%</div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all"
                style={{ width: `${data.progress}%` }}
              />
            </div>
          </div>
        )}

        {data.hasWarning && (
          <Badge variant="warning" className="absolute -top-2 -right-2">
            ⚠️
          </Badge>
        )}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
```

**Task 4.3: Custom Edge with Animation**
File: `components/graph/custom-edge.tsx`

```typescript
import { EdgeProps, getStraightPath } from 'reactflow';

export function DataFlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  const isFlowing = data?.isFlowing;
  const hasError = data?.hasError;
  const hasWarning = data?.hasWarning;

  return (
    <>
      {/* Base edge */}
      <path
        id={id}
        d={edgePath}
        className={`
          stroke-2 fill-none
          ${hasError ? 'stroke-red-500 stroke-dashed' : ''}
          ${hasWarning ? 'stroke-yellow-500' : ''}
          ${!hasError && !hasWarning ? 'stroke-gray-300' : ''}
        `}
        markerEnd="url(#arrowhead)"
      />

      {/* Animated particle when data is flowing */}
      {isFlowing && (
        <circle r={4} className="fill-blue-500">
          <animateMotion dur="1s" repeatCount="indefinite">
            <mpath href={`#${id}`} />
          </animateMotion>
        </circle>
      )}

      {/* Warning/Error badge */}
      {(hasWarning || hasError) && (
        <g transform={`translate(${labelX},${labelY})`}>
          <circle r={12} className={hasError ? 'fill-red-500' : 'fill-yellow-500'} />
          <text
            className="text-white text-xs"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {hasError ? '❌' : '⚠️'}
          </text>
        </g>
      )}

      {/* Arrow marker definition */}
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="3"
          orient="auto"
        >
          <polygon points="0 0, 10 3, 0 6" className="fill-gray-400" />
        </marker>
      </defs>
    </>
  );
}
```

**Task 4.4: Swim Lane Backgrounds**
File: `components/graph/swim-lane-background.tsx`

```typescript
export function SwimLaneBackground({ parallelGroups }: { parallelGroups: ParallelGroup[] }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {parallelGroups.map(group => (
        <div
          key={group.level}
          className={`
            absolute left-0 right-0
            ${group.level % 2 === 0 ? 'bg-slate-50/30' : 'bg-white'}
          `}
          style={{
            top: `${group.level * 100}px`,
            height: '100px',
          }}
        >
          <div className="text-xs text-muted-foreground p-2">
            L{group.level} ({group.taskIds.length} parallel)
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Task 4.5: Main Workflow Graph Component**
File: `components/graph/workflow-graph.tsx`

```typescript
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { TaskNode } from './custom-node';
import { DataFlowEdge } from './custom-edge';
import { SwimLaneBackground } from './swim-lane-background';

const nodeTypes = {
  task: TaskNode,
};

const edgeTypes = {
  dependency: DataFlowEdge,
};

interface WorkflowGraphProps {
  workflow: WorkflowDetail;
  execution?: WorkflowExecutionResponse;
}

export function WorkflowGraph({ workflow, execution }: WorkflowGraphProps) {
  const graph = buildWorkflowGraph(workflow);

  const [nodes, setNodes, onNodesChange] = useNodesState(graph.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(graph.edges);

  // Update node/edge states during execution
  useEffect(() => {
    if (!execution) return;

    const updatedNodes = nodes.map(node => {
      const task = execution.tasks.find(t => t.taskId === node.id);
      return {
        ...node,
        data: {
          ...node.data,
          status: task?.status || 'pending',
          progress: task ? calculateProgress(task) : 0,
        },
      };
    });

    setNodes(updatedNodes);

    // Update edges to show data flow
    const updatedEdges = edges.map(edge => ({
      ...edge,
      data: {
        isFlowing: isDataFlowing(edge, execution),
      },
    }));

    setEdges(updatedEdges);
  }, [execution]);

  return (
    <div className="h-full w-full relative">
      <SwimLaneBackground parallelGroups={graph.parallelGroups} />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}

function calculateProgress(task: TaskExecutionDetail): number {
  if (task.status === 'success') return 100;
  if (task.status === 'failed') return 0;
  // Estimate based on elapsed time (crude but works for demo)
  return Math.min(90, (task.durationMs / 1000) * 30);
}

function isDataFlowing(edge: GraphEdge, execution: WorkflowExecutionResponse): boolean {
  const sourceTask = execution.tasks.find(t => t.taskId === edge.source);
  const targetTask = execution.tasks.find(t => t.taskId === edge.target);

  // Data is flowing if source just completed and target is about to start
  return sourceTask?.status === 'success' && targetTask?.status === 'running';
}
```

---

### Phase 5: Workflow Detail + Execution Page (5 hours)

**Task 5.1: Dynamic Form Generation**
File: `components/execution/execution-form.tsx`

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

function generateZodSchema(jsonSchema: JSONSchema): z.ZodType {
  // Convert JSON Schema to Zod schema
  // Simplified - real implementation would handle all types
  const shape: Record<string, z.ZodType> = {};

  Object.entries(jsonSchema.properties || {}).forEach(([key, prop]) => {
    switch (prop.type) {
      case 'string':
        shape[key] = z.string();
        break;
      case 'number':
        shape[key] = z.number();
        break;
      case 'boolean':
        shape[key] = z.boolean();
        break;
      case 'object':
        shape[key] = z.object({});
        break;
      // ... handle other types
    }

    if (!jsonSchema.required?.includes(key)) {
      shape[key] = shape[key].optional();
    }
  });

  return z.object(shape);
}

export function ExecutionForm({ workflow, onExecute }: ExecutionFormProps) {
  const schema = generateZodSchema(workflow.inputSchema);
  const form = useForm({
    resolver: zodResolver(schema),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onExecute)} className="space-y-4">
        {Object.entries(workflow.inputSchema.properties || {}).map(([key, prop]) => (
          <FormField
            key={key}
            control={form.control}
            name={key}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{key}</FormLabel>
                <FormControl>
                  <Input
                    type={getInputType(prop.type)}
                    placeholder={prop.description}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}

        <div className="flex gap-2">
          <Button type="button" variant="outline">Dry Run</Button>
          <Button type="submit">Execute</Button>
        </div>
      </form>
    </Form>
  );
}
```

**Task 5.2: Execution Results Viewer**
**Task 5.3: Template Preview Component**
**Task 5.4: Task Detail Panel**
**Task 5.5: Page Layout**

File: `app/workflows/[name]/page.tsx`

---

### Phase 6: Execution Timeline (2 hours)

**Task 6.1: Timeline Component**
File: `components/execution/task-timeline.tsx`

**Task 6.2: Playback Controls**
File: `components/execution/execution-playback.tsx`

---

### Phase 7: Schema Validation UI (3 hours)

**Task 7.1: Validation Logic**
File: `lib/graph/validator.ts`

**Task 7.2: Validation Banner**
File: `components/validation/validation-banner.tsx`

**Task 7.3: Schema Comparison Panel**
File: `components/validation/schema-comparison.tsx`

**Task 7.4: Mismatch Tooltips**

---

### Phase 8: Execution History Page (2 hours)

**Task 8.1: History Table**
File: `components/history/execution-table.tsx`

**Task 8.2: Detail Dialog**
File: `app/history/page.tsx`

---

### Phase 9: Polish & Testing (3 hours)

**Task 9.1: Loading States**
**Task 9.2: Error Handling**
**Task 9.3: Responsive Design**
**Task 9.4: Dark Mode**
**Task 9.5: Keyboard Shortcuts**
**Task 9.6: Component Tests**

---

## Migration Path to Real APIs

When backend APIs are enhanced (Stages 7.8-7.9):

### Step 1: Disable MSW
```typescript
// lib/mocks/browser.ts
if (process.env.NODE_ENV === 'development') {
  // worker.start(); // Comment out
}
```

### Step 2: Update API Base URL
```typescript
// lib/api/client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
```

### Step 3: Test with Real Data
- All components already designed for real API shapes
- TanStack Query handles caching/loading/errors
- No component changes needed

### Step 4: Gradual Migration
- Keep MSW for missing endpoints
- Swap one endpoint at a time
- Easy rollback if needed

---

## Success Criteria

✅ Can browse 5-6 realistic workflows with stats
✅ Can view workflow detail with interactive React Flow graph
✅ Graph shows horizontal swim lanes with parallel groups clearly visible
✅ Can execute workflow with dynamically generated form
✅ Graph animates during execution (parallel tasks pulse together)
✅ Particles flow along edges showing data transfer
✅ Schema mismatches shown with warning badges and detailed explanations
✅ Can view task-level execution details
✅ Template resolution preview updates in real-time
✅ Execution timeline with playback controls
✅ Can view execution history (15-20 mocked executions)
✅ UI is minimal, clean, fast, and intuitive
✅ Dark mode works perfectly
✅ Responsive on mobile
✅ All critical components have tests (optional for POC)

---

## Next Steps

1. Review this guide in full
2. Confirm approach and scope
3. Begin Phase 1: Project Setup
4. Implement phases incrementally
5. Demo after each phase for feedback
6. Iterate based on UX validation

---

**Total Estimate: 35-45 hours (4.5-6 days)**

**Time Breakdown:**
- Setup (with testing infrastructure): 3-4 hours
- Mock data layer: 3 hours
- Workflow list page (TDD + Stories): 4 hours
- Graph visualization (TDD + Stories): 6-7 hours
- Detail + execution page (TDD + Stories): 6-7 hours
- Timeline component (TDD + Stories): 3 hours
- Schema validation UI (TDD + Stories): 4 hours
- Execution history (TDD + Stories): 3 hours
- Polish & E2E tests: 4-5 hours

**Quality Gates:**
- ✅ 90%+ test coverage (enforced)
- ✅ All components have Storybook stories
- ✅ Visual regression baselines created
- ✅ E2E tests for critical paths
- ✅ Accessibility tests pass
- ✅ No linting/type errors

**Ready to start building with TDD!** 🚀
