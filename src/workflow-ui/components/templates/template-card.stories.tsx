import type { Meta, StoryObj } from '@storybook/react';
import { TemplateCard } from './template-card';
import { TemplateCategory, TemplateDifficulty, type TemplateListItem } from '@/types/template';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Create a client for the QueryClientProvider wrapper
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

/**
 * TemplateCard displays a workflow template with category, difficulty, and metadata.
 *
 * Features:
 * - Category badge with icon and color
 * - Difficulty indicator
 * - Description with line clamping
 * - Tags with overflow handling
 * - Metadata (setup time, task count, parallel execution)
 * - Preview and Deploy buttons
 */
const meta = {
  title: 'Templates/TemplateCard',
  component: TemplateCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <div className="w-96">
          <Story />
        </div>
      </QueryClientProvider>
    ),
  ],
} satisfies Meta<typeof TemplateCard>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseTemplate: TemplateListItem = {
  name: 'parallel-api-fetch',
  category: TemplateCategory.ApiComposition,
  difficulty: TemplateDifficulty.Beginner,
  description: 'Fetch data from multiple APIs in parallel and aggregate the results',
  tags: ['parallel', 'http', 'api', 'aggregation'],
  estimatedSetupTime: 5,
  taskCount: 4,
  hasParallelExecution: true,
  namespace: 'default',
};

/**
 * Default API Composition template
 */
export const Default: Story = {
  args: {
    template: baseTemplate,
    onDeploy: (name) => console.log('Deploy:', name),
  },
};

/**
 * Data Processing template
 */
export const DataProcessing: Story = {
  args: {
    template: {
      ...baseTemplate,
      name: 'etl-pipeline',
      category: TemplateCategory.DataProcessing,
      difficulty: TemplateDifficulty.Intermediate,
      description: 'Extract data from source, transform it, and load into destination',
      tags: ['etl', 'transform', 'batch', 'data'],
      estimatedSetupTime: 15,
      taskCount: 6,
      hasParallelExecution: false,
    },
    onDeploy: (name) => console.log('Deploy:', name),
  },
};

/**
 * Real-Time template
 */
export const RealTime: Story = {
  args: {
    template: {
      ...baseTemplate,
      name: 'websocket-stream',
      category: TemplateCategory.RealTime,
      difficulty: TemplateDifficulty.Advanced,
      description: 'Process real-time data streams with WebSocket connections',
      tags: ['websocket', 'streaming', 'real-time', 'event-driven'],
      estimatedSetupTime: 25,
      taskCount: 8,
      hasParallelExecution: true,
    },
    onDeploy: (name) => console.log('Deploy:', name),
  },
};

/**
 * Integrations template
 */
export const Integrations: Story = {
  args: {
    template: {
      ...baseTemplate,
      name: 'slack-notification',
      category: TemplateCategory.Integrations,
      difficulty: TemplateDifficulty.Beginner,
      description: 'Send notifications to Slack channels based on workflow events',
      tags: ['slack', 'notification', 'webhook', 'integration'],
      estimatedSetupTime: 10,
      taskCount: 3,
      hasParallelExecution: false,
    },
    onDeploy: (name) => console.log('Deploy:', name),
  },
};

/**
 * Advanced difficulty template
 */
export const AdvancedDifficulty: Story = {
  args: {
    template: {
      ...baseTemplate,
      name: 'enterprise-integration',
      category: TemplateCategory.ApiComposition,
      difficulty: TemplateDifficulty.Advanced,
      description: 'Complex multi-service integration with error handling and retry logic',
      tags: ['enterprise', 'complex', 'retry', 'error-handling', 'multi-service'],
      estimatedSetupTime: 45,
      taskCount: 15,
      hasParallelExecution: true,
    },
    onDeploy: (name) => console.log('Deploy:', name),
  },
};

/**
 * Sequential execution (no parallel badge)
 */
export const SequentialExecution: Story = {
  args: {
    template: {
      ...baseTemplate,
      name: 'sequential-pipeline',
      description: 'Process data in sequential steps with validation',
      hasParallelExecution: false,
    },
    onDeploy: (name) => console.log('Deploy:', name),
  },
};

/**
 * Template with many tags (overflow handling)
 */
export const ManyTags: Story = {
  args: {
    template: {
      ...baseTemplate,
      tags: ['parallel', 'http', 'api', 'aggregation', 'caching', 'retry', 'timeout', 'logging'],
    },
    onDeploy: (name) => console.log('Deploy:', name),
  },
};

/**
 * Long description (line clamping)
 */
export const LongDescription: Story = {
  args: {
    template: {
      ...baseTemplate,
      description:
        'This template demonstrates how to fetch data from multiple external APIs in parallel, aggregate the results using a custom merge strategy, and handle errors gracefully with automatic retries and fallback values.',
    },
    onDeploy: (name) => console.log('Deploy:', name),
  },
};

/**
 * Without deploy handler (no click action)
 */
export const WithoutDeployHandler: Story = {
  args: {
    template: baseTemplate,
    // No onDeploy - deploy button will do nothing
  },
};
