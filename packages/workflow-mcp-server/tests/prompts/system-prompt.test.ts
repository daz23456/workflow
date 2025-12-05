import { describe, it, expect } from 'vitest';
import { formatTaskList, buildSystemPrompt } from '../../src/prompts/system-prompt.js';
import type { TaskSummary } from '../../src/types/index.js';

describe('system-prompt', () => {
  describe('formatTaskList', () => {
    it('should format empty task list', () => {
      const result = formatTaskList([]);
      expect(result).toBe('No tasks available.');
    });

    it('should format tasks with properties', () => {
      const tasks: TaskSummary[] = [
        {
          name: 'get-user',
          description: 'Fetch user by ID',
          category: 'data',
          inputSchema: {
            type: 'object',
            properties: {
              userId: { type: 'string' }
            }
          },
          outputSchema: {
            type: 'object',
            properties: {
              user: { type: 'object' }
            }
          }
        }
      ];

      const result = formatTaskList(tasks);
      expect(result).toContain('**get-user**');
      expect(result).toContain('(data)');
      expect(result).toContain('Fetch user by ID');
      expect(result).toContain('Input: userId');
      expect(result).toContain('Output: user');
    });

    it('should handle tasks without properties', () => {
      const tasks: TaskSummary[] = [
        {
          name: 'simple-task',
          description: 'Simple task',
          category: 'misc',
          inputSchema: { type: 'object' },
          outputSchema: { type: 'object' }
        }
      ];

      const result = formatTaskList(tasks);
      expect(result).toContain('Input: none');
      expect(result).toContain('Output: none');
    });

    it('should format multiple tasks', () => {
      const tasks: TaskSummary[] = [
        {
          name: 'task-1',
          description: 'First task',
          category: 'a',
          inputSchema: { type: 'object', properties: { a: { type: 'string' } } },
          outputSchema: { type: 'object', properties: { b: { type: 'string' } } }
        },
        {
          name: 'task-2',
          description: 'Second task',
          category: 'b',
          inputSchema: { type: 'object', properties: { c: { type: 'string' } } },
          outputSchema: { type: 'object', properties: { d: { type: 'string' } } }
        }
      ];

      const result = formatTaskList(tasks);
      expect(result).toContain('task-1');
      expect(result).toContain('task-2');
    });
  });

  describe('buildSystemPrompt', () => {
    it('should include task list in prompt', () => {
      const tasks: TaskSummary[] = [
        {
          name: 'test-task',
          description: 'Test description',
          category: 'test',
          inputSchema: { type: 'object' },
          outputSchema: { type: 'object' }
        }
      ];

      const result = buildSystemPrompt(tasks);
      expect(result).toContain('test-task');
      expect(result).toContain('Workflow Structure');
      expect(result).toContain('Template Syntax');
      expect(result).toContain('Rules');
    });

    it('should include template syntax instructions', () => {
      const result = buildSystemPrompt([]);
      expect(result).toContain('{{ input.fieldName }}');
      expect(result).toContain('{{ tasks.taskId.output.fieldName }}');
    });

    it('should include workflow structure rules', () => {
      const result = buildSystemPrompt([]);
      expect(result).toContain('name');
      expect(result).toContain('tasks');
      expect(result).toContain('dependsOn');
    });
  });
});
