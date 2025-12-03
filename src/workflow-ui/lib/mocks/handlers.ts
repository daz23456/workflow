import { http, HttpResponse, delay } from 'msw';
import { mockWorkflowList, mockWorkflowDetails } from './workflows';
import {
  mockSuccessfulExecutions,
  mockFailedExecutions,
  mockDryRunResponses,
  mockExecutionHistory,
} from './executions';
import { mockTaskDetails, mockTaskUsage, mockTaskExecutions } from './tasks';
import { mockTemplateList, mockTemplateDetails } from './templates';

/**
 * MSW request handlers for all API endpoints
 * These handlers are used in:
 * - Development (browser worker)
 * - Tests (Node server)
 * - Storybook (msw-storybook-addon)
 */

// Base URL for API handlers - matches API_BASE_URL in queries.ts
const API_BASE = 'http://localhost:5001/api/v1';

export const handlers = [
  // ============================================================================
  // WORKFLOW ENDPOINTS
  // ============================================================================

  // GET /api/v1/workflows - List all workflows
  http.get(`${API_BASE}/workflows`, async ({ request }) => {
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
        (w) => w.name.toLowerCase().includes(search) || w.description.toLowerCase().includes(search)
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
      filtered.sort((a, b) => (b.stats?.successRate || 0) - (a.stats?.successRate || 0));
    } else if (sort === 'executions') {
      filtered.sort((a, b) => (b.stats?.totalExecutions || 0) - (a.stats?.totalExecutions || 0));
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
  http.get(`${API_BASE}/workflows/:name`, async ({ params }) => {
    await delay(200);
    const { name } = params;

    // Special case for error testing: error without message
    if (name === 'error-no-message') {
      return HttpResponse.json(
        {}, // No error property - should use fallback message
        { status: 500 }
      );
    }

    const workflow = mockWorkflowDetails[name as string];

    if (!workflow) {
      return HttpResponse.json({ error: `Workflow "${name}" not found` }, { status: 404 });
    }

    return HttpResponse.json(workflow);
  }),

  // ============================================================================
  // EXECUTION ENDPOINTS
  // ============================================================================

  // POST /api/workflows/:name/execute - Execute workflow
  http.post(`${API_BASE}/workflows/:name/execute`, async ({ params, request }) => {
    await delay(500); // Simulate execution time
    const { name } = params;
    const body = (await request.json()) as { input?: Record<string, unknown> };

    // Extract input from wrapper (backend expects { input: {...} })
    const input = body?.input || body;

    // Check if workflow exists
    if (!mockWorkflowDetails[name as string]) {
      return HttpResponse.json({ error: `Workflow "${name}" not found` }, { status: 404 });
    }

    // Simulate validation error for invalid input
    if (input && typeof input === 'object' && 'simulateError' in input) {
      return HttpResponse.json(
        {
          error: 'Input validation failed',
          details: 'Missing required field: email',
        },
        { status: 400 }
      );
    }

    // Return successful or failed execution based on workflow
    if (
      name === 'payment-flow' &&
      input &&
      typeof input === 'object' &&
      'amount' in input &&
      (input as { amount: number }).amount > 100
    ) {
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
  http.post(`${API_BASE}/workflows/:name/test`, async ({ params, request }) => {
    await delay(300);
    const { name } = params;
    const body = (await request.json()) as { input?: Record<string, unknown> };

    // Extract input from wrapper (backend expects { input: {...} })
    const input = body?.input || body;

    // Check if workflow exists
    if (!mockWorkflowDetails[name as string]) {
      return HttpResponse.json({ error: `Workflow "${name}" not found` }, { status: 404 });
    }

    // Simulate validation error for invalid input
    if (input && typeof input === 'object' && 'simulateError' in input) {
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
  http.get(`${API_BASE}/workflows/:name/executions`, async ({ params, request }) => {
    await delay(200);
    const { name } = params;
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const status = url.searchParams.get('status');

    // Check if workflow exists
    if (!mockWorkflowDetails[name as string]) {
      return HttpResponse.json({ error: `Workflow "${name}" not found` }, { status: 404 });
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
  http.get(`${API_BASE}/executions/:id`, async ({ params }) => {
    await delay(200);
    const { id } = params;

    // Search for execution in all workflow histories
    for (const [workflowName, executions] of Object.entries(mockExecutionHistory)) {
      const historyItem = executions.find((e) => e.executionId === id);
      if (historyItem) {
        // Return full execution details
        const fullExecution =
          mockSuccessfulExecutions[workflowName] || mockFailedExecutions[workflowName];

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

    return HttpResponse.json({ error: `Execution "${id}" not found` }, { status: 404 });
  }),

  // ============================================================================
  // TASK ENDPOINTS
  // ============================================================================

  // GET /api/tasks - List all available tasks
  http.get(`${API_BASE}/tasks`, async () => {
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
  http.get(`${API_BASE}/tasks/:name`, async ({ params }) => {
    await delay(200);
    const { name } = params;
    const task = mockTaskDetails[name as string];

    if (!task) {
      return HttpResponse.json({ error: `Task "${name}" not found` }, { status: 404 });
    }

    return HttpResponse.json(task);
  }),

  // GET /api/tasks/:name/usage - Get workflows using this task
  http.get(`${API_BASE}/tasks/:name/usage`, async ({ params, request }) => {
    await delay(200);
    const { name } = params;
    const url = new URL(request.url);
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const take = parseInt(url.searchParams.get('take') || '20');

    if (!mockTaskDetails[name as string]) {
      return HttpResponse.json({ error: `Task "${name}" not found` }, { status: 404 });
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
  http.get(`${API_BASE}/tasks/:name/executions`, async ({ params, request }) => {
    await delay(200);
    const { name } = params;
    const url = new URL(request.url);
    const skip = parseInt(url.searchParams.get('skip') || '0');
    const take = parseInt(url.searchParams.get('take') || '20');
    const status = url.searchParams.get('status');

    if (!mockTaskDetails[name as string]) {
      return HttpResponse.json({ error: `Task "${name}" not found` }, { status: 404 });
    }

    let executions = mockTaskExecutions[name as string] || [];

    // Filter by status if provided
    if (status) {
      executions = executions.filter((e) => e.status === status);
    }

    const total = executions.length;
    const paginated = executions.slice(skip, skip + take);

    // Calculate average duration
    const avgDuration =
      executions.length > 0
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
  http.post(`${API_BASE}/tasks/:name/execute`, async ({ params, request }) => {
    await delay(300);
    const { name } = params;
    const body = await request.json();

    if (!mockTaskDetails[name as string]) {
      return HttpResponse.json({ error: `Task "${name}" not found` }, { status: 404 });
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
  // DURATION TRENDS ENDPOINTS
  // ============================================================================

  // GET /api/workflows/:name/duration-trends - Get workflow duration trends
  http.get(`${API_BASE}/workflows/:name/duration-trends`, async ({ params, request }) => {
    await delay(200);
    const { name } = params;
    const url = new URL(request.url);
    const daysBack = parseInt(url.searchParams.get('daysBack') || '30');

    if (!mockWorkflowDetails[name as string]) {
      return HttpResponse.json({ error: `Workflow "${name}" not found` }, { status: 404 });
    }

    // Generate mock trend data
    const dataPoints = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dataPoints.push({
        date: date.toISOString(),
        averageDurationMs: 150 + Math.random() * 50,
        minDurationMs: 100 + Math.random() * 20,
        maxDurationMs: 200 + Math.random() * 50,
        p50DurationMs: 140 + Math.random() * 30,
        p95DurationMs: 180 + Math.random() * 40,
        executionCount: Math.floor(10 + Math.random() * 20),
        successCount: Math.floor(8 + Math.random() * 15),
        failureCount: Math.floor(0 + Math.random() * 3),
      });
    }

    return HttpResponse.json({
      workflowName: name,
      dataPoints,
    });
  }),

  // GET /api/tasks/:name/duration-trends - Get task duration trends
  http.get(`${API_BASE}/tasks/:name/duration-trends`, async ({ params, request }) => {
    await delay(200);
    const { name } = params;
    const url = new URL(request.url);
    const daysBack = parseInt(url.searchParams.get('daysBack') || '30');

    if (!mockTaskDetails[name as string]) {
      return HttpResponse.json({ error: `Task "${name}" not found` }, { status: 404 });
    }

    // Generate mock trend data
    const dataPoints = [];
    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dataPoints.push({
        date: date.toISOString(),
        averageDurationMs: 100 + Math.random() * 30,
        minDurationMs: 80 + Math.random() * 15,
        maxDurationMs: 150 + Math.random() * 30,
        p50DurationMs: 95 + Math.random() * 20,
        p95DurationMs: 130 + Math.random() * 25,
        executionCount: Math.floor(15 + Math.random() * 25),
        successCount: Math.floor(12 + Math.random() * 20),
        failureCount: Math.floor(0 + Math.random() * 2),
      });
    }

    return HttpResponse.json({
      taskName: name,
      dataPoints,
    });
  }),

  // ============================================================================
  // TEMPLATE ENDPOINTS
  // ============================================================================

  // GET /api/templates - List all templates
  http.get(`${API_BASE}/templates`, async ({ request }) => {
    await delay(300);

    const url = new URL(request.url);
    const search = url.searchParams.get('search')?.toLowerCase();
    const category = url.searchParams.get('category');
    const difficulty = url.searchParams.get('difficulty');

    // Filter templates
    let filtered = [...mockTemplateList];

    // Apply search filter
    if (search) {
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(search) ||
          t.description.toLowerCase().includes(search) ||
          t.tags.some((tag) => tag.toLowerCase().includes(search))
      );
    }

    // Apply category filter
    if (category) {
      filtered = filtered.filter((t) => t.category === category);
    }

    // Apply difficulty filter
    if (difficulty) {
      filtered = filtered.filter((t) => t.difficulty === difficulty);
    }

    // Sort alphabetically by name
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    return HttpResponse.json({
      templates: filtered,
      total: filtered.length,
    });
  }),

  // GET /api/templates/:name - Get template details
  http.get(`${API_BASE}/templates/:name`, async ({ params }) => {
    await delay(200);
    const { name } = params;

    const template = mockTemplateDetails[name as string];

    if (!template) {
      return HttpResponse.json({ error: `Template "${name}" not found` }, { status: 404 });
    }

    return HttpResponse.json(template);
  }),

  // POST /api/templates/deploy - Deploy a template
  http.post(`${API_BASE}/templates/deploy`, async ({ request }) => {
    await delay(300);
    const body = (await request.json()) as {
      templateName: string;
      workflowName?: string;
      namespace?: string;
      inputValues?: Record<string, string>;
    };

    const { templateName, workflowName, namespace } = body;

    // Check if template exists
    if (!mockTemplateDetails[templateName]) {
      return HttpResponse.json(
        { error: `Template "${templateName}" not found` },
        { status: 404 }
      );
    }

    const deployedName = workflowName || templateName;
    const deployedNamespace = namespace || 'default';

    return HttpResponse.json({
      workflowName: deployedName,
      namespace: deployedNamespace,
      message: `Template "${templateName}" deployed successfully as "${deployedName}"`,
    });
  }),

  // ============================================================================
  // METRICS ENDPOINTS
  // ============================================================================

  // GET /api/metrics/system - System metrics
  http.get(`${API_BASE}/metrics/system`, async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const range = url.searchParams.get('range') || '24h';

    // Return different values based on time range for testing
    const multiplier = range === '1h' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 1;

    return HttpResponse.json({
      totalExecutions: 1500 * multiplier,
      throughput: 4.17 * multiplier,
      p50Ms: 120,
      p95Ms: 450,
      p99Ms: 890,
      errorRate: 2.5,
      timeRange: range,
    });
  }),

  // GET /api/metrics/workflows - All workflows metrics
  http.get(`${API_BASE}/metrics/workflows`, async () => {
    await delay(100);

    return HttpResponse.json([
      { name: 'user-signup', avgDurationMs: 234, p95Ms: 400, errorRate: 0.5, executionCount: 1000 },
      { name: 'order-process', avgDurationMs: 456, p95Ms: 700, errorRate: 3.2, executionCount: 500 },
      { name: 'payment-flow', avgDurationMs: 892, p95Ms: 1200, errorRate: 5.5, executionCount: 250 },
    ]);
  }),

  // GET /api/metrics/workflows/:name/history - Workflow history
  http.get(`${API_BASE}/metrics/workflows/:name/history`, async ({ params }) => {
    await delay(100);
    const { name } = params;

    return HttpResponse.json([
      { timestamp: '2024-01-01T00:00:00Z', avgDurationMs: 100, p95Ms: 200, errorRate: 1, count: 50 },
      { timestamp: '2024-01-02T00:00:00Z', avgDurationMs: 150, p95Ms: 300, errorRate: 2, count: 60 },
      { timestamp: '2024-01-03T00:00:00Z', avgDurationMs: 120, p95Ms: 250, errorRate: 1.5, count: 55 },
    ]);
  }),

  // GET /api/metrics/slowest - Slowest workflows
  http.get(`${API_BASE}/metrics/slowest`, async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    const workflows = [
      { name: 'slow-workflow', avgDurationMs: 2000, p95Ms: 3000, degradationPercent: 50 },
      { name: 'medium-workflow', avgDurationMs: 1000, p95Ms: 1500, degradationPercent: -20 },
      { name: 'improving-workflow', avgDurationMs: 500, p95Ms: 800, degradationPercent: 5 },
    ];

    return HttpResponse.json(workflows.slice(0, limit));
  }),

  // ============================================================================
  // HEALTH CHECK
  // ============================================================================

  // GET /api/health - Health check endpoint
  http.get(`${API_BASE}/health`, async () => {
    await delay(50);
    return HttpResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  }),
];
