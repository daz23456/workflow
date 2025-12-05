import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { generateWorkflow, detectPattern, parseGeneratedYaml } from '../../src/tools/generate-workflow.js';
import { GatewayClient } from '../../src/services/gateway-client.js';
import type { WorkflowTask, GenerateWorkflowParams } from '../../src/types/index.js';

vi.mock('../../src/services/gateway-client.js');

// Mock the Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn()
      }
    }))
  };
});

describe('generateWorkflow tool', () => {
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

  describe('detectPattern', () => {
    it('should detect sequential pattern', () => {
      const pattern = detectPattern('Fetch user then send email');
      expect(pattern).toBe('sequential');
    });

    it('should detect parallel pattern', () => {
      const pattern = detectPattern('Fetch user and order at the same time');
      expect(pattern).toBe('parallel');
    });

    it('should detect diamond pattern', () => {
      const pattern = detectPattern('Check inventory then process order');
      expect(pattern).toBe('diamond');
    });

    it('should default to sequential for unclear intent', () => {
      const pattern = detectPattern('Do something with data');
      expect(pattern).toBe('sequential');
    });
  });

  describe('parseGeneratedYaml', () => {
    it('should extract YAML from markdown code block', () => {
      const response = `Here is the workflow:

\`\`\`yaml
name: test-workflow
tasks:
  - id: task1
    taskRef: get-user
\`\`\`

This workflow does something.`;

      const yaml = parseGeneratedYaml(response);
      expect(yaml).toContain('name: test-workflow');
      expect(yaml).not.toContain('```');
    });

    it('should handle response without code block', () => {
      const response = `name: test-workflow
tasks:
  - id: task1
    taskRef: get-user`;

      const yaml = parseGeneratedYaml(response);
      expect(yaml).toContain('name: test-workflow');
    });

    it('should return empty string for invalid response', () => {
      const yaml = parseGeneratedYaml('No workflow here');
      expect(yaml).toBe('');
    });
  });

  describe('generateWorkflow', () => {
    it('should return workflow structure with yaml and metadata', async () => {
      const params: GenerateWorkflowParams = {
        intent: 'Fetch user then send email'
      };

      const result = await generateWorkflow(mockClient as unknown as GatewayClient, params);

      expect(result).toHaveProperty('yaml');
      expect(result).toHaveProperty('explanation');
      expect(result).toHaveProperty('taskCount');
      expect(result).toHaveProperty('pattern');
    });

    it('should detect sequential pattern', async () => {
      const params: GenerateWorkflowParams = {
        intent: 'Fetch user then send email notification'
      };

      const result = await generateWorkflow(mockClient as unknown as GatewayClient, params);

      expect(result.pattern).toBe('sequential');
    });

    it('should detect parallel pattern', async () => {
      const params: GenerateWorkflowParams = {
        intent: 'Fetch user and validate order at the same time'
      };

      const result = await generateWorkflow(mockClient as unknown as GatewayClient, params);

      expect(result.pattern).toBe('parallel');
    });

    it('should generate valid YAML with workflow name', async () => {
      const params: GenerateWorkflowParams = {
        intent: 'Fetch user then send email'
      };

      const result = await generateWorkflow(mockClient as unknown as GatewayClient, params);

      expect(result.yaml).toContain('name:');
      expect(result.yaml).toContain('tasks:');
    });

    it('should respect maxTasks constraint', async () => {
      const params: GenerateWorkflowParams = {
        intent: 'Create a complex workflow',
        constraints: {
          maxTasks: 2
        }
      };

      const result = await generateWorkflow(mockClient as unknown as GatewayClient, params);

      expect(result.taskCount).toBeLessThanOrEqual(2);
    });

    it('should use correct template syntax', async () => {
      const params: GenerateWorkflowParams = {
        intent: 'Fetch user then send email to that user'
      };

      const result = await generateWorkflow(mockClient as unknown as GatewayClient, params);

      // Should use proper template syntax
      if (result.yaml.includes('{{')) {
        expect(result.yaml).toMatch(/\{\{\s*(input|tasks)\./);
      }
    });

    it('should include output mapping', async () => {
      const params: GenerateWorkflowParams = {
        intent: 'Fetch user and return the result'
      };

      const result = await generateWorkflow(mockClient as unknown as GatewayClient, params);

      expect(result.yaml).toContain('output:');
    });

    it('should provide explanation', async () => {
      const params: GenerateWorkflowParams = {
        intent: 'Fetch user then send email'
      };

      const result = await generateWorkflow(mockClient as unknown as GatewayClient, params);

      expect(result.explanation).toBeTruthy();
      expect(result.explanation.length).toBeGreaterThan(10);
    });

    it('should handle API errors', async () => {
      mockClient.listTasks.mockRejectedValueOnce(new Error('API error'));

      const params: GenerateWorkflowParams = {
        intent: 'Fetch user'
      };

      await expect(generateWorkflow(mockClient as unknown as GatewayClient, params))
        .rejects.toThrow('API error');
    });

    it('should handle empty task list gracefully', async () => {
      mockClient.listTasks.mockResolvedValueOnce([]);

      const params: GenerateWorkflowParams = {
        intent: 'Fetch user'
      };

      const result = await generateWorkflow(mockClient as unknown as GatewayClient, params);

      expect(result.explanation).toContain('no tasks');
    });

    it('should filter tasks by allowedTasks constraint', async () => {
      const params: GenerateWorkflowParams = {
        intent: 'Do something',
        constraints: {
          allowedTasks: ['get-user']
        }
      };

      const result = await generateWorkflow(mockClient as unknown as GatewayClient, params);

      // Only get-user should be available
      expect(result.yaml).not.toContain('taskRef: send-email');
      expect(result.yaml).not.toContain('taskRef: validate-order');
    });

    it('should use template-based generation when useLLM is false', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';

      const params: GenerateWorkflowParams = {
        intent: 'Fetch user then send email',
        useLLM: false
      };

      const result = await generateWorkflow(mockClient as unknown as GatewayClient, params);

      // Should use template-based approach (predictable pattern)
      expect(result.pattern).toBe('sequential');
      expect(result.yaml).toContain('name:');

      delete process.env.ANTHROPIC_API_KEY;
    });

    it('should use template-based generation when API key is not set', async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const params: GenerateWorkflowParams = {
        intent: 'Fetch user then send email'
      };

      const result = await generateWorkflow(mockClient as unknown as GatewayClient, params);

      expect(result.yaml).toContain('name:');
      expect(result.pattern).toBe('sequential');
    });

    it('should use LLM when available and useLLM is not false', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';

      const mockLlmResponse = {
        content: [{
          type: 'text',
          text: `\`\`\`yaml
name: llm-generated-workflow
tasks:
  - id: fetch-user
    taskRef: get-user
    input:
      userId: "{{ input.userId }}"
\`\`\`

This workflow was generated by LLM.`
        }]
      };

      // Import and mock the Anthropic SDK
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      vi.mocked(Anthropic).mockImplementation(() => ({
        messages: { create: vi.fn().mockResolvedValue(mockLlmResponse) }
      }) as any);

      // Need to reimport to get fresh LlmService instance
      vi.resetModules();
      const { generateWorkflow: freshGenerateWorkflow } = await import('../../src/tools/generate-workflow.js');

      const params: GenerateWorkflowParams = {
        intent: 'Fetch user details'
      };

      const result = await freshGenerateWorkflow(mockClient as unknown as GatewayClient, params);

      expect(result.yaml).toContain('name:');

      delete process.env.ANTHROPIC_API_KEY;
    });

    it('should fall back to template when LLM fails', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';

      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      vi.mocked(Anthropic).mockImplementation(() => ({
        messages: { create: vi.fn().mockRejectedValue(new Error('API error')) }
      }) as any);

      vi.resetModules();
      const { generateWorkflow: freshGenerateWorkflow } = await import('../../src/tools/generate-workflow.js');

      const params: GenerateWorkflowParams = {
        intent: 'Fetch user then send email'
      };

      // Should not throw, should fall back to template
      const result = await freshGenerateWorkflow(mockClient as unknown as GatewayClient, params);

      expect(result.yaml).toContain('name:');
      expect(result.pattern).toBe('sequential');

      delete process.env.ANTHROPIC_API_KEY;
    });
  });
});
