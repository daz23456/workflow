/**
 * Transform Builder Zustand Store with Command Pattern
 *
 * Central state management for the visual transform builder.
 * Uses Command Pattern to enable undo/redo functionality.
 * Uses Immer for immutable state updates.
 *
 * Follows the same pattern as workflow-builder-store.ts
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { TransformDslDefinition, TransformOperation } from '../types/transform-dsl';
import { TransformEngine } from '../transforms/transform-engine';

/**
 * Transform Builder State
 */
export interface TransformBuilderState {
  // Pipeline configuration
  pipeline: TransformOperation[];

  // Data
  inputData: unknown[];
  outputData: unknown[];

  // Metadata
  metadata: {
    name: string;
    description: string;
  };

  // Selection
  selection: {
    operationIndex: number; // -1 if no selection
  };

  // Validation
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };

  // Undo/Redo history
  history: {
    past: HistoryCheckpoint[];
    future: HistoryCheckpoint[];
  };

  // Autosave state
  autosave: {
    isDirty: boolean;
    lastSaved: Date | null;
    isAutosaving: boolean;
  };
}

/**
 * History checkpoint for undo/redo
 */
interface HistoryCheckpoint {
  pipeline: TransformOperation[];
  metadata: {
    name: string;
    description: string;
  };
}

/**
 * Create a history checkpoint from current state
 */
function createCheckpoint(state: TransformBuilderState): HistoryCheckpoint {
  return {
    pipeline: JSON.parse(JSON.stringify(state.pipeline)),
    metadata: { ...state.metadata },
  };
}

/**
 * Restore state from a checkpoint
 */
function restoreCheckpoint(state: TransformBuilderState, checkpoint: HistoryCheckpoint): void {
  state.pipeline = JSON.parse(JSON.stringify(checkpoint.pipeline));
  state.metadata = { ...checkpoint.metadata };
}

/**
 * Create empty initial state
 */
function createEmptyState(): TransformBuilderState {
  return {
    pipeline: [],
    inputData: [],
    outputData: [],
    metadata: {
      name: '',
      description: '',
    },
    selection: {
      operationIndex: -1,
    },
    validation: {
      isValid: true,
      errors: [],
      warnings: [],
    },
    history: {
      past: [],
      future: [],
    },
    autosave: {
      isDirty: false,
      lastSaved: null,
      isAutosaving: false,
    },
  };
}

interface TransformBuilderStore extends TransformBuilderState {
  // Operation management
  addOperation: (operation: TransformOperation) => void;
  updateOperation: (index: number, updates: Partial<TransformOperation>) => void;
  deleteOperation: (index: number) => void;
  moveOperation: (fromIndex: number, toIndex: number) => void;

  // Data management
  setInputData: (data: unknown[]) => void;

  // Preview execution
  executePreview: () => Promise<void>;

  // Selection
  selectOperation: (index: number) => void;
  clearSelection: () => void;

  // Metadata
  setMetadata: (metadata: Partial<TransformBuilderState['metadata']>) => void;

  // Validation
  validate: () => void;

  // History (Undo/Redo)
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Export
  toDsl: () => TransformDslDefinition;

  // Utility
  reset: () => void;
}

