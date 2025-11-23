import {
  WorkflowExecutionResponse,
  ExecutionHistoryItem,
  DryRunResponse,
  TaskExecutionDetail
} from '@/types/execution';

/**
 * Mock execution data for development, testing, and Storybook
 * Includes successful executions, failures, and dry-run responses
 */

// ============================================================================
// SUCCESSFUL EXECUTIONS
// ============================================================================

export const mockSuccessfulExecutions: Record<string, WorkflowExecutionResponse> = {
  'user-signup': {
    executionId: 'exec-signup-001',
    workflowName: 'user-signup',
    success: true,
    output: {
      userId: 'user-123456',
      verificationToken: 'tok-verify-abc123',
    },
    tasks: [
      {
        taskId: 'validate-email',
        taskRef: 'email-validator',
        status: 'success',
        output: {
          valid: true,
          reason: 'Email format valid and not in use',
        },
        startedAt: '2025-11-23T10:30:00.000Z',
        completedAt: '2025-11-23T10:30:00.234Z',
        durationMs: 234,
        retryCount: 0,
      },
      {
        taskId: 'create-user',
        taskRef: 'user-service',
        status: 'success',
        output: {
          id: 'user-123456',
          createdAt: '2025-11-23T10:30:00.500Z',
        },
        startedAt: '2025-11-23T10:30:00.234Z',
        completedAt: '2025-11-23T10:30:00.680Z',
        durationMs: 446,
        retryCount: 0,
      },
      {
        taskId: 'send-email',
        taskRef: 'email-sender',
        status: 'success',
        output: {
          token: 'tok-verify-abc123',
          sentAt: '2025-11-23T10:30:01.100Z',
        },
        startedAt: '2025-11-23T10:30:00.680Z',
        completedAt: '2025-11-23T10:30:01.100Z',
        durationMs: 420,
        retryCount: 0,
      },
    ],
    executionTimeMs: 1100,
    startedAt: '2025-11-23T10:30:00.000Z',
    completedAt: '2025-11-23T10:30:01.100Z',
  },

  'order-processing': {
    executionId: 'exec-order-001',
    workflowName: 'order-processing',
    success: true,
    output: {
      status: 'confirmed',
      trackingNumber: 'TRACK-789XYZ',
    },
    tasks: [
      {
        taskId: 'validate-order',
        taskRef: 'order-validator',
        status: 'success',
        output: { valid: true },
        startedAt: '2025-11-23T11:45:00.000Z',
        completedAt: '2025-11-23T11:45:00.150Z',
        durationMs: 150,
        retryCount: 0,
      },
      {
        taskId: 'check-inventory',
        taskRef: 'inventory-service',
        status: 'success',
        output: {
          available: true,
          reservationId: 'res-inv-456',
        },
        startedAt: '2025-11-23T11:45:00.150Z',
        completedAt: '2025-11-23T11:45:00.680Z',
        durationMs: 530,
        retryCount: 0,
      },
      {
        taskId: 'process-payment',
        taskRef: 'payment-gateway',
        status: 'success',
        output: {
          transactionId: 'txn-pay-789',
          status: 'authorized',
        },
        startedAt: '2025-11-23T11:45:00.150Z',
        completedAt: '2025-11-23T11:45:01.450Z',
        durationMs: 1300,
        retryCount: 0,
      },
      {
        taskId: 'confirm-order',
        taskRef: 'order-service',
        status: 'success',
        output: {
          status: 'confirmed',
          confirmedAt: '2025-11-23T11:45:01.680Z',
        },
        startedAt: '2025-11-23T11:45:01.450Z',
        completedAt: '2025-11-23T11:45:01.680Z',
        durationMs: 230,
        retryCount: 0,
      },
      {
        taskId: 'send-confirmation',
        taskRef: 'email-sender',
        status: 'success',
        output: { sent: true },
        startedAt: '2025-11-23T11:45:01.680Z',
        completedAt: '2025-11-23T11:45:02.100Z',
        durationMs: 420,
        retryCount: 0,
      },
      {
        taskId: 'ship-order',
        taskRef: 'shipping-service',
        status: 'success',
        output: { trackingNumber: 'TRACK-789XYZ' },
        startedAt: '2025-11-23T11:45:01.680Z',
        completedAt: '2025-11-23T11:45:02.300Z',
        durationMs: 620,
        retryCount: 0,
      },
    ],
    executionTimeMs: 2300,
    startedAt: '2025-11-23T11:45:00.000Z',
    completedAt: '2025-11-23T11:45:02.300Z',
  },
};

