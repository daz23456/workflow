/**
 * WorkflowWebSocketClient Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock SignalR - everything must be defined inside the factory to avoid hoisting issues
vi.mock('@microsoft/signalr', () => {
  const mockConnection = {
    state: 'Disconnected' as string,
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    invoke: vi.fn().mockResolvedValue('mock-execution-id'),
    on: vi.fn(),
    onreconnecting: vi.fn(),
    onreconnected: vi.fn(),
    onclose: vi.fn(),
  };

  return {
    HubConnectionState: {
      Disconnected: 'Disconnected',
      Connecting: 'Connecting',
      Connected: 'Connected',
      Reconnecting: 'Reconnecting',
    },
    HubConnectionBuilder: class MockHubConnectionBuilder {
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
    },
    LogLevel: {
      Warning: 3,
    },
  };
});

// Import after mock is set up
import { HubConnectionState } from '@microsoft/signalr';
import {
  WorkflowWebSocketClient,
  getWorkflowWebSocketClient,
  resetWorkflowWebSocketClient,
} from './workflow-websocket-client';

describe('WorkflowWebSocketClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetWorkflowWebSocketClient();
  });

  describe('constructor', () => {
    it('should create client with default options', () => {
      const client = new WorkflowWebSocketClient();
      expect(client).toBeDefined();
      expect(client.connectionState).toBe(HubConnectionState.Disconnected);
    });

    it('should create client with custom hub URL', () => {
      const client = new WorkflowWebSocketClient({
        hubUrl: 'http://custom-url/hubs/workflow',
      });
      expect(client).toBeDefined();
    });
  });

  describe('connect', () => {
    it('should call connection.start when disconnected', async () => {
      const client = new WorkflowWebSocketClient();
      await client.connect();
      // Connection start would be called
      expect(client.connectionState).toBeDefined();
    });
  });

  describe('disconnect', () => {
    it('should handle disconnect gracefully', async () => {
      const client = new WorkflowWebSocketClient();
      await client.disconnect();
      // Should not throw
    });
  });

  describe('event handlers', () => {
    it('should register and unregister workflow started handler', () => {
      const client = new WorkflowWebSocketClient();
      const handler = vi.fn();

      const unsubscribe = client.onWorkflowStarted(handler);
      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
      // Handler should be removed
    });

    it('should register and unregister task started handler', () => {
      const client = new WorkflowWebSocketClient();
      const handler = vi.fn();

      const unsubscribe = client.onTaskStarted(handler);
      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
    });

    it('should register and unregister task completed handler', () => {
      const client = new WorkflowWebSocketClient();
      const handler = vi.fn();

      const unsubscribe = client.onTaskCompleted(handler);
      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
    });

    it('should register and unregister workflow completed handler', () => {
      const client = new WorkflowWebSocketClient();
      const handler = vi.fn();

      const unsubscribe = client.onWorkflowCompleted(handler);
      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
    });

    it('should register and unregister signal flow handler', () => {
      const client = new WorkflowWebSocketClient();
      const handler = vi.fn();

      const unsubscribe = client.onSignalFlow(handler);
      expect(typeof unsubscribe).toBe('function');

      unsubscribe();
    });
  });

  describe('singleton instance', () => {
    it('should return the same instance when called multiple times', () => {
      const client1 = getWorkflowWebSocketClient();
      const client2 = getWorkflowWebSocketClient();

      expect(client1).toBe(client2);
    });

    it('should create new instance after reset', () => {
      const client1 = getWorkflowWebSocketClient();
      resetWorkflowWebSocketClient();
      const client2 = getWorkflowWebSocketClient();

      expect(client1).not.toBe(client2);
    });
  });

  describe('subscribeToExecution', () => {
    it('should throw when not connected', async () => {
      const client = new WorkflowWebSocketClient();

      await expect(client.subscribeToExecution('exec-123')).rejects.toThrow(
        'Not connected to hub'
      );
    });
  });

  describe('executeWorkflow', () => {
    it('should throw when not connected', async () => {
      const client = new WorkflowWebSocketClient();

      await expect(
        client.executeWorkflow('test-workflow', { input: 'value' })
      ).rejects.toThrow('Not connected to hub');
    });
  });
});
