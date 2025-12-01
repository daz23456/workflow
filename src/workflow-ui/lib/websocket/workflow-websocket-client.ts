/**
 * WorkflowWebSocketClient - SignalR client for real-time workflow execution events
 *
 * Connects to the WorkflowExecutionHub and provides:
 * - Connection management (connect, disconnect, reconnect)
 * - Event subscriptions (workflow started, task events, signal flow)
 * - Execution group subscriptions
 */

import * as signalR from '@microsoft/signalr';

// Event types matching backend models
export interface WorkflowStartedEvent {
  executionId: string;
  workflowName: string;
  timestamp: string;
}

export interface TaskStartedEvent {
  executionId: string;
  taskId: string;
  taskName: string;
  timestamp: string;
}

export interface TaskCompletedEvent {
  executionId: string;
  taskId: string;
  taskName: string;
  status: string;
  output: Record<string, unknown>;
  duration: string; // TimeSpan serialized as string
  timestamp: string;
}

export interface WorkflowCompletedEvent {
  executionId: string;
  workflowName: string;
  status: string;
  output: Record<string, unknown>;
  duration: string;
  timestamp: string;
}

export interface SignalFlowEvent {
  executionId: string;
  fromTaskId: string;
  toTaskId: string;
  timestamp: string;
}

// Event handler types
export type WorkflowStartedHandler = (event: WorkflowStartedEvent) => void;
export type TaskStartedHandler = (event: TaskStartedEvent) => void;
export type TaskCompletedHandler = (event: TaskCompletedEvent) => void;
export type WorkflowCompletedHandler = (event: WorkflowCompletedEvent) => void;
export type SignalFlowHandler = (event: SignalFlowEvent) => void;
export type ConnectionStateHandler = (state: signalR.HubConnectionState) => void;

export interface WorkflowWebSocketClientOptions {
  hubUrl?: string;
  reconnectDelays?: number[];
  onConnectionStateChange?: ConnectionStateHandler;
}

const DEFAULT_HUB_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:5001/hubs/workflow';
const DEFAULT_RECONNECT_DELAYS = [0, 2000, 5000, 10000, 30000];

export class WorkflowWebSocketClient {
  private connection: signalR.HubConnection;
  private options: Required<WorkflowWebSocketClientOptions>;
  private subscribedExecutions: Set<string> = new Set();

  // Event handlers
  private workflowStartedHandlers: Set<WorkflowStartedHandler> = new Set();
  private taskStartedHandlers: Set<TaskStartedHandler> = new Set();
  private taskCompletedHandlers: Set<TaskCompletedHandler> = new Set();
  private workflowCompletedHandlers: Set<WorkflowCompletedHandler> = new Set();
  private signalFlowHandlers: Set<SignalFlowHandler> = new Set();

  constructor(options: WorkflowWebSocketClientOptions = {}) {
    this.options = {
      hubUrl: options.hubUrl || DEFAULT_HUB_URL,
      reconnectDelays: options.reconnectDelays || DEFAULT_RECONNECT_DELAYS,
      onConnectionStateChange: options.onConnectionStateChange || (() => {}),
    };

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(this.options.hubUrl)
      .withAutomaticReconnect(this.options.reconnectDelays)
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.setupEventHandlers();
    this.setupConnectionHandlers();
  }

  private setupEventHandlers(): void {
    this.connection.on('WorkflowStarted', (event: WorkflowStartedEvent) => {
      this.workflowStartedHandlers.forEach((handler) => handler(event));
    });

    this.connection.on('TaskStarted', (event: TaskStartedEvent) => {
      this.taskStartedHandlers.forEach((handler) => handler(event));
    });

    this.connection.on('TaskCompleted', (event: TaskCompletedEvent) => {
      this.taskCompletedHandlers.forEach((handler) => handler(event));
    });

    this.connection.on('WorkflowCompleted', (event: WorkflowCompletedEvent) => {
      this.workflowCompletedHandlers.forEach((handler) => handler(event));
    });

    this.connection.on('SignalFlow', (event: SignalFlowEvent) => {
      this.signalFlowHandlers.forEach((handler) => handler(event));
    });
  }

