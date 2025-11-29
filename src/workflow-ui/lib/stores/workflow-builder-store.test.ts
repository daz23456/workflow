/**
 * Tests for Workflow Builder Zustand Store with Command Pattern
 *
 * TDD RED Phase: These tests will fail until we create the store.
 *
 * The store manages:
 * - Graph state (nodes, edges, parallelGroups)
 * - Metadata, input schema, output mapping
 * - Selection, validation, history (undo/redo), autosave
 * - Actions for all state mutations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkflowBuilderStore } from './workflow-builder-store';
import type {
  WorkflowBuilderNode,
  WorkflowBuilderEdge,
} from '../types/workflow-builder';

describe('Workflow Builder Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useWorkflowBuilderStore());
    act(() => {
      result.current.reset();
    });
  });

  describe('Store Initialization', () => {
    it('should initialize with empty state', () => {
      const { result } = renderHook(() => useWorkflowBuilderStore());

      expect(result.current.graph.nodes).toEqual([]);
      expect(result.current.graph.edges).toEqual([]);
      expect(result.current.graph.parallelGroups).toEqual([]);
      expect(result.current.metadata.name).toBe('');
      expect(result.current.metadata.namespace).toBe('default');
      expect(result.current.inputSchema).toEqual({});
      expect(result.current.outputMapping).toEqual({});
      expect(result.current.validation.isValid).toBe(true);
      expect(result.current.autosave.isDirty).toBe(false);
    });
  });

  describe('Node Operations', () => {
    it('should add a node to the graph', () => {
      const { result } = renderHook(() => useWorkflowBuilderStore());

      const node: WorkflowBuilderNode = {
        id: 'task-1',
        type: 'task',
        position: { x: 100, y: 100 },
        data: { label: 'Task 1', taskRef: 'test-task' },
      };

      act(() => {
        result.current.addNode(node);
      });

      expect(result.current.graph.nodes).toHaveLength(1);
      expect(result.current.graph.nodes[0]).toEqual(node);
      expect(result.current.autosave.isDirty).toBe(true);
    });

    it('should update an existing node', () => {
      const { result } = renderHook(() => useWorkflowBuilderStore());

      const node: WorkflowBuilderNode = {
        id: 'task-1',
        type: 'task',
        position: { x: 100, y: 100 },
        data: { label: 'Task 1', taskRef: 'test-task' },
      };

      act(() => {
        result.current.addNode(node);
      });

      act(() => {
        result.current.updateNode('task-1', {
          data: { label: 'Updated Task', taskRef: 'test-task' },
        });
      });

      expect(result.current.graph.nodes[0].data.label).toBe('Updated Task');
      expect(result.current.autosave.isDirty).toBe(true);
    });

    it('should delete a node from the graph', () => {
      const { result } = renderHook(() => useWorkflowBuilderStore());

      const node: WorkflowBuilderNode = {
        id: 'task-1',
        type: 'task',
        position: { x: 100, y: 100 },
        data: { label: 'Task 1', taskRef: 'test-task' },
      };

      act(() => {
        result.current.addNode(node);
      });

      act(() => {
        result.current.deleteNode('task-1');
      });

      expect(result.current.graph.nodes).toHaveLength(0);
    });

    it('should delete connected edges when deleting a node', () => {
      const { result } = renderHook(() => useWorkflowBuilderStore());

      const node1: WorkflowBuilderNode = {
        id: 'task-1',
        type: 'task',
        position: { x: 100, y: 100 },
        data: { label: 'Task 1', taskRef: 'test-task-1' },
      };

      const node2: WorkflowBuilderNode = {
        id: 'task-2',
        type: 'task',
        position: { x: 300, y: 100 },
        data: { label: 'Task 2', taskRef: 'test-task-2' },
      };

      const edge: WorkflowBuilderEdge = {
        id: 'edge-1',
        source: 'task-1',
        target: 'task-2',
        type: 'dependency',
      };

      act(() => {
        result.current.addNode(node1);
        result.current.addNode(node2);
        result.current.addEdge(edge);
      });

      expect(result.current.graph.edges).toHaveLength(1);

      act(() => {
        result.current.deleteNode('task-1');
      });

      expect(result.current.graph.nodes).toHaveLength(1);
      expect(result.current.graph.edges).toHaveLength(0); // Edge should be deleted
    });
  });

  describe('Edge Operations', () => {
    it('should add an edge to the graph', () => {
      const { result } = renderHook(() => useWorkflowBuilderStore());

      const node1: WorkflowBuilderNode = {
        id: 'task-1',
        type: 'task',
        position: { x: 100, y: 100 },
        data: { label: 'Task 1', taskRef: 'test-task-1' },
      };

      const node2: WorkflowBuilderNode = {
        id: 'task-2',
        type: 'task',
        position: { x: 300, y: 100 },
        data: { label: 'Task 2', taskRef: 'test-task-2' },
      };

      const edge: WorkflowBuilderEdge = {
        id: 'edge-1',
        source: 'task-1',
        target: 'task-2',
        type: 'dependency',
      };

      act(() => {
        result.current.addNode(node1);
        result.current.addNode(node2);
        result.current.addEdge(edge);
      });

      expect(result.current.graph.edges).toHaveLength(1);
      expect(result.current.graph.edges[0]).toEqual(edge);
    });

    it('should delete an edge from the graph', () => {
      const { result } = renderHook(() => useWorkflowBuilderStore());

      const node1: WorkflowBuilderNode = {
        id: 'task-1',
        type: 'task',
        position: { x: 100, y: 100 },
        data: { label: 'Task 1', taskRef: 'test-task-1' },
      };

      const node2: WorkflowBuilderNode = {
        id: 'task-2',
        type: 'task',
        position: { x: 300, y: 100 },
        data: { label: 'Task 2', taskRef: 'test-task-2' },
      };

      const edge: WorkflowBuilderEdge = {
        id: 'edge-1',
        source: 'task-1',
        target: 'task-2',
        type: 'dependency',
      };

      act(() => {
        result.current.addNode(node1);
        result.current.addNode(node2);
        result.current.addEdge(edge);
      });

      act(() => {
        result.current.deleteEdge('edge-1');
      });

      expect(result.current.graph.edges).toHaveLength(0);
    });

    it('should prevent circular dependencies', () => {
      const { result } = renderHook(() => useWorkflowBuilderStore());

      const node1: WorkflowBuilderNode = {
        id: 'task-1',
        type: 'task',
        position: { x: 100, y: 100 },
        data: { label: 'Task 1', taskRef: 'test-task-1' },
      };

      const node2: WorkflowBuilderNode = {
        id: 'task-2',
        type: 'task',
        position: { x: 300, y: 100 },
        data: { label: 'Task 2', taskRef: 'test-task-2' },
      };

      const edge1: WorkflowBuilderEdge = {
        id: 'edge-1',
        source: 'task-1',
        target: 'task-2',
        type: 'dependency',
      };

      // This would create a cycle: task-1 → task-2 → task-1
      const edge2: WorkflowBuilderEdge = {
        id: 'edge-2',
        source: 'task-2',
        target: 'task-1',
        type: 'dependency',
      };

      act(() => {
        result.current.addNode(node1);
        result.current.addNode(node2);
        result.current.addEdge(edge1);
      });

      // Adding edge2 should fail or set validation error
      act(() => {
        result.current.addEdge(edge2);
      });

      // Either the edge is not added, or validation errors are set
      const hasCircularError =
        result.current.graph.edges.length === 1 ||
        result.current.validation.errors.some((err) => err.includes('circular') || err.includes('cycle'));

      expect(hasCircularError).toBe(true);
    });
  });

  describe('Selection Management', () => {
    it('should select nodes', () => {
      const { result } = renderHook(() => useWorkflowBuilderStore());

      act(() => {
        result.current.selectNodes(['task-1', 'task-2']);
      });

      expect(result.current.selection.nodeIds).toEqual(['task-1', 'task-2']);
    });

    it('should select edges', () => {
      const { result } = renderHook(() => useWorkflowBuilderStore());

      act(() => {
        result.current.selectEdges(['edge-1']);
      });

      expect(result.current.selection.edgeIds).toEqual(['edge-1']);
    });

    it('should clear selection', () => {
      const { result } = renderHook(() => useWorkflowBuilderStore());

      act(() => {
        result.current.selectNodes(['task-1']);
        result.current.selectEdges(['edge-1']);
      });

      act(() => {
        result.current.clearSelection();
      });

      expect(result.current.selection.nodeIds).toEqual([]);
      expect(result.current.selection.edgeIds).toEqual([]);
    });
  });

  describe('Undo/Redo (Command Pattern)', () => {
    it('should support undo after adding a node', () => {
      const { result } = renderHook(() => useWorkflowBuilderStore());

      const node: WorkflowBuilderNode = {
        id: 'task-1',
        type: 'task',
        position: { x: 100, y: 100 },
        data: { label: 'Task 1', taskRef: 'test-task' },
      };

      act(() => {
        result.current.addNode(node);
      });

      expect(result.current.graph.nodes).toHaveLength(1);

      act(() => {
        result.current.undo();
      });

      expect(result.current.graph.nodes).toHaveLength(0);
    });

    it('should support redo after undo', () => {
      const { result } = renderHook(() => useWorkflowBuilderStore());

      const node: WorkflowBuilderNode = {
        id: 'task-1',
        type: 'task',
        position: { x: 100, y: 100 },
        data: { label: 'Task 1', taskRef: 'test-task' },
      };

      act(() => {
        result.current.addNode(node);
      });

      act(() => {
        result.current.undo();
      });

      expect(result.current.graph.nodes).toHaveLength(0);

      act(() => {
        result.current.redo();
      });

      expect(result.current.graph.nodes).toHaveLength(1);
    });

    it('should indicate when undo/redo is available', () => {
      const { result } = renderHook(() => useWorkflowBuilderStore());

      expect(result.current.canUndo()).toBe(false);
      expect(result.current.canRedo()).toBe(false);

      const node: WorkflowBuilderNode = {
        id: 'task-1',
        type: 'task',
        position: { x: 100, y: 100 },
        data: { label: 'Task 1', taskRef: 'test-task' },
      };

      act(() => {
        result.current.addNode(node);
      });

      expect(result.current.canUndo()).toBe(true);
      expect(result.current.canRedo()).toBe(false);

      act(() => {
        result.current.undo();
      });

      expect(result.current.canUndo()).toBe(false);
      expect(result.current.canRedo()).toBe(true);
    });

    it('should support multiple undo/redo operations', () => {
      const { result } = renderHook(() => useWorkflowBuilderStore());

      const node1: WorkflowBuilderNode = {
        id: 'task-1',
        type: 'task',
        position: { x: 100, y: 100 },
        data: { label: 'Task 1', taskRef: 'test-task-1' },
      };

      const node2: WorkflowBuilderNode = {
        id: 'task-2',
        type: 'task',
        position: { x: 300, y: 100 },
        data: { label: 'Task 2', taskRef: 'test-task-2' },
      };

      act(() => {
        result.current.addNode(node1);
        result.current.addNode(node2);
      });

      expect(result.current.graph.nodes).toHaveLength(2);

      act(() => {
        result.current.undo();
      });

      expect(result.current.graph.nodes).toHaveLength(1);

      act(() => {
        result.current.undo();
      });

      expect(result.current.graph.nodes).toHaveLength(0);

      act(() => {
        result.current.redo();
        result.current.redo();
      });

      expect(result.current.graph.nodes).toHaveLength(2);
    });
  });

  describe('YAML Import/Export', () => {
    it('should import workflow from YAML', () => {
      const { result } = renderHook(() => useWorkflowBuilderStore());

      const yamlString = `
apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: test-workflow
  namespace: default
spec:
  description: Test workflow
  input:
    userId:
      type: string
      required: true
  output:
    result: "{{tasks.task-1.output.result}}"
  tasks:
    - id: task-1
      taskRef: test-task
      input:
        userId: "{{input.userId}}"
`;

      act(() => {
        result.current.importFromYaml(yamlString);
      });

      expect(result.current.metadata.name).toBe('test-workflow');
      expect(result.current.graph.nodes).toHaveLength(1);
      expect(result.current.graph.nodes[0].id).toBe('task-1');
      expect(result.current.inputSchema.userId).toBeDefined();
      expect(result.current.outputMapping.result).toBe('{{tasks.task-1.output.result}}');
    });

    it('should export workflow to YAML', () => {
      const { result } = renderHook(() => useWorkflowBuilderStore());

      const node: WorkflowBuilderNode = {
        id: 'task-1',
        type: 'task',
        position: { x: 100, y: 100 },
        data: { label: 'Task 1', taskRef: 'test-task' },
      };

      act(() => {
        result.current.setMetadata({
          name: 'export-test',
          namespace: 'default',
          description: 'Export test',
        });
        result.current.addNode(node);
      });

      const yamlString = result.current.exportToYaml();

      expect(typeof yamlString).toBe('string');
      expect(yamlString).toContain('apiVersion: workflow.example.com/v1');
      expect(yamlString).toContain('kind: Workflow');
      expect(yamlString).toContain('name: export-test');
      expect(yamlString).toContain('id: task-1');
    });

    it('should preserve data through import → export → import cycle', () => {
      const { result } = renderHook(() => useWorkflowBuilderStore());

      const yamlString = `
apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: roundtrip-test
  namespace: production
spec:
  description: Roundtrip test
  input:
    value:
      type: number
      required: true
  output:
    result: "{{tasks.task-1.output.result}}"
  tasks:
    - id: task-1
      taskRef: process-data
      timeout: "30s"
      retryCount: 3
`;

      act(() => {
        result.current.importFromYaml(yamlString);
      });

      const exported = result.current.exportToYaml();

      act(() => {
        result.current.reset();
        result.current.importFromYaml(exported);
      });

      expect(result.current.metadata.name).toBe('roundtrip-test');
      expect(result.current.metadata.namespace).toBe('production');
      expect(result.current.graph.nodes[0].data.timeout).toBe('30s');
      expect(result.current.graph.nodes[0].data.retryCount).toBe(3);
    });
  });

  describe('Metadata Management', () => {
    it('should update workflow metadata', () => {
      const { result } = renderHook(() => useWorkflowBuilderStore());

      act(() => {
        result.current.setMetadata({
          name: 'my-workflow',
          namespace: 'production',
          description: 'My workflow description',
        });
      });

      expect(result.current.metadata.name).toBe('my-workflow');
      expect(result.current.metadata.namespace).toBe('production');
      expect(result.current.metadata.description).toBe('My workflow description');
      expect(result.current.autosave.isDirty).toBe(true);
    });
  });

  describe('Input Schema Management', () => {
    it('should update input schema', () => {
      const { result } = renderHook(() => useWorkflowBuilderStore());

      act(() => {
        result.current.setInputSchema({
          userId: { type: 'string', required: true },
          email: { type: 'string', format: 'email' },
        });
      });

      expect(result.current.inputSchema.userId).toBeDefined();
      expect(result.current.inputSchema.email).toBeDefined();
      expect(result.current.autosave.isDirty).toBe(true);
    });
  });

  describe('Output Mapping Management', () => {
    it('should update output mapping', () => {
      const { result } = renderHook(() => useWorkflowBuilderStore());

      act(() => {
        result.current.setOutputMapping({
          result: '{{tasks.task-1.output.result}}',
          status: '{{tasks.task-1.output.status}}',
        });
      });

      expect(result.current.outputMapping.result).toBe('{{tasks.task-1.output.result}}');
      expect(result.current.outputMapping.status).toBe('{{tasks.task-1.output.status}}');
      expect(result.current.autosave.isDirty).toBe(true);
    });
  });

  describe('Validation', () => {
    it('should validate workflow and update validation state', () => {
      const { result } = renderHook(() => useWorkflowBuilderStore());

      const node: WorkflowBuilderNode = {
        id: 'task-1',
        type: 'task',
        position: { x: 100, y: 100 },
        data: { label: 'Task 1', taskRef: 'test-task' },
      };

      act(() => {
        result.current.addNode(node);
        result.current.validate();
      });

      expect(result.current.validation.isValid).toBeDefined();
    });
  });

  describe('Reset', () => {
    it('should reset store to initial state', () => {
      const { result } = renderHook(() => useWorkflowBuilderStore());

      const node: WorkflowBuilderNode = {
        id: 'task-1',
        type: 'task',
        position: { x: 100, y: 100 },
        data: { label: 'Task 1', taskRef: 'test-task' },
      };

      act(() => {
        result.current.setMetadata({ name: 'test', namespace: 'default', description: 'Test' });
        result.current.addNode(node);
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.graph.nodes).toEqual([]);
      expect(result.current.metadata.name).toBe('');
      expect(result.current.autosave.isDirty).toBe(false);
    });
  });
});
