import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LlmService } from '../../src/services/llm-service.js';
import type { TaskSummary } from '../../src/types/index.js';

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

describe('LlmService', () => {
  const mockTasks: TaskSummary[] = [
    {
      name: 'get-user',
      description: 'Fetch user by ID',
      category: 'data',
      inputSchema: { type: 'object', properties: { userId: { type: 'string' } } },
      outputSchema: { type: 'object', properties: { user: { type: 'object' } } }
    },
    {
      name: 'send-email',
      description: 'Send email notification',
      category: 'notification',
      inputSchema: { type: 'object', properties: { to: { type: 'string' }, message: { type: 'string' } } },
      outputSchema: { type: 'object', properties: { sent: { type: 'boolean' } } }
    }
  ];

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  describe('isAvailable', () => {
    it('should return false when API key is not set', () => {
      delete process.env.ANTHROPIC_API_KEY;
      const service = new LlmService();
      expect(service.isAvailable()).toBe(false);
    });

    it('should return true when API key is set', () => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
      const service = new LlmService();
      expect(service.isAvailable()).toBe(true);
    });
  });

  describe('generateWorkflow', () => {
    it('should throw error when LLM is not available', async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const service = new LlmService();

      await expect(service.generateWorkflow('test intent', mockTasks))
        .rejects.toThrow('LLM not available: ANTHROPIC_API_KEY not configured');
    });

    it('should generate workflow from LLM response', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
      const service = new LlmService();

      const mockResponse = {
        content: [{
          type: 'text',
          text: `Here's a workflow for fetching a user and sending an email:

\`\`\`yaml
name: notify-user
input:
  type: object
  properties:
    userId:
      type: string
  required:
    - userId
output:
  result: "{{ tasks.send-notification.output.sent }}"
tasks:
  - id: fetch-user
    taskRef: get-user
    input:
      userId: "{{ input.userId }}"
  - id: send-notification
    taskRef: send-email
    input:
      to: "{{ tasks.fetch-user.output.user.email }}"
      message: "Hello!"
    dependsOn:
      - fetch-user
\`\`\`

This workflow fetches a user and sends them an email.`
        }]
      };

      // Access the mocked client
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      const mockCreate = vi.fn().mockResolvedValue(mockResponse);
      vi.mocked(Anthropic).mockImplementation(() => ({
        messages: { create: mockCreate }
      }) as any);

      // Create new service with mocked client
      const newService = new LlmService();
      const result = await newService.generateWorkflow('fetch user and send email', mockTasks);

      expect(result.yaml).toContain('name: notify-user');
      expect(result.taskCount).toBe(2);
      expect(result.pattern).toBe('sequential');
    });

    it('should detect parallel pattern', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';

      const mockResponse = {
        content: [{
          type: 'text',
          text: `\`\`\`yaml
name: parallel-fetch
tasks:
  - id: fetch-user
    taskRef: get-user
    input:
      userId: "{{ input.userId }}"
  - id: fetch-orders
    taskRef: get-orders
    input:
      userId: "{{ input.userId }}"
\`\`\`

Both tasks run in parallel.`
        }]
      };

      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      vi.mocked(Anthropic).mockImplementation(() => ({
        messages: { create: vi.fn().mockResolvedValue(mockResponse) }
      }) as any);

      const service = new LlmService();
      const result = await service.generateWorkflow('fetch user and orders in parallel', mockTasks);

      expect(result.pattern).toBe('parallel');
    });

    it('should detect diamond pattern', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';

      const mockResponse = {
        content: [{
          type: 'text',
          text: `\`\`\`yaml
name: diamond-workflow
tasks:
  - id: start
    taskRef: get-user
    input:
      userId: "{{ input.userId }}"
  - id: check-a
    taskRef: validate
    input:
      data: "{{ tasks.start.output }}"
    dependsOn:
      - start
  - id: check-b
    taskRef: validate
    input:
      data: "{{ tasks.start.output }}"
    dependsOn:
      - start
  - id: finish
    taskRef: complete
    input:
      a: "{{ tasks.check-a.output }}"
      b: "{{ tasks.check-b.output }}"
    dependsOn:
      - check-a
      - check-b
\`\`\``
        }]
      };

      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      vi.mocked(Anthropic).mockImplementation(() => ({
        messages: { create: vi.fn().mockResolvedValue(mockResponse) }
      }) as any);

      const service = new LlmService();
      const result = await service.generateWorkflow('fork and join workflow', mockTasks);

      expect(result.pattern).toBe('diamond');
    });

    it('should throw error when response has no YAML block', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';

      const mockResponse = {
        content: [{
          type: 'text',
          text: 'Sorry, I could not generate a workflow for that.'
        }]
      };

      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      vi.mocked(Anthropic).mockImplementation(() => ({
        messages: { create: vi.fn().mockResolvedValue(mockResponse) }
      }) as any);

      const service = new LlmService();

      await expect(service.generateWorkflow('invalid intent', mockTasks))
        .rejects.toThrow('LLM response did not contain valid YAML block');
    });

    it('should handle API errors gracefully', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';

      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      vi.mocked(Anthropic).mockImplementation(() => ({
        messages: { create: vi.fn().mockRejectedValue(new Error('API rate limit exceeded')) }
      }) as any);

      const service = new LlmService();

      await expect(service.generateWorkflow('test', mockTasks))
        .rejects.toThrow('API rate limit exceeded');
    });

    it('should use correct model and max tokens', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-api-key';
      process.env.WORKFLOW_MCP_MODEL = 'claude-3-opus-20240229';
      process.env.WORKFLOW_MCP_MAX_TOKENS = '8192';

      const mockResponse = {
        content: [{
          type: 'text',
          text: '```yaml\nname: test\ntasks:\n  - id: t1\n    taskRef: get-user\n```'
        }]
      };

      const mockCreate = vi.fn().mockResolvedValue(mockResponse);
      const Anthropic = (await import('@anthropic-ai/sdk')).default;
      vi.mocked(Anthropic).mockImplementation(() => ({
        messages: { create: mockCreate }
      }) as any);

      const service = new LlmService();
      await service.generateWorkflow('test', mockTasks);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-3-opus-20240229',
          max_tokens: 8192
        })
      );

      delete process.env.WORKFLOW_MCP_MODEL;
      delete process.env.WORKFLOW_MCP_MAX_TOKENS;
    });
  });
});
