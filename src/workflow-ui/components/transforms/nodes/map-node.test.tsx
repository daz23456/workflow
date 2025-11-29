/**
 * Map Node Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { MapNode } from './map-node';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { MapOperation } from '@/lib/types/transform-dsl';

describe('MapNode', () => {
  beforeEach(() => {
    useTransformBuilderStore.getState().reset();
  });

  it('should render map node', () => {
    const store = useTransformBuilderStore.getState();
    store.addOperation({
      operation: 'map',
      mappings: { adjustedPrice: '$.price' },
    });
    render(<MapNode operationIndex={0} />);
    expect(screen.getByRole('heading', { name: /^map$/i })).toBeInTheDocument();
  });

  it('should add new mapping', async () => {
    const user = userEvent.setup();
    const store = useTransformBuilderStore.getState();
    store.addOperation({
      operation: 'map',
      mappings: { field1: '$.value' },
    });
    render(<MapNode operationIndex={0} />);
    const addButton = screen.getByRole('button', { name: /add mapping/i });
    await user.click(addButton);
    const state = useTransformBuilderStore.getState();
    expect(Object.keys((state.pipeline[0] as MapOperation).mappings)).toHaveLength(2);
  });

  it('should show description', () => {
    const store = useTransformBuilderStore.getState();
    store.addOperation({ operation: 'map', mappings: { newField: '$.x' } });
    render(<MapNode operationIndex={0} />);
    expect(screen.getByText(/remap fields/i)).toBeInTheDocument();
  });

  it('should handle non-existent operation', () => {
    render(<MapNode operationIndex={999} />);
    expect(screen.getByText(/operation not found/i)).toBeInTheDocument();
  });
});
