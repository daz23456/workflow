/**
 * Permission Check Generator
 * Generates permission check tasks for workflow security
 */

import type { TaskRef } from './workflow-scaffolder.js';

export interface PermissionCheckConfig {
  taskName: string;
  permission: string;
  userIdField: string;
}

/**
 * Generate a permission check task reference.
 * Creates a task that validates user permissions before workflow execution.
 */
export function generatePermissionCheckTask(config: PermissionCheckConfig): TaskRef {
  return {
    name: `step-0-${config.taskName}`,
    taskRef: config.taskName,
    dependsOn: [],
    input: {
      permission: config.permission,
      userId: `$.input.${config.userIdField}`
    }
  };
}

/**
 * Insert a permission check task at the beginning of a workflow.
 * Updates dependencies so the first task depends on the permission check.
 */
export function insertPermissionCheck(
  steps: TaskRef[],
  permissionTask: TaskRef
): TaskRef[] {
  // Update the first step to depend on the permission check
  const updatedSteps = steps.map((step, index) => {
    if (index === 0) {
      return {
        ...step,
        dependsOn: [...step.dependsOn, permissionTask.name]
      };
    }
    return step;
  });

  // Insert permission check at the beginning
  return [permissionTask, ...updatedSteps];
}
