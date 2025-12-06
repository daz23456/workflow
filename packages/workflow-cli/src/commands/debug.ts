/**
 * Debug Command
 * Interactive workflow debugging with breakpoints and step execution
 */

import { loadWorkflow, loadTasksFromDirectory, WorkflowDefinition, TaskDefinition } from '../loaders.js';
import {
  Debugger,
  DebugSession,
  Breakpoint,
  DebugContext,
  HistoryEntry,
  MockTaskResponse,
  DebugState
} from '../services/debugger.js';

/**
 * Debug command options
 */
export interface DebugOptions {
  input?: Record<string, unknown>;
  inputJson?: string;
  tasksPath?: string;
  breakpoints?: string[];
}

/**
 * Debug command result
 */
export interface DebugCommandResult {
  success: boolean;
  sessionId?: string;
  state?: DebugState;
  currentTask?: string;
  breakpoints?: Breakpoint[];
  executionOrder?: string[];
  error?: string;
}

/**
 * Debug session state info
 */
export interface DebugSessionState {
  sessionId: string;
  state: DebugState;
  currentTask?: string;
  executionOrder: string[];
  currentIndex: number;
}

/**
 * Start a debug session for a workflow
 */
export async function debugWorkflow(
  workflowPath: string,
  options: DebugOptions
): Promise<DebugCommandResult> {
  try {
    // Parse JSON input if provided
    let input: Record<string, unknown> = options.input || {};
    if (options.inputJson) {
      try {
        input = JSON.parse(options.inputJson);
      } catch {
        return {
          success: false,
          error: 'Invalid JSON input'
        };
      }
    }

    // Load workflow
    const workflow = await loadWorkflow(workflowPath);

    // Load tasks
    const tasks = options.tasksPath
      ? await loadTasksFromDirectory(options.tasksPath)
      : [];

    // Create debugger and session
    const debugger_ = new Debugger();

    // Add breakpoints
    if (options.breakpoints) {
      for (const bp of options.breakpoints) {
        debugger_.addBreakpoint(bp);
      }
    }

    // Create session
    const session = debugger_.createSession(workflow, tasks, input);

    // Start session
    await debugger_.start(session);

    return {
      success: true,
      sessionId: session.id,
      state: session.state,
      currentTask: session.currentTask,
      breakpoints: debugger_.listBreakpoints(),
      executionOrder: session.executionOrder
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Interactive debug command class for step-by-step debugging
 */
export class DebugCommand {
  private debugger_: Debugger;
  private session: DebugSession | null = null;
  private workflow: WorkflowDefinition | null = null;
  private tasks: TaskDefinition[] = [];
  private input: Record<string, unknown>;
  private workflowPath: string;
  private options: DebugOptions;

  constructor(workflowPath: string, options: DebugOptions) {
    this.workflowPath = workflowPath;
    this.options = options;
    this.debugger_ = new Debugger();
    this.input = options.input || {};

    // Parse JSON input if provided
    if (options.inputJson) {
      try {
        this.input = JSON.parse(options.inputJson);
      } catch {
        // Will be handled during initialize
      }
    }
  }

  /**
   * Initialize the debug session
   */
  async initialize(): Promise<DebugCommandResult> {
    try {
      // Load workflow
      this.workflow = await loadWorkflow(this.workflowPath);

      // Load tasks
      this.tasks = this.options.tasksPath
        ? await loadTasksFromDirectory(this.options.tasksPath)
        : [];

      // Add breakpoints
      if (this.options.breakpoints) {
        for (const bp of this.options.breakpoints) {
          this.debugger_.addBreakpoint(bp);
        }
      }

      // Create session
      this.session = this.debugger_.createSession(this.workflow, this.tasks, this.input);

      // Start session
      await this.debugger_.start(this.session);

      return {
        success: true,
        sessionId: this.session.id,
        state: this.session.state,
        currentTask: this.session.currentTask,
        breakpoints: this.debugger_.listBreakpoints(),
        executionOrder: this.session.executionOrder
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Step to next task
   */
  async step(): Promise<DebugSessionState> {
    if (!this.session) {
      throw new Error('Debug session not initialized');
    }

    await this.debugger_.step(this.session);

    return {
      sessionId: this.session.id,
      state: this.session.state,
      currentTask: this.session.currentTask,
      executionOrder: this.session.executionOrder,
      currentIndex: this.session.currentIndex
    };
  }

  /**
   * Continue to next breakpoint
   */
  async continue(): Promise<DebugSessionState> {
    if (!this.session) {
      throw new Error('Debug session not initialized');
    }

    await this.debugger_.continue(this.session);

    return {
      sessionId: this.session.id,
      state: this.session.state,
      currentTask: this.session.currentTask,
      executionOrder: this.session.executionOrder,
      currentIndex: this.session.currentIndex
    };
  }

  /**
   * Stop debug session
   */
  stop(): DebugSessionState {
    if (!this.session) {
      throw new Error('Debug session not initialized');
    }

    this.debugger_.stop(this.session);

    return {
      sessionId: this.session.id,
      state: this.session.state,
      currentTask: this.session.currentTask,
      executionOrder: this.session.executionOrder,
      currentIndex: this.session.currentIndex
    };
  }

  /**
   * Get current context
   */
  getContext(): DebugContext {
    if (!this.session) {
      throw new Error('Debug session not initialized');
    }

    return this.debugger_.getContext(this.session);
  }

  /**
   * Get resolved input for current task
   */
  getResolvedInput(): Record<string, unknown> {
    if (!this.session) {
      throw new Error('Debug session not initialized');
    }

    return this.debugger_.getResolvedInput(this.session);
  }

  /**
   * Set context value
   */
  setContextValue(path: string, value: unknown): void {
    if (!this.session) {
      throw new Error('Debug session not initialized');
    }

    this.debugger_.setContextValue(this.session, path, value);
  }

  /**
   * Get execution history
   */
  getHistory(): HistoryEntry[] {
    if (!this.session) {
      throw new Error('Debug session not initialized');
    }

    return this.debugger_.getHistory(this.session);
  }

  /**
   * Add breakpoint
   */
  addBreakpoint(taskId: string): void {
    this.debugger_.addBreakpoint(taskId);
  }

  /**
   * Remove breakpoint
   */
  removeBreakpoint(taskId: string): void {
    this.debugger_.removeBreakpoint(taskId);
  }

  /**
   * List breakpoints
   */
  listBreakpoints(): Breakpoint[] {
    return this.debugger_.listBreakpoints();
  }

  /**
   * Set mock response for a task
   */
  setMockResponse(taskRef: string, response: MockTaskResponse): void {
    this.debugger_.setMockResponse(taskRef, response);
  }

  /**
   * Get session state
   */
  getState(): DebugSessionState {
    if (!this.session) {
      throw new Error('Debug session not initialized');
    }

    return {
      sessionId: this.session.id,
      state: this.session.state,
      currentTask: this.session.currentTask,
      executionOrder: this.session.executionOrder,
      currentIndex: this.session.currentIndex
    };
  }
}
