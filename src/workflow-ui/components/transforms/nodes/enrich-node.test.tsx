/**
 * Enrich Node Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { EnrichNode } from './enrich-node';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { EnrichOperation } from '@/lib/types/transform-dsl';

describe('EnrichNode', () => {
  beforeEach(() => {
    useTransformBuilderStore.getState().reset();
  });

  it('should render enrich node', () => {
    const store = useTransformBuilderStore.getState();
    store.addOperation({
      operation: 'enrich',
      fields: { additionalData: '$.info' },
    });
    render(<EnrichNode operationIndex={0} />);
    expect(screen.getByRole('heading', { name: /enrich/i })).toBeInTheDocument();
  });

  it('should update enrich field path', async () => {
    const user = userEvent.setup();
    const store = useTransformBuilderStore.getState();
    store.addOperation({
      operation: 'enrich',
      fields: { data: '$.id' },
    });
    render(<EnrichNode operationIndex={0} />);
    const pathField = screen.getByPlaceholderText('$.field');
    await user.tripleClick(pathField);
    await user.keyboard('$.userId');
    const state = useTransformBuilderStore.getState();
    expect((state.pipeline[0] as EnrichOperation).fields.data).toBe('$.userId');
  });

  it('should add enrich field', async () => {
    const user = userEvent.setup();
    const store = useTransformBuilderStore.getState();
    store.addOperation({
      operation: 'enrich',
      fields: {},
    });
    render(<EnrichNode operationIndex={0} />);
    const addButton = screen.getByRole('button', { name: /add field/i });
    await user.click(addButton);
    const state = useTransformBuilderStore.getState();
    expect(Object.keys((state.pipeline[0] as EnrichOperation).fields)).toHaveLength(1);
  });

  it('should show description', () => {
    const store = useTransformBuilderStore.getState();
    store.addOperation({
      operation: 'enrich',
      fields: {},
    });
    render(<EnrichNode operationIndex={0} />);
    expect(screen.getByText(/add computed fields/i)).toBeInTheDocument();
  });

  it('should handle non-existent operation', () => {
    render(<EnrichNode operationIndex={999} />);
    expect(screen.getByText(/operation not found/i)).toBeInTheDocument();
  });
});
