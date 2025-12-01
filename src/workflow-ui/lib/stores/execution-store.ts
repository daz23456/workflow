/**
 * Execution Store - Zustand store for real-time workflow execution state
 *
 * Manages:
 * - Connection state to SignalR hub
 * - Current execution state (id, workflow name, status)
 * - Task-level state (running, completed, failed)
 * - Signal flow events for neural visualization
 */

import { create } from 'zustand';
import { HubConnectionState } from '@microsoft/signalr';
import type { SignalFlowEvent } from '../websocket/workflow-websocket-client';

export interface TaskState {
  taskId: string;
  taskName: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed';
  output?: Record<string, unknown>;
  duration?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ExecutionState {
  // Connection state
  connectionState: HubConnectionState;

  // Execution metadata
  executionId: string | null;
  workflowName: string | null;
  status: 'idle' | 'running' | 'succeeded' | 'failed';
  startedAt: Date | null;
  completedAt: Date | null;

  // Task states
  tasks: Map<string, TaskState>;

  // Signal flow events (for neural visualization)
  signalFlows: SignalFlowEvent[];

  // Output and errors
  output: Record<string, unknown> | null;
  error: string | null;

  // Actions
  setConnectionState: (state: HubConnectionState) => void;
  setExecutionStarted: (executionId: string, workflowName: string) => void;
  setTaskStarted: (taskId: string, taskName: string) => void;
  setTaskCompleted: (
    taskId: string,
    status: 'succeeded' | 'failed',
    output?: Record<string, unknown>,
    duration?: string
  ) => void;
  setExecutionCompleted: (
    status: 'succeeded' | 'failed',
    output?: Record<string, unknown>,
    error?: string
  ) => void;
  addSignalFlow: (event: SignalFlowEvent) => void;
  reset: () => void;
}

const initialState = {
  connectionState: HubConnectionState.Disconnected,
  executionId: null,
  workflowName: null,
  status: 'idle' as const,
  startedAt: null,
  completedAt: null,
  tasks: new Map<string, TaskState>(),
  signalFlows: [] as SignalFlowEvent[],
  output: null,
  error: null,
};

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  ...initialState,

  setConnectionState: (connectionState: HubConnectionState) => {
    set({ connectionState });
  },

  setExecutionStarted: (executionId: string, workflowName: string) => {
    set({
      executionId,
      workflowName,
      status: 'running',
      startedAt: new Date(),
      completedAt: null,
      tasks: new Map(),
      signalFlows: [],
      output: null,
      error: null,
    });
  },

  setTaskStarted: (taskId: string, taskName: string) => {
    const tasks = new Map(get().tasks);
    tasks.set(taskId, {
      taskId,
      taskName,
      status: 'running',
      startedAt: new Date(),
    });
    set({ tasks });
  },

  setTaskCompleted: (
    taskId: string,
    status: 'succeeded' | 'failed',
    output?: Record<string, unknown>,
    duration?: string
  ) => {
    const tasks = new Map(get().tasks);
    const existing = tasks.get(taskId);
    tasks.set(taskId, {
      taskId,
      taskName: existing?.taskName || taskId,
      status,
      output,
      duration,
      startedAt: existing?.startedAt,
      completedAt: new Date(),
    });
    set({ tasks });
  },

  setExecutionCompleted: (
    status: 'succeeded' | 'failed',
    output?: Record<string, unknown>,
    error?: string
  ) => {
    set({
      status,
      completedAt: new Date(),
      output: output || null,
      error: error || null,
    });
  },

  addSignalFlow: (event: SignalFlowEvent) => {
    set((state) => ({
      signalFlows: [...state.signalFlows, event],
    }));
  },

  reset: () => {
    set({
      ...initialState,
      connectionState: get().connectionState, // Keep connection state
    });
  },
}));

// Selector hooks for specific state slices
export const useConnectionState = () => useExecutionStore((state) => state.connectionState);
export const useExecutionStatus = () => useExecutionStore((state) => state.status);
export const useExecutionTasks = () => useExecutionStore((state) => state.tasks);
export const useSignalFlows = () => useExecutionStore((state) => state.signalFlows);
