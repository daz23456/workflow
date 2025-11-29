/**
 * Filter Node Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { FilterNode } from './filter-node';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { FilterOperation } from '@/lib/types/transform-dsl';

describe('FilterNode', () => {
  beforeEach(() => {
    useTransformBuilderStore.getState().reset();
  });

  it('should render filter node', () => {
    const store = useTransformBuilderStore.getState();
    store.addOperation({
      operation: 'filter',
      condition: { field: '$.age', operator: 'gt', value: 18 },
    });
    render(<FilterNode operationIndex={0} />);
    expect(screen.getByText(/filter/i)).toBeInTheDocument();
  });

  it('should update condition field', async () => {
    const user = userEvent.setup();
    const store = useTransformBuilderStore.getState();
    store.addOperation({
      operation: 'filter',
      condition: { field: '$.age', operator: 'eq', value: 25 },
    });
    render(<FilterNode operationIndex={0} />);
    const fieldInput = screen.getByDisplayValue('$.age');
    await user.tripleClick(fieldInput);
    await user.keyboard('$.status');
    const state = useTransformBuilderStore.getState();
    expect((state.pipeline[0] as FilterOperation).condition.field).toBe('$.status');
  });

  it('should update operator', async () => {
    const user = userEvent.setup();
    const store = useTransformBuilderStore.getState();
    store.addOperation({
      operation: 'filter',
      condition: { field: '$.age', operator: 'eq', value: 25 },
    });
    render(<FilterNode operationIndex={0} />);
    const operatorSelect = screen.getByRole('combobox', { name: /operator/i });
    await user.selectOptions(operatorSelect, 'gt');
    const state = useTransformBuilderStore.getState();
    expect((state.pipeline[0] as FilterOperation).condition.operator).toBe('gt');
  });

  it('should update value', async () => {
    const user = userEvent.setup();
    const store = useTransformBuilderStore.getState();
    store.addOperation({
      operation: 'filter',
      condition: { field: '$.age', operator: 'gt', value: 18 },
    });
    render(<FilterNode operationIndex={0} />);
    const valueInput = screen.getByLabelText(/value/i);
    await user.tripleClick(valueInput);
    await user.keyboard('21');
    const state = useTransformBuilderStore.getState();
    expect((state.pipeline[0] as FilterOperation).condition.value).toBe('21');
  });

  it('should handle non-existent operation', () => {
    render(<FilterNode operationIndex={999} />);
    expect(screen.getByText(/operation not found/i)).toBeInTheDocument();
  });
});
