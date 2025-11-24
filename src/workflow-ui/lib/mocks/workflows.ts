import { WorkflowListItem, WorkflowDetail } from '@/types/workflow';

/**
 * Mock workflows covering various complexity levels and edge cases
 * These mocks serve as fixtures for development, testing, and Storybook stories
 */

// ============================================================================
// WORKFLOW 1: User Signup (Simple Linear)
// ============================================================================

const userSignupList: WorkflowListItem = {
  name: 'user-signup',
  namespace: 'default',
  description: 'Simple user registration flow with email verification',
  taskCount: 3,
  inputSchemaPreview: '{ email, password, username }',
  endpoint: '/api/v1/workflows/user-signup/execute',
  stats: {
    totalExecutions: 1247,
    successRate: 98.5,
    successRateTrend: 2.3, // Up 2.3%
    avgDurationMs: 850,
    lastExecuted: '2025-11-23T10:30:00Z',
  },
};

const userSignupDetail: WorkflowDetail = {
  name: 'user-signup',
  namespace: 'default',
  description: 'Simple user registration flow with email verification',
  inputSchema: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 8 },
      username: { type: 'string', minLength: 3 },
    },
    required: ['email', 'password', 'username'],
  },
  outputSchema: {
    userId: '{{tasks.create-user.output.id}}',
    verificationToken: '{{tasks.send-email.output.token}}',
  },
  tasks: [
    {
      id: 'validate-email',
      taskRef: 'email-validator',
      description: 'Validate email format and check if already exists',
      timeout: '5s',
      retryCount: 2,
      inputMapping: {
        email: '{{input.email}}',
      },
      outputSchema: { type: "object", properties: {
        valid: { type: 'boolean' },
        reason: { type: 'string' },
      },
      },
      dependencies: [],
    },
    {
      id: 'create-user',
      taskRef: 'user-service',
      description: 'Create user account in database',
      timeout: '10s',
      retryCount: 3,
      inputMapping: {
        email: '{{input.email}}',
        password: '{{input.password}}',
        username: '{{input.username}}',
      },
      outputSchema: { type: "object", properties: {
        id: { type: 'string' },
        createdAt: { type: 'string' },
      },
      },
      dependencies: ['validate-email'],
    },
    {
      id: 'send-email',
      taskRef: 'email-sender',
      description: 'Send verification email to user',
      timeout: '15s',
      retryCount: 3,
      inputMapping: {
        to: '{{input.email}}',
        userId: '{{tasks.create-user.output.id}}',
        username: '{{input.username}}',
      },
      outputSchema: { type: "object", properties: {
        token: { type: 'string' },
        sentAt: { type: 'string' },
      },
      },
      dependencies: ['create-user'],
    },
  ],
  graph: {
    nodes: [
      { id: 'validate-email', type: 'task', position: { x: 0, y: 0 }, data: { label: 'validate-email', status: 'idle' } },
      { id: 'create-user', type: 'task', position: { x: 0, y: 100 }, data: { label: 'create-user', status: 'idle' } },
      { id: 'send-email', type: 'task', position: { x: 0, y: 200 }, data: { label: 'send-email', status: 'idle' } },
    ],
    edges: [
      { id: 'e1', source: 'validate-email', target: 'create-user', type: 'dependency', animated: false },
      { id: 'e2', source: 'create-user', target: 'send-email', type: 'dependency', animated: false },
    ],
    parallelGroups: [
      { level: 0, taskIds: ['validate-email'] },
      { level: 1, taskIds: ['create-user'] },
      { level: 2, taskIds: ['send-email'] },
    ],
  },
  endpoints: {
    execute: '/api/v1/workflows/user-signup/execute',
    test: '/api/v1/workflows/user-signup/test',
    details: '/api/v1/workflows/user-signup',
  },
};

// ============================================================================
// WORKFLOW 2: Order Processing (Moderate with Parallel Tasks)
// ============================================================================

