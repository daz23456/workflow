/**
 * Visualization Store - Zustand store for 3D neural network visualization state
 *
 * Manages:
 * - Theme and signal flow presets
 * - 3D node positions and states
 * - Edge connections
 * - Active signal animations
 * - Camera state
 */

import { create } from 'zustand';
import type { ThemePresetName, SignalFlowPresetName, NodeSizeModeName } from './theme';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type NodeStatus = 'idle' | 'pending' | 'running' | 'succeeded' | 'failed';

export interface VisualizationNode {
  id: string;
  label: string;
  status: NodeStatus;
  position: Vector3;
  sizeScale?: number;
  output?: Record<string, unknown>;
}

export interface VisualizationEdge {
  id: string;
  source: string;
  target: string;
}

export interface ActiveSignal {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  startTime: number;
  progress: number;
}

export interface VisualizationState {
  // Theme settings
  themePreset: ThemePresetName;
  signalFlowPreset: SignalFlowPresetName;
  nodeSizeMode: NodeSizeModeName;

  // Graph data
  nodes: Map<string, VisualizationNode>;
  edges: VisualizationEdge[];

  // Active animations
  activeSignals: ActiveSignal[];

  // Camera
  cameraPosition: Vector3;
  cameraTarget: Vector3;

  // Actions - Theme
  setThemePreset: (preset: ThemePresetName) => void;
  setSignalFlowPreset: (preset: SignalFlowPresetName) => void;
  setNodeSizeMode: (mode: NodeSizeModeName) => void;

  // Actions - Nodes
  addNode: (node: VisualizationNode) => void;
  updateNodeStatus: (id: string, status: NodeStatus) => void;
  updateNodePosition: (id: string, position: Vector3) => void;
  removeNode: (id: string) => void;
  clearNodes: () => void;

  // Actions - Edges
  addEdge: (edge: VisualizationEdge) => void;
  removeEdge: (id: string) => void;
  clearEdges: () => void;

  // Actions - Signals
  triggerSignal: (fromNodeId: string, toNodeId: string) => string;
  updateSignalProgress: (id: string, progress: number) => void;
  completeSignal: (id: string) => void;
  clearSignals: () => void;

  // Actions - Camera
  setCameraPosition: (position: Vector3) => void;
  setCameraTarget: (target: Vector3) => void;

  // Actions - Layout
  setFromWorkflowGraph: (
    tasks: { id: string; name: string }[],
    dependencies: { from: string; to: string }[]
  ) => void;

  // Actions - Reset
  reset: () => void;
  clearGraph: () => void; // Clear nodes/edges/signals but preserve theme settings
}

const initialState = {
  themePreset: 'sci-fi-cyber' as ThemePresetName,
  signalFlowPreset: 'particle-stream' as SignalFlowPresetName,
  nodeSizeMode: 'uniform' as NodeSizeModeName,
  nodes: new Map<string, VisualizationNode>(),
  edges: [] as VisualizationEdge[],
  activeSignals: [] as ActiveSignal[],
  cameraPosition: { x: 0, y: 0, z: 10 },
  cameraTarget: { x: 0, y: 0, z: 0 },
};

let signalIdCounter = 0;

/**
 * Calculate 3D positions for nodes using a simple force-directed-like layout
 */
function calculateNodePositions(
  tasks: { id: string; name: string }[],
  dependencies: { from: string; to: string }[]
): Map<string, Vector3> {
  const positions = new Map<string, Vector3>();
  const taskCount = tasks.length;

  if (taskCount === 0) return positions;

  // Calculate depth (execution order) for each task
  const depths = new Map<string, number>();
  const dependencyMap = new Map<string, string[]>();

  // Build reverse dependency map
  tasks.forEach((task) => {
    dependencyMap.set(task.id, []);
  });

  dependencies.forEach((dep) => {
    const deps = dependencyMap.get(dep.to) || [];
    deps.push(dep.from);
    dependencyMap.set(dep.to, deps);
  });

  // Calculate depths using BFS
  const queue: string[] = [];
  tasks.forEach((task) => {
    const deps = dependencyMap.get(task.id) || [];
    if (deps.length === 0) {
      depths.set(task.id, 0);
      queue.push(task.id);
    }
  });

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentDepth = depths.get(currentId)!;

    // Find tasks that depend on current
    dependencies
      .filter((dep) => dep.from === currentId)
      .forEach((dep) => {
        const targetDeps = dependencyMap.get(dep.to) || [];
        const allDepsResolved = targetDeps.every((d) => depths.has(d));

        if (allDepsResolved) {
          const maxDepth = Math.max(...targetDeps.map((d) => depths.get(d) || 0));
          depths.set(dep.to, maxDepth + 1);
          queue.push(dep.to);
        }
      });
  }

  // Assign remaining (no dependencies calculated) tasks
  tasks.forEach((task) => {
    if (!depths.has(task.id)) {
      depths.set(task.id, 0);
    }
  });

  // Group tasks by depth
  const depthGroups = new Map<number, string[]>();
  depths.forEach((depth, id) => {
    const group = depthGroups.get(depth) || [];
    group.push(id);
    depthGroups.set(depth, group);
  });

  // Calculate positions
  const maxDepth = Math.max(...Array.from(depths.values()));
  const depthSpacing = 3; // Z spacing between depth layers
  const nodeSpacing = 2.5; // Spacing between nodes at same depth

  depthGroups.forEach((taskIds, depth) => {
    const groupSize = taskIds.length;
    const startY = ((groupSize - 1) * nodeSpacing) / 2;

    taskIds.forEach((taskId, index) => {
      // Spread nodes in a spiral/cluster pattern
      const angle = (index / groupSize) * Math.PI * 2;
      const radius = groupSize > 1 ? 1.5 : 0;

      const x = Math.cos(angle) * radius;
      const y = startY - index * nodeSpacing + Math.sin(angle) * radius * 0.5;
      const z = (maxDepth / 2 - depth) * depthSpacing;

      positions.set(taskId, { x, y, z });
    });
  });

  return positions;
}

