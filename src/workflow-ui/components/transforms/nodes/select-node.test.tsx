/**
 * Select Node Tests
 *
 * Tests for select operation node component.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { SelectNode } from './select-node';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';
import type { SelectOperation } from '@/lib/types/transform-dsl';

describe('SelectNode', () => {
  beforeEach(() => {
    useTransformBuilderStore.getState().reset();
  });

  it('should render select node with current fields', () => {
    const store = useTransformBuilderStore.getState();

    const operation: SelectOperation = {
      operation: 'select',
      fields: {
        name: '$.user.name',
        email: '$.user.email',
      },
    };

    store.addOperation(operation);

    render(<SelectNode operationIndex={0} />);

    expect(screen.getByDisplayValue('name')).toBeInTheDocument();
    expect(screen.getByDisplayValue('$.user.name')).toBeInTheDocument();
  });

  it('should add new field', async () => {
    const user = userEvent.setup();
    const store = useTransformBuilderStore.getState();

    store.addOperation({
      operation: 'select',
      fields: { name: '$.name' },
    });

    render(<SelectNode operationIndex={0} />);

    const addButton = screen.getByRole('button', { name: /add field/i });
    await user.click(addButton);

    const state = useTransformBuilderStore.getState();
    expect(Object.keys((state.pipeline[0] as SelectOperation).fields)).toHaveLength(2);
  });

  it('should remove field', async () => {
    const user = userEvent.setup();
    const store = useTransformBuilderStore.getState();

    store.addOperation({
      operation: 'select',
      fields: {
        name: '$.name',
        age: '$.age',
      },
    });

    render(<SelectNode operationIndex={0} />);

    const removeButtons = screen.getAllByRole('button', { name: /remove field/i });
    await user.click(removeButtons[0]);

    const state = useTransformBuilderStore.getState();
    expect(Object.keys((state.pipeline[0] as SelectOperation).fields)).toHaveLength(1);
  });

  it('should allow editing field names', () => {
    const store = useTransformBuilderStore.getState();

    store.addOperation({
      operation: 'select',
      fields: {
        firstName: '$.user.firstName',
        lastName: '$.user.lastName',
      },
    });

    render(<SelectNode operationIndex={0} />);

    // Both field name inputs should be rendered and editable
    const firstNameInput = screen.getByDisplayValue('firstName');
    const lastNameInput = screen.getByDisplayValue('lastName');

    expect(firstNameInput).toBeInTheDocument();
    expect(lastNameInput).toBeInTheDocument();
    expect(firstNameInput).toHaveAttribute('type', 'text');
    expect(lastNameInput).toHaveAttribute('type', 'text');
  });

  it('should update field JSONPath', async () => {
    const user = userEvent.setup();
    const store = useTransformBuilderStore.getState();

    store.addOperation({
      operation: 'select',
      fields: { name: '$.name' },
    });

    render(<SelectNode operationIndex={0} />);

    const pathInput = screen.getByDisplayValue('$.name');
    await user.tripleClick(pathInput);
    await user.keyboard('$.user.fullName');

    const state = useTransformBuilderStore.getState();
    expect((state.pipeline[0] as SelectOperation).fields.name).toBe('$.user.fullName');
  });
});
