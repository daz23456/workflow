/**
 * Workflow Builder Zustand Store with Command Pattern
 *
 * Central state management for the visual workflow builder.
 * Uses Command Pattern to enable undo/redo functionality.
 * Uses Immer for immutable state updates.
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { produce } from 'immer';
import {
  createEmptyState,
  type WorkflowBuilderState,
  type WorkflowBuilderNode,
  type WorkflowBuilderEdge,
  type WorkflowMetadata,
  type WorkflowInputParameter,
  type HistoryCheckpoint,
} from '../types/workflow-builder';
import { graphToYaml, yamlToGraph } from '../adapters/yaml-adapter';

/**
 * Detect cycles in a directed graph using DFS
 */
function hasCycle(
  nodes: WorkflowBuilderNode[],
  edges: WorkflowBuilderEdge[],
  newEdge?: WorkflowBuilderEdge
): boolean {
  const allEdges = newEdge ? [...edges, newEdge] : edges;
  const nodeIds = new Set(nodes.map((n) => n.id));

  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  for (const nodeId of nodeIds) {
    adjacency.set(nodeId, []);
  }
  for (const edge of allEdges) {
    if (adjacency.has(edge.source)) {
      adjacency.get(edge.source)!.push(edge.target);
    }
  }

  // DFS cycle detection
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recStack.add(nodeId);

    const neighbors = adjacency.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true;
      } else if (recStack.has(neighbor)) {
        return true; // Cycle detected
      }
    }

    recStack.delete(nodeId);
    return false;
  }

  for (const nodeId of nodeIds) {
    if (!visited.has(nodeId)) {
      if (dfs(nodeId)) return true;
    }
  }

  return false;
}

/**
 * Create a history checkpoint from current state
 */
function createCheckpoint(state: WorkflowBuilderState): HistoryCheckpoint {
  return {
    graph: {
      nodes: JSON.parse(JSON.stringify(state.graph.nodes)),
      edges: JSON.parse(JSON.stringify(state.graph.edges)),
      parallelGroups: JSON.parse(JSON.stringify(state.graph.parallelGroups)),
    },
    metadata: { ...state.metadata },
    inputSchema: { ...state.inputSchema },
    outputMapping: { ...state.outputMapping },
  };
}

/**
 * Restore state from a checkpoint
 */
function restoreCheckpoint(state: WorkflowBuilderState, checkpoint: HistoryCheckpoint): void {
  state.graph = {
    nodes: JSON.parse(JSON.stringify(checkpoint.graph.nodes)),
    edges: JSON.parse(JSON.stringify(checkpoint.graph.edges)),
    parallelGroups: JSON.parse(JSON.stringify(checkpoint.graph.parallelGroups)),
  };
  state.metadata = { ...checkpoint.metadata };
  state.inputSchema = { ...checkpoint.inputSchema };
  state.outputMapping = { ...checkpoint.outputMapping };
}

interface WorkflowBuilderStore extends WorkflowBuilderState {
  // Node operations
  addNode: (node: WorkflowBuilderNode) => void;
  updateNode: (id: string, updates: Partial<WorkflowBuilderNode>) => void;
  deleteNode: (id: string) => void;

  // Edge operations
  addEdge: (edge: WorkflowBuilderEdge) => void;
  deleteEdge: (id: string) => void;

  // Selection operations
  selectNodes: (nodeIds: string[]) => void;
  selectEdges: (edgeIds: string[]) => void;
  clearSelection: () => void;

  // Metadata operations
  setMetadata: (metadata: Partial<WorkflowMetadata>) => void;

  // Input schema operations
  setInputSchema: (schema: Record<string, WorkflowInputParameter>) => void;

  // Output mapping operations
  setOutputMapping: (mapping: Record<string, string>) => void;

  // Validation
  validate: () => void;

  // History operations (undo/redo)
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // YAML import/export
  importFromYaml: (yaml: string) => void;
  exportToYaml: () => string;

  // Utility
  reset: () => void;
}

