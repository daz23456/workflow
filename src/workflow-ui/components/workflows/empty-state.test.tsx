import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { EmptyState } from './empty-state';

describe('EmptyState', () => {
  describe('Rendering', () => {
    it('renders title', () => {
      render(<EmptyState title="No workflows found" description="Test description" />);
      expect(screen.getByText('No workflows found')).toBeInTheDocument();
    });

    it('renders description', () => {
      render(<EmptyState title="Test title" description="Test description" />);
      expect(screen.getByText('Test description')).toBeInTheDocument();
    });

    it('renders icon', () => {
      const { container } = render(<EmptyState title="Test" description="Test" />);
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Action Button', () => {
    it('renders action button when actionLabel is provided', () => {
      render(
        <EmptyState
          title="Test"
          description="Test"
          actionLabel="Create Workflow"
          onAction={vi.fn()}
        />
      );
      expect(screen.getByRole('button', { name: 'Create Workflow' })).toBeInTheDocument();
    });

    it('does not render action button when actionLabel is not provided', () => {
      render(<EmptyState title="Test" description="Test" />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('calls onAction when button is clicked', async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();

      render(
        <EmptyState
          title="Test"
          description="Test"
          actionLabel="Create Workflow"
          onAction={onAction}
        />
      );

      await user.click(screen.getByRole('button'));
      expect(onAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Layout', () => {
    it('has centered text alignment', () => {
      const { container } = render(<EmptyState title="Test" description="Test" />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('text-center');
    });

    it('has proper spacing and padding', () => {
      const { container } = render(<EmptyState title="Test" description="Test" />);
      const wrapper = container.firstChild;
      expect(wrapper).toHaveClass('p-12');
    });
  });

  describe('Accessibility', () => {
    it('button is keyboard accessible', async () => {
      const user = userEvent.setup();
      const onAction = vi.fn();

      render(
        <EmptyState
          title="Test"
          description="Test"
          actionLabel="Create Workflow"
          onAction={onAction}
        />
      );

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');

      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('has proper heading hierarchy', () => {
      render(<EmptyState title="No workflows" description="Description" />);
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('No workflows');
    });
  });
});
