/**
 * Limit Node Tests
 *
 * Tests for limit operation node component.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { LimitNode } from './limit-node';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { LimitOperation } from '@/lib/types/transform-dsl';

describe('LimitNode', () => {
  beforeEach(() => {
    useTransformBuilderStore.getState().reset();
  });

  it('should render limit node with current value', () => {
    const store = useTransformBuilderStore.getState();

    const operation: LimitOperation = {
      operation: 'limit',
      count: 10,
    };

    store.addOperation(operation);

    render(<LimitNode operationIndex={0} />);

    expect(screen.getByLabelText(/limit count/i)).toHaveValue(10);
  });

  it('should update limit count on input change', async () => {
    const user = userEvent.setup();
    const store = useTransformBuilderStore.getState();

    store.addOperation({
      operation: 'limit',
      count: 10,
    });

    render(<LimitNode operationIndex={0} />);

    const input = screen.getByLabelText(/limit count/i) as HTMLInputElement;

    // Select all and replace
    await user.tripleClick(input);
    await user.keyboard('25');

    const state = useTransformBuilderStore.getState();
    expect((state.pipeline[0] as LimitOperation).count).toBe(25);
  });

  it('should show validation error for invalid input', async () => {
    const user = userEvent.setup();
    const store = useTransformBuilderStore.getState();

    store.addOperation({
      operation: 'limit',
      count: 10,
    });

    render(<LimitNode operationIndex={0} />);

    const input = screen.getByLabelText(/limit count/i) as HTMLInputElement;

    // Select all and replace with invalid value
    await user.tripleClick(input);
    await user.keyboard('0');

    expect(screen.getByText(/count must be greater than 0/i)).toBeInTheDocument();
  });

  it('should show operation description', () => {
    const store = useTransformBuilderStore.getState();

    store.addOperation({
      operation: 'limit',
      count: 10,
    });

    render(<LimitNode operationIndex={0} />);

    expect(screen.getByText(/limit the number of records/i)).toBeInTheDocument();
  });

  it('should handle non-existent operation index gracefully', () => {
    render(<LimitNode operationIndex={999} />);

    expect(screen.getByText(/operation not found/i)).toBeInTheDocument();
  });
});
