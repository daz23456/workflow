/**
 * Aggregate Node Tests
 *
 * Tests for aggregate operation node component.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { AggregateNode } from './aggregate-node';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { AggregateOperation } from '@/lib/types/transform-dsl';

describe('AggregateNode', () => {
  beforeEach(() => {
    useTransformBuilderStore.getState().reset();
  });

  it('should render aggregate node with current values', () => {
    const store = useTransformBuilderStore.getState();

    const operation: AggregateOperation = {
      operation: 'aggregate',
      aggregations: {
        totalAmount: { function: 'sum', field: '$.amount' },
        count: { function: 'count', field: '$.id' },
      },
    };

    store.addOperation(operation);

    render(<AggregateNode operationIndex={0} />);

    const functionSelects = screen.getAllByRole('combobox', { name: /function/i });
    expect(functionSelects[0]).toHaveValue('sum');
    expect(screen.getByDisplayValue('$.amount')).toBeInTheDocument();
  });

  it('should add new aggregation', async () => {
    const user = userEvent.setup();
    const store = useTransformBuilderStore.getState();

    store.addOperation({
      operation: 'aggregate',
      aggregations: { totalAmount: { function: 'sum', field: '$.amount' } },
    });

    render(<AggregateNode operationIndex={0} />);

    const addButton = screen.getByRole('button', { name: /add aggregation/i });
    await user.click(addButton);

    const state = useTransformBuilderStore.getState();
    expect(Object.keys((state.pipeline[0] as AggregateOperation).aggregations)).toHaveLength(2);
  });

  it('should remove aggregation', async () => {
    const user = userEvent.setup();
    const store = useTransformBuilderStore.getState();

    store.addOperation({
      operation: 'aggregate',
      aggregations: {
        sum1: { function: 'sum', field: '$.value' },
        count1: { function: 'count', field: '$.id' },
      },
    });

    render(<AggregateNode operationIndex={0} />);

    const removeButtons = screen.getAllByRole('button', { name: /remove aggregation/i });
    await user.click(removeButtons[0]);

    const state = useTransformBuilderStore.getState();
    expect(Object.keys((state.pipeline[0] as AggregateOperation).aggregations)).toHaveLength(1);
  });

  it('should update aggregation function', async () => {
    const user = userEvent.setup();
    const store = useTransformBuilderStore.getState();

    store.addOperation({
      operation: 'aggregate',
      aggregations: { sum1: { function: 'sum', field: '$.amount' } },
    });

    render(<AggregateNode operationIndex={0} />);

    const functionSelect = screen.getByRole('combobox', { name: /function/i });
    await user.selectOptions(functionSelect, 'avg');

    const state = useTransformBuilderStore.getState();
    const aggs = (state.pipeline[0] as AggregateOperation).aggregations;
    expect(Object.values(aggs)[0].function).toBe('avg');
  });

  it('should update field input', async () => {
    const user = userEvent.setup();
    const store = useTransformBuilderStore.getState();

    store.addOperation({
      operation: 'aggregate',
      aggregations: { sum1: { function: 'sum', field: '$.amount' } },
    });

    render(<AggregateNode operationIndex={0} />);

    const fieldInput = screen.getByDisplayValue('$.amount');
    await user.clear(fieldInput);
    await user.type(fieldInput, '$.price');

    const state = useTransformBuilderStore.getState();
    const aggs = (state.pipeline[0] as AggregateOperation).aggregations;
    expect(Object.values(aggs)[0].field).toBe('$.price');
  });

  it('should handle non-existent operation', () => {
    render(<AggregateNode operationIndex={0} />);
    expect(screen.getByText(/operation not found/i)).toBeInTheDocument();
  });
});
