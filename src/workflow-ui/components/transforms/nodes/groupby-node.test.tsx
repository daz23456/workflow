/**
 * GroupBy Node Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { GroupByNode } from './groupby-node';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { GroupByOperation } from '@/lib/types/transform-dsl';

describe('GroupByNode', () => {
  beforeEach(() => {
    useTransformBuilderStore.getState().reset();
  });

  it('should render groupby node', () => {
    const store = useTransformBuilderStore.getState();
    store.addOperation({
      operation: 'groupBy',
      key: '$.category',
      aggregations: { count1: { function: 'count', field: '$.id' } },
    });
    render(<GroupByNode operationIndex={0} />);
    expect(screen.getByRole('heading', { name: /group by/i })).toBeInTheDocument();
  });

  it('should update groupby key', async () => {
    const user = userEvent.setup();
    const store = useTransformBuilderStore.getState();
    store.addOperation({
      operation: 'groupBy',
      key: '$.category',
      aggregations: {},
    });
    render(<GroupByNode operationIndex={0} />);
    const keyInput = screen.getByDisplayValue('$.category');
    await user.tripleClick(keyInput);
    await user.keyboard('$.status');
    const state = useTransformBuilderStore.getState();
    expect((state.pipeline[0] as GroupByOperation).key).toBe('$.status');
  });

  it('should add aggregation', async () => {
    const user = userEvent.setup();
    const store = useTransformBuilderStore.getState();
    store.addOperation({
      operation: 'groupBy',
      key: '$.type',
      aggregations: {},
    });
    render(<GroupByNode operationIndex={0} />);
    const addButton = screen.getByRole('button', { name: /add aggregation/i });
    await user.click(addButton);
    const state = useTransformBuilderStore.getState();
    expect(Object.keys((state.pipeline[0] as GroupByOperation).aggregations)).toHaveLength(1);
  });

  it('should show description', () => {
    const store = useTransformBuilderStore.getState();
    store.addOperation({
      operation: 'groupBy',
      key: '$.x',
      aggregations: {},
    });
    render(<GroupByNode operationIndex={0} />);
    expect(screen.getByText(/group records/i)).toBeInTheDocument();
  });

  it('should handle non-existent operation', () => {
    render(<GroupByNode operationIndex={0} />);
    expect(screen.getByText(/operation not found/i)).toBeInTheDocument();
  });
});
