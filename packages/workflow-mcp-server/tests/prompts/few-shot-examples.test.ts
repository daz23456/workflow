import { describe, it, expect } from 'vitest';
import {
  FEW_SHOT_EXAMPLES,
  selectRelevantExample,
  formatExample
} from '../../src/prompts/few-shot-examples.js';

describe('few-shot-examples', () => {
  describe('FEW_SHOT_EXAMPLES', () => {
    it('should have sequential example', () => {
      const example = FEW_SHOT_EXAMPLES.sequential;
      expect(example.pattern).toBe('sequential');
      expect(example.yaml).toContain('dependsOn');
      expect(example.intent).toBeTruthy();
    });

    it('should have parallel example', () => {
      const example = FEW_SHOT_EXAMPLES.parallel;
      expect(example.pattern).toBe('parallel');
      expect(example.yaml).not.toContain('dependsOn');
      expect(example.intent).toBeTruthy();
    });

    it('should have diamond example', () => {
      const example = FEW_SHOT_EXAMPLES.diamond;
      expect(example.pattern).toBe('diamond');
      // Diamond has multiple dependsOn including one with multiple deps
      expect(example.yaml).toContain('check-inventory');
      expect(example.yaml).toContain('check-credit');
      expect(example.intent).toBeTruthy();
    });
  });

  describe('selectRelevantExample', () => {
    it('should select parallel for "at the same time"', () => {
      const example = selectRelevantExample('Fetch user and orders at the same time');
      expect(example.pattern).toBe('parallel');
    });

    it('should select parallel for "simultaneously"', () => {
      const example = selectRelevantExample('Run checks simultaneously');
      expect(example.pattern).toBe('parallel');
    });

    it('should select diamond for check-then-process pattern', () => {
      const example = selectRelevantExample('Check inventory then process order');
      expect(example.pattern).toBe('diamond');
    });

    it('should select diamond for validate-process pattern', () => {
      const example = selectRelevantExample('Validate order then process it');
      expect(example.pattern).toBe('diamond');
    });

    it('should select complex for batch operations', () => {
      const example = selectRelevantExample('Process a batch of orders');
      expect(example.pattern).toBe('complex');
    });

    it('should default to sequential', () => {
      const example = selectRelevantExample('Fetch user then send email');
      expect(example.pattern).toBe('sequential');
    });
  });

  describe('formatExample', () => {
    it('should format example with all fields', () => {
      const example = FEW_SHOT_EXAMPLES.sequential;
      const formatted = formatExample(example);

      expect(formatted).toContain('**Example Intent:**');
      expect(formatted).toContain(example.intent);
      expect(formatted).toContain('```yaml');
      expect(formatted).toContain(example.yaml);
      expect(formatted).toContain('**Pattern:**');
      expect(formatted).toContain(example.pattern);
      expect(formatted).toContain('**Explanation:**');
    });
  });
});
