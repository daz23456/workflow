/**
 * Transformers to adapt backend API responses to frontend types
 */

import type { WorkflowDetailResponse, WorkflowExecutionResponse } from './types';
import type { WorkflowDetail, GraphNode, GraphEdge, ParallelGroup } from '@/types/workflow';

/**
 * Transform backend WorkflowDetailResponse to frontend WorkflowDetail
 * Generates graph visualization data from task dependencies
 */
export function transformWorkflowDetail(backendResponse: WorkflowDetailResponse): WorkflowDetail {
  const { name, namespace, inputSchema, outputSchema, tasks, endpoints } = backendResponse;

  // Generate graph from tasks
  const graph = generateGraphFromTasks(tasks);

  // Transform tasks to match frontend expectations
  const transformedTasks = tasks.map((task) => ({
    id: task.id,
    taskRef: task.taskRef,
    description: task.description || `Task: ${task.taskRef}`,
    dependencies: task.dependencies,
    timeout: task.timeout,
  }));

  return {
    name,
    namespace,
    description: `Workflow: ${name}`, // Backend doesn't provide description, use name
    inputSchema: inputSchema || { type: 'object', properties: {}, required: [] },
    outputSchema: outputSchema || {},
    tasks: transformedTasks,
    graph,
    endpoints,
  };
}

/**
 * Generate graph visualization data from tasks
 */
function generateGraphFromTasks(
  tasks: Array<{
    id: string;
    taskRef: string;
    description?: string;
    dependencies: string[];
  }>
): { nodes: GraphNode[]; edges: GraphEdge[]; parallelGroups: ParallelGroup[] } {
  // Build dependency map
  const dependencyMap = new Map<string, string[]>();
  const reverseDependencyMap = new Map<string, string[]>();

  tasks.forEach((task) => {
    dependencyMap.set(task.id, task.dependencies || []);
    task.dependencies?.forEach((depId) => {
      if (!reverseDependencyMap.has(depId)) {
        reverseDependencyMap.set(depId, []);
      }
      reverseDependencyMap.get(depId)!.push(task.id);
    });
  });

  // Calculate execution levels (for layout)
  const levels = calculateExecutionLevels(tasks);

  // Generate nodes
  const nodes: GraphNode[] = tasks.map((task, index) => {
    const level = levels.get(task.id) || 0;
    return {
      id: task.id,
      type: 'task',
      data: {
        label: task.taskRef,
        taskRef: task.taskRef,
        level,
        description: task.description,
      },
      position: {
        x: level * 250, // Horizontal spacing
        y: index * 100, // Vertical spacing (will be adjusted for parallel groups)
      },
    };
  });

  // Generate edges from dependencies
  const edges: GraphEdge[] = [];
  tasks.forEach((task) => {
    task.dependencies?.forEach((depId) => {
      edges.push({
        id: `${depId}-${task.id}`,
        source: depId,
        target: task.id,
        type: 'dependency',
        animated: false,
      });
    });
  });

  // Find parallel groups (tasks at same level with no dependencies between them)
  const parallelGroups = findParallelGroups(tasks, levels);

  // Adjust node positions for parallel groups
  adjustNodePositionsForParallelGroups(nodes, parallelGroups);

  return { nodes, edges, parallelGroups };
}

/**
 * Calculate execution level for each task (0 = no dependencies, 1 = depends on level 0, etc.)
 */
function calculateExecutionLevels(
  tasks: Array<{ id: string; dependencies: string[] }>
): Map<string, number> {
  const levels = new Map<string, number>();
  const visited = new Set<string>();

  function calculateLevel(taskId: string): number {
    if (levels.has(taskId)) {
      return levels.get(taskId)!;
    }

    if (visited.has(taskId)) {
      // Circular dependency detected, return 0
      return 0;
    }

    visited.add(taskId);

    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.dependencies || task.dependencies.length === 0) {
      levels.set(taskId, 0);
      return 0;
    }

    const maxDepLevel = Math.max(...task.dependencies.map((depId) => calculateLevel(depId)));
    const level = maxDepLevel + 1;
    levels.set(taskId, level);
    return level;
  }

  tasks.forEach((task) => calculateLevel(task.id));
  return levels;
}

/**
 * Find tasks that can execute in parallel (same level, no dependencies between them)
 */
function findParallelGroups(
  tasks: Array<{ id: string; dependencies: string[] }>,
  levels: Map<string, number>
): ParallelGroup[] {
  const groupsByLevel = new Map<number, string[]>();

  tasks.forEach((task) => {
    const level = levels.get(task.id) || 0;
    if (!groupsByLevel.has(level)) {
      groupsByLevel.set(level, []);
    }
    groupsByLevel.get(level)!.push(task.id);
  });

  const parallelGroups: ParallelGroup[] = [];
  groupsByLevel.forEach((taskIds, level) => {
    if (taskIds.length > 1) {
      parallelGroups.push({ level, taskIds });
    }
  });

  return parallelGroups;
}

/**
 * Adjust node Y positions to distribute parallel tasks vertically
 */
function adjustNodePositionsForParallelGroups(
  nodes: GraphNode[],
  parallelGroups: ParallelGroup[]
): void {
  parallelGroups.forEach((group) => {
    const groupNodes = nodes.filter((node) => group.taskIds.includes(node.id));
    const startY = 50;
    const spacing = 120;

    groupNodes.forEach((node, index) => {
      node.position.y = startY + index * spacing;
    });
  });

  // Adjust non-parallel nodes
  const parallelTaskIds = new Set(parallelGroups.flatMap((g) => g.taskIds));
  let currentY =
    parallelGroups.length > 0
      ? Math.max(...nodes.filter((n) => parallelTaskIds.has(n.id)).map((n) => n.position.y)) + 150
      : 50;

  nodes
    .filter((node) => !parallelTaskIds.has(node.id))
    .forEach((node) => {
      node.position.y = currentY;
      currentY += 120;
    });
}

/**
 * Transform backend WorkflowExecutionResponse to frontend format
 * Maps taskDetails -> tasks for consistency with frontend expectations
 */
export function transformExecutionResponse(backendResponse: WorkflowExecutionResponse): any {
  return {
    ...backendResponse,
    tasks: backendResponse.taskDetails, // Map taskDetails to tasks
  };
}
