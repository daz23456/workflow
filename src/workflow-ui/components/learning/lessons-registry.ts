/**
 * Interactive Lessons Registry
 * Stage 9.5: Interactive Documentation & Learning - Day 2
 *
 * 5 comprehensive lessons with step-by-step guides and live YAML editing
 */

import type { Lesson } from '@/types/learning';

// ============================================================================
// LESSON 1: Hello World - Your First Workflow
// ============================================================================

export const LESSON_HELLO_WORLD: Lesson = {
  id: 'hello-world',
  title: 'Hello World: Your First Workflow',
  description: 'Create a simple workflow that makes an HTTP request and returns the response.',
  difficulty: 'beginner',
  estimatedTime: 10,
  order: 1,
  objectives: [
    'Understand basic workflow structure',
    'Configure a single HTTP task',
    'Test your workflow with dry-run',
    'Execute your first workflow',
  ],
  content: {
    introduction: 'Welcome to your first workflow! In this lesson, you\'ll create a simple workflow that fetches data from an API. This is the foundation for all workflows - a single task that does something useful.',
    steps: [
      {
        title: 'Define Workflow Metadata',
        description: 'Every workflow starts with basic metadata: name, description, and version.',
        codeExample: `apiVersion: workflow.io/v1
kind: Workflow
metadata:
  name: hello-world
  namespace: default
spec:
  description: My first workflow
  version: 1.0.0`,
        tips: [
          'Use lowercase-with-hyphens for workflow names',
          'Keep descriptions concise but meaningful',
          'Start with version 1.0.0 for new workflows',
        ],
      },
      {
        title: 'Add Input Schema',
        description: 'Define what inputs your workflow accepts. For this example, we\'ll accept a user ID.',
        codeExample: `  inputSchema:
    type: object
    properties:
      userId:
        type: string
        description: The user ID to fetch
    required:
      - userId`,
        tips: [
          'Input schema uses JSON Schema format',
          'Mark required fields explicitly',
          'Add descriptions to help users understand each field',
        ],
      },
      {
        title: 'Create Your First Task',
        description: 'Add a task that fetches user data from an API.',
        codeExample: `  tasks:
    - label: fetch-user
      taskRef: http-request
      description: Fetch user profile from API
      input:
        method: GET
        url: "https://api.example.com/users/{{input.userId}}"
        headers:
          Accept: "application/json"`,
        tips: [
          'label identifies this task (use kebab-case)',
          'taskRef references a WorkflowTask resource',
          'Use {{input.userId}} to reference workflow inputs',
        ],
      },
      {
        title: 'Test with Dry-Run',
        description: 'Before executing, test your workflow to catch errors early.',
        tips: [
          'Dry-run validates your workflow without side effects',
          'It checks for template errors and missing references',
          'Always dry-run before deploying to production',
        ],
      },
    ],
    summary: 'Congratulations! You\'ve created your first workflow. You learned how to define metadata, specify inputs, create tasks, and test with dry-run. This is the foundation for all workflows.',
  },
  yaml: `apiVersion: workflow.io/v1
kind: Workflow
metadata:
  name: hello-world
  namespace: default
spec:
  description: My first workflow - fetches user data from API
  version: 1.0.0

  inputSchema:
    type: object
    properties:
      userId:
        type: string
        description: The user ID to fetch
    required:
      - userId

  tasks:
    - label: fetch-user
      taskRef: http-request
      description: Fetch user profile from API
      input:
        method: GET
        url: "https://api.example.com/users/{{input.userId}}"
        headers:
          Accept: "application/json"`,
  successCriteria: [
    'Workflow YAML is valid',
    'Input schema accepts userId',
    'Task references http-request',
    'Template expression {{input.userId}} is correct',
    'Dry-run validation passes',
  ],
};

// ============================================================================
// LESSON 2: Task Dependencies - Chaining Tasks Together
// ============================================================================