  private setupConnectionHandlers(): void {
    this.connection.onreconnecting(() => {
      this.options.onConnectionStateChange(signalR.HubConnectionState.Reconnecting);
    });

    this.connection.onreconnected(() => {
      this.options.onConnectionStateChange(signalR.HubConnectionState.Connected);
      // Re-subscribe to all executions after reconnect
      this.resubscribeAll();
    });

    this.connection.onclose(() => {
      this.options.onConnectionStateChange(signalR.HubConnectionState.Disconnected);
    });
  }

  private async resubscribeAll(): Promise<void> {
    for (const executionId of this.subscribedExecutions) {
      try {
        await this.connection.invoke('SubscribeToExecution', executionId);
      } catch (error) {
        console.error(`Failed to resubscribe to execution ${executionId}:`, error);
      }
    }
  }

  /**
   * Connect to the SignalR hub
   */
  async connect(): Promise<void> {
    if (this.connection.state === signalR.HubConnectionState.Disconnected) {
      await this.connection.start();
      this.options.onConnectionStateChange(signalR.HubConnectionState.Connected);
    }
  }

  /**
   * Disconnect from the SignalR hub
   */
  async disconnect(): Promise<void> {
    if (this.connection.state !== signalR.HubConnectionState.Disconnected) {
      await this.connection.stop();
      this.subscribedExecutions.clear();
      this.options.onConnectionStateChange(signalR.HubConnectionState.Disconnected);
    }
  }

  /**
   * Get current connection state
   */
  get connectionState(): signalR.HubConnectionState {
    return this.connection.state;
  }

  /**
   * Subscribe to execution events for a specific execution ID
   */
  async subscribeToExecution(executionId: string): Promise<void> {
    if (this.connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('Not connected to hub');
    }
    await this.connection.invoke('SubscribeToExecution', executionId);
    this.subscribedExecutions.add(executionId);
  }

  /**
   * Unsubscribe from execution events
   */
  async unsubscribeFromExecution(executionId: string): Promise<void> {
    if (this.connection.state !== signalR.HubConnectionState.Connected) {
      return;
    }
    await this.connection.invoke('UnsubscribeFromExecution', executionId);
    this.subscribedExecutions.delete(executionId);
  }

  /**
   * Execute a workflow via WebSocket
   */
  async executeWorkflow(
    workflowName: string,
    input: Record<string, unknown>
  ): Promise<string> {
    if (this.connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('Not connected to hub');
    }
    const executionId = await this.connection.invoke<string>('ExecuteWorkflow', {
      workflowName,
      input,
    });
    // Auto-subscribe to the execution
    await this.subscribeToExecution(executionId);
    return executionId;
  }

  // Event subscription methods
  onWorkflowStarted(handler: WorkflowStartedHandler): () => void {
    this.workflowStartedHandlers.add(handler);
    return () => this.workflowStartedHandlers.delete(handler);
  }

  onTaskStarted(handler: TaskStartedHandler): () => void {
    this.taskStartedHandlers.add(handler);
    return () => this.taskStartedHandlers.delete(handler);
  }

  onTaskCompleted(handler: TaskCompletedHandler): () => void {
    this.taskCompletedHandlers.add(handler);
    return () => this.taskCompletedHandlers.delete(handler);
  }

  onWorkflowCompleted(handler: WorkflowCompletedHandler): () => void {
    this.workflowCompletedHandlers.add(handler);
    return () => this.workflowCompletedHandlers.delete(handler);
  }

  onSignalFlow(handler: SignalFlowHandler): () => void {
    this.signalFlowHandlers.add(handler);
    return () => this.signalFlowHandlers.delete(handler);
  }
}

// Singleton instance for app-wide use
let clientInstance: WorkflowWebSocketClient | null = null;

export function getWorkflowWebSocketClient(
  options?: WorkflowWebSocketClientOptions
): WorkflowWebSocketClient {
  if (!clientInstance) {
    clientInstance = new WorkflowWebSocketClient(options);
  }
  return clientInstance;
}

export function resetWorkflowWebSocketClient(): void {
  if (clientInstance) {
    clientInstance.disconnect();
    clientInstance = null;
  }
}