const orderProcessingList: WorkflowListItem = {
  name: 'order-processing',
  namespace: 'production',
  description: 'E-commerce order processing with parallel inventory and payment',
  taskCount: 6,
  inputSchemaPreview: '{ orderId, items[], paymentMethod }',
  endpoint: '/api/v1/workflows/order-processing/execute',
  stats: {
    totalExecutions: 8945,
    successRate: 94.2,
    successRateTrend: -1.5, // Down 1.5%
    avgDurationMs: 2300,
    lastExecuted: '2025-11-23T11:45:00Z',
  },
};

const orderProcessingDetail: WorkflowDetail = {
  name: 'order-processing',
  namespace: 'production',
  description: 'E-commerce order processing with parallel inventory and payment',
  inputSchema: {
    type: 'object',
    properties: {
      orderId: { type: 'string' },
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
      paymentMethod: { type: 'string', enum: ['card', 'paypal', 'crypto'] },
    },
    required: ['orderId', 'items', 'paymentMethod'],
  },
  outputSchema: {
    status: '{{tasks.confirm-order.output.status}}',
    trackingNumber: '{{tasks.ship-order.output.trackingNumber}}',
  },
  tasks: [
    {
      id: 'validate-order',
      taskRef: 'order-validator',
      description: 'Validate order data and business rules',
      timeout: '5s',
      retryCount: 1,
      inputMapping: {
        orderId: '{{input.orderId}}',
        items: '{{input.items}}',
      },
      outputSchema: { type: "object", properties: {
        valid: { type: 'boolean' },
      },
      },
      dependencies: [],
    },
    {
      id: 'check-inventory',
      taskRef: 'inventory-service',
      description: 'Check product availability',
      timeout: '10s',
      retryCount: 2,
      inputMapping: {
        items: '{{input.items}}',
      },
      outputSchema: { type: "object", properties: {
        available: { type: 'boolean' },
        reservationId: { type: 'string' },
      },
      },
      dependencies: ['validate-order'],
    },
    {
      id: 'process-payment',
      taskRef: 'payment-gateway',
      description: 'Process payment via selected method',
      timeout: '30s',
      retryCount: 3,
      inputMapping: {
        orderId: '{{input.orderId}}',
        method: '{{input.paymentMethod}}',
      },
      outputSchema: { type: "object", properties: {
        transactionId: { type: 'string' },
        status: { type: 'string' },
      },
      },
      dependencies: ['validate-order'],
    },
    {
      id: 'confirm-order',
      taskRef: 'order-service',
      description: 'Confirm order after inventory and payment',
      timeout: '5s',
      retryCount: 2,
      inputMapping: {
        orderId: '{{input.orderId}}',
        reservationId: '{{tasks.check-inventory.output.reservationId}}',
        transactionId: '{{tasks.process-payment.output.transactionId}}',
      },
      outputSchema: { type: "object", properties: {
        status: { type: 'string' },
        confirmedAt: { type: 'string' },
      },
      },
      dependencies: ['check-inventory', 'process-payment'],
    },
    {
      id: 'send-confirmation',
      taskRef: 'email-sender',
      description: 'Send order confirmation email',
      timeout: '15s',
      retryCount: 3,
      inputMapping: {
        orderId: '{{input.orderId}}',
        status: '{{tasks.confirm-order.output.status}}',
      },
      outputSchema: { type: "object", properties: {
        sent: { type: 'boolean' },
      },
      },
      dependencies: ['confirm-order'],
    },
    {
      id: 'ship-order',
      taskRef: 'shipping-service',
      description: 'Create shipping label and schedule pickup',
      timeout: '20s',
      retryCount: 2,
      inputMapping: {
        orderId: '{{input.orderId}}',
      },
      outputSchema: { type: "object", properties: {
        trackingNumber: { type: 'string' },
      },
      },
      dependencies: ['confirm-order'],
    },
  ],
  graph: {
    nodes: [
      { id: 'validate-order', type: 'task', position: { x: 200, y: 0 }, data: { label: 'validate-order', status: 'idle' } },
      { id: 'check-inventory', type: 'task', position: { x: 0, y: 100 }, data: { label: 'check-inventory', status: 'idle' } },
      { id: 'process-payment', type: 'task', position: { x: 400, y: 100 }, data: { label: 'process-payment', status: 'idle' } },
      { id: 'confirm-order', type: 'task', position: { x: 200, y: 200 }, data: { label: 'confirm-order', status: 'idle' } },
      { id: 'send-confirmation', type: 'task', position: { x: 0, y: 300 }, data: { label: 'send-confirmation', status: 'idle' } },
      { id: 'ship-order', type: 'task', position: { x: 400, y: 300 }, data: { label: 'ship-order', status: 'idle' } },
    ],
    edges: [
      { id: 'e1', source: 'validate-order', target: 'check-inventory', type: 'dependency', animated: false },
      { id: 'e2', source: 'validate-order', target: 'process-payment', type: 'dependency', animated: false },
      { id: 'e3', source: 'check-inventory', target: 'confirm-order', type: 'dependency', animated: false },
      { id: 'e4', source: 'process-payment', target: 'confirm-order', type: 'dependency', animated: false },
      { id: 'e5', source: 'confirm-order', target: 'send-confirmation', type: 'dependency', animated: false },
      { id: 'e6', source: 'confirm-order', target: 'ship-order', type: 'dependency', animated: false },
    ],
    parallelGroups: [
      { level: 0, taskIds: ['validate-order'] },
      { level: 1, taskIds: ['check-inventory', 'process-payment'] },
      { level: 2, taskIds: ['confirm-order'] },
      { level: 3, taskIds: ['send-confirmation', 'ship-order'] },
    ],
  },
  endpoints: {
    execute: '/api/v1/workflows/order-processing/execute',
    test: '/api/v1/workflows/order-processing/test',
    details: '/api/v1/workflows/order-processing',
  },
};

