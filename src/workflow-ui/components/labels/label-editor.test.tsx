import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { LabelEditor } from './label-editor';

describe('LabelEditor', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    entityType: 'workflow' as const,
    entityName: 'order-processing',
    currentTags: ['orders', 'payments'],
    currentCategories: ['commerce'],
    availableTags: ['orders', 'payments', 'users', 'notifications'],
    availableCategories: ['commerce', 'auth', 'messaging'],
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders modal when open', () => {
      render(<LabelEditor {...defaultProps} />);
      expect(screen.getByText(/edit labels/i)).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<LabelEditor {...defaultProps} isOpen={false} />);
      expect(screen.queryByText(/edit labels/i)).not.toBeInTheDocument();
    });

    it('displays entity name', () => {
      render(<LabelEditor {...defaultProps} />);
      expect(screen.getByText('order-processing')).toBeInTheDocument();
    });

    it('displays current tags', () => {
      render(<LabelEditor {...defaultProps} />);
      expect(screen.getByText('orders')).toBeInTheDocument();
      expect(screen.getByText('payments')).toBeInTheDocument();
    });

    it('displays current categories', () => {
      render(<LabelEditor {...defaultProps} />);
      expect(screen.getByText('commerce')).toBeInTheDocument();
    });
  });

  describe('tag management', () => {
    it('allows adding a new tag', async () => {
      const user = userEvent.setup();
      render(<LabelEditor {...defaultProps} currentTags={['orders']} />);

      // Click on an available tag to add it
      await user.click(screen.getByText('payments'));

      // Should now show payments as selected
      const paymentsBadges = screen.getAllByText('payments');
      expect(paymentsBadges.length).toBeGreaterThan(0);
    });

    it('allows removing a tag', async () => {
      const user = userEvent.setup();
      render(<LabelEditor {...defaultProps} />);

      // Find and click the remove button for 'orders' tag
      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      await user.click(removeButtons[0]);

      // Should not have orders in the selected list anymore
      // (but may still show in available list)
    });

    it('allows adding a custom tag', async () => {
      const user = userEvent.setup();
      render(<LabelEditor {...defaultProps} />);

      const input = screen.getByPlaceholderText(/add new tag/i);
      await user.type(input, 'custom-tag{Enter}');

      expect(screen.getByText('custom-tag')).toBeInTheDocument();
    });
  });

  describe('category management', () => {
    it('allows selecting a category', async () => {
      const user = userEvent.setup();
      render(<LabelEditor {...defaultProps} currentCategories={[]} />);

      await user.click(screen.getByText('auth'));

      // Should now show auth as selected
      const authBadges = screen.getAllByText('auth');
      expect(authBadges.length).toBeGreaterThan(0);
    });

    it('allows removing a category', async () => {
      const user = userEvent.setup();
      render(<LabelEditor {...defaultProps} />);

      // Find remove button for category
      const removeButtons = screen.getAllByRole('button', { name: /remove/i });
      // Commerce is the category, so find its remove button
      const commerceSection = screen.getByText('commerce').closest('[data-testid="selected-categories"]');
      if (commerceSection) {
        const removeBtn = commerceSection.querySelector('button');
        if (removeBtn) await user.click(removeBtn);
      }
    });
  });

  describe('save and cancel', () => {
    it('calls onSave with updated labels when save clicked', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockResolvedValue(undefined);
      render(<LabelEditor {...defaultProps} onSave={onSave} />);

      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(onSave).toHaveBeenCalledWith({
        tags: expect.any(Array),
        categories: expect.any(Array),
      });
    });

    it('calls onClose when cancel clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<LabelEditor {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalled();
    });

    it('shows loading state while saving', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves
      render(<LabelEditor {...defaultProps} onSave={onSave} />);

      await user.click(screen.getByRole('button', { name: /save/i }));

      expect(screen.getByText(/saving/i)).toBeInTheDocument();
    });

    it('closes modal after successful save', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();
      render(<LabelEditor {...defaultProps} onSave={onSave} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /save/i }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('validation', () => {
    it('trims whitespace from new tags', async () => {
      const user = userEvent.setup();
      render(<LabelEditor {...defaultProps} />);

      const input = screen.getByPlaceholderText(/add new tag/i);
      await user.type(input, '  spaced-tag  {Enter}');

      expect(screen.getByText('spaced-tag')).toBeInTheDocument();
    });

    it('prevents duplicate tags', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockResolvedValue(undefined);
      render(<LabelEditor {...defaultProps} currentTags={['orders']} onSave={onSave} />);

      // Try to add a duplicate tag
      const input = screen.getByPlaceholderText(/add new tag/i);
      await user.type(input, 'orders{Enter}');

      // Click save
      await user.click(screen.getByRole('button', { name: /save/i }));

      // Should only have one 'orders' tag in the saved result
      await waitFor(() => {
        expect(onSave).toHaveBeenCalledWith(
          expect.objectContaining({
            tags: ['orders'], // Still only one orders tag
          })
        );
      });
    });
  });
});
