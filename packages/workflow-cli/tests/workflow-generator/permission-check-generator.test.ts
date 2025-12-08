/**
 * Permission Check Generator Tests
 * TDD: RED phase - write failing tests first
 */

import { describe, it, expect } from 'vitest';
import {
  generatePermissionCheckTask,
  insertPermissionCheck,
  type PermissionCheckConfig
} from '../../src/workflow-generator/permission-check-generator.js';
import type { TaskRef } from '../../src/workflow-generator/workflow-scaffolder.js';

describe('permission-check-generator', () => {
  describe('generatePermissionCheckTask', () => {
    it('should generate a permission check task ref', () => {
      const config: PermissionCheckConfig = {
        taskName: 'check-user-permission',
        permission: 'read:users',
        userIdField: 'userId'
      };

      const taskRef = generatePermissionCheckTask(config);

      expect(taskRef.name).toBe('step-0-check-user-permission');
      expect(taskRef.taskRef).toBe('check-user-permission');
      expect(taskRef.dependsOn).toEqual([]);
      expect(taskRef.input).toEqual({
        permission: 'read:users',
        userId: '$.input.userId'
      });
    });

    it('should support custom input field mapping', () => {
      const config: PermissionCheckConfig = {
        taskName: 'check-admin-access',
        permission: 'admin:full',
        userIdField: 'adminId'
      };

      const taskRef = generatePermissionCheckTask(config);

      expect(taskRef.input).toEqual({
        permission: 'admin:full',
        userId: '$.input.adminId'
      });
    });
  });

  describe('insertPermissionCheck', () => {
    it('should insert permission check at the beginning and update dependencies', () => {
      const existingSteps: TaskRef[] = [
        {
          name: 'step-1-get-user',
          taskRef: 'get-user',
          dependsOn: [],
          input: { userId: '$.input.userId' }
        },
        {
          name: 'step-2-send-email',
          taskRef: 'send-email',
          dependsOn: ['step-1-get-user'],
          input: { to: '$.steps.step-1-get-user.outputs.email' }
        }
      ];

      const permissionTask = generatePermissionCheckTask({
        taskName: 'check-permission',
        permission: 'send:email',
        userIdField: 'userId'
      });

      const updatedSteps = insertPermissionCheck(existingSteps, permissionTask);

      // Permission check should be first
      expect(updatedSteps[0].name).toBe('step-0-check-permission');

      // First original step should depend on permission check
      expect(updatedSteps[1].name).toBe('step-1-get-user');
      expect(updatedSteps[1].dependsOn).toContain('step-0-check-permission');

      // Other dependencies should remain intact
      expect(updatedSteps[2].dependsOn).toContain('step-1-get-user');
    });
  });
});