// ============================================================================
// WORKFLOW 3: Data Pipeline (Complex Nested Dependencies)
// ============================================================================

const dataPipelineList: WorkflowListItem = {
  name: 'data-pipeline',
  namespace: 'analytics',
  description: 'Multi-stage data processing with validation and transformation',
  taskCount: 8,
  inputSchemaPreview: '{ sourceUrl, format, validationRules }',
  endpoint: '/api/v1/workflows/data-pipeline/execute',
  stats: {
    totalExecutions: 342,
    successRate: 89.7,
    avgDurationMs: 15400,
    lastExecuted: '2025-11-23T09:15:00Z',
  },
};

const dataPipelineDetail: WorkflowDetail = {
  name: 'data-pipeline',
  namespace: 'analytics',
  description: 'Multi-stage data processing with validation and transformation',
  inputSchema: {
    type: 'object',
    properties: {
      sourceUrl: { type: 'string', format: 'uri' },
      format: { type: 'string', enum: ['csv', 'json', 'xml'] },
      validationRules: { type: 'object' },
    },
    required: ['sourceUrl', 'format'],
  },
  outputSchema: {
    recordsProcessed: '{{tasks.generate-report.output.totalRecords}}',
    reportUrl: '{{tasks.upload-results.output.url}}',
  },
  tasks: [
    {
      id: 'fetch-data',
      taskRef: 'http-fetcher',
      description: 'Download data from source URL',
      timeout: '2m',
      retryCount: 3,
      inputMapping: {
        url: '{{input.sourceUrl}}',
      },
      outputSchema: { type: "object", properties: {
        data: { type: 'string' },
        size: { type: 'integer' },
      },
      },
      dependencies: [],
    },
    {
      id: 'parse-data',
      taskRef: 'data-parser',
      description: 'Parse data according to format',
      timeout: '1m',
      retryCount: 2,
      inputMapping: {
        data: '{{tasks.fetch-data.output.data}}',
        format: '{{input.format}}',
      },
      outputSchema: { type: "object", properties: {
        records: { type: 'array' },
      },
      },
      dependencies: ['fetch-data'],
    },
    {
      id: 'validate-schema',
      taskRef: 'schema-validator',
      description: 'Validate data against schema rules',
      timeout: '30s',
      retryCount: 1,
      inputMapping: {
        records: '{{tasks.parse-data.output.records}}',
        rules: '{{input.validationRules}}',
      },
      outputSchema: { type: "object", properties: {
        valid: { type: 'boolean' },
        errors: { type: 'array' },
      },
      },
      dependencies: ['parse-data'],
    },
    {
      id: 'transform-data',
      taskRef: 'data-transformer',
      description: 'Apply transformations to records',
      timeout: '5m',
      retryCount: 2,
      inputMapping: {
        records: '{{tasks.parse-data.output.records}}',
      },
      outputSchema: { type: "object", properties: {
        transformed: { type: 'array' },
      },
      },
      dependencies: ['validate-schema'],
    },
    {
      id: 'enrich-data',
      taskRef: 'data-enricher',
      description: 'Enrich records with external data',
      timeout: '3m',
      retryCount: 3,
      inputMapping: {
        records: '{{tasks.transform-data.output.transformed}}',
      },
      outputSchema: { type: "object", properties: {
        enriched: { type: 'array' },
      },
      },
      dependencies: ['transform-data'],
    },
    {
      id: 'deduplicate',
      taskRef: 'deduplicator',
      description: 'Remove duplicate records',
      timeout: '1m',
      retryCount: 1,
      inputMapping: {
        records: '{{tasks.enrich-data.output.enriched}}',
      },
      outputSchema: { type: "object", properties: {
        unique: { type: 'array' },
      },
      },
      dependencies: ['enrich-data'],
    },
    {
      id: 'generate-report',
      taskRef: 'report-generator',
      description: 'Generate processing summary report',
      timeout: '30s',
      retryCount: 2,
      inputMapping: {
        records: '{{tasks.deduplicate.output.unique}}',
      },
      outputSchema: { type: "object", properties: {
        totalRecords: { type: 'integer' },
        report: { type: 'object' },
      },
      },
      dependencies: ['deduplicate'],
    },
    {
      id: 'upload-results',
      taskRef: 's3-uploader',
      description: 'Upload processed data to S3',
      timeout: '2m',
      retryCount: 3,
      inputMapping: {
        data: '{{tasks.deduplicate.output.unique}}',
        report: '{{tasks.generate-report.output.report}}',
      },
      outputSchema: { type: "object", properties: {
        url: { type: 'string' },
      },
      },
      dependencies: ['generate-report'],
    },
  ],
  graph: {
    nodes: [
      { id: 'fetch-data', type: 'task', position: { x: 200, y: 0 }, data: { label: 'fetch-data', status: 'idle' } },
      { id: 'parse-data', type: 'task', position: { x: 200, y: 100 }, data: { label: 'parse-data', status: 'idle' } },
      { id: 'validate-schema', type: 'task', position: { x: 200, y: 200 }, data: { label: 'validate-schema', status: 'idle' } },
      { id: 'transform-data', type: 'task', position: { x: 200, y: 300 }, data: { label: 'transform-data', status: 'idle' } },
      { id: 'enrich-data', type: 'task', position: { x: 200, y: 400 }, data: { label: 'enrich-data', status: 'idle' } },
      { id: 'deduplicate', type: 'task', position: { x: 200, y: 500 }, data: { label: 'deduplicate', status: 'idle' } },
      { id: 'generate-report', type: 'task', position: { x: 200, y: 600 }, data: { label: 'generate-report', status: 'idle' } },
      { id: 'upload-results', type: 'task', position: { x: 200, y: 700 }, data: { label: 'upload-results', status: 'idle' } },
    ],
    edges: [
      { id: 'e1', source: 'fetch-data', target: 'parse-data', type: 'dependency', animated: false },
      { id: 'e2', source: 'parse-data', target: 'validate-schema', type: 'dependency', animated: false },
      { id: 'e3', source: 'validate-schema', target: 'transform-data', type: 'dependency', animated: false },
      { id: 'e4', source: 'transform-data', target: 'enrich-data', type: 'dependency', animated: false },
      { id: 'e5', source: 'enrich-data', target: 'deduplicate', type: 'dependency', animated: false },
      { id: 'e6', source: 'deduplicate', target: 'generate-report', type: 'dependency', animated: false },
      { id: 'e7', source: 'generate-report', target: 'upload-results', type: 'dependency', animated: false },
    ],
    parallelGroups: [
      { level: 0, taskIds: ['fetch-data'] },
      { level: 1, taskIds: ['parse-data'] },
      { level: 2, taskIds: ['validate-schema'] },
      { level: 3, taskIds: ['transform-data'] },
      { level: 4, taskIds: ['enrich-data'] },
      { level: 5, taskIds: ['deduplicate'] },
      { level: 6, taskIds: ['generate-report'] },
      { level: 7, taskIds: ['upload-results'] },
    ],
  },
  endpoints: {
    execute: '/api/v1/workflows/data-pipeline/execute',
    test: '/api/v1/workflows/data-pipeline/test',
    details: '/api/v1/workflows/data-pipeline',
  },
};

