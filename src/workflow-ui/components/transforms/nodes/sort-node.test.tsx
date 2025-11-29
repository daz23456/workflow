/**
 * Sort Node Tests
 *
 * Tests for sort operation node component.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { SortNode } from './sort-node';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { SortByOperation } from '@/lib/types/transform-dsl';

describe('SortNode', () => {
  beforeEach(() => {
    useTransformBuilderStore.getState().reset();
  });

  it('should render sort node with current values', () => {
    const store = useTransformBuilderStore.getState();

    const operation: SortByOperation = {
      operation: 'sortBy',
      field: '$.createdAt',
      order: 'desc',
    };

    store.addOperation(operation);

    render(<SortNode operationIndex={0} />);

    const fieldInput = screen.getByDisplayValue('$.createdAt');
    expect(fieldInput).toBeInTheDocument();

    const directionSelect = screen.getByRole('combobox', { name: /order/i });
    expect(directionSelect).toHaveValue('desc');
  });

  it('should update sort field', async () => {
    const user = userEvent.setup();
    const store = useTransformBuilderStore.getState();

    store.addOperation({
      operation: 'sortBy',
      field: '$.name',
      order: 'asc',
    });

    render(<SortNode operationIndex={0} />);

    const fieldInput = screen.getByDisplayValue('$.name');
    await user.tripleClick(fieldInput);
    await user.keyboard('$.age');

    const state = useTransformBuilderStore.getState();
    expect((state.pipeline[0] as SortByOperation).field).toBe('$.age');
  });

  it('should update sort direction', async () => {
    const user = userEvent.setup();
    const store = useTransformBuilderStore.getState();

    store.addOperation({
      operation: 'sortBy',
      field: '$.name',
      order: 'asc',
    });

    render(<SortNode operationIndex={0} />);

    const directionSelect = screen.getByRole('combobox', { name: /order/i });
    await user.selectOptions(directionSelect, 'desc');

    const state = useTransformBuilderStore.getState();
    expect((state.pipeline[0] as SortByOperation).order).toBe('desc');
  });

  it('should show operation description', () => {
    const store = useTransformBuilderStore.getState();

    store.addOperation({
      operation: 'sortBy',
      field: '$.name',
      order: 'asc',
    });

    render(<SortNode operationIndex={0} />);

    expect(screen.getByText(/sort records by a field/i)).toBeInTheDocument();
  });

  it('should handle non-existent operation index gracefully', () => {
    render(<SortNode operationIndex={999} />);

    expect(screen.getByText(/operation not found/i)).toBeInTheDocument();
  });
});
