/**
 * Execution Store Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { HubConnectionState } from '@microsoft/signalr';
import { useExecutionStore } from './execution-store';
import type { SignalFlowEvent } from '../websocket/workflow-websocket-client';

describe('ExecutionStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useExecutionStore.getState().reset();
    useExecutionStore.setState({ connectionState: HubConnectionState.Disconnected });
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useExecutionStore.getState();

      expect(state.connectionState).toBe(HubConnectionState.Disconnected);
      expect(state.executionId).toBeNull();
      expect(state.workflowName).toBeNull();
      expect(state.status).toBe('idle');
      expect(state.startedAt).toBeNull();
      expect(state.completedAt).toBeNull();
      expect(state.tasks.size).toBe(0);
      expect(state.signalFlows).toEqual([]);
      expect(state.output).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe('setConnectionState', () => {
    it('should update connection state', () => {
      useExecutionStore.getState().setConnectionState(HubConnectionState.Connected);

      expect(useExecutionStore.getState().connectionState).toBe(HubConnectionState.Connected);
    });

    it('should update to reconnecting state', () => {
      useExecutionStore.getState().setConnectionState(HubConnectionState.Reconnecting);

      expect(useExecutionStore.getState().connectionState).toBe(HubConnectionState.Reconnecting);
    });
  });

  describe('setExecutionStarted', () => {
    it('should set execution metadata', () => {
      const executionId = 'exec-123';
      const workflowName = 'test-workflow';

      useExecutionStore.getState().setExecutionStarted(executionId, workflowName);

      const state = useExecutionStore.getState();
      expect(state.executionId).toBe(executionId);
      expect(state.workflowName).toBe(workflowName);
      expect(state.status).toBe('running');
      expect(state.startedAt).toBeInstanceOf(Date);
      expect(state.completedAt).toBeNull();
    });

    it('should clear previous task state', () => {
      // Add a task first
      useExecutionStore.getState().setTaskStarted('task-1', 'task-one');
      expect(useExecutionStore.getState().tasks.size).toBe(1);

      // Start new execution
      useExecutionStore.getState().setExecutionStarted('exec-new', 'new-workflow');

      expect(useExecutionStore.getState().tasks.size).toBe(0);
    });

    it('should clear previous signal flows', () => {
      const signalFlow: SignalFlowEvent = {
        executionId: 'old-exec',
        fromTaskId: 'task-1',
        toTaskId: 'task-2',
        timestamp: new Date().toISOString(),
      };
      useExecutionStore.getState().addSignalFlow(signalFlow);
      expect(useExecutionStore.getState().signalFlows.length).toBe(1);

      // Start new execution
      useExecutionStore.getState().setExecutionStarted('exec-new', 'new-workflow');

      expect(useExecutionStore.getState().signalFlows.length).toBe(0);
    });
  });

  describe('setTaskStarted', () => {
    it('should add task with running status', () => {
      useExecutionStore.getState().setTaskStarted('task-1', 'fetch-user');

      const task = useExecutionStore.getState().tasks.get('task-1');
      expect(task).toBeDefined();
      expect(task?.taskId).toBe('task-1');
      expect(task?.taskName).toBe('fetch-user');
      expect(task?.status).toBe('running');
      expect(task?.startedAt).toBeInstanceOf(Date);
    });

    it('should handle multiple tasks', () => {
      useExecutionStore.getState().setTaskStarted('task-1', 'fetch-user');
      useExecutionStore.getState().setTaskStarted('task-2', 'process-data');

      expect(useExecutionStore.getState().tasks.size).toBe(2);
    });
  });

  describe('setTaskCompleted', () => {
    it('should update task to succeeded', () => {
      useExecutionStore.getState().setTaskStarted('task-1', 'fetch-user');
      useExecutionStore.getState().setTaskCompleted('task-1', 'succeeded', { data: 'result' }, '1.5s');

      const task = useExecutionStore.getState().tasks.get('task-1');
      expect(task?.status).toBe('succeeded');
      expect(task?.output).toEqual({ data: 'result' });
      expect(task?.duration).toBe('1.5s');
      expect(task?.completedAt).toBeInstanceOf(Date);
    });

    it('should update task to failed', () => {
      useExecutionStore.getState().setTaskStarted('task-1', 'fetch-user');
      useExecutionStore.getState().setTaskCompleted('task-1', 'failed');

      const task = useExecutionStore.getState().tasks.get('task-1');
      expect(task?.status).toBe('failed');
    });

    it('should preserve startedAt from previous state', () => {
      useExecutionStore.getState().setTaskStarted('task-1', 'fetch-user');
      const startedAt = useExecutionStore.getState().tasks.get('task-1')?.startedAt;

      useExecutionStore.getState().setTaskCompleted('task-1', 'succeeded');

      expect(useExecutionStore.getState().tasks.get('task-1')?.startedAt).toBe(startedAt);
    });
  });

  describe('setExecutionCompleted', () => {
    it('should set succeeded status with output', () => {
      useExecutionStore.getState().setExecutionStarted('exec-1', 'workflow');
      useExecutionStore.getState().setExecutionCompleted('succeeded', { result: 'done' });

      const state = useExecutionStore.getState();
      expect(state.status).toBe('succeeded');
      expect(state.output).toEqual({ result: 'done' });
      expect(state.error).toBeNull();
      expect(state.completedAt).toBeInstanceOf(Date);
    });

    it('should set failed status with error', () => {
      useExecutionStore.getState().setExecutionStarted('exec-1', 'workflow');
      useExecutionStore.getState().setExecutionCompleted('failed', undefined, 'Something went wrong');

      const state = useExecutionStore.getState();
      expect(state.status).toBe('failed');
      expect(state.error).toBe('Something went wrong');
    });
  });

  describe('addSignalFlow', () => {
    it('should add signal flow event', () => {
      const signalFlow: SignalFlowEvent = {
        executionId: 'exec-1',
        fromTaskId: 'task-1',
        toTaskId: 'task-2',
        timestamp: new Date().toISOString(),
      };

      useExecutionStore.getState().addSignalFlow(signalFlow);

      expect(useExecutionStore.getState().signalFlows).toHaveLength(1);
      expect(useExecutionStore.getState().signalFlows[0]).toEqual(signalFlow);
    });

    it('should accumulate multiple signal flows', () => {
      const flow1: SignalFlowEvent = {
        executionId: 'exec-1',
        fromTaskId: 'task-1',
        toTaskId: 'task-2',
        timestamp: new Date().toISOString(),
      };
      const flow2: SignalFlowEvent = {
        executionId: 'exec-1',
        fromTaskId: 'task-1',
        toTaskId: 'task-3',
        timestamp: new Date().toISOString(),
      };

      useExecutionStore.getState().addSignalFlow(flow1);
      useExecutionStore.getState().addSignalFlow(flow2);

      expect(useExecutionStore.getState().signalFlows).toHaveLength(2);
    });
  });

  describe('reset', () => {
    it('should reset all state except connection', () => {
      // Set up some state
      useExecutionStore.getState().setConnectionState(HubConnectionState.Connected);
      useExecutionStore.getState().setExecutionStarted('exec-1', 'workflow');
      useExecutionStore.getState().setTaskStarted('task-1', 'task-one');
      useExecutionStore.getState().setExecutionCompleted('succeeded', { data: 'result' });

      // Reset
      useExecutionStore.getState().reset();

      const state = useExecutionStore.getState();
      // Connection state should be preserved
      expect(state.connectionState).toBe(HubConnectionState.Connected);
      // Everything else should be reset
      expect(state.executionId).toBeNull();
      expect(state.workflowName).toBeNull();
      expect(state.status).toBe('idle');
      expect(state.tasks.size).toBe(0);
      expect(state.signalFlows).toEqual([]);
      expect(state.output).toBeNull();
      expect(state.error).toBeNull();
    });
  });
});
