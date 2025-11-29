/**
 * TypeScript types for Workflow Builder
 *
 * These types define the shape of the workflow builder state,
 * including graph structure, metadata, validation, and history for undo/redo.
 */

import type { Node, Edge } from '@xyflow/react';
import type { JSONSchema } from '@/types/workflow';

/**
 * Workflow metadata (name, namespace, description)
 */
export interface WorkflowMetadata {
  name: string;
  namespace: string;
  description: string;
}

/**
 * Workflow input parameter definition
 */
export interface WorkflowInputParameter {
  type: string;
  description?: string;
  required?: boolean;
  default?: any;
  format?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  pattern?: string;
  enum?: string[];
}

/**
 * Parallel group (tasks that can execute concurrently)
 */
export interface ParallelGroup {
  level: number;
  taskIds: string[];
}

/**
 * Workflow graph structure
 */
export interface WorkflowGraph {
  nodes: WorkflowBuilderNode[];
  edges: WorkflowBuilderEdge[];
  parallelGroups: ParallelGroup[];
}

/**
 * Node data for workflow builder
 */
export interface WorkflowBuilderNodeData extends Record<string, unknown> {
  label: string;
  taskRef?: string;
  level?: number;
  description?: string;
  timeout?: string;
  input?: Record<string, string>;
  inputMapping?: Record<string, string>;
  condition?: string;
  retryCount?: number;
  dependencies?: string[];
}

/**
 * Workflow builder node (extends React Flow Node)
 */
export interface WorkflowBuilderNode extends Node {
  id: string;
  type: 'task';
  position: { x: number; y: number };
  data: WorkflowBuilderNodeData;
}

/**
 * Workflow builder edge (extends React Flow Edge)
 */
export interface WorkflowBuilderEdge extends Edge {
  id: string;
  source: string;
  target: string;
  type: 'dependency';
  label?: string;
  animated?: boolean;
  style?: Record<string, string>;
  data?: {
    hasWarning?: boolean;
    hasError?: boolean;
    validationIssues?: Array<{
      severity: 'error' | 'warning' | 'info';
      message: string;
      sourceField?: string;
      targetField?: string;
      suggestedFix?: string;
    }>;
  };
}

/**
 * Validation state (errors, warnings, overall validity)
 */
export interface ValidationState {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Selection state (selected nodes and edges)
 */
export interface SelectionState {
  nodeIds: string[];
  edgeIds: string[];
}

/**
 * Checkpoint for history (undo/redo)
 */
export interface HistoryCheckpoint {
  graph: WorkflowGraph;
  metadata: WorkflowMetadata;
  inputSchema: Record<string, WorkflowInputParameter>;
  outputMapping: Record<string, string>;
}

/**
 * History state for undo/redo
 */
export interface HistoryState {
  past: HistoryCheckpoint[];
  future: HistoryCheckpoint[];
  currentCheckpoint: HistoryCheckpoint | null;
}

/**
 * Autosave state
 */
export interface AutosaveState {
  isDirty: boolean;
  lastSaved: Date | null;
  isAutosaving: boolean;
}

/**
 * Complete workflow builder state
 */
export interface WorkflowBuilderState {
  graph: WorkflowGraph;
  metadata: WorkflowMetadata;
  inputSchema: Record<string, WorkflowInputParameter>;
  outputMapping: Record<string, string>;
  selection: SelectionState;
  validation: ValidationState;
  history: HistoryState;
  autosave: AutosaveState;
}

/**
 * Create empty/initial workflow builder state
 */
export function createEmptyState(): WorkflowBuilderState {
  return {
    graph: {
      nodes: [],
      edges: [],
      parallelGroups: [],
    },
    metadata: {
      name: '',
      namespace: 'default',
      description: '',
    },
    inputSchema: {},
    outputMapping: {},
    selection: {
      nodeIds: [],
      edgeIds: [],
    },
    validation: {
      isValid: true,
      errors: [],
      warnings: [],
    },
    history: {
      past: [],
      future: [],
      currentCheckpoint: null,
    },
    autosave: {
      isDirty: false,
      lastSaved: null,
      isAutosaving: false,
    },
  };
}

/**
 * Create workflow metadata with default values
 */
export function createWorkflowMetadata(partial?: Partial<WorkflowMetadata>): WorkflowMetadata {
  return {
    name: partial?.name ?? '',
    namespace: partial?.namespace ?? 'default',
    description: partial?.description ?? '',
  };
}

/**
 * Type guard: check if node is valid
 */
export function isValidNode(node: any): node is WorkflowBuilderNode {
  if (!node || typeof node !== 'object') return false;
  if (typeof node.id !== 'string' || !node.id) return false;
  if (node.type !== 'task') return false;
  if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number')
    return false;
  if (!node.data || typeof node.data !== 'object') return false;
  if (typeof node.data.label !== 'string') return false;
  if (!node.data.taskRef || typeof node.data.taskRef !== 'string') return false;

  return true;
}

/**
 * Type guard: check if edge is valid
 */
export function isValidEdge(edge: any): edge is WorkflowBuilderEdge {
  if (!edge || typeof edge !== 'object') return false;
  if (typeof edge.id !== 'string' || !edge.id) return false;
  if (typeof edge.source !== 'string' || !edge.source) return false;
  if (typeof edge.target !== 'string' || !edge.target) return false;
  if (edge.type !== 'dependency') return false;

  // Self-referencing edges are invalid (task can't depend on itself)
  if (edge.source === edge.target) return false;

  return true;
}

/**
 * Check if validation state has errors
 */
export function hasValidationErrors(validation: ValidationState): boolean {
  return !validation.isValid || validation.errors.length > 0;
}

/**
 * Check if undo is possible
 */
export function canUndo(history: HistoryState): boolean {
  return history.past.length > 0;
}

/**
 * Check if redo is possible
 */
export function canRedo(history: HistoryState): boolean {
  return history.future.length > 0;
}