// ============================================================================
// WORKFLOW 4: User Onboarding (With Schema Mismatches - for testing)
// ============================================================================

const userOnboardingList: WorkflowListItem = {
  name: 'user-onboarding',
  namespace: 'default',
  description: 'Complete user onboarding with profile setup and welcome email',
  taskCount: 4,
  inputSchemaPreview: '{ userId, preferences, plan }',
  endpoint: '/api/v1/workflows/user-onboarding/execute',
  stats: {
    totalExecutions: 567,
    successRate: 76.3, // Lower success rate due to schema issues
    avgDurationMs: 3200,
    lastExecuted: '2025-11-23T08:20:00Z',
  },
};

const userOnboardingDetail: WorkflowDetail = {
  name: 'user-onboarding',
  namespace: 'default',
  description: 'Complete user onboarding with profile setup and welcome email (CONTAINS SCHEMA MISMATCH FOR TESTING)',
  inputSchema: {
    type: 'object',
    properties: {
      userId: { type: 'string' },
      preferences: {
        type: 'object',
        properties: {
          theme: { type: 'string' },
          notifications: { type: 'boolean' },
        },
      },
      plan: { type: 'string', enum: ['free', 'pro', 'enterprise'] },
    },
    required: ['userId', 'plan'],
  },
  outputSchema: {
    onboardingComplete: '{{tasks.send-welcome.output.sent}}',
  },
  tasks: [
    {
      id: 'create-profile',
      taskRef: 'profile-service',
      description: 'Create user profile',
      timeout: '10s',
      retryCount: 2,
      inputMapping: {
        userId: '{{input.userId}}',
        preferences: '{{input.preferences}}',
      },
      outputSchema: { type: "object", properties: {
        profileId: { type: 'string' },
        settings: { type: 'object' },
      },
      },
      dependencies: [],
    },
    {
      id: 'setup-billing',
      taskRef: 'billing-service',
      description: 'Initialize billing account',
      timeout: '15s',
      retryCount: 3,
      inputMapping: {
        userId: '{{input.userId}}',
        plan: '{{input.plan}}',
        // SCHEMA MISMATCH: Output is 'profileId' but we reference 'accountId'
        accountId: '{{tasks.create-profile.output.accountId}}',
      },
      outputSchema: { type: "object", properties: {
        billingId: { type: 'string' },
        nextBillingDate: { type: 'string' },
      },
      },
      dependencies: ['create-profile'],
    },
    {
      id: 'assign-resources',
      taskRef: 'resource-allocator',
      description: 'Allocate resources based on plan',
      timeout: '10s',
      retryCount: 2,
      inputMapping: {
        plan: '{{input.plan}}',
        billingId: '{{tasks.setup-billing.output.billingId}}',
      },
      outputSchema: { type: "object", properties: {
        resources: { type: 'array' },
        // SCHEMA MISMATCH: Outputs 'limits' as object but next task expects array
        limits: { type: 'object' },
      },
      },
      dependencies: ['setup-billing'],
    },
    {
      id: 'send-welcome',
      taskRef: 'email-sender',
      description: 'Send welcome email with onboarding guide',
      timeout: '15s',
      retryCount: 3,
      inputMapping: {
        userId: '{{input.userId}}',
        plan: '{{input.plan}}',
        // SCHEMA MISMATCH: Expects array but gets object
        limits: '{{tasks.assign-resources.output.limits}}',
      },
      outputSchema: { type: "object", properties: {
        sent: { type: 'boolean' },
      },
      },
      dependencies: ['assign-resources'],
    },
  ],
  graph: {
    nodes: [
      { id: 'create-profile', type: 'task', position: { x: 0, y: 0 }, data: { label: 'create-profile', status: 'idle' } },
      { id: 'setup-billing', type: 'task', position: { x: 0, y: 100 }, data: { label: 'setup-billing', status: 'idle', schemaMismatch: true } },
      { id: 'assign-resources', type: 'task', position: { x: 0, y: 200 }, data: { label: 'assign-resources', status: 'idle', schemaMismatch: true } },
      { id: 'send-welcome', type: 'task', position: { x: 0, y: 300 }, data: { label: 'send-welcome', status: 'idle', schemaMismatch: true } },
    ],
    edges: [
      { id: 'e1', source: 'create-profile', target: 'setup-billing', type: 'dependency', animated: false, style: { stroke: '#ef4444' } },
      { id: 'e2', source: 'setup-billing', target: 'assign-resources', type: 'dependency', animated: false },
      { id: 'e3', source: 'assign-resources', target: 'send-welcome', type: 'dependency', animated: false, style: { stroke: '#ef4444' } },
    ],
    parallelGroups: [
      { level: 0, taskIds: ['create-profile'] },
      { level: 1, taskIds: ['setup-billing'] },
      { level: 2, taskIds: ['assign-resources'] },
      { level: 3, taskIds: ['send-welcome'] },
    ],
  },
  endpoints: {
    execute: '/api/v1/workflows/user-onboarding/execute',
    test: '/api/v1/workflows/user-onboarding/test',
    details: '/api/v1/workflows/user-onboarding',
  },
};

