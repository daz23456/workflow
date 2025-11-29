import type {
  TaskDetail,
  WorkflowGraph,
  GraphNode,
  GraphEdge,
  ParallelGroup,
} from '@/types/workflow';

/**
 * Builds a workflow graph visualization from tasks array
 *
 * This is a client-side workaround for when the backend doesn't provide graph data.
 * It creates a simple horizontal layout showing all tasks.
 *
 * @param tasks - Array of task details from workflow
 * @returns WorkflowGraph with nodes, edges, and parallel groups
 */
export function buildGraphFromTasks(tasks: TaskDetail[]): WorkflowGraph {
  if (!tasks || tasks.length === 0) {
    return {
      nodes: [],
      edges: [],
      parallelGroups: [],
    };
  }

  // Create nodes from tasks
  const nodes: GraphNode[] = tasks.map((task, index) => ({
    id: task.id,
    type: 'task' as const,
    data: {
      label: task.taskRef || task.id, // Use taskRef as label, fallback to id
      taskRef: task.taskRef,
      description: task.description,
      status: 'idle',
    },
    position: {
      x: index * 300, // Horizontal spacing: 300px between tasks
      y: 100, // Fixed vertical position
    },
  }));

  // Create edges if tasks have dependencies
  const edges: GraphEdge[] = [];
  tasks.forEach((task) => {
    console.log(`Task ${task.id} dependencies:`, task.dependencies);
    if (task.dependencies && task.dependencies.length > 0) {
      task.dependencies.forEach((depId) => {
        console.log(`Creating edge: ${depId} -> ${task.id}`);
        edges.push({
          id: `${depId}-to-${task.id}`,
          source: depId,
          target: task.id,
          type: 'dependency' as const,
          animated: false,
        });
      });
    }
  });

  console.log(`Created ${edges.length} edges:`, edges);

  // Create parallel groups
  // If no dependencies, all tasks are parallel (level 0)
  // Otherwise, group by dependency levels
  const parallelGroups: ParallelGroup[] = [];

  if (edges.length === 0) {
    // No dependencies - all tasks run in parallel
    parallelGroups.push({
      level: 0,
      taskIds: tasks.map((t) => t.id),
    });
  } else {
    // TODO: Implement proper dependency level calculation
    // For now, treat each task as its own level
    tasks.forEach((task, index) => {
      parallelGroups.push({
        level: index,
        taskIds: [task.id],
      });
    });
  }

  return {
    nodes,
    edges,
    parallelGroups,
  };
}
