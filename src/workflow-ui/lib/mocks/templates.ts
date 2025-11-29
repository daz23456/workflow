import { TemplateCategory, TemplateDifficulty, type TemplateListItem, type TemplateDetail } from '@/types/template';

/**
 * Mock workflow template data for development and testing
 */

export const mockTemplateList: TemplateListItem[] = [
  {
    name: 'parallel-api-fetch',
    category: TemplateCategory.ApiComposition,
    difficulty: TemplateDifficulty.Beginner,
    description: 'Fetch data from multiple APIs in parallel and combine results',
    tags: ['parallel', 'http', 'api', 'performance'],
    estimatedSetupTime: 5,
    taskCount: 3,
    hasParallelExecution: true,
    namespace: 'default',
  },
  {
    name: 'sequential-pipeline',
    category: TemplateCategory.ApiComposition,
    difficulty: TemplateDifficulty.Beginner,
    description: 'Execute API calls in sequence, passing data between steps',
    tags: ['sequential', 'pipeline', 'http', 'api'],
    estimatedSetupTime: 7,
    taskCount: 4,
    hasParallelExecution: false,
    namespace: 'default',
  },
  {
    name: 'conditional-branching',
    category: TemplateCategory.ApiComposition,
    difficulty: TemplateDifficulty.Intermediate,
    description: 'Conditional execution based on task outputs with branching logic',
    tags: ['conditional', 'branching', 'logic', 'api'],
    estimatedSetupTime: 12,
    taskCount: 5,
    hasParallelExecution: false,
    namespace: 'default',
  },
  {
    name: 'etl-pipeline',
    category: TemplateCategory.DataProcessing,
    difficulty: TemplateDifficulty.Intermediate,
    description: 'Extract, transform, and load data from multiple sources',
    tags: ['etl', 'transform', 'pipeline', 'data'],
    estimatedSetupTime: 15,
    taskCount: 6,
    hasParallelExecution: true,
    namespace: 'default',
  },
  {
    name: 'batch-processing',
    category: TemplateCategory.DataProcessing,
    difficulty: TemplateDifficulty.Advanced,
    description: 'Process large datasets in batches with parallel execution',
    tags: ['batch', 'parallel', 'processing', 'data', 'performance'],
    estimatedSetupTime: 20,
    taskCount: 8,
    hasParallelExecution: true,
    namespace: 'default',
  },
  {
    name: 'data-aggregation',
    category: TemplateCategory.DataProcessing,
    difficulty: TemplateDifficulty.Intermediate,
    description: 'Aggregate data from multiple sources with custom logic',
    tags: ['aggregate', 'transform', 'data', 'combine'],
    estimatedSetupTime: 10,
    taskCount: 4,
    hasParallelExecution: true,
    namespace: 'default',
  },
  {
    name: 'websocket-stream',
    category: TemplateCategory.RealTime,
    difficulty: TemplateDifficulty.Advanced,
    description: 'Real-time data streaming via WebSocket connections',
    tags: ['websocket', 'realtime', 'streaming', 'event'],
    estimatedSetupTime: 25,
    taskCount: 5,
    hasParallelExecution: false,
    namespace: 'default',
  },
  {
    name: 'event-driven',
    category: TemplateCategory.RealTime,
    difficulty: TemplateDifficulty.Advanced,
    description: 'Event-driven workflow with reactive task execution',
    tags: ['event', 'reactive', 'realtime', 'async'],
    estimatedSetupTime: 22,
    taskCount: 7,
    hasParallelExecution: true,
    namespace: 'default',
  },
  {
    name: 'polling-workflow',
    category: TemplateCategory.RealTime,
    difficulty: TemplateDifficulty.Intermediate,
    description: 'Poll external service until condition is met',
    tags: ['polling', 'retry', 'conditional', 'realtime'],
    estimatedSetupTime: 10,
    taskCount: 3,
    hasParallelExecution: false,
    namespace: 'default',
  },
  {
    name: 'slack-notification',
    category: TemplateCategory.Integrations,
    difficulty: TemplateDifficulty.Beginner,
    description: 'Send notifications to Slack channels with formatted messages',
    tags: ['slack', 'notification', 'webhook', 'integration'],
    estimatedSetupTime: 5,
    taskCount: 2,
    hasParallelExecution: false,
    namespace: 'default',
  },
  {
    name: 'github-webhook',
    category: TemplateCategory.Integrations,
    difficulty: TemplateDifficulty.Intermediate,
    description: 'Process GitHub webhook events and trigger actions',
    tags: ['github', 'webhook', 'integration', 'git'],
    estimatedSetupTime: 15,
    taskCount: 5,
    hasParallelExecution: false,
    namespace: 'default',
  },
  {
    name: 'payment-processing',
    category: TemplateCategory.Integrations,
    difficulty: TemplateDifficulty.Advanced,
    description: 'Complete payment workflow with validation and confirmation',
    tags: ['payment', 'transaction', 'validation', 'integration'],
    estimatedSetupTime: 30,
    taskCount: 10,
    hasParallelExecution: true,
    namespace: 'default',
  },
];