// ============================================================================
// WORKFLOW 5: Payment Flow (With Error Scenarios)
// ============================================================================

const paymentFlowList: WorkflowListItem = {
  name: 'payment-flow',
  namespace: 'production',
  description: 'Secure payment processing with fraud detection and 3DS',
  taskCount: 5,
  inputSchemaPreview: '{ amount, currency, cardToken, customerId }',
  endpoint: '/api/v1/workflows/payment-flow/execute',
  stats: {
    totalExecutions: 15234,
    successRate: 92.1,
    avgDurationMs: 4500,
    lastExecuted: '2025-11-23T11:50:00Z',
  },
};

const paymentFlowDetail: WorkflowDetail = {
  name: 'payment-flow',
  namespace: 'production',
  description: 'Secure payment processing with fraud detection and 3DS (INCLUDES ERROR SCENARIOS)',
  inputSchema: {
    type: 'object',
    properties: {
      amount: { type: 'number', minimum: 0.01 },
      currency: { type: 'string', enum: ['USD', 'EUR', 'GBP'] },
      cardToken: { type: 'string' },
      customerId: { type: 'string' },
    },
    required: ['amount', 'currency', 'cardToken', 'customerId'],
  },
  outputSchema: {
    transactionId: '{{tasks.capture-payment.output.transactionId}}',
    status: '{{tasks.capture-payment.output.status}}',
  },
  tasks: [
    {
      id: 'fraud-check',
      taskRef: 'fraud-detector',
      description: 'Check transaction for fraud indicators',
      timeout: '5s',
      retryCount: 2,
      inputMapping: {
        amount: '{{input.amount}}',
        customerId: '{{input.customerId}}',
      },
      outputSchema: { type: "object", properties: {
        riskScore: { type: 'number' },
        approved: { type: 'boolean' },
      },
      },
      dependencies: [],
    },
    {
      id: 'verify-3ds',
      taskRef: '3ds-verifier',
      description: '3D Secure verification if required',
      timeout: '30s',
      retryCount: 1,
      inputMapping: {
        cardToken: '{{input.cardToken}}',
        amount: '{{input.amount}}',
      },
      outputSchema: { type: "object", properties: {
        verified: { type: 'boolean' },
        authToken: { type: 'string' },
      },
      },
      dependencies: ['fraud-check'],
    },
    {
      id: 'authorize-payment',
      taskRef: 'payment-gateway',
      description: 'Authorize payment with card issuer',
      timeout: '20s',
      retryCount: 2,
      inputMapping: {
        amount: '{{input.amount}}',
        currency: '{{input.currency}}',
        cardToken: '{{input.cardToken}}',
        authToken: '{{tasks.verify-3ds.output.authToken}}',
      },
      outputSchema: { type: "object", properties: {
        authorizationId: { type: 'string' },
        status: { type: 'string' },
      },
      },
      dependencies: ['verify-3ds'],
    },
    {
      id: 'update-ledger',
      taskRef: 'ledger-service',
      description: 'Record transaction in ledger',
      timeout: '10s',
      retryCount: 3,
      inputMapping: {
        customerId: '{{input.customerId}}',
        amount: '{{input.amount}}',
        authorizationId: '{{tasks.authorize-payment.output.authorizationId}}',
      },
      outputSchema: { type: "object", properties: {
        ledgerEntryId: { type: 'string' },
      },
      },
      dependencies: ['authorize-payment'],
    },
    {
      id: 'capture-payment',
      taskRef: 'payment-gateway',
      description: 'Capture authorized payment',
      timeout: '15s',
      retryCount: 3,
      inputMapping: {
        authorizationId: '{{tasks.authorize-payment.output.authorizationId}}',
      },
      outputSchema: { type: "object", properties: {
        transactionId: { type: 'string' },
        status: { type: 'string' },
      },
      },
      dependencies: ['update-ledger'],
    },
  ],
  graph: {
    nodes: [
      { id: 'fraud-check', type: 'task', position: { x: 0, y: 0 }, data: { label: 'fraud-check', status: 'idle' } },
      { id: 'verify-3ds', type: 'task', position: { x: 0, y: 100 }, data: { label: 'verify-3ds', status: 'idle' } },
      { id: 'authorize-payment', type: 'task', position: { x: 0, y: 200 }, data: { label: 'authorize-payment', status: 'idle' } },
      { id: 'update-ledger', type: 'task', position: { x: 0, y: 300 }, data: { label: 'update-ledger', status: 'idle' } },
      { id: 'capture-payment', type: 'task', position: { x: 0, y: 400 }, data: { label: 'capture-payment', status: 'idle' } },
    ],
    edges: [
      { id: 'e1', source: 'fraud-check', target: 'verify-3ds', type: 'dependency', animated: false },
      { id: 'e2', source: 'verify-3ds', target: 'authorize-payment', type: 'dependency', animated: false },
      { id: 'e3', source: 'authorize-payment', target: 'update-ledger', type: 'dependency', animated: false },
      { id: 'e4', source: 'update-ledger', target: 'capture-payment', type: 'dependency', animated: false },
    ],
    parallelGroups: [
      { level: 0, taskIds: ['fraud-check'] },
      { level: 1, taskIds: ['verify-3ds'] },
      { level: 2, taskIds: ['authorize-payment'] },
      { level: 3, taskIds: ['update-ledger'] },
      { level: 4, taskIds: ['capture-payment'] },
    ],
  },
  endpoints: {
    execute: '/api/v1/workflows/payment-flow/execute',
    test: '/api/v1/workflows/payment-flow/test',
    details: '/api/v1/workflows/payment-flow',
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

export const mockWorkflowList: WorkflowListItem[] = [
  userSignupList,
  orderProcessingList,
  dataPipelineList,
  userOnboardingList,
  paymentFlowList,
];

export const mockWorkflowDetails: Record<string, WorkflowDetail> = {
  'user-signup': userSignupDetail,
  'order-processing': orderProcessingDetail,
  'data-pipeline': dataPipelineDetail,
  'user-onboarding': userOnboardingDetail,
  'payment-flow': paymentFlowDetail,
};
