/**
 * Join Node Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { JoinNode } from './join-node';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { JoinOperation } from '@/lib/types/transform-dsl';

describe('JoinNode', () => {
  beforeEach(() => {
    useTransformBuilderStore.getState().reset();
  });

  it('should render join node', () => {
    const store = useTransformBuilderStore.getState();
    store.addOperation({
      operation: 'join',
      leftKey: '$.id',
      rightKey: '$.userId',
      rightData: [],
      joinType: 'inner',
    });
    render(<JoinNode operationIndex={0} />);
    expect(screen.getByRole('heading', { name: /^join$/i })).toBeInTheDocument();
  });

  it('should update join type', async () => {
    const user = userEvent.setup();
    const store = useTransformBuilderStore.getState();
    store.addOperation({
      operation: 'join',
      leftKey: '$.id',
      rightKey: '$.userId',
      rightData: [],
      joinType: 'inner',
    });
    render(<JoinNode operationIndex={0} />);
    const typeSelect = screen.getByRole('combobox', { name: /join type/i });
    await user.selectOptions(typeSelect, 'left');
    const state = useTransformBuilderStore.getState();
    expect((state.pipeline[0] as JoinOperation).joinType).toBe('left');
  });

  it('should update left field', async () => {
    const user = userEvent.setup();
    const store = useTransformBuilderStore.getState();
    store.addOperation({
      operation: 'join',
      leftKey: '$.id',
      rightKey: '$.userId',
      rightData: [],
      joinType: 'inner',
    });
    render(<JoinNode operationIndex={0} />);
    const leftField = screen.getByLabelText(/left key/i);
    await user.tripleClick(leftField);
    await user.keyboard('$.customerId');
    const state = useTransformBuilderStore.getState();
    expect((state.pipeline[0] as JoinOperation).leftKey).toBe('$.customerId');
  });

  it('should show description', () => {
    const store = useTransformBuilderStore.getState();
    store.addOperation({
      operation: 'join',
      leftKey: '$.x',
      rightKey: '$.y',
      rightData: [],
      joinType: 'inner',
    });
    render(<JoinNode operationIndex={0} />);
    expect(screen.getByText(/join with another dataset/i)).toBeInTheDocument();
  });

  it('should handle non-existent operation', () => {
    render(<JoinNode operationIndex={999} />);
    expect(screen.getByText(/operation not found/i)).toBeInTheDocument();
  });
});
