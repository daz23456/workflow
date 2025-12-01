/**
 * useWorkflowExecution Hook Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { HubConnectionState } from '@microsoft/signalr';

// Mock the WebSocket client
vi.mock('./workflow-websocket-client', () => {
  const mockClient = {
    connectionState: 'Disconnected',
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    executeWorkflow: vi.fn().mockResolvedValue('exec-123'),
    subscribeToExecution: vi.fn().mockResolvedValue(undefined),
    unsubscribeFromExecution: vi.fn().mockResolvedValue(undefined),
    onWorkflowStarted: vi.fn().mockReturnValue(() => {}),
    onTaskStarted: vi.fn().mockReturnValue(() => {}),
    onTaskCompleted: vi.fn().mockReturnValue(() => {}),
    onWorkflowCompleted: vi.fn().mockReturnValue(() => {}),
    onSignalFlow: vi.fn().mockReturnValue(() => {}),
  };

  return {
    WorkflowWebSocketClient: vi.fn().mockImplementation(() => mockClient),
    getWorkflowWebSocketClient: vi.fn().mockReturnValue(mockClient),
    resetWorkflowWebSocketClient: vi.fn(),
  };
});

// Mock the execution store
vi.mock('../stores/execution-store', () => ({
  useExecutionStore: vi.fn().mockReturnValue({
    connectionState: 'Disconnected',
    executionId: null,
    workflowName: null,
    status: 'idle',
    tasks: new Map(),
    signalFlows: [],
    output: null,
    error: null,
    setConnectionState: vi.fn(),
    setExecutionStarted: vi.fn(),
    setTaskStarted: vi.fn(),
    setTaskCompleted: vi.fn(),
    setExecutionCompleted: vi.fn(),
    addSignalFlow: vi.fn(),
    reset: vi.fn(),
  }),
}));

import { useWorkflowExecution } from './use-workflow-execution';
import { getWorkflowWebSocketClient } from './workflow-websocket-client';
import { useExecutionStore } from '../stores/execution-store';

describe('useWorkflowExecution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useWorkflowExecution());

      expect(result.current.connectionState).toBe('Disconnected');
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.executionId).toBeNull();
      expect(result.current.workflowName).toBeNull();
      expect(result.current.status).toBe('idle');
      expect(result.current.tasks.size).toBe(0);
      expect(result.current.signalFlows).toEqual([]);
      expect(result.current.output).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should initialize WebSocket client', () => {
      renderHook(() => useWorkflowExecution());

      expect(getWorkflowWebSocketClient).toHaveBeenCalled();
    });

    it('should register event handlers', () => {
      renderHook(() => useWorkflowExecution());

      const client = (getWorkflowWebSocketClient as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(client.onWorkflowStarted).toHaveBeenCalled();
      expect(client.onTaskStarted).toHaveBeenCalled();
      expect(client.onTaskCompleted).toHaveBeenCalled();
      expect(client.onWorkflowCompleted).toHaveBeenCalled();
      expect(client.onSignalFlow).toHaveBeenCalled();
    });
  });

  describe('auto-connect', () => {
    it('should not auto-connect by default', () => {
      renderHook(() => useWorkflowExecution());

      const client = (getWorkflowWebSocketClient as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(client.connect).not.toHaveBeenCalled();
    });

    it('should auto-connect when autoConnect is true', async () => {
      renderHook(() => useWorkflowExecution({ autoConnect: true }));

      const client = (getWorkflowWebSocketClient as ReturnType<typeof vi.fn>).mock.results[0].value;

      await waitFor(() => {
        expect(client.connect).toHaveBeenCalled();
      });
    });
  });

  describe('connect', () => {
    it('should call client connect', async () => {
      const { result } = renderHook(() => useWorkflowExecution());

      await act(async () => {
        await result.current.connect();
      });

      const client = (getWorkflowWebSocketClient as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(client.connect).toHaveBeenCalled();
    });
  });

  describe('disconnect', () => {
    it('should call client disconnect', async () => {
      const { result } = renderHook(() => useWorkflowExecution());

      await act(async () => {
        await result.current.disconnect();
      });

      const client = (getWorkflowWebSocketClient as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(client.disconnect).toHaveBeenCalled();
    });
  });

  describe('executeWorkflow', () => {
    it('should call client executeWorkflow and reset state', async () => {
      const mockReset = vi.fn();
      (useExecutionStore as ReturnType<typeof vi.fn>).mockReturnValue({
        connectionState: 'Disconnected',
        executionId: null,
        workflowName: null,
        status: 'idle',
        tasks: new Map(),
        signalFlows: [],
        output: null,
        error: null,
        setConnectionState: vi.fn(),
        setExecutionStarted: vi.fn(),
        setTaskStarted: vi.fn(),
        setTaskCompleted: vi.fn(),
        setExecutionCompleted: vi.fn(),
        addSignalFlow: vi.fn(),
        reset: mockReset,
      });

      const { result } = renderHook(() => useWorkflowExecution());

      let executionId: string | undefined;
      await act(async () => {
        executionId = await result.current.executeWorkflow('test-workflow', { input: 'value' });
      });

      const client = (getWorkflowWebSocketClient as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(mockReset).toHaveBeenCalled();
      expect(client.executeWorkflow).toHaveBeenCalledWith('test-workflow', { input: 'value' });
      expect(executionId).toBe('exec-123');
    });
  });

  describe('subscribeToExecution', () => {
    it('should call client subscribeToExecution', async () => {
      const { result } = renderHook(() => useWorkflowExecution());

      await act(async () => {
        await result.current.subscribeToExecution('exec-456');
      });

      const client = (getWorkflowWebSocketClient as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(client.subscribeToExecution).toHaveBeenCalledWith('exec-456');
    });
  });

  describe('unsubscribeFromExecution', () => {
    it('should call client unsubscribeFromExecution', async () => {
      const { result } = renderHook(() => useWorkflowExecution());

      await act(async () => {
        await result.current.unsubscribeFromExecution('exec-789');
      });

      const client = (getWorkflowWebSocketClient as ReturnType<typeof vi.fn>).mock.results[0].value;
      expect(client.unsubscribeFromExecution).toHaveBeenCalledWith('exec-789');
    });
  });

  describe('reset', () => {
    it('should call store reset', () => {
      const mockReset = vi.fn();
      (useExecutionStore as ReturnType<typeof vi.fn>).mockReturnValue({
        connectionState: 'Disconnected',
        executionId: null,
        workflowName: null,
        status: 'idle',
        tasks: new Map(),
        signalFlows: [],
        output: null,
        error: null,
        setConnectionState: vi.fn(),
        setExecutionStarted: vi.fn(),
        setTaskStarted: vi.fn(),
        setTaskCompleted: vi.fn(),
        setExecutionCompleted: vi.fn(),
        addSignalFlow: vi.fn(),
        reset: mockReset,
      });

      const { result } = renderHook(() => useWorkflowExecution());

      act(() => {
        result.current.reset();
      });

      expect(mockReset).toHaveBeenCalled();
    });
  });

  describe('connection state helpers', () => {
    it('should return isConnected true when connected', () => {
      (useExecutionStore as ReturnType<typeof vi.fn>).mockReturnValue({
        connectionState: HubConnectionState.Connected,
        executionId: null,
        workflowName: null,
        status: 'idle',
        tasks: new Map(),
        signalFlows: [],
        output: null,
        error: null,
        setConnectionState: vi.fn(),
        setExecutionStarted: vi.fn(),
        setTaskStarted: vi.fn(),
        setTaskCompleted: vi.fn(),
        setExecutionCompleted: vi.fn(),
        addSignalFlow: vi.fn(),
        reset: vi.fn(),
      });

      const { result } = renderHook(() => useWorkflowExecution());

      expect(result.current.isConnected).toBe(true);
      expect(result.current.isConnecting).toBe(false);
    });

    it('should return isConnecting true when connecting', () => {
      (useExecutionStore as ReturnType<typeof vi.fn>).mockReturnValue({
        connectionState: HubConnectionState.Connecting,
        executionId: null,
        workflowName: null,
        status: 'idle',
        tasks: new Map(),
        signalFlows: [],
        output: null,
        error: null,
        setConnectionState: vi.fn(),
        setExecutionStarted: vi.fn(),
        setTaskStarted: vi.fn(),
        setTaskCompleted: vi.fn(),
        setExecutionCompleted: vi.fn(),
        addSignalFlow: vi.fn(),
        reset: vi.fn(),
      });

      const { result } = renderHook(() => useWorkflowExecution());

      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should unsubscribe from events on unmount', () => {
      const unsubWorkflowStarted = vi.fn();
      const unsubTaskStarted = vi.fn();
      const unsubTaskCompleted = vi.fn();
      const unsubWorkflowCompleted = vi.fn();
      const unsubSignalFlow = vi.fn();

      const mockClient = {
        connectionState: 'Disconnected',
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        executeWorkflow: vi.fn().mockResolvedValue('exec-123'),
        subscribeToExecution: vi.fn().mockResolvedValue(undefined),
        unsubscribeFromExecution: vi.fn().mockResolvedValue(undefined),
        onWorkflowStarted: vi.fn().mockReturnValue(unsubWorkflowStarted),
        onTaskStarted: vi.fn().mockReturnValue(unsubTaskStarted),
        onTaskCompleted: vi.fn().mockReturnValue(unsubTaskCompleted),
        onWorkflowCompleted: vi.fn().mockReturnValue(unsubWorkflowCompleted),
        onSignalFlow: vi.fn().mockReturnValue(unsubSignalFlow),
      };

      (getWorkflowWebSocketClient as ReturnType<typeof vi.fn>).mockReturnValue(mockClient);

      const { unmount } = renderHook(() => useWorkflowExecution());

      unmount();

      expect(unsubWorkflowStarted).toHaveBeenCalled();
      expect(unsubTaskStarted).toHaveBeenCalled();
      expect(unsubTaskCompleted).toHaveBeenCalled();
      expect(unsubWorkflowCompleted).toHaveBeenCalled();
      expect(unsubSignalFlow).toHaveBeenCalled();
    });
  });
});
