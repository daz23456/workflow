import dagre from 'dagre';
import type { Node, Edge } from '@xyflow/react';

export type LayoutDirection = 'TB' | 'LR' | 'BT' | 'RL';

export interface LayoutOptions {
  direction?: LayoutDirection;
  nodeSpacing?: number;
  rankSpacing?: number;
}

const DEFAULT_NODE_WIDTH = 250;
const DEFAULT_NODE_HEIGHT = 80;
const DEFAULT_NODE_SPACING = 50;
const DEFAULT_RANK_SPACING = 100;

/**
 * Automatically layouts a React Flow graph using Dagre's hierarchical layout algorithm.
 *
 * @param nodes - Array of React Flow nodes to layout
 * @param edges - Array of React Flow edges defining connections
 * @param options - Optional layout configuration
 * @returns New array of nodes with calculated positions
 *
 * @example
 * ```typescript
 * const layoutedNodes = layoutGraph(nodes, edges, {
 *   direction: 'TB',
 *   nodeSpacing: 50,
 *   rankSpacing: 100
 * });
 * ```
 */
export function layoutGraph(nodes: Node[], edges: Edge[], options: LayoutOptions = {}): Node[] {
  const {
    direction = 'TB',
    nodeSpacing = DEFAULT_NODE_SPACING,
    rankSpacing = DEFAULT_RANK_SPACING,
  } = options;

  // Handle empty graph
  if (nodes.length === 0) {
    return [];
  }

  // Create a new directed graph
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  // Set graph direction and spacing
  // For TB/BT (vertical layouts), ranksep controls vertical spacing
  // For LR/RL (horizontal layouts), ranksep controls horizontal spacing
  const isVertical = direction === 'TB' || direction === 'BT';
  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: isVertical ? rankSpacing : nodeSpacing,
    ranksep: isVertical ? nodeSpacing : rankSpacing,
  });

  // Add nodes to the graph
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: DEFAULT_NODE_WIDTH,
      height: DEFAULT_NODE_HEIGHT,
    });
  });

  // Add edges to the graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate the layout
  dagre.layout(dagreGraph);

  // Map the calculated positions back to React Flow nodes
  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    return {
      ...node,
      position: {
        // Dagre returns center position, React Flow uses top-left
        x: nodeWithPosition.x - DEFAULT_NODE_WIDTH / 2,
        y: nodeWithPosition.y - DEFAULT_NODE_HEIGHT / 2,
      },
    };
  });
}

/**
 * Identifies groups of tasks that can run in parallel (no dependencies between them).
 *
 * @param nodes - Array of React Flow nodes
 * @param edges - Array of React Flow edges
 * @returns Array of parallel groups, each containing task IDs at the same level
 *
 * @example
 * ```typescript
 * const groups = identifyParallelGroups(nodes, edges);
 * // [
 * //   { level: 0, taskIds: ['task1'] },
 * //   { level: 1, taskIds: ['task2', 'task3'] },
 * //   { level: 2, taskIds: ['task4'] }
 * // ]
 * ```
 */
export function identifyParallelGroups(
  nodes: Node[],
  edges: Edge[]
): Array<{ level: number; taskIds: string[] }> {
  if (nodes.length === 0) {
    return [];
  }

  // Build adjacency list for dependencies
  const dependencies = new Map<string, Set<string>>();
  const dependents = new Map<string, Set<string>>();

  nodes.forEach((node) => {
    dependencies.set(node.id, new Set());
    dependents.set(node.id, new Set());
  });

  edges.forEach((edge) => {
    dependencies.get(edge.target)?.add(edge.source);
    dependents.get(edge.source)?.add(edge.target);
  });

  // BFS to assign levels
  const levels = new Map<string, number>();
  const queue: Array<{ id: string; level: number }> = [];

  // Find root nodes (no dependencies)
  nodes.forEach((node) => {
    if (dependencies.get(node.id)?.size === 0) {
      queue.push({ id: node.id, level: 0 });
      levels.set(node.id, 0);
    }
  });

  // Process queue
  while (queue.length > 0) {
    const { id, level } = queue.shift()!;

    // Process all dependent nodes
    dependents.get(id)?.forEach((depId) => {
      const deps = dependencies.get(depId)!;
      const allDepsProcessed = Array.from(deps).every((d) => levels.has(d));

      if (allDepsProcessed) {
        const maxDepLevel = Math.max(...Array.from(deps).map((d) => levels.get(d)!));
        const newLevel = maxDepLevel + 1;

        if (!levels.has(depId) || levels.get(depId)! < newLevel) {
          levels.set(depId, newLevel);
          queue.push({ id: depId, level: newLevel });
        }
      }
    });
  }

  // Group nodes by level
  const groups = new Map<number, string[]>();
  levels.forEach((level, taskId) => {
    if (!groups.has(level)) {
      groups.set(level, []);
    }
    groups.get(level)!.push(taskId);
  });

  // Convert to array and sort by level
  return Array.from(groups.entries())
    .map(([level, taskIds]) => ({ level, taskIds }))
    .sort((a, b) => a.level - b.level);
}
