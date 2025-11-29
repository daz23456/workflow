/**
 * FlatMap Node Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { FlatMapNode } from './flatmap-node';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { FlatMapOperation } from '@/lib/types/transform-dsl';

describe('FlatMapNode', () => {
  beforeEach(() => {
    useTransformBuilderStore.getState().reset();
  });

  it('should render flatmap node', () => {
    const store = useTransformBuilderStore.getState();
    store.addOperation({ operation: 'flatMap', path: '$.items' });
    render(<FlatMapNode operationIndex={0} />);
    expect(screen.getByText(/flatmap/i)).toBeInTheDocument();
  });

  it('should update field', async () => {
    const user = userEvent.setup();
    const store = useTransformBuilderStore.getState();
    store.addOperation({ operation: 'flatMap', path: '$.items' });
    render(<FlatMapNode operationIndex={0} />);
    const fieldInput = screen.getByDisplayValue('$.items');
    await user.tripleClick(fieldInput);
    await user.keyboard('$.products');
    const state = useTransformBuilderStore.getState();
    expect((state.pipeline[0] as FlatMapOperation).path).toBe('$.products');
  });

  it('should show description', () => {
    const store = useTransformBuilderStore.getState();
    store.addOperation({ operation: 'flatMap', path: '$.x' });
    render(<FlatMapNode operationIndex={0} />);
    expect(screen.getByText(/flatten arrays/i)).toBeInTheDocument();
  });

  it('should handle non-existent operation', () => {
    render(<FlatMapNode operationIndex={999} />);
    expect(screen.getByText(/operation not found/i)).toBeInTheDocument();
  });
});
