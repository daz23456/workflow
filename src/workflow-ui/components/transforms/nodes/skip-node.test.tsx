/**
 * Skip Node Tests
 *
 * Tests for skip operation node component.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { SkipNode } from './skip-node';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { SkipOperation } from '@/lib/types/transform-dsl';

describe('SkipNode', () => {
  beforeEach(() => {
    useTransformBuilderStore.getState().reset();
  });

  it('should render skip node with current value', () => {
    const store = useTransformBuilderStore.getState();

    const operation: SkipOperation = {
      operation: 'skip',
      count: 5,
    };

    store.addOperation(operation);

    render(<SkipNode operationIndex={0} />);

    expect(screen.getByLabelText(/skip count/i)).toHaveValue(5);
  });

  it('should update skip count on input change', async () => {
    const user = userEvent.setup();
    const store = useTransformBuilderStore.getState();

    store.addOperation({
      operation: 'skip',
      count: 5,
    });

    render(<SkipNode operationIndex={0} />);

    const input = screen.getByLabelText(/skip count/i) as HTMLInputElement;

    // Select all and replace
    await user.tripleClick(input);
    await user.keyboard('15');

    const state = useTransformBuilderStore.getState();
    expect((state.pipeline[0] as SkipOperation).count).toBe(15);
  });

  it('should allow skip count of 0', async () => {
    const user = userEvent.setup();
    const store = useTransformBuilderStore.getState();

    store.addOperation({
      operation: 'skip',
      count: 5,
    });

    render(<SkipNode operationIndex={0} />);

    const input = screen.getByLabelText(/skip count/i) as HTMLInputElement;

    // Select all and replace with 0
    await user.tripleClick(input);
    await user.keyboard('0');

    const state = useTransformBuilderStore.getState();
    expect((state.pipeline[0] as SkipOperation).count).toBe(0);
  });

  it('should show operation description', () => {
    const store = useTransformBuilderStore.getState();

    store.addOperation({
      operation: 'skip',
      count: 5,
    });

    render(<SkipNode operationIndex={0} />);

    expect(screen.getByText(/skip the first n records/i)).toBeInTheDocument();
  });

  it('should handle non-existent operation index gracefully', () => {
    render(<SkipNode operationIndex={999} />);

    expect(screen.getByText(/operation not found/i)).toBeInTheDocument();
  });
});