export const useVisualizationStore = create<VisualizationState>((set, get) => ({
  ...initialState,

  setThemePreset: (preset: ThemePresetName) => {
    set({ themePreset: preset });
  },

  setSignalFlowPreset: (preset: SignalFlowPresetName) => {
    set({ signalFlowPreset: preset });
  },

  setNodeSizeMode: (mode: NodeSizeModeName) => {
    set({ nodeSizeMode: mode });
  },

  addNode: (node: VisualizationNode) => {
    const nodes = new Map(get().nodes);
    nodes.set(node.id, node);
    set({ nodes });
  },

  updateNodeStatus: (id: string, status: NodeStatus) => {
    const nodes = new Map(get().nodes);
    const node = nodes.get(id);
    if (node) {
      nodes.set(id, { ...node, status });
      set({ nodes });
    }
  },

  updateNodePosition: (id: string, position: Vector3) => {
    const nodes = new Map(get().nodes);
    const node = nodes.get(id);
    if (node) {
      nodes.set(id, { ...node, position });
      set({ nodes });
    }
  },

  removeNode: (id: string) => {
    const nodes = new Map(get().nodes);
    nodes.delete(id);
    set({ nodes });
  },

  clearNodes: () => {
    set({ nodes: new Map() });
  },

  addEdge: (edge: VisualizationEdge) => {
    set((state) => ({
      edges: [...state.edges, edge],
    }));
  },

  removeEdge: (id: string) => {
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== id),
    }));
  },

  clearEdges: () => {
    set({ edges: [] });
  },

  triggerSignal: (fromNodeId: string, toNodeId: string) => {
    const id = `signal-${++signalIdCounter}`;
    const signal: ActiveSignal = {
      id,
      fromNodeId,
      toNodeId,
      startTime: Date.now(),
      progress: 0,
    };

    set((state) => ({
      activeSignals: [...state.activeSignals, signal],
    }));

    return id;
  },

  updateSignalProgress: (id: string, progress: number) => {
    set((state) => ({
      activeSignals: state.activeSignals.map((s) =>
        s.id === id ? { ...s, progress } : s
      ),
    }));
  },

  completeSignal: (id: string) => {
    set((state) => ({
      activeSignals: state.activeSignals.filter((s) => s.id !== id),
    }));
  },

  clearSignals: () => {
    set({ activeSignals: [] });
  },

  setCameraPosition: (position: Vector3) => {
    set({ cameraPosition: position });
  },

  setCameraTarget: (target: Vector3) => {
    set({ cameraTarget: target });
  },

  setFromWorkflowGraph: (
    tasks: { id: string; name: string }[],
    dependencies: { from: string; to: string }[]
  ) => {
    const positions = calculateNodePositions(tasks, dependencies);

    const nodes = new Map<string, VisualizationNode>();
    tasks.forEach((task) => {
      nodes.set(task.id, {
        id: task.id,
        label: task.name,
        status: 'idle',
        position: positions.get(task.id) || { x: 0, y: 0, z: 0 },
      });
    });

    const edges: VisualizationEdge[] = dependencies.map((dep, index) => ({
      id: `edge-${index}`,
      source: dep.from,
      target: dep.to,
    }));

    set({ nodes, edges });
  },

  reset: () => {
    set({
      ...initialState,
      nodes: new Map(),
      edges: [],
      activeSignals: [],
    });
  },

  clearGraph: () => {
    // Clear nodes/edges/signals but preserve theme settings
    set({
      nodes: new Map(),
      edges: [],
      activeSignals: [],
    });
  },
}));

// Selector hooks
export const useThemePreset = () =>
  useVisualizationStore((state) => state.themePreset);
export const useSignalFlowPreset = () =>
  useVisualizationStore((state) => state.signalFlowPreset);
export const useNodeSizeMode = () =>
  useVisualizationStore((state) => state.nodeSizeMode);
export const useVisualizationNodes = () =>
  useVisualizationStore((state) => state.nodes);
export const useVisualizationEdges = () =>
  useVisualizationStore((state) => state.edges);
export const useActiveSignals = () =>
  useVisualizationStore((state) => state.activeSignals);
