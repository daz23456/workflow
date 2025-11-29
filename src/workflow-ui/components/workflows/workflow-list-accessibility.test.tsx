import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkflowList } from './workflow-list';

// @ts-ignore - jest-axe types not available
import { axe, toHaveNoViolations } from 'jest-axe';

// @ts-ignore - extend expect with toHaveNoViolations
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
    await new Promise((resolve) => setTimeout(resolve, 500));

    const results = await axe(container);
    // @ts-ignore - toHaveNoViolations is extended from jest-axe
    expect(results).toHaveNoViolations();
  }, 10000); // Increase timeout for axe analysis

  it('should not have accessibility violations with filters applied', async () => {
    const { container } = renderWithQuery(
      <WorkflowList defaultFilters={{ search: 'user', namespace: 'default' }} />
    );

    await new Promise((resolve) => setTimeout(resolve, 500));

    const results = await axe(container);
    // @ts-ignore - toHaveNoViolations is extended from jest-axe
    expect(results).toHaveNoViolations();
  }, 10000); // Increase timeout for axe analysis
});
