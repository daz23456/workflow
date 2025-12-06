/**
 * Debugger Service Tests
 * TDD: RED phase - tests written before implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  Debugger,
  DebugSession,
  DebugState,
  Breakpoint,
  DebugContext
} from '../../src/services/debugger.js';
import type { WorkflowDefinition, TaskDefinition } from '../../src/loaders.js';

describe('Debugger Service', () => {
  let debugger_: Debugger;

  const sampleWorkflow: WorkflowDefinition = {
    apiVersion: 'workflow.example.com/v1',
    kind: 'Workflow',
    metadata: { name: 'test-workflow', namespace: 'default' },
    spec: {
      tasks: [
        { id: 'fetch-user', taskRef: 'get-user', input: { id: '{{input.userId}}' } },
        {
          id: 'fetch-orders',
          taskRef: 'get-orders',
          dependsOn: ['fetch-user'],
          input: { userId: '{{tasks.fetch-user.output.id}}' }
        },
        {
          id: 'process',
          taskRef: 'process-data',
          dependsOn: ['fetch-orders'],
          input: {}
        }
      ],
      input: {
        type: 'object',
        properties: { userId: { type: 'string' } }
      },
      output: {
        user: '{{tasks.fetch-user.output}}',
        orders: '{{tasks.fetch-orders.output}}'
      }
    }
  };

  const sampleTasks: TaskDefinition[] = [
    {
      apiVersion: 'workflow.example.com/v1',
      kind: 'WorkflowTask',
      metadata: { name: 'get-user', namespace: 'default' },
      spec: { type: 'http', request: { url: 'http://localhost/api/users/{{input.id}}', method: 'GET' } }
    },
    {
      apiVersion: 'workflow.example.com/v1',
      kind: 'WorkflowTask',
      metadata: { name: 'get-orders', namespace: 'default' },
      spec: { type: 'http', request: { url: 'http://localhost/api/orders', method: 'GET' } }
    }
  ];

  beforeEach(() => {
    debugger_ = new Debugger();
  });

  describe('Breakpoint Management', () => {
    it('should add breakpoint on task', () => {
      debugger_.addBreakpoint('fetch-user');

      const breakpoints = debugger_.listBreakpoints();
      expect(breakpoints).toHaveLength(1);
      expect(breakpoints[0].taskId).toBe('fetch-user');
      expect(breakpoints[0].enabled).toBe(true);
    });

    it('should remove breakpoint', () => {
      debugger_.addBreakpoint('fetch-user');
      debugger_.removeBreakpoint('fetch-user');

      expect(debugger_.listBreakpoints()).toHaveLength(0);
    });

    it('should toggle breakpoint enabled state', () => {
      debugger_.addBreakpoint('fetch-user');
      debugger_.toggleBreakpoint('fetch-user');

      const breakpoints = debugger_.listBreakpoints();
      expect(breakpoints[0].enabled).toBe(false);
    });

    it('should check if breakpoint exists', () => {
      debugger_.addBreakpoint('fetch-user');

      expect(debugger_.hasBreakpoint('fetch-user')).toBe(true);
      expect(debugger_.hasBreakpoint('fetch-orders')).toBe(false);
    });

    it('should clear all breakpoints', () => {
      debugger_.addBreakpoint('fetch-user');
      debugger_.addBreakpoint('fetch-orders');
      debugger_.clearBreakpoints();

      expect(debugger_.listBreakpoints()).toHaveLength(0);
    });
  });

  describe('Debug Session', () => {
    it('should create debug session', () => {
      const session = debugger_.createSession(sampleWorkflow, sampleTasks, { userId: '123' });

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.state).toBe('ready');
    });

    it('should start debug session and complete without breakpoints', async () => {
      const session = debugger_.createSession(sampleWorkflow, sampleTasks, { userId: '123' });
      await debugger_.start(session);

      // Without breakpoints, workflow completes immediately
      expect(session.state).toBe('completed');
    });

    it('should pause at breakpoint', async () => {
      debugger_.addBreakpoint('fetch-user');
      const session = debugger_.createSession(sampleWorkflow, sampleTasks, { userId: '123' });

      await debugger_.start(session);

      expect(session.state).toBe('paused');
      expect(session.currentTask).toBe('fetch-user');
    });

    it('should step to next task', async () => {
      debugger_.addBreakpoint('fetch-user');
      const session = debugger_.createSession(sampleWorkflow, sampleTasks, { userId: '123' });

      // Set mock response
      debugger_.setMockResponse('get-user', { status: 200, body: { id: '123', name: 'John' } });

      await debugger_.start(session);
      await debugger_.step(session);

      // After stepping, should move to next task or pause at next breakpoint
      expect(session.currentTask).not.toBe('fetch-user');
    });

    it('should continue to next breakpoint', async () => {
      debugger_.addBreakpoint('fetch-user');
      debugger_.addBreakpoint('process');
      const session = debugger_.createSession(sampleWorkflow, sampleTasks, { userId: '123' });

      // Set mock responses
      debugger_.setMockResponse('get-user', { status: 200, body: { id: '123' } });
      debugger_.setMockResponse('get-orders', { status: 200, body: [] });

      await debugger_.start(session);
      await debugger_.continue(session);

      expect(session.state).toBe('paused');
      expect(session.currentTask).toBe('process');
    });

    it('should complete execution when no more breakpoints', async () => {
      debugger_.addBreakpoint('fetch-user');
      const session = debugger_.createSession(sampleWorkflow, sampleTasks, { userId: '123' });

      // Set mock responses
      debugger_.setMockResponse('get-user', { status: 200, body: { id: '123' } });
      debugger_.setMockResponse('get-orders', { status: 200, body: [] });
      debugger_.setMockResponse('process-data', { status: 200, body: { result: 'done' } });

      await debugger_.start(session);
      await debugger_.continue(session);

      expect(session.state).toBe('completed');
    });

    it('should stop debug session', async () => {
      const session = debugger_.createSession(sampleWorkflow, sampleTasks, { userId: '123' });
      await debugger_.start(session);
      debugger_.stop(session);

      expect(session.state).toBe('stopped');
    });
  });

  describe('Context Inspection', () => {
    it('should get current context', async () => {
      debugger_.addBreakpoint('fetch-orders');
      const session = debugger_.createSession(sampleWorkflow, sampleTasks, { userId: '123' });

      // Set mock response for first task
      debugger_.setMockResponse('get-user', { status: 200, body: { id: '123', name: 'John' } });

      await debugger_.start(session);

      const context = debugger_.getContext(session);

      expect(context.input).toEqual({ userId: '123' });
      expect(context.tasks['fetch-user']).toBeDefined();
      expect(context.tasks['fetch-user'].output).toEqual({ id: '123', name: 'John' });
    });

    it('should get resolved input for current task', async () => {
      debugger_.addBreakpoint('fetch-orders');
      const session = debugger_.createSession(sampleWorkflow, sampleTasks, { userId: '123' });

      debugger_.setMockResponse('get-user', { status: 200, body: { id: '456' } });

      await debugger_.start(session);

      const resolvedInput = debugger_.getResolvedInput(session);

      expect(resolvedInput).toEqual({ userId: '456' });
    });

    it('should get last task output', async () => {
      debugger_.addBreakpoint('fetch-orders');
      const session = debugger_.createSession(sampleWorkflow, sampleTasks, { userId: '123' });

      debugger_.setMockResponse('get-user', { status: 200, body: { id: '123', name: 'John' } });

      await debugger_.start(session);

      const output = debugger_.getLastOutput(session);

      expect(output).toEqual({ id: '123', name: 'John' });
    });

    it('should modify context value', async () => {
      debugger_.addBreakpoint('fetch-user');
      const session = debugger_.createSession(sampleWorkflow, sampleTasks, { userId: '123' });

      await debugger_.start(session);

      debugger_.setContextValue(session, 'input.userId', '999');

      const context = debugger_.getContext(session);
      expect(context.input.userId).toBe('999');
    });
  });

  describe('Execution History', () => {
    it('should track execution history', async () => {
      debugger_.addBreakpoint('process');
      const session = debugger_.createSession(sampleWorkflow, sampleTasks, { userId: '123' });

      debugger_.setMockResponse('get-user', { status: 200, body: { id: '123' } });
      debugger_.setMockResponse('get-orders', { status: 200, body: [] });

      await debugger_.start(session);

      const history = debugger_.getHistory(session);

      expect(history).toHaveLength(2);
      expect(history[0].taskId).toBe('fetch-user');
      expect(history[1].taskId).toBe('fetch-orders');
    });

    it('should include duration in history', async () => {
      debugger_.addBreakpoint('fetch-orders');
      const session = debugger_.createSession(sampleWorkflow, sampleTasks, { userId: '123' });

      debugger_.setMockResponse('get-user', { status: 200, body: {} });

      await debugger_.start(session);

      const history = debugger_.getHistory(session);

      expect(history[0].duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('DebugSession interface', () => {
    it('should have correct structure', () => {
      const session: DebugSession = {
        id: 'debug-123',
        state: 'ready',
        workflow: sampleWorkflow,
        tasks: sampleTasks,
        input: { userId: '123' },
        currentTask: undefined,
        context: { input: { userId: '123' }, tasks: {} },
        history: []
      };

      expect(session.state).toBe('ready');
    });
  });

  describe('Breakpoint interface', () => {
    it('should have correct structure', () => {
      const breakpoint: Breakpoint = {
        taskId: 'fetch-user',
        enabled: true,
        condition: undefined,
        hitCount: 0
      };

      expect(breakpoint.taskId).toBe('fetch-user');
      expect(breakpoint.enabled).toBe(true);
    });
  });

  describe('DebugContext interface', () => {
    it('should have correct structure', () => {
      const context: DebugContext = {
        input: { userId: '123' },
        tasks: {
          'fetch-user': { output: { id: '123' }, status: 'completed' }
        }
      };

      expect(context.input.userId).toBe('123');
      expect(context.tasks['fetch-user'].status).toBe('completed');
    });
  });
});