// ============================================================================
// FAILED EXECUTIONS
// ============================================================================

export const mockFailedExecutions: Record<string, WorkflowExecutionResponse> = {
  'payment-flow': {
    executionId: 'exec-payment-fail-001',
    workflowName: 'payment-flow',
    success: false,
    output: {},
    tasks: [
      {
        taskId: 'fraud-check',
        taskRef: 'fraud-detector',
        status: 'success',
        output: {
          riskScore: 0.15,
          approved: true,
        },
        startedAt: '2025-11-23T11:50:00.000Z',
        completedAt: '2025-11-23T11:50:00.300Z',
        durationMs: 300,
        retryCount: 0,
      },
      {
        taskId: 'verify-3ds',
        taskRef: '3ds-verifier',
        status: 'success',
        output: {
          verified: true,
          authToken: 'auth-3ds-xyz',
        },
        startedAt: '2025-11-23T11:50:00.300Z',
        completedAt: '2025-11-23T11:50:02.100Z',
        durationMs: 1800,
        retryCount: 0,
      },
      {
        taskId: 'authorize-payment',
        taskRef: 'payment-gateway',
        status: 'failed',
        output: {},
        error: 'Card declined: insufficient_funds',
        startedAt: '2025-11-23T11:50:02.100Z',
        completedAt: '2025-11-23T11:50:03.500Z',
        durationMs: 1400,
        retryCount: 2,
      },
    ],
    executionTimeMs: 3500,
    startedAt: '2025-11-23T11:50:00.000Z',
    completedAt: '2025-11-23T11:50:03.500Z',
    error: 'Task "authorize-payment" failed: Card declined: insufficient_funds',
  },

  'user-onboarding': {
    executionId: 'exec-onboard-fail-001',
    workflowName: 'user-onboarding',
    success: false,
    output: {},
    tasks: [
      {
        taskId: 'create-profile',
        taskRef: 'profile-service',
        status: 'success',
        output: {
          profileId: 'prof-123',
          settings: { theme: 'dark', notifications: true },
        },
        startedAt: '2025-11-23T08:20:00.000Z',
        completedAt: '2025-11-23T08:20:00.500Z',
        durationMs: 500,
        retryCount: 0,
      },
      {
        taskId: 'setup-billing',
        taskRef: 'billing-service',
        status: 'failed',
        output: {},
        error: 'Template resolution failed: tasks.create-profile.output.accountId does not exist (available: profileId, settings)',
        startedAt: '2025-11-23T08:20:00.500Z',
        completedAt: '2025-11-23T08:20:00.520Z',
        durationMs: 20,
        retryCount: 0,
      },
    ],
    executionTimeMs: 520,
    startedAt: '2025-11-23T08:20:00.000Z',
    completedAt: '2025-11-23T08:20:00.520Z',
    error: 'Template resolution failed: tasks.create-profile.output.accountId does not exist',
  },
};

// ============================================================================
// DRY-RUN RESPONSES
// ============================================================================

