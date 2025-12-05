import { describe, it, expect } from 'vitest';
import {
  ERROR_FIXES,
  detectErrorType,
  generateSuggestion
} from '../../src/prompts/error-fixing.js';

describe('error-fixing', () => {
  describe('ERROR_FIXES', () => {
    it('should generate unknown_task_ref message', () => {
      const result = ERROR_FIXES.unknown_task_ref('bad-task', 'get-user, send-email');
      expect(result).toContain('bad-task');
      expect(result).toContain('get-user, send-email');
    });

    it('should generate invalid_template message', () => {
      const result = ERROR_FIXES.invalid_template('{{ broken');
      expect(result).toContain('{{ broken');
      expect(result).toContain('{{ input.field }}');
    });

    it('should generate circular_dependency message', () => {
      const result = ERROR_FIXES.circular_dependency('a → b → a');
      expect(result).toContain('a → b → a');
      expect(result).toContain('Remove one');
    });

    it('should generate schema_mismatch message', () => {
      const result = ERROR_FIXES.schema_mismatch('userId', 'string', 'number');
      expect(result).toContain('userId');
      expect(result).toContain('string');
      expect(result).toContain('number');
    });

    it('should generate missing_dependency message', () => {
      const result = ERROR_FIXES.missing_dependency('task-a', 'task-b');
      expect(result).toContain('task-a');
      expect(result).toContain('task-b');
      expect(result).toContain('dependsOn');
    });

    it('should generate duplicate_task_id message', () => {
      const result = ERROR_FIXES.duplicate_task_id('duplicate');
      expect(result).toContain('duplicate');
      expect(result).toContain('unique');
    });

    it('should generate invalid_yaml message', () => {
      const result = ERROR_FIXES.invalid_yaml('unexpected token');
      expect(result).toContain('unexpected token');
      expect(result).toContain('indentation');
    });

    it('should generate missing_required_field message', () => {
      const result = ERROR_FIXES.missing_required_field('name', 'workflow');
      expect(result).toContain('name');
      expect(result).toContain('workflow');
    });
  });

  describe('detectErrorType', () => {
    it('should detect unknown_task_ref', () => {
      expect(detectErrorType('unknown task reference')).toBe('unknown_task_ref');
      expect(detectErrorType('task not found: foo')).toBe('unknown_task_ref');
    });

    it('should detect invalid_template', () => {
      expect(detectErrorType('Invalid template {{ bad }}')).toBe('invalid_template');
      expect(detectErrorType('Template error')).toBe('invalid_template');
    });

    it('should detect circular_dependency', () => {
      expect(detectErrorType('Circular dependency detected')).toBe('circular_dependency');
      expect(detectErrorType('Cycle found in graph')).toBe('circular_dependency');
    });

    it('should detect schema_mismatch', () => {
      expect(detectErrorType('Type expected string but got number')).toBe('schema_mismatch');
      expect(detectErrorType('Type mismatch')).toBe('schema_mismatch');
    });

    it('should detect missing_dependency', () => {
      expect(detectErrorType('Missing dependency')).toBe('missing_dependency');
      expect(detectErrorType('Task depends on unknown')).toBe('missing_dependency');
    });

    it('should detect duplicate_task_id', () => {
      expect(detectErrorType('Duplicate ID found')).toBe('duplicate_task_id');
    });

    it('should detect invalid_yaml', () => {
      expect(detectErrorType('YAML parse error')).toBe('invalid_yaml');
    });

    it('should detect missing_required_field', () => {
      expect(detectErrorType('Required field missing')).toBe('missing_required_field');
    });

    it('should return null for unknown errors', () => {
      expect(detectErrorType('Something random')).toBeNull();
    });
  });

  describe('generateSuggestion', () => {
    it('should generate suggestion for unknown_task_ref', () => {
      const result = generateSuggestion('unknown task "bad-task" not found', ['get-user', 'send-email']);
      expect(result).toContain('bad-task');
      expect(result).toContain('get-user, send-email');
    });

    it('should generate suggestion for invalid_template', () => {
      const result = generateSuggestion('Invalid template {{ broken }}');
      expect(result).toContain('{{ broken }}');
    });

    it('should generate suggestion for circular_dependency', () => {
      const result = generateSuggestion('Circular dependency: cycle: a → b → a');
      expect(result).toContain('a → b → a');
    });

    it('should generate suggestion for invalid_yaml', () => {
      const result = generateSuggestion('YAML parse error: unexpected');
      expect(result).toContain('YAML');
    });

    it('should return undefined for unknown errors', () => {
      const result = generateSuggestion('Unknown error type');
      expect(result).toBeUndefined();
    });

    it('should handle missing template in error message', () => {
      const result = generateSuggestion('Template syntax error');
      expect(result).toContain('template');
    });

    it('should handle missing task in error message', () => {
      const result = generateSuggestion('Unknown task reference');
      expect(result).toContain('unknown');
    });
  });
});
