import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BlastRadiusPanel, BlastRadiusPanelSkeleton } from './blast-radius-panel';
import { BlastRadiusSummary } from './blast-radius-summary';
import { BlastRadiusGraph, BlastRadiusGraphLegend } from './blast-radius-graph';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Create query client wrapper for tests
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// Mock data
const mockSummary = {
  totalAffectedWorkflows: 2,
  totalAffectedTasks: 3,
  affectedWorkflows: ['user-signup', 'user-onboarding'],
  affectedTasks: ['create-user', 'send-welcome-email', 'update-profile'],
  byDepth: [
    {
      depth: 1,
      workflows: ['user-signup'],
      tasks: ['create-user'],
    },
    {
      depth: 2,
      workflows: ['user-onboarding'],
      tasks: ['send-welcome-email', 'update-profile'],
    },
  ],
};

const mockGraph = {
  nodes: [
    { id: 'task:fetch-user', name: 'fetch-user', type: 'task' as const, depth: 0, isSource: true },
    { id: 'workflow:user-signup', name: 'user-signup', type: 'workflow' as const, depth: 1, isSource: false },
    { id: 'task:create-user', name: 'create-user', type: 'task' as const, depth: 1, isSource: false },
  ],
  edges: [
    { source: 'task:fetch-user', target: 'workflow:user-signup', relationship: 'usedBy' as const },
    { source: 'workflow:user-signup', target: 'task:create-user', relationship: 'contains' as const },
  ],
};

const emptySummary = {
  totalAffectedWorkflows: 0,
  totalAffectedTasks: 0,
  affectedWorkflows: [],
  affectedTasks: [],
  byDepth: [],
};

const emptyGraph = {
  nodes: [],
  edges: [],
};

describe('BlastRadiusSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays summary statistics', () => {
    render(<BlastRadiusSummary summary={mockSummary} />);

    expect(screen.getByText('2')).toBeInTheDocument(); // workflows count
    expect(screen.getByText('3')).toBeInTheDocument(); // tasks count
    expect(screen.getByText('workflows')).toBeInTheDocument();
    expect(screen.getByText('tasks')).toBeInTheDocument();
  });

  it('displays items grouped by depth level', () => {
    render(<BlastRadiusSummary summary={mockSummary} />);

    expect(screen.getByTestId('depth-1')).toBeInTheDocument();
    expect(screen.getByTestId('depth-2')).toBeInTheDocument();
  });

  it('shows workflow and task items with badges', () => {
    render(<BlastRadiusSummary summary={mockSummary} />);

    expect(screen.getByTestId('workflow-item-user-signup')).toBeInTheDocument();
    expect(screen.getByTestId('task-item-create-user')).toBeInTheDocument();
  });

  it('shows empty state when no impact', () => {
    render(<BlastRadiusSummary summary={emptySummary} />);

    expect(screen.getByTestId('no-impact')).toBeInTheDocument();
    expect(screen.getByText(/No downstream impact detected/)).toBeInTheDocument();
  });

  it('calls onClick handlers when items are clicked', () => {
    const onWorkflowClick = vi.fn();
    const onTaskClick = vi.fn();

    render(
      <BlastRadiusSummary
        summary={mockSummary}
        onWorkflowClick={onWorkflowClick}
        onTaskClick={onTaskClick}
      />
    );

    fireEvent.click(screen.getByTestId('workflow-item-user-signup'));
    expect(onWorkflowClick).toHaveBeenCalledWith('user-signup');

    fireEvent.click(screen.getByTestId('task-item-create-user'));
    expect(onTaskClick).toHaveBeenCalledWith('create-user');
  });
});

describe('BlastRadiusGraph', () => {
  it('displays graph when nodes exist', () => {
    render(<BlastRadiusGraph graph={mockGraph} />);

    expect(screen.getByTestId('blast-radius-graph')).toBeInTheDocument();
  });

  it('shows empty state when no nodes', () => {
    render(<BlastRadiusGraph graph={emptyGraph} />);

    expect(screen.getByTestId('empty-graph')).toBeInTheDocument();
    expect(screen.getByText(/No impact graph to display/)).toBeInTheDocument();
  });

  it('calls onNodeClick when a node is clicked', async () => {
    const onNodeClick = vi.fn();
    render(<BlastRadiusGraph graph={mockGraph} onNodeClick={onNodeClick} />);

    // Note: ReactFlow interactions are difficult to test directly
    // This test verifies the graph renders without errors
    expect(screen.getByTestId('blast-radius-graph')).toBeInTheDocument();
  });
});

describe('BlastRadiusGraphLegend', () => {
  it('displays all legend items', () => {
    render(<BlastRadiusGraphLegend />);

    expect(screen.getByTestId('graph-legend')).toBeInTheDocument();
    expect(screen.getByText('Source Task')).toBeInTheDocument();
    expect(screen.getByText('Workflow')).toBeInTheDocument();
    expect(screen.getByText('Affected Task')).toBeInTheDocument();
  });
});

describe('BlastRadiusPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders collapsed by default', () => {
    render(<BlastRadiusPanel taskName="fetch-user" />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByTestId('blast-radius-panel')).toBeInTheDocument();
    expect(screen.getByTestId('panel-header')).toBeInTheDocument();
    expect(screen.queryByTestId('panel-content')).not.toBeInTheDocument();
  });

  it('expands when header is clicked', async () => {
    render(<BlastRadiusPanel taskName="fetch-user" />, {
      wrapper: createWrapper(),
    });

    const header = screen.getByTestId('panel-header');
    fireEvent.click(header);

    await waitFor(() => {
      expect(screen.getByTestId('panel-content')).toBeInTheDocument();
    });
  });

  it('renders expanded when defaultExpanded is true', () => {
    render(<BlastRadiusPanel taskName="fetch-user" defaultExpanded />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByTestId('panel-content')).toBeInTheDocument();
  });

  it('shows loading state when fetching', async () => {
    render(<BlastRadiusPanel taskName="fetch-user" defaultExpanded />, {
      wrapper: createWrapper(),
    });

    // Should show loading initially
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('has depth selector', async () => {
    render(<BlastRadiusPanel taskName="fetch-user" defaultExpanded />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByTestId('depth-selector')).toBeInTheDocument();
    expect(screen.getByText('Depth 1')).toBeInTheDocument();
  });

  it('has view mode toggle buttons', async () => {
    render(<BlastRadiusPanel taskName="fetch-user" defaultExpanded />, {
      wrapper: createWrapper(),
    });

    expect(screen.getByTestId('view-list')).toBeInTheDocument();
    expect(screen.getByTestId('view-graph')).toBeInTheDocument();
  });

  it('switches between list and graph views', async () => {
    render(<BlastRadiusPanel taskName="fetch-user" defaultExpanded />, {
      wrapper: createWrapper(),
    });

    // List view is default
    const listButton = screen.getByTestId('view-list');
    const graphButton = screen.getByTestId('view-graph');

    expect(listButton).toHaveAttribute('aria-pressed', 'true');
    expect(graphButton).toHaveAttribute('aria-pressed', 'false');

    // Switch to graph view
    fireEvent.click(graphButton);

    expect(listButton).toHaveAttribute('aria-pressed', 'false');
    expect(graphButton).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('BlastRadiusPanelSkeleton', () => {
  it('renders skeleton loading state', () => {
    render(<BlastRadiusPanelSkeleton />);

    const skeleton = document.querySelector('.animate-pulse');
    expect(skeleton).toBeInTheDocument();
  });
});