export const LESSON_TASK_DEPENDENCIES: Lesson = {
  id: 'task-dependencies',
  title: 'Task Dependencies: Chaining Tasks',
  description: 'Learn how to chain tasks together by referencing outputs from previous tasks.',
  difficulty: 'beginner',
  estimatedTime: 15,
  order: 2,
  objectives: [
    'Understand how task dependencies work',
    'Reference task outputs with {{tasks.label.output}}',
    'Create a multi-step workflow',
    'Pass data between tasks',
  ],
  content: {
    introduction: 'Most real workflows involve multiple steps. In this lesson, you\'ll learn how to chain tasks together by passing data from one task to the next.',
    steps: [
      {
        title: 'Create the First Task',
        description: 'Start with a task that fetches user data.',
        codeExample: `  tasks:
    - label: fetch-user
      taskRef: http-request
      description: Get user profile
      input:
        method: GET
        url: "https://api.example.com/users/{{input.userId}}"`,
        tips: [
          'This task fetches user data',
          'Output will include user email and name',
        ],
      },
      {
        title: 'Add a Dependent Task',
        description: 'Create a second task that uses data from the first task.',
        codeExample: `    - label: send-welcome-email
      taskRef: http-request
      description: Send welcome email to user
      input:
        method: POST
        url: "https://api.example.com/emails/send"
        body:
          to: "{{tasks.fetch-user.output.email}}"
          subject: "Welcome!"
          message: "Hello {{tasks.fetch-user.output.name}}"`,
        tips: [
          '{{tasks.fetch-user.output.email}} references the first task\'s output',
          'Dependencies are automatically detected from templates',
          'send-welcome-email will wait for fetch-user to complete',
        ],
      },
      {
        title: 'Visualize the Execution Graph',
        description: 'The system automatically detects dependencies and creates an execution graph.',
        tips: [
          'Tasks run in topological order based on dependencies',
          'The graph ensures data is available before it\'s needed',
          'You can visualize the graph in the workflow builder',
        ],
      },
    ],
    summary: 'You\'ve learned how to chain tasks together! By referencing task outputs, you create implicit dependencies. The workflow engine ensures tasks run in the correct order.',
  },
  yaml: `apiVersion: workflow.io/v1
kind: Workflow
metadata:
  name: user-onboarding
  namespace: default
spec:
  description: Fetch user and send welcome email
  version: 1.0.0

  inputSchema:
    type: object
    properties:
      userId:
        type: string
    required:
      - userId

  tasks:
    - label: fetch-user
      taskRef: http-request
      description: Get user profile
      input:
        method: GET
        url: "https://api.example.com/users/{{input.userId}}"
        headers:
          Accept: "application/json"

    - label: send-welcome-email
      taskRef: http-request
      description: Send welcome email to user
      input:
        method: POST
        url: "https://api.example.com/emails/send"
        headers:
          Content-Type: "application/json"
        body:
          to: "{{tasks.fetch-user.output.email}}"
          subject: "Welcome!"
          message: "Hello {{tasks.fetch-user.output.name}}, welcome to our platform!"`,
  successCriteria: [
    'Two tasks defined: fetch-user and send-welcome-email',
    'send-welcome-email references fetch-user output',
    'Template expressions use correct syntax',
    'Dependency graph shows correct order',
  ],
};

// ============================================================================
// LESSON 3: Parallel Execution - Speed Up Your Workflows
// ============================================================================

