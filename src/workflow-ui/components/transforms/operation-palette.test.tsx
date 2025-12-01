/**
 * Operation Palette Tests
 *
 * TDD tests for the drag-and-drop operation palette component.
 * Tests rendering, categories, drag events, and accessibility.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { OperationPalette } from './operation-palette';

// Mock the transform builder store
const mockAddOperation = vi.fn();
vi.mock('@/lib/stores/transform-builder-store', () => ({
  useTransformBuilderStore: (selector: (state: any) => any) => {
    const state = {
      addOperation: mockAddOperation,
    };
    return selector ? selector(state) : state;
  },
}));

describe('OperationPalette', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the palette container', () => {
      render(<OperationPalette />);
      expect(screen.getByTestId('operation-palette')).toBeInTheDocument();
    });

    it('should render all 11 core operations', () => {
      render(<OperationPalette />);

      // Data Extraction
      expect(screen.getByText('Select')).toBeInTheDocument();
      expect(screen.getByText('Map')).toBeInTheDocument();
      expect(screen.getByText('Enrich')).toBeInTheDocument();

      // Filtering
      expect(screen.getByText('Filter')).toBeInTheDocument();
      expect(screen.getByText('Limit')).toBeInTheDocument();
      expect(screen.getByText('Skip')).toBeInTheDocument();

      // Aggregation
      expect(screen.getByText('Group By')).toBeInTheDocument();
      expect(screen.getByText('Aggregate')).toBeInTheDocument();

      // Transformation
      expect(screen.getByText('Flatten')).toBeInTheDocument();
      expect(screen.getByText('Sort')).toBeInTheDocument();
      expect(screen.getByText('Join')).toBeInTheDocument();
    });

    it('should render category headers', () => {
      render(<OperationPalette />);

      expect(screen.getByText('Data Extraction')).toBeInTheDocument();
      expect(screen.getByText('Filtering')).toBeInTheDocument();
      expect(screen.getByText('Aggregation')).toBeInTheDocument();
      expect(screen.getByText('Transformation')).toBeInTheDocument();
    });

    it('should render operation descriptions', () => {
      render(<OperationPalette />);

      expect(screen.getByText(/extract specific fields/i)).toBeInTheDocument();
      expect(screen.getByText(/keep matching records/i)).toBeInTheDocument();
    });
  });

  describe('Drag and Drop', () => {
    it('should have draggable operation cards', () => {
      render(<OperationPalette />);

      const selectCard = screen.getByTestId('operation-card-select');
      expect(selectCard).toHaveAttribute('draggable', 'true');
    });

    it('should set correct drag data on drag start', () => {
      render(<OperationPalette />);

      const selectCard = screen.getByTestId('operation-card-select');
      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: '',
      };

      fireEvent.dragStart(selectCard, { dataTransfer });

      expect(dataTransfer.setData).toHaveBeenCalledWith(
        'application/reactflow',
        expect.stringContaining('"operationType":"select"')
      );
      expect(dataTransfer.effectAllowed).toBe('move');
    });

    it('should set drag data for filter operation', () => {
      render(<OperationPalette />);

      const filterCard = screen.getByTestId('operation-card-filter');
      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: '',
      };

      fireEvent.dragStart(filterCard, { dataTransfer });

      expect(dataTransfer.setData).toHaveBeenCalledWith(
        'application/reactflow',
        expect.stringContaining('"operationType":"filter"')
      );
    });

    it('should add visual feedback during drag', () => {
      render(<OperationPalette />);

      const selectCard = screen.getByTestId('operation-card-select');
      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: '',
      };

      fireEvent.dragStart(selectCard, { dataTransfer });

      expect(selectCard).toHaveAttribute('data-dragging', 'true');
    });

    it('should remove visual feedback on drag end', () => {
      render(<OperationPalette />);

      const selectCard = screen.getByTestId('operation-card-select');
      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: '',
      };

      fireEvent.dragStart(selectCard, { dataTransfer });
      expect(selectCard).toHaveAttribute('data-dragging', 'true');

      fireEvent.dragEnd(selectCard);
      expect(selectCard).toHaveAttribute('data-dragging', 'false');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible aria-label on palette', () => {
      render(<OperationPalette />);

      expect(screen.getByLabelText('Operation palette')).toBeInTheDocument();
    });

    it('should have accessible labels on operation cards', () => {
      render(<OperationPalette />);

      expect(screen.getByLabelText(/drag select operation/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/drag filter operation/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation with Tab', async () => {
      const user = userEvent.setup();
      render(<OperationPalette />);

      const selectCard = screen.getByTestId('operation-card-select');

      // Tab to first operation
      await user.tab();
      await user.tab(); // Skip search if present

      // One of the cards should be focusable
      const focusedElement = document.activeElement;
      expect(focusedElement?.getAttribute('draggable')).toBe('true');
    });
  });

  describe('Search', () => {
    it('should render search input', () => {
      render(<OperationPalette />);

      expect(screen.getByPlaceholderText(/search operations/i)).toBeInTheDocument();
    });

    it('should filter operations by search query', async () => {
      const user = userEvent.setup();
      render(<OperationPalette />);

      const searchInput = screen.getByPlaceholderText(/search operations/i);
      await user.type(searchInput, 'filter');

      // Filter should be visible
      expect(screen.getByText('Filter')).toBeInTheDocument();

      // Select should be hidden (doesn't match "filter")
      expect(screen.queryByTestId('operation-card-select')).not.toBeInTheDocument();
    });

    it('should show no results message when search has no matches', async () => {
      const user = userEvent.setup();
      render(<OperationPalette />);

      const searchInput = screen.getByPlaceholderText(/search operations/i);
      await user.type(searchInput, 'xyz123nonexistent');

      expect(screen.getByText(/no operations found/i)).toBeInTheDocument();
    });

    it('should clear search when clear button clicked', async () => {
      const user = userEvent.setup();
      render(<OperationPalette />);

      const searchInput = screen.getByPlaceholderText(/search operations/i);
      await user.type(searchInput, 'filter');

      const clearButton = screen.getByLabelText(/clear search/i);
      await user.click(clearButton);

      expect(searchInput).toHaveValue('');
      // All operations should be visible again
      expect(screen.getByTestId('operation-card-select')).toBeInTheDocument();
    });
  });
});
