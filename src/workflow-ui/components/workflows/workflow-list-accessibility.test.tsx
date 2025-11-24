import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkflowList } from './workflow-list';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

// Mock router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

function renderWithQuery(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('WorkflowList Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not have accessibility violations', async () => {
    const { container } = renderWithQuery(<WorkflowList />);

    // Wait a bit for async loading
    await new Promise(resolve => setTimeout(resolve, 500));

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should not have accessibility violations with filters applied', async () => {
    const { container } = renderWithQuery(
      <WorkflowList defaultFilters={{ search: 'user', namespace: 'default' }} />
    );

    await new Promise(resolve => setTimeout(resolve, 500));

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