export const LESSON_PARALLEL_EXECUTION: Lesson = {
  id: 'parallel-execution',
  title: 'Parallel Execution: Speed Up Workflows',
  description: 'Learn how to run independent tasks in parallel for dramatic performance improvements.',
  difficulty: 'intermediate',
  estimatedTime: 20,
  order: 3,
  objectives: [
    'Identify independent tasks that can run in parallel',
    'Create parallel task groups',
    'Understand parallelism vs sequential execution',
    'Measure performance improvements',
  ],
  content: {
    introduction: 'Running independent tasks in parallel can dramatically speed up your workflows. In this lesson, you\'ll learn how to identify opportunities for parallelism and configure parallel execution.',
    steps: [
      {
        title: 'Create Independent Tasks',
        description: 'Tasks that don\'t depend on each other can run in parallel.',
        codeExample: `  tasks:
    - label: fetch-user
      taskRef: http-request
      description: Get user profile
      input:
        method: GET
        url: "https://api.example.com/users/{{input.userId}}"

    - label: fetch-products
      taskRef: http-request
      description: Get product catalog
      input:
        method: GET
        url: "https://api.example.com/products"`,
        tips: [
          'These tasks are independent - neither references the other',
          'They will automatically run in parallel',
          'No configuration needed - the engine detects this',
        ],
      },
      {
        title: 'Add a Task That Depends on Both',
        description: 'Create a task that waits for both parallel tasks to complete.',
        codeExample: `    - label: generate-recommendations
      taskRef: http-request
      description: Generate personalized recommendations
      input:
        method: POST
        url: "https://api.example.com/recommendations"
        body:
          userId: "{{tasks.fetch-user.output.id}}"
          products: "{{tasks.fetch-products.output.items}}"`,
        tips: [
          'This task depends on BOTH previous tasks',
          'It will wait for both to complete before starting',
          'Execution time = max(fetch-user, fetch-products) + generate-recommendations',
        ],
      },
      {
        title: 'Visualize Parallel Groups',
        description: 'Use dry-run to see which tasks run in parallel.',
        tips: [
          'Parallel groups are shown in the execution plan',
          'Level 0: fetch-user and fetch-products (parallel)',
          'Level 1: generate-recommendations (waits for both)',
          'Total time is much faster than sequential execution',
        ],
      },
    ],
    summary: 'You\'ve mastered parallel execution! By designing workflows with independent tasks, you can achieve dramatic performance improvements. The workflow engine automatically detects and executes parallelism.',
  },
  yaml: `apiVersion: workflow.io/v1
kind: Workflow
metadata:
  name: parallel-recommendation
  namespace: default
spec:
  description: Fetch data in parallel and generate recommendations
  version: 1.0.0

  inputSchema:
    type: object
    properties:
      userId:
        type: string
    required:
      - userId

  tasks:
    # These two tasks run in PARALLEL (no dependencies)
    - label: fetch-user
      taskRef: http-request
      description: Get user profile
      input:
        method: GET
        url: "https://api.example.com/users/{{input.userId}}"

    - label: fetch-products
      taskRef: http-request
      description: Get product catalog
      input:
        method: GET
        url: "https://api.example.com/products"

    # This task waits for BOTH above tasks (depends on both)
    - label: generate-recommendations
      taskRef: http-request
      description: Generate personalized recommendations
      input:
        method: POST
        url: "https://api.example.com/recommendations"
        body:
          userId: "{{tasks.fetch-user.output.id}}"
          products: "{{tasks.fetch-products.output.items}}"`,
  successCriteria: [
    'Three tasks defined with correct labels',
    'fetch-user and fetch-products are independent',
    'generate-recommendations depends on both previous tasks',
    'Execution plan shows parallel groups',
    'Performance improvement vs sequential execution',
  ],
};

// ============================================================================
// LESSON 4: Template Syntax - Advanced Data Flow
// ============================================================================