export const mockTemplateDetails: Record<string, TemplateDetail> = {
  'parallel-api-fetch': {
    ...mockTemplateList[0],
    yamlDefinition: `apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: parallel-api-fetch
  annotations:
    template.workflow.example.com/category: "ApiComposition"
    template.workflow.example.com/difficulty: "Beginner"
    template.workflow.example.com/estimatedSetupTime: "5"
spec:
  description: Fetch data from multiple APIs in parallel and combine results
  input:
    type: object
    properties:
      userIds:
        type: array
        items:
          type: string
  tasks:
    - id: fetch-users
      taskRef: user-service
      input:
        ids: "{{input.userIds}}"
    - id: fetch-profiles
      taskRef: profile-service
      input:
        ids: "{{input.userIds}}"
    - id: fetch-settings
      taskRef: settings-service
      input:
        ids: "{{input.userIds}}"
  output:
    users: "{{tasks.fetch-users.output}}"
    profiles: "{{tasks.fetch-profiles.output}}"
    settings: "{{tasks.fetch-settings.output}}"
`,
  },
  'sequential-pipeline': {
    ...mockTemplateList[1],
    yamlDefinition: `apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: sequential-pipeline
  annotations:
    template.workflow.example.com/category: "ApiComposition"
    template.workflow.example.com/difficulty: "Beginner"
    template.workflow.example.com/estimatedSetupTime: "7"
spec:
  description: Execute API calls in sequence, passing data between steps
  input:
    type: object
    properties:
      email:
        type: string
        format: email
  tasks:
    - id: validate-email
      taskRef: email-validator
      input:
        email: "{{input.email}}"
    - id: create-user
      taskRef: user-service
      dependsOn:
        - validate-email
      input:
        email: "{{input.email}}"
        validated: "{{tasks.validate-email.output.valid}}"
    - id: send-welcome
      taskRef: email-sender
      dependsOn:
        - create-user
      input:
        to: "{{input.email}}"
        userId: "{{tasks.create-user.output.id}}"
    - id: notify-admin
      taskRef: slack-notifier
      dependsOn:
        - send-welcome
      input:
        message: "New user created: {{input.email}}"
  output:
    userId: "{{tasks.create-user.output.id}}"
    emailSent: "{{tasks.send-welcome.output.sent}}"
`,
  },
  'conditional-branching': {
    ...mockTemplateList[2],
    yamlDefinition: `apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: conditional-branching
  annotations:
    template.workflow.example.com/category: "ApiComposition"
    template.workflow.example.com/difficulty: "Intermediate"
    template.workflow.example.com/estimatedSetupTime: "12"
spec:
  description: Conditional execution based on task outputs
  input:
    type: object
    properties:
      amount:
        type: number
      currency:
        type: string
  tasks:
    - id: validate-payment
      taskRef: payment-validator
      input:
        amount: "{{input.amount}}"
        currency: "{{input.currency}}"
    - id: process-small-payment
      taskRef: simple-payment-processor
      dependsOn:
        - validate-payment
      input:
        amount: "{{input.amount}}"
    - id: process-large-payment
      taskRef: advanced-payment-processor
      dependsOn:
        - validate-payment
      input:
        amount: "{{input.amount}}"
    - id: fraud-check
      taskRef: fraud-detection
      dependsOn:
        - validate-payment
      input:
        amount: "{{input.amount}}"
    - id: send-receipt
      taskRef: email-sender
      dependsOn:
        - process-small-payment
        - process-large-payment
      input:
        to: "{{input.customerEmail}}"
  output:
    transactionId: "{{tasks.process-small-payment.output.id}}"
    status: "{{tasks.process-small-payment.output.status}}"
`,
  },
  'etl-pipeline': {
    ...mockTemplateList[3],
    yamlDefinition: `apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: etl-pipeline
  annotations:
    template.workflow.example.com/category: "DataProcessing"
    template.workflow.example.com/difficulty: "Intermediate"
    template.workflow.example.com/estimatedSetupTime: "15"
spec:
  description: Extract, transform, and load data from multiple sources
  input:
    type: object
    properties:
      sources:
        type: array
        items:
          type: string
  tasks:
    - id: extract-source-a
      taskRef: data-extractor
      input:
        source: "{{input.sources[0]}}"
    - id: extract-source-b
      taskRef: data-extractor
      input:
        source: "{{input.sources[1]}}"
    - id: extract-source-c
      taskRef: data-extractor
      input:
        source: "{{input.sources[2]}}"
    - id: transform-data
      taskRef: data-transformer
      dependsOn:
        - extract-source-a
        - extract-source-b
        - extract-source-c
      input:
        datasets:
          - "{{tasks.extract-source-a.output}}"
          - "{{tasks.extract-source-b.output}}"
          - "{{tasks.extract-source-c.output}}"
    - id: validate-data
      taskRef: data-validator
      dependsOn:
        - transform-data
      input:
        data: "{{tasks.transform-data.output}}"
    - id: load-data
      taskRef: data-loader
      dependsOn:
        - validate-data
      input:
        data: "{{tasks.transform-data.output}}"
        valid: "{{tasks.validate-data.output.valid}}"
  output:
    recordsLoaded: "{{tasks.load-data.output.count}}"
    success: "{{tasks.load-data.output.success}}"
`,
  },
  'batch-processing': {
    ...mockTemplateList[4],
    yamlDefinition: `apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: batch-processing
  annotations:
    template.workflow.example.com/category: "DataProcessing"
    template.workflow.example.com/difficulty: "Advanced"
    template.workflow.example.com/estimatedSetupTime: "20"
spec:
  description: Process large datasets in batches with parallel execution
  input:
    type: object
    properties:
      batchSize:
        type: integer
      dataSource:
        type: string
  tasks:
    - id: fetch-batch-1
      taskRef: batch-fetcher
      input:
        size: "{{input.batchSize}}"
        source: "{{input.dataSource}}"
    - id: fetch-batch-2
      taskRef: batch-fetcher
      input:
        size: "{{input.batchSize}}"
        source: "{{input.dataSource}}"
    - id: process-batches
      taskRef: batch-processor
      dependsOn:
        - fetch-batch-1
        - fetch-batch-2
      input:
        batches:
          - "{{tasks.fetch-batch-1.output}}"
          - "{{tasks.fetch-batch-2.output}}"
  output:
    processed: "{{tasks.process-batches.output.count}}"
`,
  },
  'data-aggregation': {
    ...mockTemplateList[5],
    yamlDefinition: `apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: data-aggregation
  annotations:
    template.workflow.example.com/category: "DataProcessing"
    template.workflow.example.com/difficulty: "Intermediate"
    template.workflow.example.com/estimatedSetupTime: "10"
spec:
  description: Aggregate data from multiple sources with custom logic
  input:
    type: object
    properties:
      sources:
        type: array
  tasks:
    - id: aggregate-data
      taskRef: data-aggregator
      input:
        sources: "{{input.sources}}"
  output:
    result: "{{tasks.aggregate-data.output}}"
`,
  },
  'websocket-stream': {
    ...mockTemplateList[6],
    yamlDefinition: `apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: websocket-stream
  annotations:
    template.workflow.example.com/category: "RealTime"
    template.workflow.example.com/difficulty: "Advanced"
    template.workflow.example.com/estimatedSetupTime: "25"
spec:
  description: Real-time data streaming via WebSocket connections
  input:
    type: object
    properties:
      wsUrl:
        type: string
  tasks:
    - id: connect-websocket
      taskRef: websocket-connector
      input:
        url: "{{input.wsUrl}}"
  output:
    connected: "{{tasks.connect-websocket.output.status}}"
`,
  },
  'event-driven': {
    ...mockTemplateList[7],
    yamlDefinition: `apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: event-driven
  annotations:
    template.workflow.example.com/category: "RealTime"
    template.workflow.example.com/difficulty: "Advanced"
    template.workflow.example.com/estimatedSetupTime: "20"
spec:
  description: Event-driven workflow with webhook triggers
  input:
    type: object
    properties:
      eventType:
        type: string
  tasks:
    - id: process-event
      taskRef: event-processor
      input:
        type: "{{input.eventType}}"
  output:
    processed: "{{tasks.process-event.output.success}}"
`,
  },
  'polling-workflow': {
    ...mockTemplateList[8],
    yamlDefinition: `apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: polling-workflow
  annotations:
    template.workflow.example.com/category: "RealTime"
    template.workflow.example.com/difficulty: "Intermediate"
    template.workflow.example.com/estimatedSetupTime: "15"
spec:
  description: Periodic polling with retry logic
  input:
    type: object
    properties:
      endpoint:
        type: string
  tasks:
    - id: poll-endpoint
      taskRef: poller
      input:
        url: "{{input.endpoint}}"
  output:
    data: "{{tasks.poll-endpoint.output}}"
`,
  },
  'slack-notification': {
    ...mockTemplateList[9],
    yamlDefinition: `apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: slack-notification
  annotations:
    template.workflow.example.com/category: "Integration"
    template.workflow.example.com/difficulty: "Beginner"
    template.workflow.example.com/estimatedSetupTime: "5"
spec:
  description: Send notifications to Slack channels
  input:
    type: object
    properties:
      message:
        type: string
      channel:
        type: string
  tasks:
    - id: send-slack
      taskRef: slack-sender
      input:
        message: "{{input.message}}"
        channel: "{{input.channel}}"
  output:
    sent: "{{tasks.send-slack.output.success}}"
`,
  },
  'github-webhook': {
    ...mockTemplateList[10],
    yamlDefinition: `apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: github-webhook
  annotations:
    template.workflow.example.com/category: "Integration"
    template.workflow.example.com/difficulty: "Intermediate"
    template.workflow.example.com/estimatedSetupTime: "12"
spec:
  description: Automated CI/CD workflows triggered by GitHub webhooks
  input:
    type: object
    properties:
      repository:
        type: string
  tasks:
    - id: process-webhook
      taskRef: github-processor
      input:
        repo: "{{input.repository}}"
  output:
    processed: "{{tasks.process-webhook.output}}"
`,
  },
  'payment-processing': {
    ...mockTemplateList[11],
    yamlDefinition: `apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: payment-processing
  annotations:
    template.workflow.example.com/category: "Integration"
    template.workflow.example.com/difficulty: "Advanced"
    template.workflow.example.com/estimatedSetupTime: "18"
spec:
  description: Secure payment processing with fraud detection
  input:
    type: object
    properties:
      amount:
        type: number
  tasks:
    - id: process-payment
      taskRef: payment-processor
      input:
        amount: "{{input.amount}}"
    - id: fraud-check
      taskRef: fraud-detector
      dependsOn:
        - process-payment
      input:
        transactionId: "{{tasks.process-payment.output.id}}"
  output:
    transactionId: "{{tasks.process-payment.output.id}}"
    fraudScore: "{{tasks.fraud-check.output.score}}"
`,
  },
};
