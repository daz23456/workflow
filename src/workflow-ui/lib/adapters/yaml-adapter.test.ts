/**
 * Tests for YAML Adapter (Bidirectional Graph ↔ YAML Conversion)
 *
 * TDD RED Phase: These tests will fail until we create the YAML adapter.
 *
 * Critical Requirements:
 * - Lossless bidirectional conversion (Graph → YAML → Graph must preserve all data)
 * - Handle dependencies correctly (convert to/from dependencies array)
 * - Handle input schemas (Workflow.input format)
 * - Handle output mappings (Workflow.output format)
 * - Handle task properties (taskRef, input, timeout, etc.)
 */

import { describe, it, expect } from 'vitest';
import { graphToYaml, yamlToGraph, type WorkflowYaml } from './yaml-adapter';
import type {
  WorkflowBuilderState,
  WorkflowBuilderNode,
  WorkflowBuilderEdge,
} from '../types/workflow-builder';

describe('YAML Adapter', () => {
  describe('graphToYaml', () => {
    it('should convert empty graph to valid YAML structure', () => {
      const state: WorkflowBuilderState = {
        graph: { nodes: [], edges: [], parallelGroups: [] },
        metadata: { name: 'test-workflow', namespace: 'default', description: 'Test workflow' },
        inputSchema: {},
        outputMapping: {},
        selection: { nodeIds: [], edgeIds: [] },
        validation: { isValid: true, errors: [], warnings: [] },
        history: { past: [], future: [], currentCheckpoint: null },
        autosave: { isDirty: false, lastSaved: null, isAutosaving: false },
      };

      const yaml = graphToYaml(state) as WorkflowYaml;

      expect(yaml.apiVersion).toBe('workflow.example.com/v1');
      expect(yaml.kind).toBe('Workflow');
      expect(yaml.metadata.name).toBe('test-workflow');
      expect(yaml.metadata.namespace).toBe('default');
      expect(yaml.spec.description).toBe('Test workflow');
      expect(yaml.spec.tasks).toEqual([]);
      expect(yaml.spec.input).toEqual({});
      expect(yaml.spec.output).toEqual({});
    });

    it('should convert single task workflow to YAML', () => {
      const nodes: WorkflowBuilderNode[] = [
        {
          id: 'task-1',
          type: 'task',
          position: { x: 100, y: 100 },
          data: {
            label: 'Fetch User',
            taskRef: 'fetch-user',
            input: { userId: '{{input.userId}}' },
          },
        },
      ];

      const state: WorkflowBuilderState = {
        graph: { nodes, edges: [], parallelGroups: [] },
        metadata: { name: 'simple-fetch', namespace: 'default', description: 'Simple fetch' },
        inputSchema: {
          userId: { type: 'string', required: true, description: 'User ID' },
        },
        outputMapping: {
          name: '{{tasks.task-1.output.name}}',
          email: '{{tasks.task-1.output.email}}',
        },
        selection: { nodeIds: [], edgeIds: [] },
        validation: { isValid: true, errors: [], warnings: [] },
        history: { past: [], future: [], currentCheckpoint: null },
        autosave: { isDirty: false, lastSaved: null, isAutosaving: false },
      };

      const yaml = graphToYaml(state) as WorkflowYaml;

      expect(yaml.spec.tasks).toHaveLength(1);
      expect(yaml.spec.tasks[0].id).toBe('task-1');
      expect(yaml.spec.tasks[0].taskRef).toBe('fetch-user');
      expect(yaml.spec.tasks[0].input).toEqual({ userId: '{{input.userId}}' });
      expect(yaml.spec.input).toEqual({
        userId: { type: 'string', required: true, description: 'User ID' },
      });
      expect(yaml.spec.output).toEqual({
        name: '{{tasks.task-1.output.name}}',
        email: '{{tasks.task-1.output.email}}',
      });
    });

    it('should convert tasks with dependencies from edges', () => {
      const nodes: WorkflowBuilderNode[] = [
        {
          id: 'task-1',
          type: 'task',
          position: { x: 100, y: 100 },
          data: { label: 'Task 1', taskRef: 'task-a' },
        },
        {
          id: 'task-2',
          type: 'task',
          position: { x: 300, y: 100 },
          data: { label: 'Task 2', taskRef: 'task-b' },
        },
        {
          id: 'task-3',
          type: 'task',
          position: { x: 200, y: 200 },
          data: { label: 'Task 3', taskRef: 'task-c' },
        },
      ];

      const edges: WorkflowBuilderEdge[] = [
        { id: 'edge-1', source: 'task-1', target: 'task-3', type: 'dependency' },
        { id: 'edge-2', source: 'task-2', target: 'task-3', type: 'dependency' },
      ];

      const state: WorkflowBuilderState = {
        graph: { nodes, edges, parallelGroups: [] },
        metadata: { name: 'dependency-test', namespace: 'default', description: 'Dependency test' },
        inputSchema: {},
        outputMapping: {},
        selection: { nodeIds: [], edgeIds: [] },
        validation: { isValid: true, errors: [], warnings: [] },
        history: { past: [], future: [], currentCheckpoint: null },
        autosave: { isDirty: false, lastSaved: null, isAutosaving: false },
      };

      const yaml = graphToYaml(state) as WorkflowYaml;

      // Task 3 should have dependencies on task-1 and task-2 (inferred from edges)
      const task3 = yaml.spec.tasks.find((t: any) => t.id === 'task-3');
      expect(task3).toBeDefined();
      expect(task3!.dependencies).toBeDefined();
      expect(task3!.dependencies).toEqual(expect.arrayContaining(['task-1', 'task-2']));
      expect(task3!.dependencies).toHaveLength(2);

      // Tasks 1 and 2 should have no dependencies
      const task1 = yaml.spec.tasks.find((t: any) => t.id === 'task-1');
      const task2 = yaml.spec.tasks.find((t: any) => t.id === 'task-2');
      expect(task1!.dependencies).toBeUndefined();
      expect(task2!.dependencies).toBeUndefined();
    });

    it('should include task properties (timeout, condition, retryCount)', () => {
      const nodes: WorkflowBuilderNode[] = [
        {
          id: 'task-1',
          type: 'task',
          position: { x: 100, y: 100 },
          data: {
            label: 'Fetch Data',
            taskRef: 'fetch-data',
            timeout: '30s',
            condition: '{{input.enabled}}',
            retryCount: 3,
          },
        },
      ];

      const state: WorkflowBuilderState = {
        graph: { nodes, edges: [], parallelGroups: [] },
        metadata: { name: 'task-properties', namespace: 'default', description: 'Task properties' },
        inputSchema: {},
        outputMapping: {},
        selection: { nodeIds: [], edgeIds: [] },
        validation: { isValid: true, errors: [], warnings: [] },
        history: { past: [], future: [], currentCheckpoint: null },
        autosave: { isDirty: false, lastSaved: null, isAutosaving: false },
      };

      const yaml = graphToYaml(state) as WorkflowYaml;

      expect(yaml.spec.tasks[0].timeout).toBe('30s');
      expect(yaml.spec.tasks[0].condition).toBe('{{input.enabled}}');
      expect(yaml.spec.tasks[0].retryCount).toBe(3);
    });

    it('should convert graph to YAML string format', () => {
      const state: WorkflowBuilderState = {
        graph: { nodes: [], edges: [], parallelGroups: [] },
        metadata: { name: 'test', namespace: 'default', description: 'Test' },
        inputSchema: {},
        outputMapping: {},
        selection: { nodeIds: [], edgeIds: [] },
        validation: { isValid: true, errors: [], warnings: [] },
        history: { past: [], future: [], currentCheckpoint: null },
        autosave: { isDirty: false, lastSaved: null, isAutosaving: false },
      };

      const yamlString = graphToYaml(state, { format: 'string' });

      expect(typeof yamlString).toBe('string');
      expect(yamlString).toContain('apiVersion: workflow.example.com/v1');
      expect(yamlString).toContain('kind: Workflow');
      expect(yamlString).toContain('name: test');
    });
  });

  describe('yamlToGraph', () => {
    it('should convert minimal YAML to empty graph', () => {
      const yaml: WorkflowYaml = {
        apiVersion: 'workflow.example.com/v1',
        kind: 'Workflow',
        metadata: { name: 'test-workflow', namespace: 'default' },
        spec: {
          description: 'Test workflow',
          input: {},
          output: {},
          tasks: [],
        },
      };

      const state = yamlToGraph(yaml);

      expect(state.metadata.name).toBe('test-workflow');
      expect(state.metadata.namespace).toBe('default');
      expect(state.metadata.description).toBe('Test workflow');
      expect(state.graph.nodes).toEqual([]);
      expect(state.graph.edges).toEqual([]);
      expect(state.inputSchema).toEqual({});
      expect(state.outputMapping).toEqual({});
    });

    it('should convert single task YAML to graph node', () => {
      const yaml: WorkflowYaml = {
        apiVersion: 'workflow.example.com/v1',
        kind: 'Workflow',
        metadata: { name: 'simple-fetch', namespace: 'default' },
        spec: {
          description: 'Simple fetch',
          input: {
            userId: { type: 'string', required: true, description: 'User ID' },
          },
          output: {
            name: '{{tasks.get-user.output.name}}',
          },
          tasks: [
            {
              id: 'get-user',
              taskRef: 'fetch-user',
              input: { userId: '{{input.userId}}' },
            },
          ],
        },
      };

      const state = yamlToGraph(yaml);

      expect(state.graph.nodes).toHaveLength(1);
      expect(state.graph.nodes[0].id).toBe('get-user');
      expect(state.graph.nodes[0].type).toBe('task');
      expect(state.graph.nodes[0].data.taskRef).toBe('fetch-user');
      expect(state.graph.nodes[0].data.label).toBeDefined();
      expect(state.graph.nodes[0].position).toBeDefined();
      expect(state.graph.nodes[0].data.input).toEqual({ userId: '{{input.userId}}' });
      expect(state.inputSchema.userId).toEqual({
        type: 'string',
        required: true,
        description: 'User ID',
      });
      expect(state.outputMapping.name).toBe('{{tasks.get-user.output.name}}');
    });

    it('should convert task dependencies to graph edges', () => {
      const yaml: WorkflowYaml = {
        apiVersion: 'workflow.example.com/v1',
        kind: 'Workflow',
        metadata: { name: 'dependency-test', namespace: 'default' },
        spec: {
          description: 'Dependency test',
          input: {},
          output: {},
          tasks: [
            { id: 'task-1', taskRef: 'task-a' },
            { id: 'task-2', taskRef: 'task-b' },
            { id: 'task-3', taskRef: 'task-c', dependencies: ['task-1', 'task-2'] },
          ],
        },
      };

      const state = yamlToGraph(yaml);

      expect(state.graph.nodes).toHaveLength(3);
      expect(state.graph.edges).toHaveLength(2);

      const edge1 = state.graph.edges.find((e) => e.source === 'task-1' && e.target === 'task-3');
      const edge2 = state.graph.edges.find((e) => e.source === 'task-2' && e.target === 'task-3');

      expect(edge1).toBeDefined();
      expect(edge1!.type).toBe('dependency');
      expect(edge2).toBeDefined();
      expect(edge2!.type).toBe('dependency');
    });

    it('should preserve task properties (timeout, condition, retryCount)', () => {
      const yaml: WorkflowYaml = {
        apiVersion: 'workflow.example.com/v1',
        kind: 'Workflow',
        metadata: { name: 'task-properties', namespace: 'default' },
        spec: {
          description: 'Task properties',
          input: {},
          output: {},
          tasks: [
            {
              id: 'task-1',
              taskRef: 'fetch-data',
              timeout: '30s',
              condition: '{{input.enabled}}',
              retryCount: 3,
            },
          ],
        },
      };

      const state = yamlToGraph(yaml);

      expect(state.graph.nodes[0].data.timeout).toBe('30s');
      expect(state.graph.nodes[0].data.condition).toBe('{{input.enabled}}');
      expect(state.graph.nodes[0].data.retryCount).toBe(3);
    });

    it('should parse YAML string to graph', () => {
      const yamlString = `
apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: test
  namespace: default
spec:
  description: Test
  input: {}
  output: {}
  tasks: []
`;

      const state = yamlToGraph(yamlString);

      expect(state.metadata.name).toBe('test');
      expect(state.metadata.namespace).toBe('default');
      expect(state.graph.nodes).toEqual([]);
    });

    it('should handle inputMapping in tasks', () => {
      const yaml: WorkflowYaml = {
        apiVersion: 'workflow.example.com/v1',
        kind: 'Workflow',
        metadata: { name: 'input-mapping-test', namespace: 'default' },
        spec: {
          description: 'Input mapping test',
          input: {},
          output: {},
          tasks: [
            {
              id: 'task-1',
              taskRef: 'process-data',
              inputMapping: {
                data: '{{input.rawData}}',
                format: '{{input.format}}',
              },
            },
          ],
        },
      };

      const state = yamlToGraph(yaml);

      expect(state.graph.nodes[0].data.inputMapping).toEqual({
        data: '{{input.rawData}}',
        format: '{{input.format}}',
      });
    });
  });

  describe('Lossless Roundtrip Conversion', () => {
    it('should preserve all data through Graph → YAML → Graph roundtrip', () => {
      const originalNodes: WorkflowBuilderNode[] = [
        {
          id: 'task-1',
          type: 'task',
          position: { x: 100, y: 100 },
          data: {
            label: 'Fetch User',
            taskRef: 'fetch-user',
            timeout: '30s',
            retryCount: 2,
            input: { userId: '{{input.userId}}' },
          },
        },
        {
          id: 'task-2',
          type: 'task',
          position: { x: 300, y: 200 },
          data: {
            label: 'Process Data',
            taskRef: 'process-data',
            condition: '{{input.enabled}}',
            inputMapping: { data: '{{tasks.task-1.output.data}}' },
          },
        },
      ];

      const originalEdges: WorkflowBuilderEdge[] = [
        { id: 'edge-1', source: 'task-1', target: 'task-2', type: 'dependency' },
      ];

      const originalState: WorkflowBuilderState = {
        graph: { nodes: originalNodes, edges: originalEdges, parallelGroups: [] },
        metadata: {
          name: 'roundtrip-test',
          namespace: 'production',
          description: 'Roundtrip test',
        },
        inputSchema: {
          userId: { type: 'string', required: true },
          enabled: { type: 'boolean', default: true },
        },
        outputMapping: {
          result: '{{tasks.task-2.output.result}}',
        },
        selection: { nodeIds: [], edgeIds: [] },
        validation: { isValid: true, errors: [], warnings: [] },
        history: { past: [], future: [], currentCheckpoint: null },
        autosave: { isDirty: false, lastSaved: null, isAutosaving: false },
      };

      // Graph → YAML → Graph
      const yaml = graphToYaml(originalState);
      const reconstructedState = yamlToGraph(yaml);

      // Verify metadata preserved
      expect(reconstructedState.metadata).toEqual(originalState.metadata);

      // Verify input schema preserved
      expect(reconstructedState.inputSchema).toEqual(originalState.inputSchema);

      // Verify output mapping preserved
      expect(reconstructedState.outputMapping).toEqual(originalState.outputMapping);

      // Verify nodes preserved (positions may differ due to auto-layout)
      expect(reconstructedState.graph.nodes).toHaveLength(2);
      const node1 = reconstructedState.graph.nodes.find((n) => n.id === 'task-1')!;
      const node2 = reconstructedState.graph.nodes.find((n) => n.id === 'task-2')!;

      expect(node1.data.taskRef).toBe('fetch-user');
      expect(node1.data.timeout).toBe('30s');
      expect(node1.data.retryCount).toBe(2);
      expect(node1.data.input).toEqual({ userId: '{{input.userId}}' });

      expect(node2.data.taskRef).toBe('process-data');
      expect(node2.data.condition).toBe('{{input.enabled}}');
      expect(node2.data.inputMapping).toEqual({ data: '{{tasks.task-1.output.data}}' });

      // Verify edges preserved
      expect(reconstructedState.graph.edges).toHaveLength(1);
      expect(reconstructedState.graph.edges[0].source).toBe('task-1');
      expect(reconstructedState.graph.edges[0].target).toBe('task-2');
    });

    it('should be idempotent (multiple roundtrips preserve data)', () => {
      const state: WorkflowBuilderState = {
        graph: {
          nodes: [
            {
              id: 'task-1',
              type: 'task',
              position: { x: 100, y: 100 },
              data: { label: 'Task 1', taskRef: 'task-a' },
            },
          ],
          edges: [],
          parallelGroups: [],
        },
        metadata: { name: 'idempotent-test', namespace: 'default', description: 'Idempotent test' },
        inputSchema: { value: { type: 'number' } },
        outputMapping: { result: '{{tasks.task-1.output.result}}' },
        selection: { nodeIds: [], edgeIds: [] },
        validation: { isValid: true, errors: [], warnings: [] },
        history: { past: [], future: [], currentCheckpoint: null },
        autosave: { isDirty: false, lastSaved: null, isAutosaving: false },
      };

      // First roundtrip
      const yaml1 = graphToYaml(state);
      const state1 = yamlToGraph(yaml1);

      // Second roundtrip
      const yaml2 = graphToYaml(state1);
      const state2 = yamlToGraph(yaml2);

      // Third roundtrip
      const yaml3 = graphToYaml(state2);
      const state3 = yamlToGraph(yaml3);

      // All reconstructed states should be equivalent (ignoring position variations)
      expect(state1.metadata).toEqual(state2.metadata);
      expect(state2.metadata).toEqual(state3.metadata);
      expect(state1.inputSchema).toEqual(state2.inputSchema);
      expect(state2.inputSchema).toEqual(state3.inputSchema);
      expect(state1.outputMapping).toEqual(state2.outputMapping);
      expect(state2.outputMapping).toEqual(state3.outputMapping);
    });
  });
});