export const useWorkflowBuilderStore = create<WorkflowBuilderStore>()(
  immer((set, get) => ({
    // Initialize with empty state
    ...createEmptyState(),

    // Node operations
    addNode: (node) =>
      set((state) => {
        // Save current state to history before mutation
        const checkpoint = createCheckpoint(state);
        state.history.past.push(checkpoint);
        state.history.future = []; // Clear redo stack

        state.graph.nodes.push(node);
        state.autosave.isDirty = true;
      }),

    updateNode: (id, updates) =>
      set((state) => {
        const checkpoint = createCheckpoint(state);
        state.history.past.push(checkpoint);
        state.history.future = [];

        const nodeIndex = state.graph.nodes.findIndex((n) => n.id === id);
        if (nodeIndex !== -1) {
          state.graph.nodes[nodeIndex] = {
            ...state.graph.nodes[nodeIndex],
            ...updates,
          };
          state.autosave.isDirty = true;
        }
      }),

    deleteNode: (id) =>
      set((state) => {
        const checkpoint = createCheckpoint(state);
        state.history.past.push(checkpoint);
        state.history.future = [];

        // Remove node
        state.graph.nodes = state.graph.nodes.filter((n) => n.id !== id);

        // Remove connected edges
        state.graph.edges = state.graph.edges.filter((e) => e.source !== id && e.target !== id);

        state.autosave.isDirty = true;
      }),

    // Edge operations
    addEdge: (edge) =>
      set((state) => {
        // Check for circular dependencies
        if (hasCycle(state.graph.nodes, state.graph.edges, edge)) {
          // Don't add the edge - would create a cycle
          state.validation.errors.push(
            `Cannot add edge from ${edge.source} to ${edge.target}: would create a circular dependency`
          );
          state.validation.isValid = false;
          return;
        }

        const checkpoint = createCheckpoint(state);
        state.history.past.push(checkpoint);
        state.history.future = [];

        state.graph.edges.push(edge);
        state.autosave.isDirty = true;
      }),

    deleteEdge: (id) =>
      set((state) => {
        const checkpoint = createCheckpoint(state);
        state.history.past.push(checkpoint);
        state.history.future = [];

        state.graph.edges = state.graph.edges.filter((e) => e.id !== id);
        state.autosave.isDirty = true;
      }),

    // Selection operations
    selectNodes: (nodeIds) =>
      set((state) => {
        state.selection.nodeIds = nodeIds;
      }),

    selectEdges: (edgeIds) =>
      set((state) => {
        state.selection.edgeIds = edgeIds;
      }),

    clearSelection: () =>
      set((state) => {
        state.selection.nodeIds = [];
        state.selection.edgeIds = [];
      }),

    // Metadata operations
    setMetadata: (metadata) =>
      set((state) => {
        const checkpoint = createCheckpoint(state);
        state.history.past.push(checkpoint);
        state.history.future = [];

        state.metadata = { ...state.metadata, ...metadata };
        state.autosave.isDirty = true;
      }),

    // Input schema operations
    setInputSchema: (schema) =>
      set((state) => {
        const checkpoint = createCheckpoint(state);
        state.history.past.push(checkpoint);
        state.history.future = [];

        state.inputSchema = schema;
        state.autosave.isDirty = true;
      }),

    // Output mapping operations
    setOutputMapping: (mapping) =>
      set((state) => {
        const checkpoint = createCheckpoint(state);
        state.history.past.push(checkpoint);
        state.history.future = [];

        state.outputMapping = mapping;
        state.autosave.isDirty = true;
      }),

    // Validation
    validate: () =>
      set((state) => {
        state.validation.errors = [];
        state.validation.warnings = [];

        // Check for circular dependencies
        if (hasCycle(state.graph.nodes, state.graph.edges)) {
          state.validation.errors.push('Workflow contains circular dependencies');
        }

        // Check for nodes without taskRef
        const nodesWithoutTaskRef = state.graph.nodes.filter((n) => !n.data.taskRef);
        if (nodesWithoutTaskRef.length > 0) {
          state.validation.errors.push(`${nodesWithoutTaskRef.length} task(s) missing taskRef`);
        }

        // Check for empty workflow name
        if (!state.metadata.name || state.metadata.name.trim() === '') {
          state.validation.errors.push('Workflow name is required');
        }

        state.validation.isValid = state.validation.errors.length === 0;
      }),

    // History operations (undo/redo)
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

    // YAML import/export
    importFromYaml: (yamlString) =>
      set((state) => {
        const checkpoint = createCheckpoint(state);
        state.history.past.push(checkpoint);
        state.history.future = [];

        const importedState = yamlToGraph(yamlString);

        // Replace state with imported state (keeping history and selection)
        state.graph = importedState.graph;
        state.metadata = importedState.metadata;
        state.inputSchema = importedState.inputSchema;
        state.outputMapping = importedState.outputMapping;
        state.validation = importedState.validation;

        state.autosave.isDirty = true;
      }),

    exportToYaml: () => {
      const state = get();
      return graphToYaml(state, { format: 'string' }) as string;
    },

    // Utility
    reset: () =>
      set((state) => {
        const emptyState = createEmptyState();
        Object.assign(state, emptyState);
      }),
  }))
);
