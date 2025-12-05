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
// LESSON 6: Control Flow - Conditional Execution
// ============================================================================

export const LESSON_CONTROL_FLOW_CONDITIONS: Lesson = {
  id: 'control-flow-conditions',
  title: 'Control Flow: Conditional Execution',
  description: 'Learn how to skip tasks based on conditions using if/else expressions.',
  difficulty: 'intermediate',
  estimatedTime: 15,
  order: 6,
  objectives: [
    'Understand conditional task execution',
    'Write if/else condition expressions',
    'Use comparison operators (==, !=, >, <)',
    'Combine conditions with && and ||',
  ],
  content: {
    introduction: 'Not every task should run every time. With conditions, you can skip tasks based on data from previous tasks or input values. This enables branching logic in your workflows.',
    steps: [
      {
        title: 'Basic If Condition',
        description: 'Add a condition to skip a task based on a boolean value.',
        codeExample: `  tasks:
    - id: check-credit
      taskRef: credit-check
      input:
        customerId: "{{input.customerId}}"

    - id: process-payment
      condition:
        if: "{{tasks.check-credit.output.approved}} == true"
      taskRef: charge-card
      input:
        customerId: "{{input.customerId}}"`,
        tips: [
          'The condition.if field contains an expression',
          'If the expression evaluates to false, the task is skipped',
          'Skipped tasks don\'t affect dependent tasks',
        ],
      },
      {
        title: 'Comparison Operators',
        description: 'Use different operators to compare values.',
        codeExample: `    - id: apply-discount
      condition:
        if: "{{tasks.get-order.output.total}} > 100"
      taskRef: apply-discount
      input:
        orderId: "{{input.orderId}}"
        discountPercent: 10

    - id: premium-shipping
      condition:
        if: "{{tasks.get-order.output.tier}} != 'basic'"
      taskRef: enable-premium-shipping`,
        tips: [
          'Operators: == (equal), != (not equal), >, <, >=, <=',
          'String comparisons use quotes: == \'value\'',
          'Number comparisons work without quotes: > 100',
        ],
      },
      {
        title: 'Combining Conditions',
        description: 'Use logical operators to combine multiple conditions.',
        codeExample: `    - id: send-vip-email
      condition:
        if: "{{tasks.get-user.output.isVip}} == true && {{tasks.get-order.output.total}} > 500"
      taskRef: send-vip-notification

    - id: fraud-alert
      condition:
        if: "{{tasks.check-fraud.output.score}} > 80 || {{tasks.check-fraud.output.flagged}} == true"
      taskRef: alert-fraud-team`,
        tips: [
          '&& means AND - both conditions must be true',
          '|| means OR - either condition can be true',
          'Use ! for NOT: !{{tasks.check.output.valid}}',
        ],
      },
    ],
    summary: 'You\'ve learned conditional task execution! Now you can create workflows that adapt based on data, skipping irrelevant tasks and routing to different branches.',
  },
  yaml: `apiVersion: workflow.io/v1
kind: Workflow
metadata:
  name: conditional-order-processing
  namespace: default
spec:
  description: Process orders with conditional logic
  version: 1.0.0

  inputSchema:
    type: object
    properties:
      customerId:
        type: string
      orderId:
        type: string
    required:
      - customerId
      - orderId

  tasks:
    # Step 1: Check customer credit
    - id: check-credit
      taskRef: credit-check
      input:
        customerId: "{{input.customerId}}"

    # Step 2: Only process payment if approved
    - id: process-payment
      condition:
        if: "{{tasks.check-credit.output.approved}} == true"
      taskRef: charge-card
      input:
        customerId: "{{input.customerId}}"
        orderId: "{{input.orderId}}"

    # Step 3: Only send rejection if NOT approved
    - id: send-rejection
      condition:
        if: "{{tasks.check-credit.output.approved}} == false"
      taskRef: send-rejection-email
      input:
        customerId: "{{input.customerId}}"
        reason: "{{tasks.check-credit.output.reason}}"`,
  successCriteria: [
    'Workflow has condition.if on tasks',
    'Comparison uses == for equality',
    'Both true and false branches are handled',
    'Template expressions reference task outputs',
    'Workflow validates successfully',
  ],
};

