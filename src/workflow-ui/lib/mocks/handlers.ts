import { http, HttpResponse, delay } from 'msw';
import { mockWorkflowList, mockWorkflowDetails } from './workflows';
import {
  mockSuccessfulExecutions,
  mockFailedExecutions,
  mockDryRunResponses,
  mockExecutionHistory,
} from './executions';

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

  // GET /api/v1/workflows - List all workflows
  http.get('/api/v1/workflows', async () => {
    await delay(300); // Simulate network latency
    return HttpResponse.json({
      workflows: mockWorkflowList,
      total: mockWorkflowList.length,
    });
  }),

  // GET /api/v1/workflows/:name - Get workflow details
  http.get('/api/v1/workflows/:name', async ({ params }) => {
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

  // POST /api/v1/workflows/:name/execute - Execute workflow
  http.post('/api/v1/workflows/:name/execute', async ({ params, request }) => {
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

  // POST /api/v1/workflows/:name/test - Dry-run workflow
  http.post('/api/v1/workflows/:name/test', async ({ params, request }) => {
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

  // GET /api/v1/workflows/:name/executions - Get execution history for workflow
  http.get('/api/v1/workflows/:name/executions', async ({ params, request }) => {
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

  // GET /api/v1/executions/:id - Get execution details by ID
  http.get('/api/v1/executions/:id', async ({ params }) => {
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

  // GET /api/v1/tasks - List all available tasks
  http.get('/api/v1/tasks', async () => {
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
