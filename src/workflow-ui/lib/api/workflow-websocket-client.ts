import * as signalR from '@microsoft/signalr';

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
  duration: string;
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

export interface ExecuteWorkflowRequest {
  workflowName: string;
  input: Record<string, unknown>;
}

export type WorkflowStartedHandler = (event: WorkflowStartedEvent) => void;
export type TaskStartedHandler = (event: TaskStartedEvent) => void;
export type TaskCompletedHandler = (event: TaskCompletedEvent) => void;
export type WorkflowCompletedHandler = (event: WorkflowCompletedEvent) => void;
export type SignalFlowHandler = (event: SignalFlowEvent) => void;

export class WorkflowWebSocketClient {
  private connection: signalR.HubConnection | null = null;
  private hubUrl: string;
  private workflowStartedHandlers: WorkflowStartedHandler[] = [];
  private taskStartedHandlers: TaskStartedHandler[] = [];
  private taskCompletedHandlers: TaskCompletedHandler[] = [];
  private workflowCompletedHandlers: WorkflowCompletedHandler[] = [];
  private signalFlowHandlers: SignalFlowHandler[] = [];

  constructor(hubUrl: string = '/hubs/workflow') {
    this.hubUrl = hubUrl;
  }

  /**
   * Connect to the WebSocket hub
   */
  async connect(): Promise<void> {
    if (this.connection && this.connection.state === signalR.HubConnectionState.Connected) {
      return; // Already connected
    }

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(this.hubUrl)
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    // Register server-to-client event handlers
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

    await this.connection.start();
  }

  /**
   * Disconnect from the WebSocket hub
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      await this.connection.stop();
      this.connection = null;
    }
  }

  /**
   * Execute a workflow and return the execution ID
   */
  async executeWorkflow(
    workflowName: string,
    input: Record<string, unknown> = {}
  ): Promise<string> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('Not connected to WebSocket hub. Call connect() first.');
    }

    const request: ExecuteWorkflowRequest = {
      workflowName,
      input,
    };

    const executionId = await this.connection.invoke<string>('ExecuteWorkflow', request);
    return executionId;
  }

  /**
   * Subscribe to execution events for a specific execution ID
   */
  async subscribeToExecution(executionId: string): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('Not connected to WebSocket hub. Call connect() first.');
    }

    await this.connection.invoke('SubscribeToExecution', executionId);
  }

  /**
   * Unsubscribe from execution events
   */
  async unsubscribeFromExecution(executionId: string): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('Not connected to WebSocket hub. Call connect() first.');
    }

    await this.connection.invoke('UnsubscribeFromExecution', executionId);
  }

  /**
   * Join the global visualization group to receive ALL execution events.
   * Used by the neural network visualization to monitor all workflow activity.
   */
  async joinVisualizationGroup(): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('Not connected to WebSocket hub. Call connect() first.');
    }

    await this.connection.invoke('JoinVisualizationGroup');
  }

  /**
   * Leave the global visualization group
   */
  async leaveVisualizationGroup(): Promise<void> {
    if (!this.connection || this.connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('Not connected to WebSocket hub. Call connect() first.');
    }

    await this.connection.invoke('LeaveVisualizationGroup');
  }

  /**
   * Register a handler for workflow started events
   */
  onWorkflowStarted(handler: WorkflowStartedHandler): () => void {
    this.workflowStartedHandlers.push(handler);
    // Return unsubscribe function
    return () => {
      this.workflowStartedHandlers = this.workflowStartedHandlers.filter((h) => h !== handler);
    };
  }

  /**
   * Register a handler for task started events
   */
  onTaskStarted(handler: TaskStartedHandler): () => void {
    this.taskStartedHandlers.push(handler);
    // Return unsubscribe function
    return () => {
      this.taskStartedHandlers = this.taskStartedHandlers.filter((h) => h !== handler);
    };
  }

  /**
   * Register a handler for task completed events
   */
  onTaskCompleted(handler: TaskCompletedHandler): () => void {
    this.taskCompletedHandlers.push(handler);
    // Return unsubscribe function
    return () => {
      this.taskCompletedHandlers = this.taskCompletedHandlers.filter((h) => h !== handler);
    };
  }

  /**
   * Register a handler for workflow completed events
   */
  onWorkflowCompleted(handler: WorkflowCompletedHandler): () => void {
    this.workflowCompletedHandlers.push(handler);
    // Return unsubscribe function
    return () => {
      this.workflowCompletedHandlers = this.workflowCompletedHandlers.filter((h) => h !== handler);
    };
  }

  /**
   * Register a handler for signal flow events (data flowing between tasks)
   */
  onSignalFlow(handler: SignalFlowHandler): () => void {
    this.signalFlowHandlers.push(handler);
    // Return unsubscribe function
    return () => {
      this.signalFlowHandlers = this.signalFlowHandlers.filter((h) => h !== handler);
    };
  }

  /**
   * Get current connection state
   */
  getState(): signalR.HubConnectionState | null {
    return this.connection?.state ?? null;
  }
}