export const LESSON_TEMPLATE_SYNTAX: Lesson = {
  id: 'template-syntax',
  title: 'Template Syntax: Advanced Data Flow',
  description: 'Master template expressions for complex data transformations and nested property access.',
  difficulty: 'intermediate',
  estimatedTime: 20,
  order: 4,
  objectives: [
    'Use nested property paths with dot notation',
    'Access array elements in templates',
    'Combine multiple template expressions',
    'Handle complex data structures',
  ],
  content: {
    introduction: 'Template expressions are powerful tools for data flow in workflows. This lesson covers advanced template syntax for handling complex data structures.',
    steps: [
      {
        title: 'Nested Property Access',
        description: 'Use dot notation to access deeply nested properties.',
        codeExample: `  tasks:
    - label: fetch-order
      taskRef: http-request
      input:
        url: "https://api.example.com/orders/{{input.orderId}}"

    - label: process-payment
      taskRef: http-request
      input:
        amount: "{{tasks.fetch-order.output.data.payment.amount}}"
        currency: "{{tasks.fetch-order.output.data.payment.currency}}"
        customer: "{{tasks.fetch-order.output.data.customer.email}}"`,
        tips: [
          'Use dot notation for nested objects: data.payment.amount',
          'Access any depth: output.data.customer.address.city',
          'Template expressions resolve at runtime',
        ],
      },
      {
        title: 'Array Element Access',
        description: 'Access specific array elements using bracket notation.',
        codeExample: `    - label: process-first-item
      taskRef: http-request
      input:
        productId: "{{tasks.fetch-order.output.items[0].productId}}"
        quantity: "{{tasks.fetch-order.output.items[0].quantity}}"`,
        tips: [
          'Use [0] to access first element',
          'Use [1] for second element, etc.',
          'Combine with dot notation: items[0].productId',
        ],
      },
      {
        title: 'Multiple References in One Value',
        description: 'Combine data from multiple sources in a single field.',
        codeExample: '    - label: send-notification\n      taskRef: http-request\n      input:\n        message: "Order {{input.orderId}} for {{tasks.fetch-order.output.customer.name}} - Total: ${{tasks.fetch-order.output.total}}"',
        tips: [
          'Mix template expressions with static text',
          'Multiple {{...}} expressions in one string',
          'Great for building messages and URLs',
        ],
      },
    ],
    summary: 'You\'re now proficient with advanced template syntax! You can access nested properties, array elements, and combine multiple data sources. This unlocks powerful data transformation capabilities.',
  },
  yaml: `apiVersion: workflow.io/v1
kind: Workflow
metadata:
  name: advanced-templates
  namespace: default
spec:
  description: Demonstrates advanced template syntax
  version: 1.0.0

  inputSchema:
    type: object
    properties:
      orderId:
        type: string
    required:
      - orderId

  tasks:
    - label: fetch-order
      taskRef: http-request
      description: Get order details
      input:
        method: GET
        url: "https://api.example.com/orders/{{input.orderId}}"

    - label: process-payment
      taskRef: http-request
      description: Process payment with nested data
      input:
        method: POST
        url: "https://api.example.com/payments"
        body:
          amount: "{{tasks.fetch-order.output.data.payment.amount}}"
          currency: "{{tasks.fetch-order.output.data.payment.currency}}"
          customerEmail: "{{tasks.fetch-order.output.data.customer.email}}"

    - label: send-confirmation
      taskRef: http-request
      description: Send confirmation with combined data
      input:
        method: POST
        url: "https://api.example.com/notifications/email"
        body:
          to: "{{tasks.fetch-order.output.data.customer.email}}"
          subject: "Order Confirmation"
          message: "Order {{input.orderId}} confirmed for {{tasks.fetch-order.output.data.customer.name}}. Total: \${'{'}{{tasks.fetch-order.output.data.payment.amount}}"`,
  successCriteria: [
    'Uses nested property access (data.payment.amount)',
    'Accesses customer data (data.customer.email)',
    'Combines multiple templates in one string',
    'All template expressions are valid',
    'Workflow validates successfully',
  ],
};

// ============================================================================
// LESSON 5: Advanced Features - Production-Ready Workflows
// ============================================================================

