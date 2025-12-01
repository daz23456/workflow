import type { Meta, StoryObj } from '@storybook/react';
import { TemplatePreview } from './template-preview';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { TemplateCategory, TemplateDifficulty, type TemplateDetail } from '@/types/template';

// Create a client for the QueryClientProvider wrapper
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

/**
 * TemplatePreview displays a modal with detailed template information.
 *
 * Features:
 * - Template metadata (name, category, difficulty)
 * - Description
 * - Setup time, task count, execution mode
 * - Tags list
 * - YAML definition with syntax highlighting
 * - Download YAML button
 * - Deploy button
 */
const meta = {
  title: 'Templates/TemplatePreview',
  component: TemplatePreview,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ),
  ],
} satisfies Meta<typeof TemplatePreview>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockTemplate: TemplateDetail = {
  name: 'parallel-api-fetch',
  category: TemplateCategory.ApiComposition,
  difficulty: TemplateDifficulty.Beginner,
  description: 'Fetch data from multiple APIs in parallel and aggregate the results into a unified response.',
  tags: ['parallel', 'http', 'api', 'aggregation'],
  estimatedSetupTime: 5,
  taskCount: 4,
  hasParallelExecution: true,
  namespace: 'default',
  yamlDefinition: `apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: parallel-api-fetch
  namespace: default
spec:
  inputSchema:
    type: object
    properties:
      userId:
        type: string
    required:
      - userId
  tasks:
    - id: fetch-user
      taskRef: user-service-task
      inputMapping:
        userId: "{{input.userId}}"
    - id: fetch-orders
      taskRef: order-service-task
      inputMapping:
        userId: "{{input.userId}}"
    - id: fetch-preferences
      taskRef: preferences-task
      inputMapping:
        userId: "{{input.userId}}"
    - id: aggregate
      taskRef: aggregator-task
      dependencies:
        - fetch-user
        - fetch-orders
        - fetch-preferences
      inputMapping:
        user: "{{tasks.fetch-user.output}}"
        orders: "{{tasks.fetch-orders.output}}"
        preferences: "{{tasks.fetch-preferences.output}}"
  output:
    aggregatedData: "{{tasks.aggregate.output}}"`,
};

/**
 * Default preview with template loaded
 */
export const Default: Story = {
  args: {
    templateName: 'parallel-api-fetch',
    onClose: () => console.log('Close clicked'),
    onDeploy: () => console.log('Deploy clicked'),
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/templates/parallel-api-fetch', () => {
          return HttpResponse.json(mockTemplate);
        }),
      ],
    },
  },
};

/**
 * Loading state
 */
export const Loading: Story = {
  args: {
    templateName: 'loading-template',
    onClose: () => console.log('Close clicked'),
    onDeploy: () => console.log('Deploy clicked'),
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/templates/loading-template', async () => {
          // Delay response to show loading state
          await new Promise((resolve) => setTimeout(resolve, 999999));
          return HttpResponse.json(mockTemplate);
        }),
      ],
    },
  },
};

/**
 * Error state
 */
export const Error: Story = {
  args: {
    templateName: 'error-template',
    onClose: () => console.log('Close clicked'),
    onDeploy: () => console.log('Deploy clicked'),
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/templates/error-template', () => {
          return HttpResponse.json(
            { message: 'Template not found' },
            { status: 404 }
          );
        }),
      ],
    },
  },
};

/**
 * Advanced template with complex YAML
 */
export const AdvancedTemplate: Story = {
  args: {
    templateName: 'enterprise-integration',
    onClose: () => console.log('Close clicked'),
    onDeploy: () => console.log('Deploy clicked'),
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/templates/enterprise-integration', () => {
          return HttpResponse.json({
            ...mockTemplate,
            name: 'enterprise-integration',
            category: TemplateCategory.DataProcessing,
            difficulty: TemplateDifficulty.Advanced,
            description: 'Complex multi-service integration with error handling, retry logic, and comprehensive logging.',
            tags: ['enterprise', 'complex', 'retry', 'error-handling', 'logging', 'monitoring'],
            estimatedSetupTime: 45,
            taskCount: 15,
            yamlDefinition: `apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: enterprise-integration
  namespace: production
spec:
  inputSchema:
    type: object
    properties:
      orderId:
        type: string
      customerId:
        type: string
      items:
        type: array
        items:
          type: object
    required:
      - orderId
      - customerId
      - items
  tasks:
    - id: validate-input
      taskRef: validator-task
      timeout: 10s
      retryPolicy:
        maxRetries: 3
        backoffMs: 1000
    - id: check-inventory
      taskRef: inventory-task
      dependencies:
        - validate-input
    - id: process-payment
      taskRef: payment-task
      dependencies:
        - check-inventory
    - id: notify-warehouse
      taskRef: warehouse-task
      dependencies:
        - process-payment
    # ... and 11 more tasks
  output:
    orderConfirmation: "{{tasks.finalize.output}}"`,
          });
        }),
      ],
    },
  },
};

/**
 * Data Processing template
 */
export const DataProcessingTemplate: Story = {
  args: {
    templateName: 'etl-pipeline',
    onClose: () => console.log('Close clicked'),
    onDeploy: () => console.log('Deploy clicked'),
  },
  parameters: {
    msw: {
      handlers: [
        http.get('/api/templates/etl-pipeline', () => {
          return HttpResponse.json({
            ...mockTemplate,
            name: 'etl-pipeline',
            category: TemplateCategory.DataProcessing,
            difficulty: TemplateDifficulty.Intermediate,
            description: 'Extract data from source, transform it, and load into destination database.',
            tags: ['etl', 'transform', 'batch', 'data'],
            hasParallelExecution: false,
          });
        }),
      ],
    },
  },
};
