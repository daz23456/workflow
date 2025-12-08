/**
 * Workflow Scaffolder Tests
 * TDD: RED phase - write failing tests first
 */

import { describe, it, expect } from 'vitest';
import {
  scaffoldWorkflow,
  generateTaskRefs,
  type ScaffoldOptions,
  type WorkflowScaffold,
  type TaskRef
} from '../../src/workflow-generator/workflow-scaffolder.js';
import type { TaskChain, TaskDefinition } from '../../src/workflow-generator/dependency-analyzer.js';

describe('workflow-scaffolder', () => {
  const getUserTask: TaskDefinition = {
    name: 'get-user',
    inputSchema: {
      type: 'object',
      properties: { userId: { type: 'string' } },
      required: ['userId']
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        email: { type: 'string' }
      }
    }
  };

  const sendEmailTask: TaskDefinition = {
    name: 'send-email',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string' },
        subject: { type: 'string' }
      },
      required: ['to']
    },
    outputSchema: {
      type: 'object',
      properties: { sent: { type: 'boolean' } }
    }
  };

  const taskChain: TaskChain = {
    tasks: [getUserTask, sendEmailTask],
    mappings: [[{ from: 'email', to: 'to' }]]
  };

  describe('generateTaskRefs', () => {
    it('should generate task refs with proper dependencies', () => {
      const refs = generateTaskRefs(taskChain);

      expect(refs).toHaveLength(2);
      expect(refs[0].name).toBe('step-1-get-user');
      expect(refs[0].taskRef).toBe('get-user');
      expect(refs[0].dependsOn).toEqual([]);
      expect(refs[1].name).toBe('step-2-send-email');
      expect(refs[1].taskRef).toBe('send-email');
      expect(refs[1].dependsOn).toEqual(['step-1-get-user']);
    });

    it('should generate input mappings from field mappings', () => {
      const refs = generateTaskRefs(taskChain);

      // Second task should have input mapping: to = $.steps.step-1-get-user.outputs.email
      expect(refs[1].input).toEqual({
        to: '$.steps.step-1-get-user.outputs.email'
      });
    });

    it('should handle single-task chains', () => {
      const singleTaskChain: TaskChain = {
        tasks: [getUserTask],
        mappings: []
      };

      const refs = generateTaskRefs(singleTaskChain);

      expect(refs).toHaveLength(1);
      expect(refs[0].name).toBe('step-1-get-user');
      expect(refs[0].dependsOn).toEqual([]);
      expect(refs[0].input).toEqual({});
    });
  });

  describe('scaffoldWorkflow', () => {
    it('should generate complete workflow scaffold', () => {
      const options: ScaffoldOptions = {
        workflowName: 'user-notification',
        description: 'Notify user by email'
      };

      const scaffold = scaffoldWorkflow(taskChain, options);

      expect(scaffold.apiVersion).toBe('workflow.io/v1');
      expect(scaffold.kind).toBe('Workflow');
      expect(scaffold.metadata.name).toBe('user-notification');
      expect(scaffold.spec.description).toBe('Notify user by email');
      expect(scaffold.spec.steps).toHaveLength(2);
    });

    it('should include input schema from first task', () => {
      const options: ScaffoldOptions = {
        workflowName: 'user-notification'
      };

      const scaffold = scaffoldWorkflow(taskChain, options);

      expect(scaffold.spec.input).toEqual({
        type: 'object',
        properties: { userId: { type: 'string' } },
        required: ['userId']
      });
    });

    it('should include output from last task', () => {
      const options: ScaffoldOptions = {
        workflowName: 'user-notification'
      };

      const scaffold = scaffoldWorkflow(taskChain, options);

      // Output should reference the last step's output
      expect(scaffold.spec.output).toEqual({
        sent: '$.steps.step-2-send-email.outputs.sent'
      });
    });
  });
});
