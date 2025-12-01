/**
 * useWorkflowExecution - React hook for real-time workflow execution
 *
 * Provides:
 * - Connection management to SignalR hub
 * - Real-time execution state updates
 * - Task-level event tracking
 * - Signal flow events for neural visualization
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { HubConnectionState } from '@microsoft/signalr';
import {
  WorkflowWebSocketClient,
  getWorkflowWebSocketClient,
  WorkflowStartedEvent,
  TaskStartedEvent,
  TaskCompletedEvent,
  WorkflowCompletedEvent,
  SignalFlowEvent,
} from './workflow-websocket-client';
import { useExecutionStore, TaskState } from '../stores/execution-store';

export interface UseWorkflowExecutionOptions {
  autoConnect?: boolean;
  hubUrl?: string;
}

export interface UseWorkflowExecutionReturn {
  // Connection state
  connectionState: HubConnectionState;
  isConnected: boolean;
  isConnecting: boolean;

  // Execution state
  executionId: string | null;
  workflowName: string | null;
  status: 'idle' | 'running' | 'succeeded' | 'failed';
  tasks: Map<string, TaskState>;
  signalFlows: SignalFlowEvent[];
  output: Record<string, unknown> | null;
  error: string | null;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  executeWorkflow: (workflowName: string, input: Record<string, unknown>) => Promise<string>;
  subscribeToExecution: (executionId: string) => Promise<void>;
  unsubscribeFromExecution: (executionId: string) => Promise<void>;
  reset: () => void;
}

export function useWorkflowExecution(
  options: UseWorkflowExecutionOptions = {}
): UseWorkflowExecutionReturn {
  const { autoConnect = false, hubUrl } = options;
  const clientRef = useRef<WorkflowWebSocketClient | null>(null);

  // Get store state and actions
  const {
    connectionState,
    executionId,
    workflowName,
    status,
    tasks,
    signalFlows,
    output,
    error,
    setConnectionState,
    setExecutionStarted,
    setTaskStarted,
    setTaskCompleted,
    setExecutionCompleted,
    addSignalFlow,
    reset,
  } = useExecutionStore();

  // Initialize client
  useEffect(() => {
    if (!clientRef.current) {
      clientRef.current = getWorkflowWebSocketClient({
        hubUrl,
        onConnectionStateChange: setConnectionState,
      });
    }

    const client = clientRef.current;

    // Set up event handlers
    const unsubWorkflowStarted = client.onWorkflowStarted((event: WorkflowStartedEvent) => {
      setExecutionStarted(event.executionId, event.workflowName);
    });

    const unsubTaskStarted = client.onTaskStarted((event: TaskStartedEvent) => {
      setTaskStarted(event.taskId, event.taskName);
    });

    const unsubTaskCompleted = client.onTaskCompleted((event: TaskCompletedEvent) => {
      setTaskCompleted(
        event.taskId,
        event.status.toLowerCase() as 'succeeded' | 'failed',
        event.output,
        event.duration
      );
    });

    const unsubWorkflowCompleted = client.onWorkflowCompleted((event: WorkflowCompletedEvent) => {
      setExecutionCompleted(
        event.status.toLowerCase() as 'succeeded' | 'failed',
        event.output,
        event.status.toLowerCase() === 'failed' ? 'Workflow execution failed' : undefined
      );
    });

    const unsubSignalFlow = client.onSignalFlow((event: SignalFlowEvent) => {
      addSignalFlow(event);
    });

    // Auto-connect if enabled
    if (autoConnect) {
      client.connect().catch(console.error);
    }

    // Cleanup
    return () => {
      unsubWorkflowStarted();
      unsubTaskStarted();
      unsubTaskCompleted();
      unsubWorkflowCompleted();
      unsubSignalFlow();
    };
  }, [
    hubUrl,
    autoConnect,
    setConnectionState,
    setExecutionStarted,
    setTaskStarted,
    setTaskCompleted,
    setExecutionCompleted,
    addSignalFlow,
  ]);

  const connect = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.connect();
    }
  }, []);

  const disconnect = useCallback(async () => {
    if (clientRef.current) {
      await clientRef.current.disconnect();
    }
  }, []);

  const executeWorkflow = useCallback(
    async (name: string, input: Record<string, unknown>): Promise<string> => {
      if (!clientRef.current) {
        throw new Error('WebSocket client not initialized');
      }
      reset();
      return clientRef.current.executeWorkflow(name, input);
    },
    [reset]
  );

  const subscribeToExecution = useCallback(async (execId: string) => {
    if (clientRef.current) {
      await clientRef.current.subscribeToExecution(execId);
    }
  }, []);

  const unsubscribeFromExecution = useCallback(async (execId: string) => {
    if (clientRef.current) {
      await clientRef.current.unsubscribeFromExecution(execId);
    }
  }, []);

  return {
    // Connection state
    connectionState,
    isConnected: connectionState === HubConnectionState.Connected,
    isConnecting: connectionState === HubConnectionState.Connecting,

    // Execution state
    executionId,
    workflowName,
    status,
    tasks,
    signalFlows,
    output,
    error,

    // Actions
    connect,
    disconnect,
    executeWorkflow,
    subscribeToExecution,
    unsubscribeFromExecution,
    reset,
  };
}
