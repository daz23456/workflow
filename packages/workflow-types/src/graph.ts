/**
 * Execution graph for workflow task dependencies
 */
export interface ExecutionGraph {
  nodes: Map<string, GraphNode>;
  edges: GraphEdge[];
}

/**
 * Node in execution graph (represents a task)
 */
export interface GraphNode {
  id: string;
  taskRef: string;
  dependencies: string[];
  dependents: string[];
  level: number;
}

/**
 * Edge in execution graph (represents dependency)
 */
export interface GraphEdge {
  from: string;
  to: string;
}

/**
 * Parallel execution group (tasks that can run concurrently)
 */
export interface ParallelGroup {
  level: number;
  taskIds: string[];
}

/**
 * Graph layout result with positioned nodes
 */
export interface LayoutedGraph {
  nodes: PositionedNode[];
  edges: PositionedEdge[];
}

/**
 * Node with position for visualization
 */
export interface PositionedNode extends GraphNode {
  x: number;
  y: number;
  width?: number;
  height?: number;
}

/**
 * Edge with source/target positions
 */
export interface PositionedEdge extends GraphEdge {
  points?: { x: number; y: number }[];
}

/**
 * Layout options for graph visualization
 */
export interface LayoutOptions {
  direction?: 'TB' | 'LR' | 'BT' | 'RL';
  nodeWidth?: number;
  nodeHeight?: number;
  rankSep?: number;
  nodeSep?: number;
}
