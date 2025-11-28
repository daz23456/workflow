import { http, HttpResponse, delay } from 'msw';
import { mockWorkflowList, mockWorkflowDetails } from './workflows';
import {
  mockSuccessfulExecutions,
  mockFailedExecutions,
  mockDryRunResponses,
  mockExecutionHistory,
} from './executions';
import { mockTaskDetails, mockTaskUsage, mockTaskExecutions } from './tasks';

/**
 * MSW request handlers for all API endpoints
 * These handlers are used in:
 * - Development (browser worker)
 * - Tests (Node server)
 * - Storybook (msw-storybook-addon)
 */

export const handlers = [
  // ============================================================================
  // WORKFLOW ENDPOINTS
  // ============================================================================

  // GET /api/workflows - List all workflows
  http.get('/api/workflows', async ({ request }) => {
    await delay(300); // Simulate network latency

    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase();
    const namespace = url.searchParams.get('namespace');
    const sort = url.searchParams.get('sort');

    // Filter workflows
    let filtered = [...mockWorkflowList];

    // Apply search filter (searches name and description)
    if (search) {
      filtered = filtered.filter(
        (w) =>
          w.name.toLowerCase().includes(search) ||
          w.description.toLowerCase().includes(search)
      );
    }

    // Apply namespace filter
    if (namespace) {
      filtered = filtered.filter((w) => w.namespace === namespace);
    }

    // Apply sorting
    if (sort === 'name') {
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'success-rate') {
      filtered.sort((a, b) => b.stats.successRate - a.stats.successRate);
    } else if (sort === 'executions') {
      filtered.sort((a, b) => b.stats.totalExecutions - a.stats.totalExecutions);
    } else {
      // Default sort: alphabetically by name
      filtered.sort((a, b) => a.name.localeCompare(b.name));
    }

    return HttpResponse.json({
      workflows: filtered,
      total: filtered.length,
    });
  }),

  // GET /api/workflows/:name - Get workflow details
  http.get('/api/workflows/:name', async ({ params }) => {
    await delay(200);
    const { name } = params;
    const workflow = mockWorkflowDetails[name as string];

    if (!workflow) {
      return HttpResponse.json(
        { error: `Workflow "${name}" not found` },
        { status: 404 }
      );
    }

    return HttpResponse.json(workflow);
  }),

  // ============================================================================
  // EXECUTION ENDPOINTS
  // ============================================================================

  // POST /api/workflows/:name/execute - Execute workflow
  http.post('/api/workflows/:name/execute', async ({ params, request }) => {
    await delay(500); // Simulate execution time
    const { name } = params;
    const body = await request.json();

    // Check if workflow exists
    if (!mockWorkflowDetails[name as string]) {
      return HttpResponse.json(
        { error: `Workflow "${name}" not found` },
        { status: 404 }
      );
    }

    // Simulate validation error for invalid input
    if (body && typeof body === 'object' && 'simulateError' in body) {
      return HttpResponse.json(
        {
          error: 'Input validation failed',
          details: 'Missing required field: email',
        },
        { status: 400 }
      );
    }

    // Return successful or failed execution based on workflow
    if (name === 'payment-flow' && body && typeof body === 'object' && 'amount' in body && (body as { amount: number }).amount > 100) {
      // Simulate payment failure for amounts > 100
      return HttpResponse.json(mockFailedExecutions['payment-flow']);
    }

    if (name === 'user-onboarding') {
      // Always fail user-onboarding due to schema mismatch
      return HttpResponse.json(mockFailedExecutions['user-onboarding']);
    }

    // Return success for other workflows
    const execution = mockSuccessfulExecutions[name as string];
    if (execution) {
      return HttpResponse.json(execution);
    }

    // Fallback: generic success response
    return HttpResponse.json({
      executionId: `exec-${name}-${Date.now()}`,
      workflowName: name,
      success: true,
      output: {},
      tasks: [],
      executionTimeMs: 1000,
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    });
  }),

  // POST /api/workflows/:name/test - Dry-run workflow
  http.post('/api/workflows/:name/test', async ({ params, request }) => {
    await delay(300);
    const { name } = params;
    const body = await request.json();

    // Check if workflow exists
    if (!mockWorkflowDetails[name as string]) {
      return HttpResponse.json(
        { error: `Workflow "${name}" not found` },
        { status: 404 }
      );
    }

    // Simulate validation error for invalid input
    if (body && typeof body === 'object' && 'simulateError' in body) {
      return HttpResponse.json(
        {
          error: 'Input validation failed',
          details: 'Invalid input schema',
        },
        { status: 400 }
      );
    }

    // Return dry-run response
    const dryRun = mockDryRunResponses[name as string];
    if (dryRun) {
      return HttpResponse.json(dryRun);
    }

    // Fallback: generic valid response
    return HttpResponse.json({
      valid: true,
      executionPlan: {
        totalTasks: 0,
        estimatedDurationMs: 0,
        parallelGroups: [],
        executionOrder: [],
        graph: { nodes: [], edges: [] },
      },
      templateResolution: {},
    });
  }),

  // GET /api/workflows/:name/executions - Get execution history for workflow
  http.get('/api/workflows/:name/executions', async ({ params, request }) => {
    await delay(200);
    const { name } = params;
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const status = url.searchParams.get('status');

    // Check if workflow exists
    if (!mockWorkflowDetails[name as string]) {
      return HttpResponse.json(
        { error: `Workflow "${name}" not found` },
        { status: 404 }
      );
    }

    let executions = mockExecutionHistory[name as string] || [];

    // Filter by status if provided
    if (status) {
      executions = executions.filter((e) => e.status === status);
    }

    // Apply pagination
    const total = executions.length;
    const paginated = executions.slice(offset, offset + limit);

    return HttpResponse.json({
      executions: paginated,
      total,
      limit,
      offset,
    });
  }),

  // GET /api/executions/:id - Get execution details by ID
  http.get('/api/executions/:id', async ({ params }) => {
    await delay(200);
    const { id } = params;

    // Search for execution in all workflow histories
    for (const [workflowName, executions] of Object.entries(mockExecutionHistory)) {
      const historyItem = executions.find((e) => e.executionId === id);
      if (historyItem) {
        // Return full execution details
        const fullExecution =
          mockSuccessfulExecutions[workflowName] ||
          mockFailedExecutions[workflowName];

        if (fullExecution && fullExecution.executionId === id) {
          return HttpResponse.json(fullExecution);
        }

        // Fallback: construct from history item
        return HttpResponse.json({
          ...historyItem,
          tasks: [],
          output: {},
        });
      }
    }

    return HttpResponse.json(
      { error: `Execution "${id}" not found` },
      { status: 404 }
    );
  }),

  // ============================================================================
  // TASK ENDPOINTS
  // ============================================================================

  // GET /api/tasks - List all available tasks
  http.get('/api/tasks', async () => {
    await delay(200);
    return HttpResponse.json({
      tasks: [
        {
          name: 'email-validator',
          description: 'Validate email format and availability',
          inputSchema: {
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email' },
            },
            required: ['email'],
          },
          outputSchema: {
            type: 'object',
            properties: {
              valid: { type: 'boolean' },
              reason: { type: 'string' },
            },
          },
        },
        {
          name: 'user-service',
          description: 'User account management',
          inputSchema: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              password: { type: 'string' },
              username: { type: 'string' },
            },
            required: ['email', 'password'],
          },
          outputSchema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              createdAt: { type: 'string' },
            },
          },
        },
        {
          name: 'email-sender',
          description: 'Send emails via SMTP',
          inputSchema: {
            type: 'object',
            properties: {
              to: { type: 'string', format: 'email' },
              subject: { type: 'string' },
              body: { type: 'string' },
            },
            required: ['to'],
          },
          outputSchema: {
            type: 'object',
            properties: {
              sent: { type: 'boolean' },
              token: { type: 'string' },
              sentAt: { type: 'string' },
            },
          },
        },
        {
          name: 'payment-gateway',
          description: 'Process payments',
          inputSchema: {
            type: 'object',
            properties: {
              amount: { type: 'number' },
              currency: { type: 'string' },
              cardToken: { type: 'string' },
            },
            required: ['amount', 'currency', 'cardToken'],
          },
          outputSchema: {
            type: 'object',
            properties: {
              transactionId: { type: 'string' },
              status: { type: 'string' },
            },
          },
        },
        {
          name: 'inventory-service',
          description: 'Check and reserve inventory',
          inputSchema: {
            type: 'object',
            properties: {
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    productId: { type: 'string' },
                    quantity: { type: 'integer' },
                  },
                },
              },
            },
            required: ['items'],
          },
          outputSchema: {
            type: 'object',
            properties: {
              available: { type: 'boolean' },
              reservationId: { type: 'string' },
            },
          },
        },
      ],
    });
  }),

  // GET /api/tasks/:name - Get task details
  http.get('/api/tasks/:name', async ({ params }) => {
    await delay(200);
    const { name } = params;
    const task = mockTaskDetails[name as string];

    if (!task) {
      return HttpResponse.json(
        { error: `Task "${name}" not found` },
        { status: 404 }
      );
    }

    return HttpResponse.json(task);
  }),

  // GET /api/tasks/:name/usage - Get workflows using this task
  http.get('/api/tasks/:name/usage', async ({ params, request }) => {
    await delay(200);
    const { name } = params;
    const url = new URL(request.url);
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const take = parseInt(url.searchParams.get('take') || '20');

    if (!mockTaskDetails[name as string]) {
      return HttpResponse.json(
        { error: `Task "${name}" not found` },
        { status: 404 }
      );
    }

    const usage = mockTaskUsage[name as string] || [];
    const total = usage.length;
    const paginated = usage.slice(skip, skip + take);

    return HttpResponse.json({
      taskName: name,
      workflows: paginated,
      totalCount: total,
      skip,
      take,
    });
  }),

  // GET /api/tasks/:name/executions - Get task execution history
  http.get('/api/tasks/:name/executions', async ({ params, request }) => {
    await delay(200);
    const { name } = params;
    const url = new URL(request.url);
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const take = parseInt(url.searchParams.get('take') || '20');
    const status = url.searchParams.get('status');

    if (!mockTaskDetails[name as string]) {
      return HttpResponse.json(
        { error: `Task "${name}" not found` },
        { status: 404 }
      );
    }

    let executions = mockTaskExecutions[name as string] || [];

    // Filter by status if provided
    if (status) {
      executions = executions.filter((e) => e.status === status);
    }

    const total = executions.length;
    const paginated = executions.slice(skip, skip + take);

    // Calculate average duration
    const avgDuration = executions.length > 0
      ? executions.reduce((sum, e) => sum + e.durationMs, 0) / executions.length
      : 0;

    return HttpResponse.json({
      taskName: name,
      executions: paginated,
      averageDurationMs: Math.round(avgDuration),
      totalCount: total,
      skip,
      take,
    });
  }),

  // POST /api/tasks/:name/execute - Execute task standalone
  http.post('/api/tasks/:name/execute', async ({ params, request }) => {
    await delay(300);
    const { name } = params;
    const body = await request.json();

    if (!mockTaskDetails[name as string]) {
      return HttpResponse.json(
        { error: `Task "${name}" not found` },
        { status: 404 }
      );
    }

    // Simulate error if requested (input is wrapped in { input: ... })
    if (body && typeof body === 'object' && body.input && 'simulateError' in body.input) {
      return HttpResponse.json(
        {
          error: 'Task execution failed',
          details: 'Simulated error',
        },
        { status: 400 }
      );
    }

    // Return successful execution response
    return HttpResponse.json({
      executionId: `exec-${name}-${Date.now()}`,
      status: 'succeeded',
      durationMs: 245,
      startedAt: new Date().toISOString(),
      completedAt: new Date(Date.now() + 245).toISOString(),
      outputs: {
        id: '123',
        name: 'John Doe',
        email: 'john@example.com',
      },
    });
  }),

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  // GET /api/health - Health check endpoint
  http.get('/api/health', async () => {
    await delay(50);
    return HttpResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  }),
];