// ============================================================================
// LESSON 7: Switch/Case - Multi-Branch Routing
// ============================================================================

export const LESSON_SWITCH_CASE: Lesson = {
  id: 'switch-case',
  title: 'Switch/Case: Multi-Branch Routing',
  description: 'Route workflow execution to different tasks based on a value using switch/case.',
  difficulty: 'intermediate',
  estimatedTime: 15,
  order: 7,
  objectives: [
    'Understand switch/case routing',
    'Define multiple case branches',
    'Handle unknown values with default',
    'Choose between conditions and switch/case',
  ],
  content: {
    introduction: 'When you need to route to one of many tasks based on a single value, switch/case is cleaner than multiple if conditions. Think of it like a menu selector.',
    steps: [
      {
        title: 'Basic Switch/Case',
        description: 'Route to different tasks based on a value.',
        codeExample: `  tasks:
    - id: route-payment
      switch:
        value: "{{input.paymentMethod}}"
        cases:
          - match: "stripe"
            taskRef: stripe-charge
          - match: "paypal"
            taskRef: paypal-charge
          - match: "invoice"
            taskRef: create-invoice`,
        tips: [
          'value is the expression to evaluate',
          'Each case has a match value and taskRef',
          'First matching case wins',
        ],
      },
      {
        title: 'Default Case',
        description: 'Handle unexpected values with a default case.',
        codeExample: `    - id: route-payment
      switch:
        value: "{{input.paymentMethod}}"
        cases:
          - match: "stripe"
            taskRef: stripe-charge
          - match: "paypal"
            taskRef: paypal-charge
        default:
          taskRef: unknown-payment-error`,
        tips: [
          'default runs if no case matches',
          'Always include a default for safety',
          'Error if no match AND no default',
        ],
      },
      {
        title: 'When to Use Switch vs Conditions',
        description: 'Choose the right tool for the job.',
        tips: [
          'Use switch when routing based on ONE value with MANY options',
          'Use conditions when logic depends on MULTIPLE values',
          'Use conditions for range checks (> 100)',
          'Switch is cleaner for "menu-like" selections',
        ],
      },
    ],
    summary: 'You\'ve mastered switch/case routing! Use it when you have a single value that determines which of many paths to take. Always include a default case for robustness.',
  },
  yaml: `apiVersion: workflow.io/v1
kind: Workflow
metadata:
  name: payment-router
  namespace: default
spec:
  description: Route payments to different processors
  version: 1.0.0

  inputSchema:
    type: object
    properties:
      paymentMethod:
        type: string
        enum: [stripe, paypal, invoice, apple-pay]
      amount:
        type: number
      customerId:
        type: string
    required:
      - paymentMethod
      - amount
      - customerId

  tasks:
    # Route to different payment processors
    - id: process-payment
      switch:
        value: "{{input.paymentMethod}}"
        cases:
          - match: "stripe"
            taskRef: stripe-charge
            input:
              amount: "{{input.amount}}"
              customerId: "{{input.customerId}}"
          - match: "paypal"
            taskRef: paypal-charge
            input:
              amount: "{{input.amount}}"
              email: "{{input.customerEmail}}"
          - match: "invoice"
            taskRef: create-invoice
            input:
              amount: "{{input.amount}}"
              dueDate: "{{input.invoiceDueDate}}"
        default:
          taskRef: unsupported-payment-method
          input:
            method: "{{input.paymentMethod}}"

    # Confirmation runs after whichever payment succeeded
    - id: send-confirmation
      taskRef: send-receipt
      input:
        customerId: "{{input.customerId}}"
        paymentId: "{{tasks.process-payment.output.paymentId}}"`,
  successCriteria: [
    'switch.value references input or task output',
    'Multiple cases defined with match values',
    'default case handles unknown values',
    'Each case has a taskRef',
    'Workflow validates successfully',
  ],
};

