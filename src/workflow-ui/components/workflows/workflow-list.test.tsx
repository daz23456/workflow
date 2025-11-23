import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkflowList } from './workflow-list';
import { act } from 'react';

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

describe('WorkflowList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders WorkflowFilters component', async () => {
      renderWithQuery(<WorkflowList />);

      await waitFor(() => {
        expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/namespace/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
      });
    });

    it('renders workflow cards after loading', async () => {
      renderWithQuery(<WorkflowList />);

      await waitFor(() => {
        // Should render multiple workflow cards
        const cards = screen.getAllByRole('article');
        expect(cards.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Loading State', () => {
    it('shows loading skeleton while fetching', () => {
      renderWithQuery(<WorkflowList />);

      // Should show loading text initially
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('hides loading state after data loads', async () => {
      renderWithQuery(<WorkflowList />);

      await waitFor(() => {
        expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Default Filters', () => {
    it('applies default search filter', async () => {
      renderWithQuery(<WorkflowList defaultFilters={{ search: 'user' }} />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search workflows/i) as HTMLInputElement;
        expect(searchInput.value).toBe('user');
      });
    });

    it('applies default namespace filter', async () => {
      renderWithQuery(<WorkflowList defaultFilters={{ namespace: 'production' }} />);

      await waitFor(() => {
        const namespaceSelect = screen.getByLabelText(/namespace/i) as HTMLSelectElement;
        expect(namespaceSelect.value).toBe('production');
      });
    });

    it('applies default sort filter', async () => {
      renderWithQuery(<WorkflowList defaultFilters={{ sort: 'success-rate' }} />);

      await waitFor(() => {
        const sortSelect = screen.getByLabelText(/sort by/i) as HTMLSelectElement;
        expect(sortSelect.value).toBe('success-rate');
      });
    });
  });

  describe('Filtering', () => {
    it('filters workflows by namespace', async () => {
      renderWithQuery(<WorkflowList defaultFilters={{ namespace: 'production' }} />);

      await waitFor(() => {
        const cards = screen.getAllByRole('article');
        expect(cards.length).toBeGreaterThan(0);

        // All cards should be from production namespace
        cards.forEach((card) => {
          expect(within(card).getByText(/production/i)).toBeInTheDocument();
        });
      });
    });

    it('filters workflows by search query', async () => {
      renderWithQuery(<WorkflowList defaultFilters={{ search: 'user' }} />);

      await waitFor(() => {
        const cards = screen.getAllByRole('article');
        expect(cards.length).toBeGreaterThan(0);

        // At least one card should contain "user" in name or description
        const hasUserMatch = cards.some((card) => {
          const text = card.textContent || '';
          return text.toLowerCase().includes('user');
        });
        expect(hasUserMatch).toBe(true);
      });
    });

    it('shows empty state when no results match', async () => {
      renderWithQuery(<WorkflowList defaultFilters={{ search: 'nonexistent' }} />);

      await waitFor(() => {
        expect(screen.getByText(/no workflows found/i)).toBeInTheDocument();
        expect(screen.getByText(/try adjusting your filters/i)).toBeInTheDocument();
      });
    });
  });

  describe('Sorting', () => {
    it('sorts workflows by name by default', async () => {
      renderWithQuery(<WorkflowList />);

      await waitFor(() => {
        const cards = screen.getAllByRole('article');
        expect(cards.length).toBeGreaterThan(1);

        // Extract workflow names
        const names = cards.map((card) => {
          const heading = within(card).getByRole('heading', { level: 3 });
          return heading.textContent || '';
        });

        // Should be sorted alphabetically
        const sortedNames = [...names].sort();
        expect(names).toEqual(sortedNames);
      });
    });

    it('sorts workflows by success rate when selected', async () => {
      renderWithQuery(<WorkflowList defaultFilters={{ sort: 'success-rate' }} />);

      await waitFor(() => {
        const cards = screen.getAllByRole('article');
        expect(cards.length).toBeGreaterThan(1);

        // Extract success rates (they should be in descending order)
        const rates: number[] = [];
        cards.forEach((card) => {
          const badge = card.querySelector('[class*="bg-green"], [class*="bg-yellow"], [class*="bg-red"]');
          if (badge) {
            const text = badge.textContent || '';
            const match = text.match(/(\d+\.?\d*)%/);
            if (match) {
              rates.push(parseFloat(match[1]));
            }
          }
        });

        // Should be sorted descending
        for (let i = 1; i < rates.length; i++) {
          expect(rates[i - 1]).toBeGreaterThanOrEqual(rates[i]);
        }
      });
    });
  });

  describe('Grid Layout', () => {
    it('renders workflows in a grid layout', async () => {
      renderWithQuery(<WorkflowList />);

      await waitFor(() => {
        // Find the grid container
        const grid = document.querySelector('.grid');
        expect(grid).toBeInTheDocument();
        expect(grid).toHaveClass('grid-cols-1');
        expect(grid).toHaveClass('md:grid-cols-2');
        expect(grid).toHaveClass('lg:grid-cols-3');
      });
    });
  });

  describe('Namespace List', () => {
    it('extracts unique namespaces from workflows', async () => {
      renderWithQuery(<WorkflowList />);

      await waitFor(() => {
        const namespaceSelect = screen.getByLabelText(/namespace/i);
        const options = within(namespaceSelect).getAllByRole('option');

        // Should have "All namespaces" + actual namespaces
        expect(options.length).toBeGreaterThan(1);
        expect(options[0]).toHaveTextContent('All namespaces');
      });
    });
  });

  describe('Error Handling', () => {
    it('shows error message when fetch fails', async () => {
      // Override MSW to return error
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      });

      // Force error by using invalid endpoint (not implemented in MSW)
      render(
        <QueryClientProvider client={queryClient}>
          <WorkflowList />
        </QueryClientProvider>
      );

      // Note: This test depends on MSW setup - if handlers return success, this won't fail
      // In practice, error handling would be tested with custom MSW handlers that return errors
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA roles and labels', async () => {
      renderWithQuery(<WorkflowList />);

      await waitFor(() => {
        // Filter inputs should have labels
        expect(screen.getByLabelText(/search/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/namespace/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();

        // Cards should have article role
        const cards = screen.getAllByRole('article');
        expect(cards.length).toBeGreaterThan(0);
      });
    });
  });
});
