import type { Meta, StoryObj } from '@storybook/react';
import { ExecutionInputForm } from './execution-input-form';

/**
 * ExecutionInputForm renders a dynamic form based on JSON Schema for workflow input.
 *
 * Features:
 * - Generates form fields from JSON Schema
 * - Supports string, number, boolean, and select fields
 * - Validates input using Zod schema derived from JSON Schema
 * - Execute and Test/Dry-run buttons
 * - Handles loading states during submission
 */
const meta = {
  title: 'Workflows/ExecutionInputForm',
  component: ExecutionInputForm,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[500px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ExecutionInputForm>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default form with various field types
 */
export const Default: Story = {
  args: {
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          description: 'User email address',
        },
        username: {
          type: 'string',
          description: 'Desired username',
        },
        age: {
          type: 'integer',
          description: 'User age',
          minimum: 18,
          maximum: 120,
        },
      },
      required: ['email', 'username'],
    },
    onSubmit: async (data) => {
      console.log('Execute:', data);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    },
    onTest: async (data) => {
      console.log('Test:', data);
      await new Promise((resolve) => setTimeout(resolve, 500));
    },
  },
};

/**
 * Form with no required fields
 */
export const NoRequiredFields: Story = {
  args: {
    schema: {
      type: 'object',
      properties: {
        nickname: {
          type: 'string',
          description: 'Optional nickname',
        },
        notifyByEmail: {
          type: 'boolean',
          description: 'Send email notifications',
        },
      },
    },
    onSubmit: async (data) => console.log('Execute:', data),
    onTest: async (data) => console.log('Test:', data),
  },
};

/**
 * Form with number constraints
 */
export const WithNumberConstraints: Story = {
  args: {
    schema: {
      type: 'object',
      properties: {
        quantity: {
          type: 'integer',
          description: 'Number of items (1-100)',
          minimum: 1,
          maximum: 100,
        },
        price: {
          type: 'number',
          description: 'Price per item',
          minimum: 0.01,
        },
        discount: {
          type: 'number',
          description: 'Discount percentage (0-50)',
          minimum: 0,
          maximum: 50,
        },
      },
      required: ['quantity', 'price'],
    },
    onSubmit: async (data) => console.log('Execute:', data),
    onTest: async (data) => console.log('Test:', data),
  },
};

/**
 * Form with select/enum fields
 */
export const WithSelectFields: Story = {
  args: {
    schema: {
      type: 'object',
      properties: {
        priority: {
          type: 'string',
          description: 'Task priority',
          enum: ['low', 'medium', 'high', 'urgent'],
        },
        category: {
          type: 'string',
          description: 'Task category',
          enum: ['bug', 'feature', 'improvement', 'documentation'],
        },
      },
      required: ['priority'],
    },
    onSubmit: async (data) => console.log('Execute:', data),
    onTest: async (data) => console.log('Test:', data),
  },
};

/**
 * Empty schema - no input required
 */
export const NoInputRequired: Story = {
  args: {
    schema: {
      type: 'object',
      properties: {},
    },
    onSubmit: async () => {
      console.log('Execute with no input');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    },
    onTest: async () => {
      console.log('Test with no input');
      await new Promise((resolve) => setTimeout(resolve, 500));
    },
  },
};

/**
 * Form without test button
 */
export const WithoutTestButton: Story = {
  args: {
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Message to send',
        },
      },
      required: ['message'],
    },
    onSubmit: async (data) => console.log('Execute:', data),
    // No onTest prop
  },
};

/**
 * Complex form with many fields
 */
export const ComplexForm: Story = {
  args: {
    schema: {
      type: 'object',
      properties: {
        firstName: {
          type: 'string',
          description: 'First name',
        },
        lastName: {
          type: 'string',
          description: 'Last name',
        },
        email: {
          type: 'string',
          description: 'Email address',
        },
        phone: {
          type: 'string',
          description: 'Phone number',
        },
        age: {
          type: 'integer',
          description: 'Age',
          minimum: 0,
          maximum: 150,
        },
        subscribe: {
          type: 'boolean',
          description: 'Subscribe to newsletter',
        },
        plan: {
          type: 'string',
          description: 'Subscription plan',
          enum: ['free', 'basic', 'pro', 'enterprise'],
        },
      },
      required: ['firstName', 'lastName', 'email'],
    },
    onSubmit: async (data) => {
      console.log('Execute:', data);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    },
    onTest: async (data) => {
      console.log('Test:', data);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    },
  },
};
