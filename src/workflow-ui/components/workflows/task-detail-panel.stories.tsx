import type { Meta, StoryObj } from '@storybook/react';
import { TaskDetailPanel } from './task-detail-panel';
import type { TaskDetail } from '@/types/workflow';

/**
 * TaskDetailPanel displays detailed information about a workflow task.
 *
 * Features:
 * - Task ID and reference
 * - Description
 * - Configuration (timeout, retries)
 * - Dependencies list
 * - Input mapping with template expressions
 * - HTTP request details (method, URL, headers, body)
 * - Output schema
 */
const meta = {
  title: 'Workflows/TaskDetailPanel',
  component: TaskDetailPanel,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="h-[600px] w-[450px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TaskDetailPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

const baseTask: TaskDetail = {
  id: 'fetch-user',
  taskRef: 'user-service-task',
  description: 'Fetches user details from the user service API',
  timeout: '30s',
  retryCount: 3,
  dependencies: ['validate-input'],
  inputMapping: {
    userId: '{{input.userId}}',
    includeProfile: '{{input.includeProfile}}',
  },
  httpRequest: {
    method: 'GET',
    url: 'https://api.example.com/users/{{input.userId}}',
    headers: {
      Authorization: 'Bearer {{secrets.API_TOKEN}}',
      'Content-Type': 'application/json',
    },
    bodyTemplate: '',
  },
  outputSchema: {
    type: 'object',
    properties: {
      id: { type: 'string', description: 'User ID' },
      name: { type: 'string', description: 'User full name' },
      email: { type: 'string', description: 'User email address' },
    },
  },
};

/**
 * Default task with all details populated
 */
export const Default: Story = {
  args: {
    task: baseTask,
    onClose: () => console.log('Close clicked'),
  },
};

/**
 * Task with POST method and request body
 */
export const PostRequest: Story = {
  args: {
    task: {
      ...baseTask,
      id: 'create-order',
      taskRef: 'order-service-task',
      description: 'Creates a new order in the order management system',
      httpRequest: {
        method: 'POST',
        url: 'https://api.example.com/orders',
        headers: {
          Authorization: 'Bearer {{secrets.API_TOKEN}}',
          'Content-Type': 'application/json',
        },
        bodyTemplate: JSON.stringify(
          {
            userId: '{{input.userId}}',
            items: '{{tasks.fetch-cart.output.items}}',
            shippingAddress: '{{input.address}}',
          },
          null,
          2
        ),
      },
    },
    onClose: () => console.log('Close clicked'),
  },
};

/**
 * Task with no dependencies
 */
export const NoDependencies: Story = {
  args: {
    task: {
      ...baseTask,
      id: 'start-task',
      description: 'Initial task with no dependencies',
      dependencies: [],
    },
    onClose: () => console.log('Close clicked'),
  },
};

/**
 * Task with multiple dependencies
 */
export const MultipleDependencies: Story = {
  args: {
    task: {
      ...baseTask,
      id: 'aggregate-data',
      description: 'Aggregates data from multiple upstream tasks',
      dependencies: ['fetch-users', 'fetch-orders', 'fetch-products', 'fetch-analytics'],
      inputMapping: {
        users: '{{tasks.fetch-users.output.data}}',
        orders: '{{tasks.fetch-orders.output.data}}',
        products: '{{tasks.fetch-products.output.data}}',
        analytics: '{{tasks.fetch-analytics.output.data}}',
      },
    },
    onClose: () => console.log('Close clicked'),
  },
};

/**
 * Task with DELETE method
 */
export const DeleteRequest: Story = {
  args: {
    task: {
      ...baseTask,
      id: 'delete-user',
      taskRef: 'user-deletion-task',
      description: 'Permanently deletes a user account',
      httpRequest: {
        method: 'DELETE',
        url: 'https://api.example.com/users/{{input.userId}}',
        headers: {
          Authorization: 'Bearer {{secrets.ADMIN_TOKEN}}',
        },
        bodyTemplate: '',
      },
    },
    onClose: () => console.log('Close clicked'),
  },
};

/**
 * Task with PUT method
 */
export const PutRequest: Story = {
  args: {
    task: {
      ...baseTask,
      id: 'update-profile',
      taskRef: 'profile-update-task',
      description: 'Updates user profile information',
      httpRequest: {
        method: 'PUT',
        url: 'https://api.example.com/users/{{input.userId}}/profile',
        headers: {
          Authorization: 'Bearer {{secrets.API_TOKEN}}',
          'Content-Type': 'application/json',
        },
        bodyTemplate: JSON.stringify(
          {
            name: '{{input.name}}',
            bio: '{{input.bio}}',
            avatar: '{{input.avatarUrl}}',
          },
          null,
          2
        ),
      },
    },
    onClose: () => console.log('Close clicked'),
  },
};

/**
 * Minimal task with only required fields
 */
export const MinimalTask: Story = {
  args: {
    task: {
      id: 'simple-task',
      taskRef: 'simple-service',
      description: '',
    },
    onClose: () => console.log('Close clicked'),
  },
};

/**
 * Task with complex output schema
 */
export const ComplexOutputSchema: Story = {
  args: {
    task: {
      ...baseTask,
      id: 'fetch-report',
      description: 'Fetches a detailed analytics report',
      outputSchema: {
        type: 'object',
        properties: {
          reportId: { type: 'string', description: 'Unique report identifier' },
          generatedAt: { type: 'string', description: 'ISO timestamp of generation' },
          metrics: { type: 'object', description: 'Key performance metrics' },
          charts: { type: 'array', description: 'Chart data for visualization' },
          summary: { type: 'string', description: 'Executive summary text' },
          confidence: { type: 'number', description: 'Confidence score 0-1' },
        },
      },
    },
    onClose: () => console.log('Close clicked'),
  },
};

/**
 * Task with long URL
 */
export const LongUrl: Story = {
  args: {
    task: {
      ...baseTask,
      id: 'search-api',
      description: 'Searches the external API with multiple parameters',
      httpRequest: {
        method: 'GET',
        url: 'https://api.very-long-domain-name.example.com/v2/search?query={{input.query}}&filter={{input.filter}}&sort={{input.sort}}&page={{input.page}}&limit={{input.limit}}&include=metadata,references',
        headers: {
          Authorization: 'Bearer {{secrets.API_TOKEN}}',
        },
        bodyTemplate: '',
      },
    },
    onClose: () => console.log('Close clicked'),
  },
};