export const mockDryRunResponses: Record<string, DryRunResponse> = {
  'user-signup': {
    valid: true,
    validationErrors: [],
    executionPlan: {
      taskOrder: ['validate-email', 'create-user', 'send-email'],
      parallelizable: [],
      totalTasks: 3,
      estimatedDurationMs: 850,
      parallelGroups: [
        { level: 0, taskIds: ['validate-email'] },
        { level: 1, taskIds: ['create-user'] },
        { level: 2, taskIds: ['send-email'] },
      ],
      executionOrder: ['validate-email', 'create-user', 'send-email'],
      graph: {
        nodes: [
          { id: 'validate-email', label: 'validate-email', level: 0 },
          { id: 'create-user', label: 'create-user', level: 1 },
          { id: 'send-email', label: 'send-email', level: 2 },
        ],
        edges: [
          { source: 'validate-email', target: 'create-user' },
          { source: 'create-user', target: 'send-email' },
        ],
      },
    },
    templateResolution: {
      'validate-email': {
        email: {
          template: '{{input.email}}',
          resolved: 'user@example.com',
          source: 'input.email',
        },
      },
      'create-user': {
        email: {
          template: '{{input.email}}',
          resolved: 'user@example.com',
          source: 'input.email',
        },
        password: {
          template: '{{input.password}}',
          resolved: '********',
          source: 'input.password',
        },
        username: {
          template: '{{input.username}}',
          resolved: 'johndoe',
          source: 'input.username',
        },
      },
      'send-email': {
        to: {
          template: '{{input.email}}',
          resolved: 'user@example.com',
          source: 'input.email',
        },
        userId: {
          template: '{{tasks.create-user.output.id}}',
          resolved: '<will be available after create-user completes>',
          source: 'tasks.create-user.output.id',
        },
        username: {
          template: '{{input.username}}',
          resolved: 'johndoe',
          source: 'input.username',
        },
      },
    },
  },

  'order-processing': {
    valid: true,
    validationErrors: [],
    executionPlan: {
      taskOrder: [
        'validate-order',
        'check-inventory',
        'process-payment',
        'confirm-order',
        'send-confirmation',
        'ship-order',
      ],
      parallelizable: [
        ['check-inventory', 'process-payment'],
        ['send-confirmation', 'ship-order'],
      ],
      totalTasks: 6,
      estimatedDurationMs: 2300,
      parallelGroups: [
        { level: 0, taskIds: ['validate-order'] },
        { level: 1, taskIds: ['check-inventory', 'process-payment'] },
        { level: 2, taskIds: ['confirm-order'] },
        { level: 3, taskIds: ['send-confirmation', 'ship-order'] },
      ],
      executionOrder: [
        'validate-order',
        'check-inventory',
        'process-payment',
        'confirm-order',
        'send-confirmation',
        'ship-order',
      ],
      graph: {
        nodes: [
          { id: 'validate-order', label: 'validate-order', level: 0 },
          { id: 'check-inventory', label: 'check-inventory', level: 1 },
          { id: 'process-payment', label: 'process-payment', level: 1 },
          { id: 'confirm-order', label: 'confirm-order', level: 2 },
          { id: 'send-confirmation', label: 'send-confirmation', level: 3 },
          { id: 'ship-order', label: 'ship-order', level: 3 },
        ],
        edges: [
          { source: 'validate-order', target: 'check-inventory' },
          { source: 'validate-order', target: 'process-payment' },
          { source: 'check-inventory', target: 'confirm-order' },
          { source: 'process-payment', target: 'confirm-order' },
          { source: 'confirm-order', target: 'send-confirmation' },
          { source: 'confirm-order', target: 'ship-order' },
        ],
      },
    },
    templateResolution: {
      'validate-order': {
        orderId: {
          template: '{{input.orderId}}',
          resolved: 'order-12345',
          source: 'input.orderId',
        },
        items: {
          template: '{{input.items}}',
          resolved: JSON.stringify([
            { productId: 'prod-1', quantity: 2 },
            { productId: 'prod-2', quantity: 1 },
          ]),
          source: 'input.items',
        },
      },
      'check-inventory': {
        items: {
          template: '{{input.items}}',
          resolved: JSON.stringify([
            { productId: 'prod-1', quantity: 2 },
            { productId: 'prod-2', quantity: 1 },
          ]),
          source: 'input.items',
        },
      },
      'process-payment': {
        orderId: {
          template: '{{input.orderId}}',
          resolved: 'order-12345',
          source: 'input.orderId',
        },
        method: {
          template: '{{input.paymentMethod}}',
          resolved: 'card',
          source: 'input.paymentMethod',
        },
      },
      'confirm-order': {
        orderId: {
          template: '{{input.orderId}}',
          resolved: 'order-12345',
          source: 'input.orderId',
        },
        reservationId: {
          template: '{{tasks.check-inventory.output.reservationId}}',
          resolved: '<will be available after check-inventory completes>',
          source: 'tasks.check-inventory.output.reservationId',
        },
        transactionId: {
          template: '{{tasks.process-payment.output.transactionId}}',
          resolved: '<will be available after process-payment completes>',
          source: 'tasks.process-payment.output.transactionId',
        },
      },
      'send-confirmation': {
        orderId: {
          template: '{{input.orderId}}',
          resolved: 'order-12345',
          source: 'input.orderId',
        },
        status: {
          template: '{{tasks.confirm-order.output.status}}',
          resolved: '<will be available after confirm-order completes>',
          source: 'tasks.confirm-order.output.status',
        },
      },
      'ship-order': {
        orderId: {
          template: '{{input.orderId}}',
          resolved: 'order-12345',
          source: 'input.orderId',
        },
      },
    },
  },

  'user-onboarding': {
    valid: false,
    validationErrors: [
      {
        taskId: 'setup-billing',
        field: 'accountId',
        message:
          'Template "{{tasks.create-profile.output.accountId}}" references non-existent field. Available fields: profileId, settings',
        suggestion: 'Did you mean "{{tasks.create-profile.output.profileId}}"?',
      },
      {
        taskId: 'send-welcome',
        field: 'limits',
        message:
          'Type mismatch: Task "assign-resources" outputs "limits" as object, but task "send-welcome" expects array',
        suggestion: 'Update the output schema of "assign-resources" or input mapping of "send-welcome"',
      },
    ],
    executionPlan: {
      taskOrder: ['create-profile', 'setup-billing', 'assign-resources', 'send-welcome'],
      parallelizable: [],
      totalTasks: 4,
      estimatedDurationMs: 3200,
      parallelGroups: [
        { level: 0, taskIds: ['create-profile'] },
        { level: 1, taskIds: ['setup-billing'] },
        { level: 2, taskIds: ['assign-resources'] },
        { level: 3, taskIds: ['send-welcome'] },
      ],
      executionOrder: ['create-profile', 'setup-billing', 'assign-resources', 'send-welcome'],
      graph: {
        nodes: [
          { id: 'create-profile', label: 'create-profile', level: 0 },
          { id: 'setup-billing', label: 'setup-billing', level: 1, error: true },
          { id: 'assign-resources', label: 'assign-resources', level: 2, error: true },
          { id: 'send-welcome', label: 'send-welcome', level: 3, error: true },
        ],
        edges: [
          { source: 'create-profile', target: 'setup-billing', error: true },
          { source: 'setup-billing', target: 'assign-resources' },
          { source: 'assign-resources', target: 'send-welcome', error: true },
        ],
      },
    },
    templateResolution: {},
  },
};

