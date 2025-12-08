import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { LabelFilter } from './label-filter';

describe('LabelFilter', () => {
  const defaultProps = {
    availableTags: ['orders', 'payments', 'users', 'notifications'],
    availableCategories: ['commerce', 'auth', 'messaging'],
    selectedTags: [],
    selectedCategories: [],
    onTagsChange: vi.fn(),
    onCategoriesChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders filter section', () => {
      render(<LabelFilter {...defaultProps} />);
      expect(screen.getByText('Labels')).toBeInTheDocument();
    });

    it('renders available tags', () => {
      render(<LabelFilter {...defaultProps} />);
      expect(screen.getByText('orders')).toBeInTheDocument();
      expect(screen.getByText('payments')).toBeInTheDocument();
    });

    it('renders available categories', () => {
      render(<LabelFilter {...defaultProps} />);
      expect(screen.getByText('commerce')).toBeInTheDocument();
      expect(screen.getByText('auth')).toBeInTheDocument();
    });

    it('renders tags section header', () => {
      render(<LabelFilter {...defaultProps} />);
      expect(screen.getByText('Tags')).toBeInTheDocument();
    });

    it('renders categories section header', () => {
      render(<LabelFilter {...defaultProps} />);
      expect(screen.getByText('Categories')).toBeInTheDocument();
    });
  });

  describe('tag selection', () => {
    it('calls onTagsChange when tag is clicked', async () => {
      const user = userEvent.setup();
      const onTagsChange = vi.fn();
      render(<LabelFilter {...defaultProps} onTagsChange={onTagsChange} />);

      await user.click(screen.getByText('orders'));
      expect(onTagsChange).toHaveBeenCalledWith(['orders']);
    });

    it('adds tag to existing selection', async () => {
      const user = userEvent.setup();
      const onTagsChange = vi.fn();
      render(
        <LabelFilter
          {...defaultProps}
          selectedTags={['orders']}
          onTagsChange={onTagsChange}
        />
      );

      await user.click(screen.getByText('payments'));
      expect(onTagsChange).toHaveBeenCalledWith(['orders', 'payments']);
    });

    it('removes tag when already selected', async () => {
      const user = userEvent.setup();
      const onTagsChange = vi.fn();
      render(
        <LabelFilter
          {...defaultProps}
          selectedTags={['orders', 'payments']}
          onTagsChange={onTagsChange}
        />
      );

      await user.click(screen.getByText('orders'));
      expect(onTagsChange).toHaveBeenCalledWith(['payments']);
    });

    it('shows selected tags with visual indicator', () => {
      const { container } = render(
        <LabelFilter
          {...defaultProps}
          selectedTags={['orders']}
        />
      );

      // Selected tag should have ring/outline
      const selectedTag = container.querySelector('[data-selected="true"]');
      expect(selectedTag).toBeInTheDocument();
    });
  });

  describe('category selection', () => {
    it('calls onCategoriesChange when category is clicked', async () => {
      const user = userEvent.setup();
      const onCategoriesChange = vi.fn();
      render(<LabelFilter {...defaultProps} onCategoriesChange={onCategoriesChange} />);

      await user.click(screen.getByText('commerce'));
      expect(onCategoriesChange).toHaveBeenCalledWith(['commerce']);
    });

    it('adds category to existing selection', async () => {
      const user = userEvent.setup();
      const onCategoriesChange = vi.fn();
      render(
        <LabelFilter
          {...defaultProps}
          selectedCategories={['commerce']}
          onCategoriesChange={onCategoriesChange}
        />
      );

      await user.click(screen.getByText('auth'));
      expect(onCategoriesChange).toHaveBeenCalledWith(['commerce', 'auth']);
    });

    it('removes category when already selected', async () => {
      const user = userEvent.setup();
      const onCategoriesChange = vi.fn();
      render(
        <LabelFilter
          {...defaultProps}
          selectedCategories={['commerce', 'auth']}
          onCategoriesChange={onCategoriesChange}
        />
      );

      await user.click(screen.getByText('commerce'));
      expect(onCategoriesChange).toHaveBeenCalledWith(['auth']);
    });
  });

  describe('clear filters', () => {
    it('shows clear button when filters are selected', () => {
      render(
        <LabelFilter
          {...defaultProps}
          selectedTags={['orders']}
        />
      );

      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
    });

    it('hides clear button when no filters selected', () => {
      render(<LabelFilter {...defaultProps} />);

      expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
    });

    it('clears all filters when clear button clicked', async () => {
      const user = userEvent.setup();
      const onTagsChange = vi.fn();
      const onCategoriesChange = vi.fn();

      render(
        <LabelFilter
          {...defaultProps}
          selectedTags={['orders']}
          selectedCategories={['commerce']}
          onTagsChange={onTagsChange}
          onCategoriesChange={onCategoriesChange}
        />
      );

      await user.click(screen.getByRole('button', { name: /clear/i }));
      expect(onTagsChange).toHaveBeenCalledWith([]);
      expect(onCategoriesChange).toHaveBeenCalledWith([]);
    });
  });

  describe('collapsible', () => {
    it('can be collapsed', async () => {
      const user = userEvent.setup();
      const { container } = render(<LabelFilter {...defaultProps} collapsible />);

      // Click to collapse
      await user.click(screen.getByRole('button', { name: /labels/i }));

      // Content section should have hidden class
      const contentSection = container.querySelector('.hidden');
      expect(contentSection).toBeInTheDocument();
    });

    it('shows filter count when collapsed and filters active', async () => {
      const user = userEvent.setup();
      render(
        <LabelFilter
          {...defaultProps}
          selectedTags={['orders', 'payments']}
          collapsible
          defaultCollapsed
        />
      );

      // Should show count badge
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('empty states', () => {
    it('shows message when no tags available', () => {
      render(
        <LabelFilter
          {...defaultProps}
          availableTags={[]}
        />
      );

      expect(screen.getByText(/no tags/i)).toBeInTheDocument();
    });

    it('shows message when no categories available', () => {
      render(
        <LabelFilter
          {...defaultProps}
          availableCategories={[]}
        />
      );

      expect(screen.getByText(/no categories/i)).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('shows loading skeleton when loading', () => {
      const { container } = render(<LabelFilter {...defaultProps} isLoading />);

      expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    });
  });
});