export const useTransformBuilderStore = create<TransformBuilderStore>()(
  immer((set, get) => ({
    // Initialize with empty state
    ...createEmptyState(),

    // Operation management
    addOperation: (operation) =>
      set((state) => {
        // Save current state to history before mutation
        const checkpoint = createCheckpoint(state);
        state.history.past.push(checkpoint);
        state.history.future = []; // Clear redo stack

        state.pipeline.push(operation);
        state.autosave.isDirty = true;
      }),

    updateOperation: (index, updates) =>
      set((state) => {
        if (index < 0 || index >= state.pipeline.length) return;

        const checkpoint = createCheckpoint(state);
        state.history.past.push(checkpoint);
        state.history.future = [];

        state.pipeline[index] = {
          ...state.pipeline[index],
          ...updates,
        } as any;
        state.autosave.isDirty = true;
      }),

    deleteOperation: (index) =>
      set((state) => {
        if (index < 0 || index >= state.pipeline.length) return;

        const checkpoint = createCheckpoint(state);
        state.history.past.push(checkpoint);
        state.history.future = [];

        state.pipeline.splice(index, 1);

        // Clear selection if deleted operation was selected
        if (state.selection.operationIndex === index) {
          state.selection.operationIndex = -1;
        }

        state.autosave.isDirty = true;
      }),

    moveOperation: (fromIndex, toIndex) =>
      set((state) => {
        if (
          fromIndex < 0 ||
          fromIndex >= state.pipeline.length ||
          toIndex < 0 ||
          toIndex >= state.pipeline.length
        ) {
          return;
        }

        const checkpoint = createCheckpoint(state);
        state.history.past.push(checkpoint);
        state.history.future = [];

        // Remove from old position
        const [operation] = state.pipeline.splice(fromIndex, 1);
        // Insert at new position
        state.pipeline.splice(toIndex, 0, operation);

        state.autosave.isDirty = true;
      }),

    // Data management
    setInputData: (data) =>
      set((state) => {
        state.inputData = data;
        state.autosave.isDirty = true;
      }),

    // Preview execution
    executePreview: async () => {
      const state = get();

      try {
        const engine = new TransformEngine();

        const dsl: TransformDslDefinition = {
          version: '1.0',
          pipeline: state.pipeline,
        };

        const result = await engine.execute(dsl, state.inputData);

        set((draft) => {
          draft.outputData = result;
          draft.validation.isValid = true;
          draft.validation.errors = [];
        });
      } catch (error) {
        set((draft) => {
          draft.validation.isValid = false;
          draft.validation.errors = [
            error instanceof Error ? error.message : 'Transform execution failed',
          ];
        });
      }
    },

    // Selection
    selectOperation: (index) =>
      set((state) => {
        state.selection.operationIndex = index;
      }),

    clearSelection: () =>
      set((state) => {
        state.selection.operationIndex = -1;
      }),

    // Metadata
    setMetadata: (metadata) =>
      set((state) => {
        const checkpoint = createCheckpoint(state);
        state.history.past.push(checkpoint);
        state.history.future = [];

        state.metadata = { ...state.metadata, ...metadata };
        state.autosave.isDirty = true;
      }),

    // Validation
    validate: () =>
      set((state) => {
        state.validation.errors = [];
        state.validation.warnings = [];

        // Check for invalid operation types
        const validOperations = [
          'select',
          'filter',
          'map',
          'flatMap',
          'groupBy',
          'join',
          'sortBy',
          'enrich',
          'aggregate',
          'limit',
          'skip',
        ];

        for (let i = 0; i < state.pipeline.length; i++) {
          const operation = state.pipeline[i];
          if (!validOperations.includes(operation.operation)) {
            state.validation.errors.push(
              `Operation ${i}: Invalid operation type '${operation.operation}'`
            );
          }
        }

        state.validation.isValid = state.validation.errors.length === 0;
      }),

    // History (Undo/Redo)
    undo: () =>
      set((state) => {
        if (state.history.past.length === 0) return;

        // Save current state to future
        const currentCheckpoint = createCheckpoint(state);
        state.history.future.unshift(currentCheckpoint);

        // Restore previous state
        const previousCheckpoint = state.history.past.pop()!;
        restoreCheckpoint(state, previousCheckpoint);

        state.autosave.isDirty = true;
      }),

    redo: () =>
      set((state) => {
        if (state.history.future.length === 0) return;

        // Save current state to past
        const currentCheckpoint = createCheckpoint(state);
        state.history.past.push(currentCheckpoint);

        // Restore next state
        const nextCheckpoint = state.history.future.shift()!;
        restoreCheckpoint(state, nextCheckpoint);

        state.autosave.isDirty = true;
      }),

    canUndo: () => {
      const state = get();
      return state.history.past.length > 0;
    },

    canRedo: () => {
      const state = get();
      return state.history.future.length > 0;
    },

    // Export
    toDsl: () => {
      const state = get();
      return {
        version: '1.0',
        pipeline: state.pipeline,
      } as TransformDslDefinition;
    },

    // Utility
    reset: () =>
      set((state) => {
        const emptyState = createEmptyState();
        Object.assign(state, emptyState);
      }),
  }))
);