// ============================================================================
// LESSON 8: forEach Loops - Array Iteration
// ============================================================================

export const LESSON_FOR_EACH: Lesson = {
  id: 'for-each-loops',
  title: 'forEach Loops: Process Arrays',
  description: 'Iterate over arrays and process each item with parallel execution.',
  difficulty: 'advanced',
  estimatedTime: 20,
  order: 8,
  objectives: [
    'Iterate over arrays with forEach',
    'Access current item and index',
    'Control parallelism with maxParallel',
    'Aggregate results from all iterations',
  ],
  content: {
    introduction: 'When you have an array of items to process (orders, users, products), forEach lets you run a task for each item. Items can be processed in parallel for massive speedups.',
    steps: [
      {
        title: 'Basic forEach',
        description: 'Process each item in an array.',
        codeExample: `  tasks:
    - id: process-orders
      forEach:
        items: "{{input.orderIds}}"
        itemVar: "order"
      taskRef: process-order
      input:
        orderId: "{{forEach.order}}"`,
        tips: [
          'items is the array to iterate over',
          'itemVar names the current item variable',
          'Access current item with {{forEach.order}}',
        ],
      },
      {
        title: 'Access Index and Control Parallelism',
        description: 'Use the iteration index and limit concurrent executions.',
        codeExample: `    - id: process-items
      forEach:
        items: "{{input.items}}"
        itemVar: "item"
        maxParallel: 5
      taskRef: process-item
      input:
        itemId: "{{forEach.item.id}}"
        index: "{{forEach.index}}"
        batchLabel: "Item {{forEach.index}} of batch"`,
        tips: [
          '{{forEach.index}} is the 0-based iteration index',
          'maxParallel limits concurrent executions (default: unlimited)',
          'Use maxParallel to avoid overwhelming APIs',
        ],
      },
      {
        title: 'Access Aggregated Results',
        description: 'Get results from all iterations.',
        codeExample: `  output:
    results: "{{tasks.process-items.forEach.outputs}}"
    totalProcessed: "{{tasks.process-items.forEach.successCount}}"
    failedCount: "{{tasks.process-items.forEach.failureCount}}"`,
        tips: [
          'forEach.outputs is an array of all iteration outputs',
          'forEach.successCount counts successful iterations',
          'forEach.failureCount counts failed iterations',
          'forEach.itemCount is the total number of items',
        ],
      },
    ],
    summary: 'You\'ve mastered forEach loops! Process arrays efficiently with parallel execution. Use maxParallel to control concurrency and access aggregated results for reporting.',
  },
  yaml: `apiVersion: workflow.io/v1
kind: Workflow
metadata:
  name: batch-order-processor
  namespace: default
spec:
  description: Process multiple orders in parallel
  version: 1.0.0

  inputSchema:
    type: object
    properties:
      orderIds:
        type: array
        items:
          type: string
    required:
      - orderIds

  tasks:
    # Process each order in parallel (max 5 at a time)
    - id: process-orders
      forEach:
        items: "{{input.orderIds}}"
        itemVar: "orderId"
        maxParallel: 5
      taskRef: process-order
      input:
        orderId: "{{forEach.orderId}}"
        index: "{{forEach.index}}"

  # Expose aggregated results
  output:
    processedOrders: "{{tasks.process-orders.forEach.outputs}}"
    successCount: "{{tasks.process-orders.forEach.successCount}}"
    failureCount: "{{tasks.process-orders.forEach.failureCount}}"
    totalOrders: "{{tasks.process-orders.forEach.itemCount}}"`,
  successCriteria: [
    'forEach.items references an array',
    'forEach.itemVar names the iteration variable',
    'Task input uses {{forEach.varName}} syntax',
    'maxParallel is set to control concurrency',
    'Output uses forEach.outputs for aggregation',
  ],
};

// ============================================================================
// LESSON 9: Transform DSL - Data Transformations
// ============================================================================