export const LESSON_ADVANCED_FEATURES: Lesson = {
  id: 'advanced-features',
  title: 'Advanced Features: Production-Ready Workflows',
  description: 'Learn output mapping, timeouts, and error handling for production-grade workflows.',
  difficulty: 'advanced',
  estimatedTime: 25,
  order: 5,
  objectives: [
    'Map task outputs to workflow outputs',
    'Configure per-task timeouts',
    'Understand timeout string syntax',
    'Build production-ready workflows',
  ],
  content: {
    introduction: 'Production workflows need robust error handling, timeouts, and clear outputs. This lesson covers advanced features that make your workflows production-ready.',
    steps: [
      {
        title: 'Output Mapping',
        description: 'Control what data your workflow returns to callers.',
        codeExample: `spec:
  output:
    userId: "{{tasks.fetch-user.output.id}}"
    email: "{{tasks.fetch-user.output.email}}"
    recommendationCount: "{{tasks.generate-recommendations.output.count}}"`,
        tips: [
          'Output mapping defines the workflow\'s return value',
          'Expose only the data callers need',
          'Use template expressions to map from task outputs',
        ],
      },
      {
        title: 'Task Timeouts',
        description: 'Prevent tasks from running too long with timeout configuration.',
        codeExample: `  tasks:
    - label: fetch-user
      taskRef: http-request
      timeout: 5s
      input:
        url: "https://api.example.com/users/{{input.userId}}"

    - label: generate-report
      taskRef: http-request
      timeout: 30s
      input:
        url: "https://api.example.com/reports/generate"`,
        tips: [
          'Timeout syntax: 500ms, 5s, 2m, 1h',
          'Use short timeouts for simple operations',
          'Use longer timeouts for heavy processing',
          'Tasks are cancelled if they exceed timeout',
        ],
      },
      {
        title: 'Complete Production Workflow',
        description: 'Combine all features for a production-ready workflow.',
        tips: [
          'Output mapping provides clean API responses',
          'Timeouts prevent runaway tasks',
          'Clear descriptions help with debugging',
          'Version tracking enables safe updates',
        ],
      },
    ],
    summary: 'Congratulations! You\'ve mastered all the advanced features. You can now build production-ready workflows with proper output mapping, timeouts, and error handling. You\'re ready to create complex, reliable workflows!',
  },
  yaml: `apiVersion: workflow.io/v1
kind: Workflow
metadata:
  name: production-workflow
  namespace: default
spec:
  description: Production-ready workflow with all advanced features
  version: 1.0.0

  inputSchema:
    type: object
    properties:
      userId:
        type: string
    required:
      - userId

  # Output Mapping - Define what the workflow returns
  output:
    userId: "{{tasks.fetch-user.output.id}}"
    userName: "{{tasks.fetch-user.output.name}}"
    email: "{{tasks.fetch-user.output.email}}"
    recommendationCount: "{{tasks.generate-recommendations.output.count}}"
    processingTime: "{{tasks.generate-recommendations.output.duration}}"

  tasks:
    # Task 1: Fetch user with 5 second timeout
    - label: fetch-user
      taskRef: http-request
      description: Get user profile
      timeout: 5s
      input:
        method: GET
        url: "https://api.example.com/users/{{input.userId}}"

    # Task 2: Fetch products with 10 second timeout
    - label: fetch-products
      taskRef: http-request
      description: Get product catalog
      timeout: 10s
      input:
        method: GET
        url: "https://api.example.com/products"

    # Task 3: Generate recommendations with 30 second timeout
    - label: generate-recommendations
      taskRef: http-request
      description: Generate AI-powered recommendations
      timeout: 30s
      input:
        method: POST
        url: "https://api.example.com/ml/recommendations"
        body:
          userId: "{{tasks.fetch-user.output.id}}"
          products: "{{tasks.fetch-products.output.items}}"
          preferences: "{{tasks.fetch-user.output.preferences}}"`,
  successCriteria: [
    'Output mapping is defined with 5 fields',
    'All tasks have timeout configurations',
    'Timeout syntax is correct (5s, 10s, 30s)',
    'Workflow uses parallel execution',
    'All template expressions are valid',
  ],
};

// ============================================================================
// LESSONS REGISTRY - Export all lessons
// ============================================================================

export const ALL_LESSONS: Lesson[] = [
  LESSON_HELLO_WORLD,
  LESSON_TASK_DEPENDENCIES,
  LESSON_PARALLEL_EXECUTION,
  LESSON_TEMPLATE_SYNTAX,
  LESSON_ADVANCED_FEATURES,
];

/**
 * Get lesson by ID
 */
export function getLessonById(id: string): Lesson | undefined {
  return ALL_LESSONS.find(lesson => lesson.id === id);
}

/**
 * Get lessons by difficulty
 */
export function getLessonsByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): Lesson[] {
  return ALL_LESSONS.filter(lesson => lesson.difficulty === difficulty);
}

/**
 * Get next lesson after current lesson
 */
export function getNextLesson(currentLessonId: string): Lesson | undefined {
  const currentIndex = ALL_LESSONS.findIndex(lesson => lesson.id === currentLessonId);
  if (currentIndex === -1 || currentIndex === ALL_LESSONS.length - 1) {
    return undefined;
  }
  return ALL_LESSONS[currentIndex + 1];
}

/**
 * Get previous lesson before current lesson
 */
export function getPreviousLesson(currentLessonId: string): Lesson | undefined {
  const currentIndex = ALL_LESSONS.findIndex(lesson => lesson.id === currentLessonId);
  if (currentIndex === -1 || currentIndex === 0) {
    return undefined;
  }
  return ALL_LESSONS[currentIndex - 1];
}
