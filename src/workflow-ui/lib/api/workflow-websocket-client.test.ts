import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as signalR from '@microsoft/signalr';
import {
  WorkflowWebSocketClient,
  TaskStartedEvent,
  TaskCompletedEvent,
  WorkflowCompletedEvent,
} from './workflow-websocket-client';

// Create mock connection
const createMockConnection = () => ({
  start: vi.fn().mockResolvedValue(undefined),
  stop: vi.fn().mockResolvedValue(undefined),
  invoke: vi.fn(),
  on: vi.fn(),
  state: 1, // Connected state
});

let mockConnection = createMockConnection();

// Mock SignalR
vi.mock('@microsoft/signalr', () => {
  class MockHubConnectionBuilder {
    withUrl() {
      return this;
    }
    withAutomaticReconnect() {
      return this;
    }
    configureLogging() {
      return this;
    }
    build() {
      return mockConnection;
    }
  }

  return {
    HubConnectionBuilder: MockHubConnectionBuilder,
    HubConnectionState: {
      Disconnected: 0,
      Connected: 1,
      Connecting: 2,
      Reconnecting: 3,
      Disconnecting: 4,
    },
    LogLevel: {
      Information: 3,
    },
  };
});

describe('WorkflowWebSocketClient', () => {
  let client: WorkflowWebSocketClient;

  beforeEach(() => {
    vi.clearAllMocks();
    mockConnection = createMockConnection();
    client = new WorkflowWebSocketClient();
  });

  afterEach(async () => {
    await client.disconnect();
  });

  it('should connect to the WebSocket hub', async () => {
    await client.connect();

    expect(mockConnection.start).toHaveBeenCalled();
    expect(mockConnection.on).toHaveBeenCalled();
    expect(client.getState()).toBe(signalR.HubConnectionState.Connected);
  });

  it('should not connect twice if already connected', async () => {
    await client.connect();
    const firstStartCallCount = mockConnection.start.mock.calls.length;

    await client.connect(); // Second call should be no-op

    // Should not call start again
    expect(mockConnection.start).toHaveBeenCalledTimes(firstStartCallCount);
  });

  it('should disconnect from the WebSocket hub', async () => {
    await client.connect();
    await client.disconnect();

    expect(client.getState()).toBeNull();
  });

  it('should execute a workflow and return execution ID', async () => {
    await client.connect();

    const mockExecutionId = '123e4567-e89b-12d3-a456-426614174000';
    const mockConnection = (client as any).connection;
    mockConnection.invoke = vi.fn().mockResolvedValue(mockExecutionId);

    const result = await client.executeWorkflow('test-workflow', { key: 'value' });

    expect(result).toBe(mockExecutionId);
    expect(mockConnection.invoke).toHaveBeenCalledWith('ExecuteWorkflow', {
      workflowName: 'test-workflow',
      input: { key: 'value' },
    });
  });

  it('should throw error when executing workflow without connection', async () => {
    await expect(client.executeWorkflow('test-workflow')).rejects.toThrow(
      'Not connected to WebSocket hub'
    );
  });

  it('should subscribe to execution events', async () => {
    await client.connect();

    const executionId = '123e4567-e89b-12d3-a456-426614174000';
    const mockConnection = (client as any).connection;
    mockConnection.invoke = vi.fn().mockResolvedValue(undefined);

    await client.subscribeToExecution(executionId);

    expect(mockConnection.invoke).toHaveBeenCalledWith('SubscribeToExecution', executionId);
  });

  it('should unsubscribe from execution events', async () => {
    await client.connect();

    const executionId = '123e4567-e89b-12d3-a456-426614174000';
    const mockConnection = (client as any).connection;
    mockConnection.invoke = vi.fn().mockResolvedValue(undefined);

    await client.unsubscribeFromExecution(executionId);

    expect(mockConnection.invoke).toHaveBeenCalledWith('UnsubscribeFromExecution', executionId);
  });

  it('should handle task started events', async () => {
    await client.connect();

    const mockEvent: TaskStartedEvent = {
      executionId: '123e4567-e89b-12d3-a456-426614174000',
      taskId: 'task1',
      taskName: 'fetch-user',
      timestamp: '2023-01-01T00:00:00Z',
    };

    const handler = vi.fn();
    client.onTaskStarted(handler);

    // Simulate server event
    const mockConnection = (client as any).connection;
    const taskStartedCallback = mockConnection.on.mock.calls.find(
      (call: any[]) => call[0] === 'TaskStarted'
    )?.[1];
    taskStartedCallback(mockEvent);

    expect(handler).toHaveBeenCalledWith(mockEvent);
  });

  it('should handle task completed events', async () => {
    await client.connect();

    const mockEvent: TaskCompletedEvent = {
      executionId: '123e4567-e89b-12d3-a456-426614174000',
      taskId: 'task1',
      taskName: 'fetch-user',
      status: 'Succeeded',
      output: { id: 'user-123' },
      duration: '00:00:01',
      timestamp: '2023-01-01T00:00:01Z',
    };

    const handler = vi.fn();
    client.onTaskCompleted(handler);

    // Simulate server event
    const mockConnection = (client as any).connection;
    const taskCompletedCallback = mockConnection.on.mock.calls.find(
      (call: any[]) => call[0] === 'TaskCompleted'
    )?.[1];
    taskCompletedCallback(mockEvent);

    expect(handler).toHaveBeenCalledWith(mockEvent);
  });

  it('should handle workflow completed events', async () => {
    await client.connect();

    const mockEvent: WorkflowCompletedEvent = {
      executionId: '123e4567-e89b-12d3-a456-426614174000',
      workflowName: 'test-workflow',
      status: 'Succeeded',
      output: { result: 'success' },
      duration: '00:00:05',
      timestamp: '2023-01-01T00:00:05Z',
    };

    const handler = vi.fn();
    client.onWorkflowCompleted(handler);

    // Simulate server event
    const mockConnection = (client as any).connection;
    const workflowCompletedCallback = mockConnection.on.mock.calls.find(
      (call: any[]) => call[0] === 'WorkflowCompleted'
    )?.[1];
    workflowCompletedCallback(mockEvent);

    expect(handler).toHaveBeenCalledWith(mockEvent);
  });

  it('should allow unsubscribing from event handlers', async () => {
    await client.connect();

    const mockEvent: TaskStartedEvent = {
      executionId: '123e4567-e89b-12d3-a456-426614174000',
      taskId: 'task1',
      taskName: 'fetch-user',
      timestamp: '2023-01-01T00:00:00Z',
    };

    const handler = vi.fn();
    const unsubscribe = client.onTaskStarted(handler);

    // Unsubscribe
    unsubscribe();

    // Simulate server event
    const mockConnection = (client as any).connection;
    const taskStartedCallback = mockConnection.on.mock.calls.find(
      (call: any[]) => call[0] === 'TaskStarted'
    )?.[1];
    taskStartedCallback(mockEvent);

    // Handler should not be called
    expect(handler).not.toHaveBeenCalled();
  });
});