// ============================================================================
// EXECUTION HISTORY
// ============================================================================

export const mockExecutionHistory: Record<string, ExecutionHistoryItem[]> = {
  'user-signup': [
    {
      executionId: 'exec-signup-001',
      workflowName: 'user-signup',
      status: 'success',
      startedAt: '2025-11-23T10:30:00Z',
      completedAt: '2025-11-23T10:30:01Z',
      durationMs: 1100,
      inputSnapshot: {
        email: 'user@example.com',
        username: 'johndoe',
      },
    },
    {
      executionId: 'exec-signup-002',
      workflowName: 'user-signup',
      status: 'success',
      startedAt: '2025-11-23T09:15:00Z',
      completedAt: '2025-11-23T09:15:01Z',
      durationMs: 950,
      inputSnapshot: {
        email: 'jane@example.com',
        username: 'janedoe',
      },
    },
    {
      executionId: 'exec-signup-003',
      workflowName: 'user-signup',
      status: 'failed',
      startedAt: '2025-11-23T08:45:00Z',
      completedAt: '2025-11-23T08:45:00Z',
      durationMs: 450,
      inputSnapshot: {
        email: 'duplicate@example.com',
        username: 'duplicate',
      },
      error: 'Email already exists',
    },
  ],

  'order-processing': [
    {
      executionId: 'exec-order-001',
      workflowName: 'order-processing',
      status: 'success',
      startedAt: '2025-11-23T11:45:00Z',
      completedAt: '2025-11-23T11:45:02Z',
      durationMs: 2300,
      inputSnapshot: {
        orderId: 'order-12345',
      },
    },
    {
      executionId: 'exec-order-002',
      workflowName: 'order-processing',
      status: 'success',
      startedAt: '2025-11-23T11:30:00Z',
      completedAt: '2025-11-23T11:30:02Z',
      durationMs: 2100,
      inputSnapshot: {
        orderId: 'order-12346',
      },
    },
  ],

  'payment-flow': [
    {
      executionId: 'exec-payment-fail-001',
      workflowName: 'payment-flow',
      status: 'failed',
      startedAt: '2025-11-23T11:50:00Z',
      completedAt: '2025-11-23T11:50:03Z',
      durationMs: 3500,
      inputSnapshot: {
        amount: 99.99,
        currency: 'USD',
      },
      error: 'Card declined: insufficient_funds',
    },
    {
      executionId: 'exec-payment-002',
      workflowName: 'payment-flow',
      status: 'success',
      startedAt: '2025-11-23T11:40:00Z',
      completedAt: '2025-11-23T11:40:04Z',
      durationMs: 4200,
      inputSnapshot: {
        amount: 49.99,
        currency: 'USD',
      },
    },
  ],
};
