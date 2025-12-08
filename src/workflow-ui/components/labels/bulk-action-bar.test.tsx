import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { BulkActionBar } from './bulk-action-bar';

describe('BulkActionBar', () => {
  const defaultProps = {
    selectedCount: 3,
    entityType: 'workflow' as const,
    onClearSelection: vi.fn(),
    onEditLabels: vi.fn(),
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders when items are selected', () => {
      render(<BulkActionBar {...defaultProps} />);
      expect(screen.getByText(/3 workflows selected/i)).toBeInTheDocument();
    });

    it('does not render when no items selected', () => {
      render(<BulkActionBar {...defaultProps} selectedCount={0} />);
      expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
    });

    it('displays correct count for single item', () => {
      render(<BulkActionBar {...defaultProps} selectedCount={1} />);
      expect(screen.getByText(/1 workflow selected/i)).toBeInTheDocument();
    });

    it('displays correct label for tasks', () => {
      render(<BulkActionBar {...defaultProps} entityType="task" />);
      expect(screen.getByText(/3 tasks selected/i)).toBeInTheDocument();
    });

    it('displays correct label for single task', () => {
      render(<BulkActionBar {...defaultProps} entityType="task" selectedCount={1} />);
      expect(screen.getByText(/1 task selected/i)).toBeInTheDocument();
    });

    it('shows edit labels button', () => {
      render(<BulkActionBar {...defaultProps} />);
      expect(screen.getByRole('button', { name: /edit labels/i })).toBeInTheDocument();
    });

    it('shows clear selection button', () => {
      render(<BulkActionBar {...defaultProps} />);
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();
    });

    it('shows delete button when onDelete provided', () => {
      render(<BulkActionBar {...defaultProps} />);
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    it('hides delete button when onDelete not provided', () => {
      render(<BulkActionBar {...defaultProps} onDelete={undefined} />);
      expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('calls onClearSelection when clear clicked', async () => {
      const user = userEvent.setup();
      const onClearSelection = vi.fn();
      render(<BulkActionBar {...defaultProps} onClearSelection={onClearSelection} />);

      await user.click(screen.getByRole('button', { name: /clear/i }));

      expect(onClearSelection).toHaveBeenCalled();
    });

    it('calls onEditLabels when edit labels clicked', async () => {
      const user = userEvent.setup();
      const onEditLabels = vi.fn();
      render(<BulkActionBar {...defaultProps} onEditLabels={onEditLabels} />);

      await user.click(screen.getByRole('button', { name: /edit labels/i }));

      expect(onEditLabels).toHaveBeenCalled();
    });

    it('calls onDelete when delete clicked', async () => {
      const user = userEvent.setup();
      const onDelete = vi.fn();
      render(<BulkActionBar {...defaultProps} onDelete={onDelete} />);

      await user.click(screen.getByRole('button', { name: /delete/i }));

      expect(onDelete).toHaveBeenCalled();
    });
  });

  describe('positioning', () => {
    it('has fixed positioning for floating effect', () => {
      const { container } = render(<BulkActionBar {...defaultProps} />);
      const bar = container.firstChild as HTMLElement;
      expect(bar).toHaveClass('fixed');
    });

    it('is positioned at bottom of screen', () => {
      const { container } = render(<BulkActionBar {...defaultProps} />);
      const bar = container.firstChild as HTMLElement;
      expect(bar).toHaveClass('bottom-4');
    });
  });

  describe('loading states', () => {
    it('shows loading state when isLoading is true', () => {
      render(<BulkActionBar {...defaultProps} isLoading={true} />);
      // Buttons should be disabled
      expect(screen.getByRole('button', { name: /edit labels/i })).toBeDisabled();
    });

    it('disables all action buttons when loading', () => {
      render(<BulkActionBar {...defaultProps} isLoading={true} />);
      expect(screen.getByRole('button', { name: /edit labels/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled();
    });

    it('allows clear selection even when loading', () => {
      render(<BulkActionBar {...defaultProps} isLoading={true} />);
      expect(screen.getByRole('button', { name: /clear/i })).not.toBeDisabled();
    });
  });

  describe('animations', () => {
    it('applies entrance animation class', () => {
      const { container } = render(<BulkActionBar {...defaultProps} />);
      const bar = container.firstChild as HTMLElement;
      expect(bar).toHaveClass('animate-slide-up');
    });
  });
});
