import { describe, it, expect, beforeEach, vi } from 'vitest';
import { listTasks } from '../../src/tools/list-tasks.js';
import { GatewayClient } from '../../src/services/gateway-client.js';
import type { WorkflowTask, TaskSummary } from '../../src/types/index.js';

vi.mock('../../src/services/gateway-client.js');

describe('listTasks tool', () => {
  const mockClient = {
    listTasks: vi.fn()
  };

  const mockTasks: WorkflowTask[] = [
    {
      name: 'get-user',
      description: 'Fetch user by ID',
      category: 'data',
      spec: {
        http: { url: 'http://api/users/{id}', method: 'GET' },
        input: { type: 'object', properties: { userId: { type: 'string' } } },
        output: { type: 'object', properties: { user: { type: 'object' } } }
      }
    },
    {
      name: 'send-email',
      description: 'Send email notification',
      category: 'notification',
      spec: {
        http: { url: 'http://api/email', method: 'POST' },
        input: { type: 'object', properties: { to: { type: 'string' }, message: { type: 'string' } } },
        output: { type: 'object', properties: { sent: { type: 'boolean' } } }
      }
    },
    {
      name: 'validate-order',
      description: 'Validate order data',
      category: 'data',
      spec: {
        http: { url: 'http://api/orders/validate', method: 'POST' },
        input: { type: 'object', properties: { orderId: { type: 'string' } } },
        output: { type: 'object', properties: { valid: { type: 'boolean' } } }
      }
    }
  ];

  beforeEach(() => {
    vi.resetAllMocks();
    mockClient.listTasks.mockResolvedValue(mockTasks);
  });

  it('should list all tasks when no filters provided', async () => {
    const result = await listTasks(mockClient as unknown as GatewayClient, {});

    expect(mockClient.listTasks).toHaveBeenCalled();
    expect(result.tasks).toHaveLength(3);
    expect(result.tasks[0].name).toBe('get-user');
  });

  it('should filter tasks by category', async () => {
    const result = await listTasks(mockClient as unknown as GatewayClient, { category: 'data' });

    expect(result.tasks).toHaveLength(2);
    expect(result.tasks.every(t => t.category === 'data')).toBe(true);
  });

  it('should search tasks by name', async () => {
    const result = await listTasks(mockClient as unknown as GatewayClient, { search: 'user' });

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].name).toBe('get-user');
  });

  it('should search tasks by description', async () => {
    const result = await listTasks(mockClient as unknown as GatewayClient, { search: 'notification' });

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].name).toBe('send-email');
  });

  it('should handle empty results', async () => {
    const result = await listTasks(mockClient as unknown as GatewayClient, { search: 'nonexistent' });

    expect(result.tasks).toHaveLength(0);
  });

  it('should handle API errors', async () => {
    mockClient.listTasks.mockRejectedValueOnce(new Error('API error'));

    await expect(listTasks(mockClient as unknown as GatewayClient, {}))
      .rejects.toThrow('API error');
  });

  it('should transform tasks to TaskSummary format', async () => {
    const result = await listTasks(mockClient as unknown as GatewayClient, {});

    const task = result.tasks[0];
    expect(task).toHaveProperty('name');
    expect(task).toHaveProperty('description');
    expect(task).toHaveProperty('category');
    expect(task).toHaveProperty('inputSchema');
    expect(task).toHaveProperty('outputSchema');
  });

  it('should handle tasks with missing optional fields', async () => {
    mockClient.listTasks.mockResolvedValueOnce([
      {
        name: 'minimal-task',
        spec: {
          http: { url: 'http://api/minimal', method: 'GET' },
          input: { type: 'object' },
          output: { type: 'object' }
        }
      }
    ]);

    const result = await listTasks(mockClient as unknown as GatewayClient, {});

    expect(result.tasks[0].description).toBe('');
    expect(result.tasks[0].category).toBe('uncategorized');
  });

  it('should be case-insensitive when searching', async () => {
    const result = await listTasks(mockClient as unknown as GatewayClient, { search: 'USER' });

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].name).toBe('get-user');
  });

  it('should combine category and search filters', async () => {
    const result = await listTasks(mockClient as unknown as GatewayClient, {
      category: 'data',
      search: 'order'
    });

    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].name).toBe('validate-order');
  });
});