export const LESSON_TRANSFORM_DSL: Lesson = {
  id: 'transform-dsl',
  title: 'Transform DSL: Shape Your Data',
  description: 'Transform data between tasks using map, filter, select, and more.',
  difficulty: 'advanced',
  estimatedTime: 20,
  order: 9,
  objectives: [
    'Transform arrays with map and filter',
    'Select specific fields from objects',
    'Chain transformations in pipelines',
    'Handle complex data structures',
  ],
  content: {
    introduction: 'When task outputs don\'t match the next task\'s expected input format, transforms bridge the gap. The Transform DSL provides powerful operations for reshaping data.',
    steps: [
      {
        title: 'Filter and Map',
        description: 'Filter arrays and transform each element.',
        codeExample: `  tasks:
    - id: get-orders
      taskRef: fetch-orders

    - id: process-high-value
      taskRef: process-orders
      input:
        orders: |
          {{tasks.get-orders.output.orders
            | filter: item.total > 100
            | map: { id: item.id, amount: item.total }
          }}`,
        tips: [
          'filter: keeps items matching the condition',
          'map: transforms each item to a new shape',
          'Chain with | (pipe) operator',
        ],
      },
      {
        title: 'Select Fields',
        description: 'Extract specific fields from objects.',
        codeExample: `    - id: send-notification
      taskRef: send-email
      input:
        recipients: |
          {{tasks.get-users.output.users
            | select: email, name
          }}`,
        tips: [
          'select: picks specific fields',
          'Reduces payload size',
          'Useful for privacy (exclude sensitive fields)',
        ],
      },
      {
        title: 'Advanced Operations',
        description: 'Sort, limit, flatten, and more.',
        codeExample: `    - id: get-top-products
      taskRef: display-products
      input:
        products: |
          {{tasks.get-catalog.output.products
            | filter: item.inStock == true
            | sort: item.rating desc
            | limit: 10
            | map: { name: item.name, price: item.price }
          }}`,
        tips: [
          'sort: orders by field (asc or desc)',
          'limit: N takes first N items',
          'flatten: unwraps nested arrays',
          'distinct: removes duplicates',
        ],
      },
    ],
    summary: 'You\'ve learned the Transform DSL! Use it to reshape data between tasks. Chain operations to build powerful transformation pipelines.',
  },
  yaml: `apiVersion: workflow.io/v1
kind: Workflow
metadata:
  name: data-transformation-demo
  namespace: default
spec:
  description: Demonstrates Transform DSL operations
  version: 1.0.0

  inputSchema:
    type: object
    properties:
      categoryId:
        type: string
    required:
      - categoryId

  tasks:
    # Fetch raw product data
    - id: fetch-products
      taskRef: get-products
      input:
        category: "{{input.categoryId}}"

    # Filter, sort, and transform for display
    - id: prepare-display
      taskRef: render-product-list
      input:
        # Transform pipeline: filter in-stock, sort by rating, take top 10
        products: |
          {{tasks.fetch-products.output.products
            | filter: item.inventory > 0
            | sort: item.rating desc
            | limit: 10
            | map: {
                id: item.id,
                name: item.name,
                price: item.price,
                rating: item.rating
              }
          }}

    # Get unique brands from products
    - id: get-brands
      taskRef: render-brand-filter
      input:
        brands: |
          {{tasks.fetch-products.output.products
            | map: item.brand
            | distinct
            | sort: item asc
          }}

  output:
    displayProducts: "{{tasks.prepare-display.output}}"
    availableBrands: "{{tasks.get-brands.output}}"`,
  successCriteria: [
    'Transform uses pipe (|) syntax',
    'filter: operation filters array',
    'map: operation transforms items',
    'sort: and limit: operations used',
    'Workflow validates successfully',
  ],
};

// ============================================================================
// LESSON 10: OpenAPI Import - Auto-Generate Tasks
// ============================================================================

