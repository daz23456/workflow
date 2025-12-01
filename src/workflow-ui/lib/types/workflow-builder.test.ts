/**
 * Tests for Workflow Builder Types and Helper Functions
 *
 * TDD RED Phase: These tests will fail until we create the types and helpers.
 */

import { describe, it, expect } from 'vitest';
import {
  type WorkflowBuilderNode,
  type WorkflowBuilderEdge,
  type ValidationState,
  type HistoryState,
  createEmptyState,
  createWorkflowMetadata,
  isValidNode,
  isValidEdge,
  hasValidationErrors,
  canUndo,
  canRedo,
} from './workflow-builder';

describe('Workflow Builder Types', () => {
  describe('createEmptyState', () => {
    it('should create initial empty builder state', () => {
      const state = createEmptyState();

      expect(state).toBeDefined();
      expect(state.graph.nodes).toEqual([]);
      expect(state.graph.edges).toEqual([]);
      expect(state.graph.parallelGroups).toEqual([]);
      expect(state.validation.isValid).toBe(true);
      expect(state.validation.errors).toEqual([]);
      expect(state.validation.warnings).toEqual([]);
      expect(state.autosave.isDirty).toBe(false);
      expect(state.autosave.lastSaved).toBeNull();
      expect(state.autosave.isAutosaving).toBe(false);
    });

    it('should create state with empty metadata', () => {
      const state = createEmptyState();

      expect(state.metadata.name).toBe('');
      expect(state.metadata.namespace).toBe('default');
      expect(state.metadata.description).toBe('');
    });

    it('should create state with empty selection', () => {
      const state = createEmptyState();

      expect(state.selection.nodeIds).toEqual([]);
      expect(state.selection.edgeIds).toEqual([]);
    });

    it('should create state with empty history', () => {
      const state = createEmptyState();

      expect(state.history.past).toEqual([]);
      expect(state.history.future).toEqual([]);
      expect(state.history.currentCheckpoint).toBeNull();
    });

    it('should create state with empty input schema', () => {
      const state = createEmptyState();

      expect(state.inputSchema).toEqual({});
    });

    it('should create state with empty output mapping', () => {
      const state = createEmptyState();

      expect(state.outputMapping).toEqual({});
    });
  });

  describe('createWorkflowMetadata', () => {
    it('should create workflow metadata with default values', () => {
      const metadata = createWorkflowMetadata();

      expect(metadata.name).toBe('');
      expect(metadata.namespace).toBe('default');
      expect(metadata.description).toBe('');
    });

    it('should create workflow metadata with custom values', () => {
      const metadata = createWorkflowMetadata({
        name: 'test-workflow',
        namespace: 'production',
        description: 'Test workflow description',
      });

      expect(metadata.name).toBe('test-workflow');
      expect(metadata.namespace).toBe('production');
      expect(metadata.description).toBe('Test workflow description');
    });

    it('should allow partial updates', () => {
      const metadata = createWorkflowMetadata({
        name: 'my-workflow',
      });

      expect(metadata.name).toBe('my-workflow');
      expect(metadata.namespace).toBe('default'); // default value
      expect(metadata.description).toBe(''); // default value
    });
  });

  describe('isValidNode', () => {
    it('should return true for valid node with required fields', () => {
      const node: WorkflowBuilderNode = {
        id: 'task-1',
        type: 'task',
        position: { x: 0, y: 0 },
        data: {
          label: 'Test Task',
          taskRef: 'test-task',
        },
      };

      expect(isValidNode(node)).toBe(true);
    });

    it('should return false for node without id', () => {
      const node = {
        type: 'task',
        position: { x: 0, y: 0 },
        data: { label: 'Test', taskRef: 'test' },
      } as any;

      expect(isValidNode(node)).toBe(false);
    });

    it('should return false for node without position', () => {
      const node = {
        id: 'task-1',
        type: 'task',
        data: { label: 'Test', taskRef: 'test' },
      } as any;

      expect(isValidNode(node)).toBe(false);
    });

    it('should return false for node without data.taskRef', () => {
      const node: WorkflowBuilderNode = {
        id: 'task-1',
        type: 'task',
        position: { x: 0, y: 0 },
        data: {
          label: 'Test Task',
          taskRef: undefined as any,
        },
      };

      expect(isValidNode(node)).toBe(false);
    });
  });

  describe('isValidEdge', () => {
    it('should return true for valid edge', () => {
      const edge: WorkflowBuilderEdge = {
        id: 'edge-1',
        source: 'task-1',
        target: 'task-2',
        type: 'dependency',
      };

      expect(isValidEdge(edge)).toBe(true);
    });

    it('should return false for edge without source', () => {
      const edge = {
        id: 'edge-1',
        target: 'task-2',
        type: 'dependency',
      } as any;

      expect(isValidEdge(edge)).toBe(false);
    });

    it('should return false for edge without target', () => {
      const edge = {
        id: 'edge-1',
        source: 'task-1',
        type: 'dependency',
      } as any;

      expect(isValidEdge(edge)).toBe(false);
    });

    it('should return false for self-referencing edge', () => {
      const edge: WorkflowBuilderEdge = {
        id: 'edge-1',
        source: 'task-1',
        target: 'task-1',
        type: 'dependency',
      };

      expect(isValidEdge(edge)).toBe(false);
    });
  });

  describe('hasValidationErrors', () => {
    it('should return false for valid state', () => {
      const validationState: ValidationState = {
        isValid: true,
        errors: [],
        warnings: [],
      };

      expect(hasValidationErrors(validationState)).toBe(false);
    });

    it('should return true when isValid is false', () => {
      const validationState: ValidationState = {
        isValid: false,
        errors: ['Error 1'],
        warnings: [],
      };

      expect(hasValidationErrors(validationState)).toBe(true);
    });

    it('should return true when errors array has items', () => {
      const validationState: ValidationState = {
        isValid: false,
        errors: ['Error 1', 'Error 2'],
        warnings: [],
      };

      expect(hasValidationErrors(validationState)).toBe(true);
    });

    it('should return false even when warnings exist', () => {
      const validationState: ValidationState = {
        isValid: true,
        errors: [],
        warnings: ['Warning 1'],
      };

      expect(hasValidationErrors(validationState)).toBe(false);
    });
  });

  describe('canUndo', () => {
    it('should return false when past is empty', () => {
      const historyState: HistoryState = {
        past: [],
        future: [],
        currentCheckpoint: null,
      };

      expect(canUndo(historyState)).toBe(false);
    });

    it('should return true when past has items', () => {
      const historyState: HistoryState = {
        past: [
          {
            graph: { nodes: [], edges: [], parallelGroups: [] },
            metadata: { name: '', namespace: 'default', description: '' },
            inputSchema: {},
            outputMapping: {},
          },
        ],
        future: [],
        currentCheckpoint: null,
      };

      expect(canUndo(historyState)).toBe(true);
    });

    it('should return true when past has multiple items', () => {
      const historyState: HistoryState = {
        past: [
          {
            graph: { nodes: [], edges: [], parallelGroups: [] },
            metadata: { name: '', namespace: 'default', description: '' },
            inputSchema: {},
            outputMapping: {},
          },
          {
            graph: { nodes: [], edges: [], parallelGroups: [] },
            metadata: { name: 'test', namespace: 'default', description: '' },
            inputSchema: {},
            outputMapping: {},
          },
        ],
        future: [],
        currentCheckpoint: null,
      };

      expect(canUndo(historyState)).toBe(true);
    });
  });

  describe('canRedo', () => {
    it('should return false when future is empty', () => {
      const historyState: HistoryState = {
        past: [],
        future: [],
        currentCheckpoint: null,
      };

      expect(canRedo(historyState)).toBe(false);
    });

    it('should return true when future has items', () => {
      const historyState: HistoryState = {
        past: [],
        future: [
          {
            graph: { nodes: [], edges: [], parallelGroups: [] },
            metadata: { name: '', namespace: 'default', description: '' },
            inputSchema: {},
            outputMapping: {},
          },
        ],
        currentCheckpoint: null,
      };

      expect(canRedo(historyState)).toBe(true);
    });
  });
});
