/**
 * Visualization Store Tests
 * TDD: RED phase - tests written before implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useVisualizationStore } from './visualization-store';

describe('VisualizationStore', () => {
  beforeEach(() => {
    useVisualizationStore.getState().reset();
  });

  describe('initial state', () => {
    it('should have default theme preset', () => {
      const state = useVisualizationStore.getState();
      expect(state.themePreset).toBe('sci-fi-cyber');
    });

    it('should have default signal flow preset', () => {
      const state = useVisualizationStore.getState();
      expect(state.signalFlowPreset).toBe('particle-stream');
    });

    it('should have empty nodes', () => {
      const state = useVisualizationStore.getState();
      expect(state.nodes.size).toBe(0);
    });

    it('should have empty edges', () => {
      const state = useVisualizationStore.getState();
      expect(state.edges).toEqual([]);
    });

    it('should have no active signals', () => {
      const state = useVisualizationStore.getState();
      expect(state.activeSignals).toEqual([]);
    });
  });

  describe('theme management', () => {
    it('should set theme preset', () => {
      useVisualizationStore.getState().setThemePreset('bioluminescent');
      expect(useVisualizationStore.getState().themePreset).toBe('bioluminescent');
    });

    it('should set signal flow preset', () => {
      useVisualizationStore.getState().setSignalFlowPreset('electric-pulses');
      expect(useVisualizationStore.getState().signalFlowPreset).toBe('electric-pulses');
    });
  });

  describe('node management', () => {
    it('should add a node', () => {
      useVisualizationStore.getState().addNode({
        id: 'task-1',
        label: 'Fetch User',
        status: 'idle',
        position: { x: 0, y: 0, z: 0 },
      });

      const node = useVisualizationStore.getState().nodes.get('task-1');
      expect(node).toBeDefined();
      expect(node?.label).toBe('Fetch User');
      expect(node?.status).toBe('idle');
    });

    it('should update node status', () => {
      useVisualizationStore.getState().addNode({
        id: 'task-1',
        label: 'Fetch User',
        status: 'idle',
        position: { x: 0, y: 0, z: 0 },
      });

      useVisualizationStore.getState().updateNodeStatus('task-1', 'running');
      expect(useVisualizationStore.getState().nodes.get('task-1')?.status).toBe('running');
    });

    it('should update node position', () => {
      useVisualizationStore.getState().addNode({
        id: 'task-1',
        label: 'Fetch User',
        status: 'idle',
        position: { x: 0, y: 0, z: 0 },
      });

      useVisualizationStore.getState().updateNodePosition('task-1', { x: 1, y: 2, z: 3 });
      const node = useVisualizationStore.getState().nodes.get('task-1');
      expect(node?.position).toEqual({ x: 1, y: 2, z: 3 });
    });

    it('should remove a node', () => {
      useVisualizationStore.getState().addNode({
        id: 'task-1',
        label: 'Fetch User',
        status: 'idle',
        position: { x: 0, y: 0, z: 0 },
      });

      useVisualizationStore.getState().removeNode('task-1');
      expect(useVisualizationStore.getState().nodes.has('task-1')).toBe(false);
    });

    it('should clear all nodes', () => {
      useVisualizationStore.getState().addNode({
        id: 'task-1',
        label: 'Task 1',
        status: 'idle',
        position: { x: 0, y: 0, z: 0 },
      });
      useVisualizationStore.getState().addNode({
        id: 'task-2',
        label: 'Task 2',
        status: 'idle',
        position: { x: 1, y: 0, z: 0 },
      });

      useVisualizationStore.getState().clearNodes();
      expect(useVisualizationStore.getState().nodes.size).toBe(0);
    });
  });

  describe('edge management', () => {
    it('should add an edge', () => {
      useVisualizationStore.getState().addEdge({
        id: 'edge-1',
        source: 'task-1',
        target: 'task-2',
      });

      expect(useVisualizationStore.getState().edges).toHaveLength(1);
      expect(useVisualizationStore.getState().edges[0].source).toBe('task-1');
    });

    it('should remove an edge', () => {
      useVisualizationStore.getState().addEdge({
        id: 'edge-1',
        source: 'task-1',
        target: 'task-2',
      });

      useVisualizationStore.getState().removeEdge('edge-1');
      expect(useVisualizationStore.getState().edges).toHaveLength(0);
    });

    it('should clear all edges', () => {
      useVisualizationStore.getState().addEdge({
        id: 'edge-1',
        source: 'task-1',
        target: 'task-2',
      });
      useVisualizationStore.getState().addEdge({
        id: 'edge-2',
        source: 'task-2',
        target: 'task-3',
      });

      useVisualizationStore.getState().clearEdges();
      expect(useVisualizationStore.getState().edges).toHaveLength(0);
    });
  });

  describe('signal flow management', () => {
    it('should trigger a signal', () => {
      const signalId = useVisualizationStore.getState().triggerSignal('task-1', 'task-2');

      expect(signalId).toBeDefined();
      expect(useVisualizationStore.getState().activeSignals).toHaveLength(1);
      expect(useVisualizationStore.getState().activeSignals[0].fromNodeId).toBe('task-1');
      expect(useVisualizationStore.getState().activeSignals[0].toNodeId).toBe('task-2');
    });

    it('should complete a signal', () => {
      const signalId = useVisualizationStore.getState().triggerSignal('task-1', 'task-2');

      useVisualizationStore.getState().completeSignal(signalId);
      expect(useVisualizationStore.getState().activeSignals).toHaveLength(0);
    });

    it('should track multiple active signals', () => {
      useVisualizationStore.getState().triggerSignal('task-1', 'task-2');
      useVisualizationStore.getState().triggerSignal('task-1', 'task-3');

      expect(useVisualizationStore.getState().activeSignals).toHaveLength(2);
    });

    it('should clear all signals', () => {
      useVisualizationStore.getState().triggerSignal('task-1', 'task-2');
      useVisualizationStore.getState().triggerSignal('task-1', 'task-3');

      useVisualizationStore.getState().clearSignals();
      expect(useVisualizationStore.getState().activeSignals).toHaveLength(0);
    });
  });

  describe('camera state', () => {
    it('should have default camera position', () => {
      const state = useVisualizationStore.getState();
      expect(state.cameraPosition).toBeDefined();
      expect(state.cameraPosition.z).toBeGreaterThan(0);
    });

    it('should update camera position', () => {
      useVisualizationStore.getState().setCameraPosition({ x: 5, y: 10, z: 15 });
      expect(useVisualizationStore.getState().cameraPosition).toEqual({ x: 5, y: 10, z: 15 });
    });

    it('should have default camera target', () => {
      const state = useVisualizationStore.getState();
      expect(state.cameraTarget).toBeDefined();
    });

    it('should update camera target', () => {
      useVisualizationStore.getState().setCameraTarget({ x: 1, y: 2, z: 3 });
      expect(useVisualizationStore.getState().cameraTarget).toEqual({ x: 1, y: 2, z: 3 });
    });
  });

  describe('layout', () => {
    it('should set nodes from workflow graph', () => {
      const tasks = [
        { id: 'task-1', name: 'Fetch User' },
        { id: 'task-2', name: 'Process Data' },
        { id: 'task-3', name: 'Save Result' },
      ];
      const dependencies = [
        { from: 'task-1', to: 'task-2' },
        { from: 'task-2', to: 'task-3' },
      ];

      useVisualizationStore.getState().setFromWorkflowGraph(tasks, dependencies);

      expect(useVisualizationStore.getState().nodes.size).toBe(3);
      expect(useVisualizationStore.getState().edges).toHaveLength(2);
    });

    it('should calculate 3D positions for nodes', () => {
      const tasks = [
        { id: 'task-1', name: 'Task 1' },
        { id: 'task-2', name: 'Task 2' },
      ];
      const dependencies: { from: string; to: string }[] = [];

      useVisualizationStore.getState().setFromWorkflowGraph(tasks, dependencies);

      const node1 = useVisualizationStore.getState().nodes.get('task-1');
      const node2 = useVisualizationStore.getState().nodes.get('task-2');

      // Nodes should have different positions
      expect(node1?.position).toBeDefined();
      expect(node2?.position).toBeDefined();
    });
  });

  describe('reset', () => {
    it('should reset all state to defaults', () => {
      // Set up some state
      useVisualizationStore.getState().setThemePreset('bioluminescent');
      useVisualizationStore.getState().addNode({
        id: 'task-1',
        label: 'Test',
        status: 'running',
        position: { x: 0, y: 0, z: 0 },
      });
      useVisualizationStore.getState().triggerSignal('task-1', 'task-2');

      // Reset
      useVisualizationStore.getState().reset();

      const state = useVisualizationStore.getState();
      expect(state.themePreset).toBe('sci-fi-cyber');
      expect(state.nodes.size).toBe(0);
      expect(state.edges).toHaveLength(0);
      expect(state.activeSignals).toHaveLength(0);
    });
  });
});