export const LESSON_OPENAPI_IMPORT: Lesson = {
  id: 'openapi-import',
  title: 'OpenAPI Import: Auto-Generate Tasks',
  description: 'Generate WorkflowTask definitions automatically from OpenAPI/Swagger specs.',
  difficulty: 'advanced',
  estimatedTime: 15,
  order: 10,
  objectives: [
    'Understand the workflow-cli tool',
    'Import tasks from OpenAPI specs',
    'Customize generated tasks',
    'Manage task versions',
  ],
  content: {
    introduction: 'Manually creating WorkflowTask CRDs for every API endpoint is tedious. The workflow-cli can auto-generate tasks from OpenAPI/Swagger specifications, saving hours of work.',
    steps: [
      {
        title: 'Import from OpenAPI',
        description: 'Generate tasks from an OpenAPI specification.',
        codeExample: `# Import all endpoints from a Swagger spec
$ workflow-cli import openapi https://api.example.com/swagger.json \\
    --base-url https://api.example.com \\
    --prefix example

# Output:
# ✓ Parsed OpenAPI 3.0.0 spec
# ✓ Found 25 endpoints
# ✓ Generated 25 WorkflowTask CRDs
# ✓ Saved to ./tasks/example/`,
        tips: [
          'Works with OpenAPI 2.0 (Swagger) and 3.x',
          '--prefix adds a namespace to task names',
          '--base-url sets the API base URL in tasks',
        ],
      },
      {
        title: 'Filter Endpoints',
        description: 'Import only specific endpoints.',
        codeExample: `# Import only endpoints tagged "payments"
$ workflow-cli import openapi spec.yaml \\
    --tags payments,orders \\
    --exclude-tags internal

# Import and group by tag
$ workflow-cli import openapi spec.yaml \\
    --group-by-tag`,
        tips: [
          '--tags filters to specific API tags',
          '--exclude-tags removes unwanted endpoints',
          '--group-by-tag creates folders per tag',
        ],
      },
      {
        title: 'Generated Task Structure',
        description: 'Understand what gets generated.',
        codeExample: `# Generated WorkflowTask CRD
apiVersion: workflow.io/v1
kind: WorkflowTask
metadata:
  name: example-get-user
  labels:
    workflow.io/source: openapi
    workflow.io/content-hash: "abc123..."
spec:
  inputSchema:
    type: object
    properties:
      userId:
        type: string
  http:
    method: GET
    url: "https://api.example.com/users/{{input.userId}}"`,
        tips: [
          'Task names derived from operationId or path',
          'Input schema from path/query/body parameters',
          'content-hash label tracks spec changes',
          'Re-import detects breaking changes',
        ],
      },
    ],
    summary: 'You\'ve learned to auto-generate tasks from OpenAPI specs! This dramatically speeds up integration work. Use filters to import only what you need.',
  },
  yaml: `# This lesson demonstrates CLI usage, not a workflow YAML.
# Below is an example of a generated WorkflowTask from OpenAPI import.

apiVersion: workflow.io/v1
kind: WorkflowTask
metadata:
  name: petstore-get-pet-by-id
  namespace: default
  labels:
    workflow.io/source: openapi
    workflow.io/content-hash: "sha256:a1b2c3..."
spec:
  description: Find pet by ID (auto-generated from Petstore API)

  inputSchema:
    type: object
    properties:
      petId:
        type: integer
        description: ID of pet to return
    required:
      - petId

  outputSchema:
    type: object
    properties:
      id:
        type: integer
      name:
        type: string
      status:
        type: string
        enum: [available, pending, sold]

  http:
    method: GET
    url: "https://petstore.swagger.io/v2/pet/{{input.petId}}"
    headers:
      Accept: "application/json"`,
  successCriteria: [
    'Understand workflow-cli import command',
    'Know how to filter by tags',
    'Understand generated task structure',
    'Know that content-hash tracks changes',
    'Can apply generated tasks with kubectl',
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
  LESSON_CONTROL_FLOW_CONDITIONS,
  LESSON_SWITCH_CASE,
  LESSON_FOR_EACH,
  LESSON_TRANSFORM_DSL,
  LESSON_OPENAPI_IMPORT,
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
