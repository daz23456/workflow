/**
 * Transform Builder Store Tests
 *
 * Tests Zustand store for transform pipeline state management.
 * Uses Immer middleware for immutability and command pattern for undo/redo.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useTransformBuilderStore } from './transform-builder-store';
import type { SelectOperation, FilterOperation } from '../types/transform-dsl';

describe('TransformBuilderStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useTransformBuilderStore.getState().reset();
  });

  describe('Initialization', () => {
    it('should initialize with empty state', () => {
      const state = useTransformBuilderStore.getState();

      expect(state.pipeline).toEqual([]);
      expect(state.inputData).toEqual([]);
      expect(state.outputData).toEqual([]);
      expect(state.metadata.name).toBe('');
      expect(state.history.past).toEqual([]);
      expect(state.history.future).toEqual([]);
    });
  });

  describe('Operation Management', () => {
    it('should add operation to pipeline', () => {
      const store = useTransformBuilderStore.getState();

      const operation: SelectOperation = {
        operation: 'select',
        fields: { name: '$.name' },
      };

      store.addOperation(operation);

      const state = useTransformBuilderStore.getState();
      expect(state.pipeline).toHaveLength(1);
      expect(state.pipeline[0]).toEqual(operation);
    });

    it('should update operation in pipeline', () => {
      const store = useTransformBuilderStore.getState();

      const operation: SelectOperation = {
        operation: 'select',
        fields: { name: '$.name' },
      };

      store.addOperation(operation);
      store.updateOperation(0, {
        fields: { name: '$.name', age: '$.age' },
      });

      const state = useTransformBuilderStore.getState();
      expect(state.pipeline[0]).toEqual({
        operation: 'select',
        fields: { name: '$.name', age: '$.age' },
      });
    });

    it('should delete operation from pipeline', () => {
      const store = useTransformBuilderStore.getState();

      const op1: SelectOperation = {
        operation: 'select',
        fields: { name: '$.name' },
      };

      const op2: FilterOperation = {
        operation: 'filter',
        condition: {
          field: '$.age',
          operator: 'gt',
          value: 18,
        },
      };

      store.addOperation(op1);
      store.addOperation(op2);
      store.deleteOperation(0);

      const state = useTransformBuilderStore.getState();
      expect(state.pipeline).toHaveLength(1);
      expect(state.pipeline[0].operation).toBe('filter');
    });

    it('should move operation within pipeline', () => {
      const store = useTransformBuilderStore.getState();

      const op1: SelectOperation = {
        operation: 'select',
        fields: { name: '$.name' },
      };

      const op2: FilterOperation = {
        operation: 'filter',
        condition: {
          field: '$.age',
          operator: 'gt',
          value: 18,
        },
      };

      store.addOperation(op1);
      store.addOperation(op2);
      store.moveOperation(0, 1);

      const state = useTransformBuilderStore.getState();
      expect(state.pipeline[0].operation).toBe('filter');
      expect(state.pipeline[1].operation).toBe('select');
    });
  });

  describe('Input Data Management', () => {
    it('should set input data', () => {
      const store = useTransformBuilderStore.getState();

      const data = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ];

      store.setInputData(data);

      const state = useTransformBuilderStore.getState();
      expect(state.inputData).toEqual(data);
    });

    it('should clear input data', () => {
      const store = useTransformBuilderStore.getState();

      store.setInputData([{ name: 'Alice' }]);
      store.setInputData([]);

      const state = useTransformBuilderStore.getState();
      expect(state.inputData).toEqual([]);
    });
  });

  describe('Preview Execution', () => {
    it('should execute transform and update output data', async () => {
      const store = useTransformBuilderStore.getState();

      const inputData = [
        { name: 'Alice', age: 30 },
        { name: 'Bob', age: 25 },
      ];

      const operation: SelectOperation = {
        operation: 'select',
        fields: { name: '$.name' },
      };

      store.setInputData(inputData);
      store.addOperation(operation);

      await store.executePreview();

      const state = useTransformBuilderStore.getState();
      expect(state.outputData).toHaveLength(2);
      expect(state.outputData[0]).toEqual({ name: 'Alice' });
      expect(state.outputData[1]).toEqual({ name: 'Bob' });
    });

    it('should handle empty pipeline', async () => {
      const store = useTransformBuilderStore.getState();

      const inputData = [{ name: 'Alice' }];

      store.setInputData(inputData);
      await store.executePreview();

      const state = useTransformBuilderStore.getState();
      expect(state.outputData).toEqual(inputData);
    });

    it('should handle transform errors', async () => {
      const store = useTransformBuilderStore.getState();

      const inputData = [{ name: 'Alice' }];

      store.setInputData(inputData);
      store.addOperation({
        // @ts-expect-error - Testing invalid operation
        operation: 'invalid',
      });

      await store.executePreview();

      const state = useTransformBuilderStore.getState();
      expect(state.validation.isValid).toBe(false);
      expect(state.validation.errors).toHaveLength(1);
    });
  });

  describe('History (Undo/Redo)', () => {
    it('should save history checkpoint when adding operation', () => {
      const store = useTransformBuilderStore.getState();

      const operation: SelectOperation = {
        operation: 'select',
        fields: { name: '$.name' },
      };

      store.addOperation(operation);

      const state = useTransformBuilderStore.getState();
      expect(state.history.past).toHaveLength(1);
      expect(state.history.future).toEqual([]);
    });

    it('should undo operation addition', () => {
      const store = useTransformBuilderStore.getState();

      const operation: SelectOperation = {
        operation: 'select',
        fields: { name: '$.name' },
      };

      store.addOperation(operation);
      store.undo();

      const state = useTransformBuilderStore.getState();
      expect(state.pipeline).toEqual([]);
      expect(state.history.past).toEqual([]);
      expect(state.history.future).toHaveLength(1);
    });

    it('should redo operation addition', () => {
      const store = useTransformBuilderStore.getState();

      const operation: SelectOperation = {
        operation: 'select',
        fields: { name: '$.name' },
      };

      store.addOperation(operation);
      store.undo();
      store.redo();

      const state = useTransformBuilderStore.getState();
      expect(state.pipeline).toHaveLength(1);
      expect(state.pipeline[0]).toEqual(operation);
    });

    it('should clear redo stack when making new change', () => {
      const store = useTransformBuilderStore.getState();

      const op1: SelectOperation = {
        operation: 'select',
        fields: { name: '$.name' },
      };

      const op2: FilterOperation = {
        operation: 'filter',
        condition: {
          field: '$.age',
          operator: 'gt',
          value: 18,
        },
      };

      store.addOperation(op1);
      store.undo();

      // Now add a different operation
      store.addOperation(op2);

      const state = useTransformBuilderStore.getState();
      expect(state.history.future).toEqual([]);
      expect(state.pipeline[0]).toEqual(op2);
    });

    it('should check if can undo', () => {
      const store = useTransformBuilderStore.getState();

      expect(store.canUndo()).toBe(false);

      store.addOperation({
        operation: 'select',
        fields: { name: '$.name' },
      });

      expect(store.canUndo()).toBe(true);
    });

    it('should check if can redo', () => {
      const store = useTransformBuilderStore.getState();

      expect(store.canRedo()).toBe(false);

      store.addOperation({
        operation: 'select',
        fields: { name: '$.name' },
      });
      store.undo();

      expect(store.canRedo()).toBe(true);
    });
  });

  describe('Selection', () => {
    it('should select operation', () => {
      const store = useTransformBuilderStore.getState();

      store.addOperation({
        operation: 'select',
        fields: { name: '$.name' },
      });

      store.selectOperation(0);

      const state = useTransformBuilderStore.getState();
      expect(state.selection.operationIndex).toBe(0);
    });

    it('should clear selection', () => {
      const store = useTransformBuilderStore.getState();

      store.addOperation({
        operation: 'select',
        fields: { name: '$.name' },
      });

      store.selectOperation(0);
      store.clearSelection();

      const state = useTransformBuilderStore.getState();
      expect(state.selection.operationIndex).toBe(-1);
    });
  });

  describe('Metadata', () => {
    it('should set transform name', () => {
      const store = useTransformBuilderStore.getState();

      store.setMetadata({ name: 'my-transform' });

      const state = useTransformBuilderStore.getState();
      expect(state.metadata.name).toBe('my-transform');
    });

    it('should set transform description', () => {
      const store = useTransformBuilderStore.getState();

      store.setMetadata({ description: 'My custom transform' });

      const state = useTransformBuilderStore.getState();
      expect(state.metadata.description).toBe('My custom transform');
    });
  });

  describe('Validation', () => {
    it('should validate pipeline', () => {
      const store = useTransformBuilderStore.getState();

      store.validate();

      const state = useTransformBuilderStore.getState();
      expect(state.validation.isValid).toBe(true);
      expect(state.validation.errors).toEqual([]);
    });

    it('should detect invalid pipeline', () => {
      const store = useTransformBuilderStore.getState();

      // Add invalid operation
      store.addOperation({
        // @ts-expect-error - Testing invalid operation
        operation: 'invalid',
      });

      store.validate();

      const state = useTransformBuilderStore.getState();
      expect(state.validation.isValid).toBe(false);
      expect(state.validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Autosave State', () => {
    it('should mark as dirty when adding operation', () => {
      const store = useTransformBuilderStore.getState();

      store.addOperation({
        operation: 'select',
        fields: { name: '$.name' },
      });

      const state = useTransformBuilderStore.getState();
      expect(state.autosave.isDirty).toBe(true);
    });

    it('should mark as dirty when updating operation', () => {
      const store = useTransformBuilderStore.getState();

      store.addOperation({
        operation: 'select',
        fields: { name: '$.name' },
      });

      // Reset dirty flag
      useTransformBuilderStore.setState({
        autosave: { isDirty: false, lastSaved: null, isAutosaving: false },
      });

      store.updateOperation(0, {
        fields: { name: '$.name', age: '$.age' },
      });

      const state = useTransformBuilderStore.getState();
      expect(state.autosave.isDirty).toBe(true);
    });
  });

  describe('Reset', () => {
    it('should reset store to initial state', () => {
      const store = useTransformBuilderStore.getState();

      // Make some changes
      store.setInputData([{ name: 'Alice' }]);
      store.addOperation({
        operation: 'select',
        fields: { name: '$.name' },
      });
      store.setMetadata({ name: 'test-transform' });

      // Reset
      store.reset();

      const state = useTransformBuilderStore.getState();
      expect(state.pipeline).toEqual([]);
      expect(state.inputData).toEqual([]);
      expect(state.outputData).toEqual([]);
      expect(state.metadata.name).toBe('');
      expect(state.history.past).toEqual([]);
    });
  });
});
