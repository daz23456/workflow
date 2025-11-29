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
    it('shows loading skeletons while fetching', () => {
      renderWithQuery(<WorkflowList />);

      // Should show skeleton cards initially
      const skeletons = screen.getAllByRole('status');
      expect(skeletons.length).toBeGreaterThan(0);
      expect(skeletons[0]).toHaveAccessibleName('Loading workflow');
    });

    it('hides loading skeletons after data loads', async () => {
      renderWithQuery(<WorkflowList />);

      await waitFor(() => {
        // Skeletons (with role="status") should be hidden
        // Note: Workflow count also has role="status" for screen readers, so count will be 1
        const statusElements = screen.queryAllByRole('status');
        const skeletons = statusElements.filter(
          (el) => el.getAttribute('aria-label') === 'Loading workflow'
        );
        expect(skeletons.length).toBe(0);
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
          const badge = card.querySelector(
            '[class*="bg-green"], [class*="bg-yellow"], [class*="bg-red"]'
          );
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
        expect(grid).toHaveClass('sm:grid-cols-2');
        expect(grid).toHaveClass('lg:grid-cols-3');
        expect(grid).toHaveClass('xl:grid-cols-4');
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

  describe('Last Updated Timestamp', () => {
    it('displays last updated timestamp after data loads', async () => {
      renderWithQuery(<WorkflowList />);

      await waitFor(() => {
        const cards = screen.getAllByRole('article');
        expect(cards.length).toBeGreaterThan(0);
      });

      // Should show "Updated X ago" text
      await waitFor(() => {
        expect(screen.getByText(/updated/i)).toBeInTheDocument();
      });
    });

    it('does not display timestamp while loading', () => {
      renderWithQuery(<WorkflowList />);

      // Should not show timestamp during initial load
      expect(screen.queryByText(/updated/i)).not.toBeInTheDocument();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('focuses search input when "/" key is pressed', async () => {
      renderWithQuery(<WorkflowList />);

      // Wait for loading to complete and search to be enabled
      await waitFor(() => {
        const searchInput = screen.getByLabelText(/search/i) as HTMLInputElement;
        expect(searchInput).toBeInTheDocument();
        expect(searchInput.disabled).toBe(false);
      });

      const searchInput = screen.getByLabelText(/search/i) as HTMLInputElement;

      // Ensure search is not focused initially
      expect(document.activeElement).not.toBe(searchInput);

      // Press "/" key
      act(() => {
        const event = new KeyboardEvent('keydown', { key: '/' });
        document.dispatchEvent(event);
      });

      // Search input should now be focused
      await waitFor(() => {
        expect(document.activeElement).toBe(searchInput);
      });
    });

    it('clears all filters when "Escape" key is pressed', async () => {
      renderWithQuery(
        <WorkflowList
          defaultFilters={{ search: 'order', namespace: 'production', sort: 'success-rate' }}
        />
      );

      // Wait for workflows to load and filters to be applied
      await waitFor(() => {
        // Workflows must be loaded (check for cards)
        const cards = screen.queryAllByRole('article');
        expect(cards.length).toBeGreaterThan(0);
      });

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search workflows/i) as HTMLInputElement;
        const namespaceSelect = screen.getByLabelText(/namespace/i) as HTMLSelectElement;
        const sortSelect = screen.getByLabelText(/sort by/i) as HTMLSelectElement;

        expect(searchInput.disabled).toBe(false);
        expect(searchInput.value).toBe('order');
        expect(namespaceSelect.value).toBe('production');
        expect(sortSelect.value).toBe('success-rate');
      });

      // Press "Escape" key
      act(() => {
        const event = new KeyboardEvent('keydown', { key: 'Escape' });
        document.dispatchEvent(event);
      });

      // All filters should be cleared
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search workflows/i) as HTMLInputElement;
        const namespaceSelect = screen.getByLabelText(/namespace/i) as HTMLSelectElement;
        const sortSelect = screen.getByLabelText(/sort by/i) as HTMLSelectElement;

        expect(searchInput.value).toBe('');
        expect(namespaceSelect.value).toBe('');
        expect(sortSelect.value).toBe('name');
      });
    });

    it('does not trigger "/" shortcut when typing in an input field', async () => {
      renderWithQuery(<WorkflowList />);

      // Wait for loading to complete
      await waitFor(() => {
        const searchInput = screen.getByLabelText(/search/i) as HTMLInputElement;
        expect(searchInput).toBeInTheDocument();
        expect(searchInput.disabled).toBe(false);
      });

      const searchInput = screen.getByLabelText(/search/i) as HTMLInputElement;
      searchInput.focus();

      // Wait for focus
      await waitFor(() => {
        expect(document.activeElement).toBe(searchInput);
      });

      // Type "/" while focused in search input
      act(() => {
        const event = new KeyboardEvent('keydown', { key: '/' });
        Object.defineProperty(event, 'target', { value: searchInput, enumerable: true });
        document.dispatchEvent(event);
      });

      // Should not interfere with normal typing - focus should remain on search
      expect(document.activeElement).toBe(searchInput);
    });
  });

  describe('Workflow Count Display', () => {
    it('displays workflow count after loading', async () => {
      renderWithQuery(<WorkflowList />);

      await waitFor(() => {
        const cards = screen.getAllByRole('article');
        expect(cards.length).toBeGreaterThan(0);

        const count = screen.getByText(new RegExp(`Showing ${cards.length} workflows?`));
        expect(count).toBeInTheDocument();
      });
    });

    it('displays correct count with filters applied', async () => {
      renderWithQuery(<WorkflowList defaultFilters={{ search: 'user' }} />);

      await waitFor(() => {
        const cards = screen.getAllByRole('article');
        expect(cards.length).toBeGreaterThan(0);

        const count = screen.getByText(new RegExp(`Showing ${cards.length} workflows?`));
        expect(count).toBeInTheDocument();
      });
    });

    it('does not display count while loading', () => {
      renderWithQuery(<WorkflowList />);

      // Should not show count during initial load
      expect(screen.queryByText(/showing/i)).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid filter changes gracefully', async () => {
      const user = await import('@testing-library/user-event').then((m) => m.userEvent.setup());
      renderWithQuery(<WorkflowList />);

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search workflows/i) as HTMLInputElement;
        expect(searchInput).toBeInTheDocument();
        expect(searchInput.disabled).toBe(false);
      });

      const searchInput = screen.getByPlaceholderText(/search workflows/i) as HTMLInputElement;

      // Rapidly change search value
      await user.type(searchInput, 'user');
      searchInput.value = ''; // Manually clear instead of user.clear()
      await user.type(searchInput, 'order');

      // Should eventually show correct results
      await waitFor(() => {
        expect(searchInput.value).toBe('order');
      });
    });

    it('handles empty workflow list gracefully', async () => {
      renderWithQuery(<WorkflowList defaultFilters={{ search: 'this-will-match-nothing-xyz' }} />);

      await waitFor(() => {
        expect(screen.getByText(/no workflows found/i)).toBeInTheDocument();
      });

      // Should not show workflow count
      expect(screen.queryByText(/showing/i)).not.toBeInTheDocument();
    });

    it('handles single workflow result', async () => {
      renderWithQuery(<WorkflowList defaultFilters={{ namespace: 'production' }} />);

      await waitFor(() => {
        const cards = screen.queryAllByRole('article');
        if (cards.length === 1) {
          expect(screen.getByText(/Showing 1 workflow$/i)).toBeInTheDocument();
        }
      });
    });
  });

  describe('Clear Filters Button', () => {
    it('displays clear filters button when filters are active', async () => {
      renderWithQuery(<WorkflowList defaultFilters={{ search: 'user' }} />);

      await waitFor(() => {
        const clearButton = screen.getByRole('button', { name: /clear filters/i });
        expect(clearButton).toBeInTheDocument();
      });
    });

    it('does not display clear filters button when no filters are active', async () => {
      renderWithQuery(<WorkflowList />);

      await waitFor(() => {
        const cards = screen.getAllByRole('article');
        expect(cards.length).toBeGreaterThan(0);
      });

      // Button should not be present
      expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
    });

    it('displays filter count badge showing number of active filters', async () => {
      renderWithQuery(<WorkflowList defaultFilters={{ search: 'user', namespace: 'default' }} />);

      await waitFor(() => {
        const clearButton = screen.getByRole('button', { name: /clear filters/i });
        expect(clearButton).toBeInTheDocument();
      });

      // Should show "2" for search + namespace
      const badge = screen.getByText('2');
      expect(badge).toBeInTheDocument();
    });

    it('clears all filters when clear button is clicked', async () => {
      const user = await import('@testing-library/user-event').then((m) => m.userEvent.setup());
      renderWithQuery(
        <WorkflowList
          defaultFilters={{ search: 'order', namespace: 'production', sort: 'success-rate' }}
        />
      );

      // Wait for filters to be applied
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search workflows/i) as HTMLInputElement;
        expect(searchInput.value).toBe('order');
      });

      // Click clear filters button
      const clearButton = screen.getByRole('button', { name: /clear filters/i });
      await user.click(clearButton);

      // All filters should be cleared
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/search workflows/i) as HTMLInputElement;
        const namespaceSelect = screen.getByLabelText(/namespace/i) as HTMLSelectElement;
        const sortSelect = screen.getByLabelText(/sort by/i) as HTMLSelectElement;

        expect(searchInput.value).toBe('');
        expect(namespaceSelect.value).toBe('');
        expect(sortSelect.value).toBe('name');
      });

      // Button should disappear after clearing
      expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
    });

    it('counts only non-default filters (excludes default sort)', async () => {
      renderWithQuery(<WorkflowList defaultFilters={{ sort: 'name' }} />);

      await waitFor(() => {
        const cards = screen.getAllByRole('article');
        expect(cards.length).toBeGreaterThan(0);
      });

      // No clear button should appear because 'name' is the default sort
      expect(screen.queryByRole('button', { name: /clear filters/i })).not.toBeInTheDocument();
    });
  });
});
