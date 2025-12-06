/**
 * Debug Command Tests
 * TDD: RED phase - tests written before implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  debugWorkflow,
  DebugOptions,
  DebugCommandResult,
  DebugCommand
} from '../../src/commands/debug.js';
import * as loaders from '../../src/loaders.js';
import { Debugger } from '../../src/services/debugger.js';
import type { WorkflowDefinition, TaskDefinition } from '../../src/loaders.js';

// Mock modules
vi.mock('../../src/loaders.js');
vi.mock('../../src/services/debugger.js');

describe('Debug Command', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  describe('debugWorkflow', () => {
    it('should create debug session', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const mockSession = {
        id: 'debug-123',
        state: 'ready',
        workflow: sampleWorkflow,
        tasks: sampleTasks,
        input: { userId: '123' },
        context: { input: { userId: '123' }, tasks: {} },
        history: [],
        executionOrder: ['fetch-user', 'fetch-orders', 'process'],
        currentIndex: 0
      };

      const mockDebugger = {
        createSession: vi.fn().mockReturnValue(mockSession),
        addBreakpoint: vi.fn(),
        start: vi.fn(),
        listBreakpoints: vi.fn().mockReturnValue([])
      };

      vi.mocked(Debugger).mockImplementation(() => mockDebugger as any);

      const result = await debugWorkflow('/path/to/workflow.yaml', {
        input: { userId: '123' },
        tasksPath: '/path/to/tasks'
      });

      expect(result.success).toBe(true);
      expect(result.sessionId).toBe('debug-123');
      expect(mockDebugger.createSession).toHaveBeenCalled();
    });

    it('should add breakpoints from options', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const mockSession = {
        id: 'debug-123',
        state: 'ready',
        workflow: sampleWorkflow,
        tasks: sampleTasks,
        input: { userId: '123' },
        context: { input: { userId: '123' }, tasks: {} },
        history: [],
        executionOrder: ['fetch-user', 'fetch-orders', 'process'],
        currentIndex: 0
      };

      const mockDebugger = {
        createSession: vi.fn().mockReturnValue(mockSession),
        addBreakpoint: vi.fn(),
        start: vi.fn(),
        listBreakpoints: vi.fn().mockReturnValue([
          { taskId: 'fetch-user', enabled: true, hitCount: 0 }
        ])
      };

      vi.mocked(Debugger).mockImplementation(() => mockDebugger as any);

      const result = await debugWorkflow('/path/to/workflow.yaml', {
        input: { userId: '123' },
        tasksPath: '/path/to/tasks',
        breakpoints: ['fetch-user']
      });

      expect(mockDebugger.addBreakpoint).toHaveBeenCalledWith('fetch-user');
      expect(result.breakpoints).toHaveLength(1);
    });

    it('should start session and pause at breakpoint', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const mockSession = {
        id: 'debug-123',
        state: 'paused',
        workflow: sampleWorkflow,
        tasks: sampleTasks,
        input: { userId: '123' },
        currentTask: 'fetch-user',
        context: { input: { userId: '123' }, tasks: {} },
        history: [],
        executionOrder: ['fetch-user', 'fetch-orders', 'process'],
        currentIndex: 0
      };

      const mockDebugger = {
        createSession: vi.fn().mockReturnValue(mockSession),
        addBreakpoint: vi.fn(),
        start: vi.fn(),
        listBreakpoints: vi.fn().mockReturnValue([
          { taskId: 'fetch-user', enabled: true, hitCount: 1 }
        ])
      };

      vi.mocked(Debugger).mockImplementation(() => mockDebugger as any);

      const result = await debugWorkflow('/path/to/workflow.yaml', {
        input: { userId: '123' },
        tasksPath: '/path/to/tasks',
        breakpoints: ['fetch-user']
      });

      expect(result.state).toBe('paused');
      expect(result.currentTask).toBe('fetch-user');
    });

    it('should handle workflow file not found', async () => {
      vi.mocked(loaders.loadWorkflow).mockRejectedValue(new Error('ENOENT: no such file'));

      const result = await debugWorkflow('/nonexistent.yaml', {
        input: {}
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('no such file');
    });

    it('should parse JSON input', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const mockSession = {
        id: 'debug-123',
        state: 'ready',
        workflow: sampleWorkflow,
        tasks: sampleTasks,
        input: { userId: '789' },
        context: { input: { userId: '789' }, tasks: {} },
        history: [],
        executionOrder: ['fetch-user', 'fetch-orders', 'process'],
        currentIndex: 0
      };

      const mockDebugger = {
        createSession: vi.fn().mockReturnValue(mockSession),
        addBreakpoint: vi.fn(),
        start: vi.fn(),
        listBreakpoints: vi.fn().mockReturnValue([])
      };

      vi.mocked(Debugger).mockImplementation(() => mockDebugger as any);

      const result = await debugWorkflow('/path/to/workflow.yaml', {
        inputJson: '{"userId": "789"}',
        tasksPath: '/path/to/tasks'
      });

      expect(result.success).toBe(true);
      expect(mockDebugger.createSession).toHaveBeenCalledWith(
        sampleWorkflow,
        sampleTasks,
        { userId: '789' }
      );
    });

    it('should handle invalid JSON input', async () => {
      const result = await debugWorkflow('/path/to/workflow.yaml', {
        inputJson: 'invalid json'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid JSON');
    });
  });

  describe('DebugCommand', () => {
    it('should execute step command', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const mockSession = {
        id: 'debug-123',
        state: 'paused',
        workflow: sampleWorkflow,
        tasks: sampleTasks,
        input: { userId: '123' },
        currentTask: 'fetch-user',
        context: { input: { userId: '123' }, tasks: {} },
        history: [],
        executionOrder: ['fetch-user', 'fetch-orders', 'process'],
        currentIndex: 0
      };

      const mockDebugger = {
        createSession: vi.fn().mockReturnValue(mockSession),
        addBreakpoint: vi.fn(),
        start: vi.fn(),
        step: vi.fn().mockImplementation(() => {
          mockSession.currentTask = 'fetch-orders';
          mockSession.currentIndex = 1;
        }),
        listBreakpoints: vi.fn().mockReturnValue([])
      };

      vi.mocked(Debugger).mockImplementation(() => mockDebugger as any);

      const cmd = new DebugCommand('/path/to/workflow.yaml', {
        input: { userId: '123' },
        tasksPath: '/path/to/tasks',
        breakpoints: ['fetch-user']
      });

      await cmd.initialize();
      const result = await cmd.step();

      expect(mockDebugger.step).toHaveBeenCalled();
      expect(result.currentTask).toBe('fetch-orders');
    });

    it('should execute continue command', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const mockSession = {
        id: 'debug-123',
        state: 'paused',
        workflow: sampleWorkflow,
        tasks: sampleTasks,
        input: { userId: '123' },
        currentTask: 'fetch-user',
        context: { input: { userId: '123' }, tasks: {} },
        history: [],
        executionOrder: ['fetch-user', 'fetch-orders', 'process'],
        currentIndex: 0
      };

      const mockDebugger = {
        createSession: vi.fn().mockReturnValue(mockSession),
        addBreakpoint: vi.fn(),
        start: vi.fn(),
        continue: vi.fn().mockImplementation(() => {
          mockSession.state = 'completed';
          mockSession.currentTask = undefined;
        }),
        listBreakpoints: vi.fn().mockReturnValue([])
      };

      vi.mocked(Debugger).mockImplementation(() => mockDebugger as any);

      const cmd = new DebugCommand('/path/to/workflow.yaml', {
        input: { userId: '123' },
        tasksPath: '/path/to/tasks',
        breakpoints: ['fetch-user']
      });

      await cmd.initialize();
      const result = await cmd.continue();

      expect(mockDebugger.continue).toHaveBeenCalled();
      expect(result.state).toBe('completed');
    });

    it('should get context', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const mockContext = {
        input: { userId: '123' },
        tasks: {
          'fetch-user': { output: { id: '123', name: 'John' }, status: 'completed' }
        }
      };

      const mockSession = {
        id: 'debug-123',
        state: 'paused',
        workflow: sampleWorkflow,
        tasks: sampleTasks,
        input: { userId: '123' },
        currentTask: 'fetch-orders',
        context: mockContext,
        history: [],
        executionOrder: ['fetch-user', 'fetch-orders', 'process'],
        currentIndex: 1
      };

      const mockDebugger = {
        createSession: vi.fn().mockReturnValue(mockSession),
        addBreakpoint: vi.fn(),
        start: vi.fn(),
        getContext: vi.fn().mockReturnValue(mockContext),
        listBreakpoints: vi.fn().mockReturnValue([])
      };

      vi.mocked(Debugger).mockImplementation(() => mockDebugger as any);

      const cmd = new DebugCommand('/path/to/workflow.yaml', {
        input: { userId: '123' },
        tasksPath: '/path/to/tasks'
      });

      await cmd.initialize();
      const context = cmd.getContext();

      expect(context.input.userId).toBe('123');
      expect(context.tasks['fetch-user'].output).toEqual({ id: '123', name: 'John' });
    });

    it('should get resolved input for current task', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const mockSession = {
        id: 'debug-123',
        state: 'paused',
        workflow: sampleWorkflow,
        tasks: sampleTasks,
        input: { userId: '123' },
        currentTask: 'fetch-orders',
        context: {
          input: { userId: '123' },
          tasks: { 'fetch-user': { output: { id: '456' }, status: 'completed' } }
        },
        history: [],
        executionOrder: ['fetch-user', 'fetch-orders', 'process'],
        currentIndex: 1
      };

      const mockDebugger = {
        createSession: vi.fn().mockReturnValue(mockSession),
        addBreakpoint: vi.fn(),
        start: vi.fn(),
        getResolvedInput: vi.fn().mockReturnValue({ userId: '456' }),
        listBreakpoints: vi.fn().mockReturnValue([])
      };

      vi.mocked(Debugger).mockImplementation(() => mockDebugger as any);

      const cmd = new DebugCommand('/path/to/workflow.yaml', {
        input: { userId: '123' },
        tasksPath: '/path/to/tasks'
      });

      await cmd.initialize();
      const resolvedInput = cmd.getResolvedInput();

      expect(resolvedInput).toEqual({ userId: '456' });
    });

    it('should set context value', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const mockSession = {
        id: 'debug-123',
        state: 'paused',
        workflow: sampleWorkflow,
        tasks: sampleTasks,
        input: { userId: '123' },
        currentTask: 'fetch-user',
        context: { input: { userId: '123' }, tasks: {} },
        history: [],
        executionOrder: ['fetch-user', 'fetch-orders', 'process'],
        currentIndex: 0
      };

      const mockDebugger = {
        createSession: vi.fn().mockReturnValue(mockSession),
        addBreakpoint: vi.fn(),
        start: vi.fn(),
        setContextValue: vi.fn(),
        getContext: vi.fn().mockReturnValue({ input: { userId: '999' }, tasks: {} }),
        listBreakpoints: vi.fn().mockReturnValue([])
      };

      vi.mocked(Debugger).mockImplementation(() => mockDebugger as any);

      const cmd = new DebugCommand('/path/to/workflow.yaml', {
        input: { userId: '123' },
        tasksPath: '/path/to/tasks'
      });

      await cmd.initialize();
      cmd.setContextValue('input.userId', '999');

      expect(mockDebugger.setContextValue).toHaveBeenCalledWith(
        mockSession,
        'input.userId',
        '999'
      );
    });

    it('should stop debug session', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const mockSession = {
        id: 'debug-123',
        state: 'paused',
        workflow: sampleWorkflow,
        tasks: sampleTasks,
        input: { userId: '123' },
        currentTask: 'fetch-user',
        context: { input: { userId: '123' }, tasks: {} },
        history: [],
        executionOrder: ['fetch-user', 'fetch-orders', 'process'],
        currentIndex: 0
      };

      const mockDebugger = {
        createSession: vi.fn().mockReturnValue(mockSession),
        addBreakpoint: vi.fn(),
        start: vi.fn(),
        stop: vi.fn().mockImplementation(() => {
          mockSession.state = 'stopped';
        }),
        listBreakpoints: vi.fn().mockReturnValue([])
      };

      vi.mocked(Debugger).mockImplementation(() => mockDebugger as any);

      const cmd = new DebugCommand('/path/to/workflow.yaml', {
        input: { userId: '123' },
        tasksPath: '/path/to/tasks'
      });

      await cmd.initialize();
      const result = cmd.stop();

      expect(mockDebugger.stop).toHaveBeenCalled();
      expect(result.state).toBe('stopped');
    });

    it('should get execution history', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const mockHistory = [
        { taskId: 'fetch-user', taskRef: 'get-user', status: 'completed', duration: 50, timestamp: Date.now() }
      ];

      const mockSession = {
        id: 'debug-123',
        state: 'paused',
        workflow: sampleWorkflow,
        tasks: sampleTasks,
        input: { userId: '123' },
        currentTask: 'fetch-orders',
        context: { input: { userId: '123' }, tasks: {} },
        history: mockHistory,
        executionOrder: ['fetch-user', 'fetch-orders', 'process'],
        currentIndex: 1
      };

      const mockDebugger = {
        createSession: vi.fn().mockReturnValue(mockSession),
        addBreakpoint: vi.fn(),
        start: vi.fn(),
        getHistory: vi.fn().mockReturnValue(mockHistory),
        listBreakpoints: vi.fn().mockReturnValue([])
      };

      vi.mocked(Debugger).mockImplementation(() => mockDebugger as any);

      const cmd = new DebugCommand('/path/to/workflow.yaml', {
        input: { userId: '123' },
        tasksPath: '/path/to/tasks'
      });

      await cmd.initialize();
      const history = cmd.getHistory();

      expect(history).toHaveLength(1);
      expect(history[0].taskId).toBe('fetch-user');
    });

    it('should add breakpoint during session', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const mockSession = {
        id: 'debug-123',
        state: 'paused',
        workflow: sampleWorkflow,
        tasks: sampleTasks,
        input: { userId: '123' },
        currentTask: 'fetch-user',
        context: { input: { userId: '123' }, tasks: {} },
        history: [],
        executionOrder: ['fetch-user', 'fetch-orders', 'process'],
        currentIndex: 0
      };

      const mockDebugger = {
        createSession: vi.fn().mockReturnValue(mockSession),
        addBreakpoint: vi.fn(),
        start: vi.fn(),
        listBreakpoints: vi.fn().mockReturnValue([
          { taskId: 'fetch-orders', enabled: true, hitCount: 0 }
        ])
      };

      vi.mocked(Debugger).mockImplementation(() => mockDebugger as any);

      const cmd = new DebugCommand('/path/to/workflow.yaml', {
        input: { userId: '123' },
        tasksPath: '/path/to/tasks'
      });

      await cmd.initialize();
      cmd.addBreakpoint('fetch-orders');

      expect(mockDebugger.addBreakpoint).toHaveBeenCalledWith('fetch-orders');
    });

    it('should remove breakpoint during session', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const mockSession = {
        id: 'debug-123',
        state: 'paused',
        workflow: sampleWorkflow,
        tasks: sampleTasks,
        input: { userId: '123' },
        currentTask: 'fetch-user',
        context: { input: { userId: '123' }, tasks: {} },
        history: [],
        executionOrder: ['fetch-user', 'fetch-orders', 'process'],
        currentIndex: 0
      };

      const mockDebugger = {
        createSession: vi.fn().mockReturnValue(mockSession),
        addBreakpoint: vi.fn(),
        removeBreakpoint: vi.fn(),
        start: vi.fn(),
        listBreakpoints: vi.fn().mockReturnValue([])
      };

      vi.mocked(Debugger).mockImplementation(() => mockDebugger as any);

      const cmd = new DebugCommand('/path/to/workflow.yaml', {
        input: { userId: '123' },
        tasksPath: '/path/to/tasks',
        breakpoints: ['fetch-user']
      });

      await cmd.initialize();
      cmd.removeBreakpoint('fetch-user');

      expect(mockDebugger.removeBreakpoint).toHaveBeenCalledWith('fetch-user');
    });

    it('should list breakpoints', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const mockBreakpoints = [
        { taskId: 'fetch-user', enabled: true, hitCount: 1 },
        { taskId: 'process', enabled: false, hitCount: 0 }
      ];

      const mockSession = {
        id: 'debug-123',
        state: 'paused',
        workflow: sampleWorkflow,
        tasks: sampleTasks,
        input: { userId: '123' },
        currentTask: 'fetch-user',
        context: { input: { userId: '123' }, tasks: {} },
        history: [],
        executionOrder: ['fetch-user', 'fetch-orders', 'process'],
        currentIndex: 0
      };

      const mockDebugger = {
        createSession: vi.fn().mockReturnValue(mockSession),
        addBreakpoint: vi.fn(),
        start: vi.fn(),
        listBreakpoints: vi.fn().mockReturnValue(mockBreakpoints)
      };

      vi.mocked(Debugger).mockImplementation(() => mockDebugger as any);

      const cmd = new DebugCommand('/path/to/workflow.yaml', {
        input: { userId: '123' },
        tasksPath: '/path/to/tasks',
        breakpoints: ['fetch-user', 'process']
      });

      await cmd.initialize();
      const breakpoints = cmd.listBreakpoints();

      expect(breakpoints).toHaveLength(2);
      expect(breakpoints[0].taskId).toBe('fetch-user');
      expect(breakpoints[1].enabled).toBe(false);
    });

    it('should set mock response', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const mockSession = {
        id: 'debug-123',
        state: 'paused',
        workflow: sampleWorkflow,
        tasks: sampleTasks,
        input: { userId: '123' },
        currentTask: 'fetch-user',
        context: { input: { userId: '123' }, tasks: {} },
        history: [],
        executionOrder: ['fetch-user', 'fetch-orders', 'process'],
        currentIndex: 0
      };

      const mockDebugger = {
        createSession: vi.fn().mockReturnValue(mockSession),
        addBreakpoint: vi.fn(),
        start: vi.fn(),
        setMockResponse: vi.fn(),
        listBreakpoints: vi.fn().mockReturnValue([])
      };

      vi.mocked(Debugger).mockImplementation(() => mockDebugger as any);

      const cmd = new DebugCommand('/path/to/workflow.yaml', {
        input: { userId: '123' },
        tasksPath: '/path/to/tasks'
      });

      await cmd.initialize();
      cmd.setMockResponse('get-user', { status: 200, body: { id: '123', name: 'John' } });

      expect(mockDebugger.setMockResponse).toHaveBeenCalledWith(
        'get-user',
        { status: 200, body: { id: '123', name: 'John' } }
      );
    });

    it('should get session state', async () => {
      vi.mocked(loaders.loadWorkflow).mockResolvedValue(sampleWorkflow);
      vi.mocked(loaders.loadTasksFromDirectory).mockResolvedValue(sampleTasks);

      const mockSession = {
        id: 'debug-123',
        state: 'paused',
        workflow: sampleWorkflow,
        tasks: sampleTasks,
        input: { userId: '123' },
        currentTask: 'fetch-user',
        context: { input: { userId: '123' }, tasks: {} },
        history: [],
        executionOrder: ['fetch-user', 'fetch-orders', 'process'],
        currentIndex: 0
      };

      const mockDebugger = {
        createSession: vi.fn().mockReturnValue(mockSession),
        addBreakpoint: vi.fn(),
        start: vi.fn(),
        listBreakpoints: vi.fn().mockReturnValue([])
      };

      vi.mocked(Debugger).mockImplementation(() => mockDebugger as any);

      const cmd = new DebugCommand('/path/to/workflow.yaml', {
        input: { userId: '123' },
        tasksPath: '/path/to/tasks'
      });

      await cmd.initialize();
      const state = cmd.getState();

      expect(state.sessionId).toBe('debug-123');
      expect(state.state).toBe('paused');
      expect(state.currentTask).toBe('fetch-user');
      expect(state.executionOrder).toEqual(['fetch-user', 'fetch-orders', 'process']);
    });
  });

  describe('DebugOptions', () => {
    it('should have correct structure', () => {
      const options: DebugOptions = {
        input: { key: 'value' },
        inputJson: '{"key":"value"}',
        tasksPath: '/path/to/tasks',
        breakpoints: ['task-1', 'task-2']
      };

      expect(options.breakpoints).toHaveLength(2);
    });
  });

  describe('DebugCommandResult', () => {
    it('should have correct structure for success', () => {
      const result: DebugCommandResult = {
        success: true,
        sessionId: 'debug-123',
        state: 'paused',
        currentTask: 'fetch-user',
        breakpoints: [{ taskId: 'fetch-user', enabled: true, hitCount: 1 }],
        executionOrder: ['fetch-user', 'fetch-orders']
      };

      expect(result.success).toBe(true);
      expect(result.state).toBe('paused');
    });

    it('should have correct structure for failure', () => {
      const result: DebugCommandResult = {
        success: false,
        error: 'Workflow file not found'
      };

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
