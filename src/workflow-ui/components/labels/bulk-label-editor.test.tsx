import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { BulkLabelEditor } from './bulk-label-editor';

describe('BulkLabelEditor', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    entityType: 'workflow' as const,
    selectedEntities: [
      { name: 'order-processing', tags: ['orders'], categories: ['commerce'] },
      { name: 'payment-flow', tags: ['payments'], categories: ['commerce'] },
    ],
    availableTags: ['orders', 'payments', 'users', 'notifications'],
    availableCategories: ['commerce', 'auth', 'messaging'],
    onSave: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders popover when open', () => {
      render(<BulkLabelEditor {...defaultProps} />);
      expect(screen.getByText(/bulk edit labels/i)).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<BulkLabelEditor {...defaultProps} isOpen={false} />);
      expect(screen.queryByText(/bulk edit labels/i)).not.toBeInTheDocument();
    });

    it('displays count of selected entities', () => {
      render(<BulkLabelEditor {...defaultProps} />);
      expect(screen.getByText(/2 workflows selected/i)).toBeInTheDocument();
    });

    it('displays entity type correctly for tasks', () => {
      render(<BulkLabelEditor {...defaultProps} entityType="task" />);
      expect(screen.getByText(/2 tasks selected/i)).toBeInTheDocument();
    });

    it('shows add tags section', () => {
      render(<BulkLabelEditor {...defaultProps} />);
      expect(screen.getByText(/add tags/i)).toBeInTheDocument();
    });

    it('shows remove tags section', () => {
      render(<BulkLabelEditor {...defaultProps} />);
      expect(screen.getByText(/remove tags/i)).toBeInTheDocument();
    });

    it('shows categories section', () => {
      render(<BulkLabelEditor {...defaultProps} />);
      expect(screen.getByTestId('categories-section')).toBeInTheDocument();
    });
  });

  describe('tag operations', () => {
    it('allows selecting tags to add', async () => {
      const user = userEvent.setup();
      render(<BulkLabelEditor {...defaultProps} />);

      // Find and click a tag in the add section
      const addSection = screen.getByTestId('add-tags-section');
      const usersTag = addSection.querySelector('[data-tag="users"]');
      if (usersTag) await user.click(usersTag);

      // Should be visually selected
      expect(usersTag).toHaveAttribute('data-selected', 'true');
    });

    it('allows selecting tags to remove', async () => {
      const user = userEvent.setup();
      render(<BulkLabelEditor {...defaultProps} />);

      // Find and click a tag in the remove section
      const removeSection = screen.getByTestId('remove-tags-section');
      const ordersTag = removeSection.querySelector('[data-tag="orders"]');
      if (ordersTag) await user.click(ordersTag);

      expect(ordersTag).toHaveAttribute('data-selected', 'true');
    });

    it('shows common tags that exist on selected entities in remove section', () => {
      render(<BulkLabelEditor {...defaultProps} />);

      const removeSection = screen.getByTestId('remove-tags-section');
      // Both entities have these tags, so they should be available to remove
      expect(removeSection.querySelector('[data-tag="orders"]')).toBeInTheDocument();
      expect(removeSection.querySelector('[data-tag="payments"]')).toBeInTheDocument();
    });
  });

  describe('category operations', () => {
    it('allows selecting a category to set', async () => {
      const user = userEvent.setup();
      render(<BulkLabelEditor {...defaultProps} />);

      const categorySection = screen.getByTestId('categories-section');
      const authCategory = categorySection.querySelector('[data-category="auth"]');
      if (authCategory) await user.click(authCategory);

      expect(authCategory).toHaveAttribute('data-selected', 'true');
    });

    it('shows option to clear categories', () => {
      render(<BulkLabelEditor {...defaultProps} />);
      expect(screen.getByRole('button', { name: /clear categories/i })).toBeInTheDocument();
    });
  });

  describe('save and cancel', () => {
    it('calls onSave with changes when apply clicked', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockResolvedValue(undefined);
      render(<BulkLabelEditor {...defaultProps} onSave={onSave} />);

      // Select a tag to add
      const addSection = screen.getByTestId('add-tags-section');
      const usersTag = addSection.querySelector('[data-tag="users"]');
      if (usersTag) await user.click(usersTag);

      // Click apply
      await user.click(screen.getByRole('button', { name: /apply/i }));

      expect(onSave).toHaveBeenCalledWith({
        addTags: ['users'],
        removeTags: [],
        setCategories: null,
        clearCategories: false,
      });
    });

    it('calls onClose when cancel clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<BulkLabelEditor {...defaultProps} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(onClose).toHaveBeenCalled();
    });

    it('shows loading state while saving', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockImplementation(() => new Promise(() => {}));
      render(<BulkLabelEditor {...defaultProps} onSave={onSave} />);

      // Select something to enable apply
      const addSection = screen.getByTestId('add-tags-section');
      const usersTag = addSection.querySelector('[data-tag="users"]');
      if (usersTag) await user.click(usersTag);

      await user.click(screen.getByRole('button', { name: /apply/i }));

      expect(screen.getByText(/applying/i)).toBeInTheDocument();
    });

    it('closes after successful save', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockResolvedValue(undefined);
      const onClose = vi.fn();
      render(<BulkLabelEditor {...defaultProps} onSave={onSave} onClose={onClose} />);

      // Select a tag to add
      const addSection = screen.getByTestId('add-tags-section');
      const usersTag = addSection.querySelector('[data-tag="users"]');
      if (usersTag) await user.click(usersTag);

      await user.click(screen.getByRole('button', { name: /apply/i }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('disables apply when no changes made', () => {
      render(<BulkLabelEditor {...defaultProps} />);
      expect(screen.getByRole('button', { name: /apply/i })).toBeDisabled();
    });
  });

  describe('combined operations', () => {
    it('supports adding and removing tags simultaneously', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockResolvedValue(undefined);
      render(<BulkLabelEditor {...defaultProps} onSave={onSave} />);

      // Add a tag
      const addSection = screen.getByTestId('add-tags-section');
      const usersTag = addSection.querySelector('[data-tag="users"]');
      if (usersTag) await user.click(usersTag);

      // Remove a tag
      const removeSection = screen.getByTestId('remove-tags-section');
      const ordersTag = removeSection.querySelector('[data-tag="orders"]');
      if (ordersTag) await user.click(ordersTag);

      await user.click(screen.getByRole('button', { name: /apply/i }));

      expect(onSave).toHaveBeenCalledWith({
        addTags: ['users'],
        removeTags: ['orders'],
        setCategories: null,
        clearCategories: false,
      });
    });

    it('supports setting category while modifying tags', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockResolvedValue(undefined);
      render(<BulkLabelEditor {...defaultProps} onSave={onSave} />);

      // Add a tag
      const addSection = screen.getByTestId('add-tags-section');
      const usersTag = addSection.querySelector('[data-tag="users"]');
      if (usersTag) await user.click(usersTag);

      // Set category
      const categorySection = screen.getByTestId('categories-section');
      const authCategory = categorySection.querySelector('[data-category="auth"]');
      if (authCategory) await user.click(authCategory);

      await user.click(screen.getByRole('button', { name: /apply/i }));

      expect(onSave).toHaveBeenCalledWith({
        addTags: ['users'],
        removeTags: [],
        setCategories: ['auth'],
        clearCategories: false,
      });
    });

    it('handles clear categories option', async () => {
      const user = userEvent.setup();
      const onSave = vi.fn().mockResolvedValue(undefined);
      render(<BulkLabelEditor {...defaultProps} onSave={onSave} />);

      await user.click(screen.getByRole('button', { name: /clear categories/i }));
      await user.click(screen.getByRole('button', { name: /apply/i }));

      expect(onSave).toHaveBeenCalledWith({
        addTags: [],
        removeTags: [],
        setCategories: null,
        clearCategories: true,
      });
    });
  });

  describe('validation', () => {
    it('prevents adding same tag that is being removed', async () => {
      const user = userEvent.setup();
      render(<BulkLabelEditor {...defaultProps} />);

      // First remove orders tag
      const removeSection = screen.getByTestId('remove-tags-section');
      const ordersTagRemove = removeSection.querySelector('[data-tag="orders"]');
      if (ordersTagRemove) await user.click(ordersTagRemove);

      // Orders should not be selectable in add section now
      const addSection = screen.getByTestId('add-tags-section');
      const ordersTagAdd = addSection.querySelector('[data-tag="orders"]');
      expect(ordersTagAdd).toHaveAttribute('data-disabled', 'true');
    });
  });
});
