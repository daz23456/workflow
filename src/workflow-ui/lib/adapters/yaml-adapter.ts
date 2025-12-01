/**
 * YAML Adapter - Bidirectional Graph ↔ YAML Conversion
 *
 * Provides lossless conversion between:
 * - Visual graph format (WorkflowBuilderState) used by React Flow
 * - Workflow YAML/CRD format used by Kubernetes
 *
 * Critical: Must maintain data integrity through roundtrip conversions.
 */

import * as yaml from 'js-yaml';
import type {
  WorkflowBuilderState,
  WorkflowBuilderNode,
  WorkflowBuilderEdge,
  WorkflowMetadata,
  WorkflowInputParameter,
} from '../types/workflow-builder';

/**
 * Workflow YAML structure (matches Kubernetes CRD format)
 */
export interface WorkflowYaml {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
  };
  spec: {
    description: string;
    input: Record<string, WorkflowInputParameter>;
    output: Record<string, string>;
    tasks: Array<{
      id: string;
      taskRef: string;
      description?: string;
      input?: Record<string, string>;
      inputMapping?: Record<string, string>;
      timeout?: string;
      condition?: string;
      retryCount?: number;
      dependsOn?: string[]; // CRD uses 'dependsOn', not 'dependencies'
    }>;
  };
}

/**
 * Options for graph to YAML conversion
 */
interface GraphToYamlOptions {
  format?: 'object' | 'string';
}

/**
 * Convert WorkflowBuilderState (graph) to Workflow YAML
 *
 * @param state - The workflow builder state
 * @param options - Conversion options
 * @returns Workflow YAML object or string
 */
export function graphToYaml(
  state: WorkflowBuilderState,
  options?: GraphToYamlOptions
): WorkflowYaml | string {
  const { format = 'object' } = options || {};

  // Build tasks array from nodes
  const tasks = state.graph.nodes.map((node) => {
    // Find all incoming edges to determine dependencies
    const dependencies = state.graph.edges
      .filter((edge) => edge.target === node.id)
      .map((edge) => edge.source);

    const task: WorkflowYaml['spec']['tasks'][number] = {
      id: node.id,
      taskRef: node.data.taskRef!,
    };

    // Add optional fields only if they exist
    if (node.data.description) {
      task.description = node.data.description;
    }

    if (node.data.input) {
      task.input = node.data.input;
    }

    if (node.data.inputMapping) {
      task.inputMapping = node.data.inputMapping;
    }

    if (node.data.timeout) {
      task.timeout = node.data.timeout;
    }

    if (node.data.condition) {
      task.condition = node.data.condition;
    }

    if (node.data.retryCount !== undefined) {
      task.retryCount = node.data.retryCount;
    }

    // Only add dependsOn array if there are dependencies (CRD uses 'dependsOn')
    if (dependencies.length > 0) {
      task.dependsOn = dependencies;
    }

    return task;
  });

  // Build the Workflow YAML object
  const workflowYaml: WorkflowYaml = {
    apiVersion: 'workflow.example.com/v1',
    kind: 'Workflow',
    metadata: {
      name: state.metadata.name,
      namespace: state.metadata.namespace,
    },
    spec: {
      description: state.metadata.description,
      input: state.inputSchema,
      output: state.outputMapping,
      tasks,
    },
  };

  // Return as string or object based on format option
  if (format === 'string') {
    return yaml.dump(workflowYaml, {
      indent: 2,
      lineWidth: -1, // Don't wrap long lines
      noRefs: true, // Don't use YAML references
    });
  }

  return workflowYaml;
}

/**
 * Convert Workflow YAML to WorkflowBuilderState (graph)
 *
 * @param input - Workflow YAML object or YAML string
 * @returns WorkflowBuilderState for use in the visual builder
 */
export function yamlToGraph(input: WorkflowYaml | string): WorkflowBuilderState {
  // Parse YAML string if needed
  const workflowYaml: WorkflowYaml =
    typeof input === 'string' ? (yaml.load(input) as WorkflowYaml) : input;

  // Convert tasks to nodes
  const nodes: WorkflowBuilderNode[] = workflowYaml.spec.tasks.map((task, index) => {
    // Auto-layout: arrange nodes in a grid (can be improved with dagre later)
    const position = {
      x: (index % 3) * 300 + 100, // 3 columns
      y: Math.floor(index / 3) * 150 + 100, // Row height 150px
    };

    return {
      id: task.id,
      type: 'task' as const,
      position,
      data: {
        label: task.description || task.taskRef || task.id,
        taskRef: task.taskRef,
        description: task.description,
        input: task.input,
        inputMapping: task.inputMapping,
        timeout: task.timeout,
        condition: task.condition,
        retryCount: task.retryCount,
        dependsOn: task.dependsOn || (task as any).dependencies, // Support both 'dependsOn' (CRD) and legacy 'dependencies'
      },
    };
  });

  // Convert task dependencies to edges (support both 'dependsOn' and legacy 'dependencies')
  const edges: WorkflowBuilderEdge[] = [];
  workflowYaml.spec.tasks.forEach((task) => {
    const deps = task.dependsOn || (task as any).dependencies;
    if (deps && deps.length > 0) {
      deps.forEach((depId: string) => {
        edges.push({
          id: `${depId}-to-${task.id}`,
          source: depId,
          target: task.id,
          type: 'dependency' as const,
        });
      });
    }
  });

  // Build metadata
  const metadata: WorkflowMetadata = {
    name: workflowYaml.metadata.name,
    namespace: workflowYaml.metadata.namespace || 'default',
    description: workflowYaml.spec.description || '',
  };

  // Build complete state
  return {
    graph: {
      nodes,
      edges,
      parallelGroups: [], // Can be computed from edges if needed
    },
    metadata,
    inputSchema: workflowYaml.spec.input || {},
    outputMapping: workflowYaml.spec.output || {},
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
    panel: {
      activePanel: null,
      selectedTaskId: null,
    },
  };
}
