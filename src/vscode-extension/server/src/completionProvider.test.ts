import { CompletionProvider, CompletionContext } from './completionProvider';
import { CompletionItemKind } from 'vscode-languageserver';

describe('CompletionProvider', () => {
  let provider: CompletionProvider;

  beforeEach(() => {
    provider = new CompletionProvider();
  });

  describe('getCompletions', () => {
    describe('top-level property completions for Workflow', () => {
      it('should suggest top-level properties at root level of empty Workflow document', () => {
        const yaml = `kind: Workflow
`;
        const context: CompletionContext = {
          text: yaml,
          position: { line: 1, character: 0 },
          lineText: '',
        };

        const completions = provider.getCompletions(context);

        expect(completions).toHaveLength(4);
        expect(completions.map(c => c.label)).toContain('apiVersion');
        expect(completions.map(c => c.label)).toContain('kind');
        expect(completions.map(c => c.label)).toContain('metadata');
        expect(completions.map(c => c.label)).toContain('spec');
      });

      it('should suggest spec properties inside spec block', () => {
        const yaml = `kind: Workflow
metadata:
  name: test
spec:
  `;
        const context: CompletionContext = {
          text: yaml,
          position: { line: 4, character: 2 },
          lineText: '  ',
        };

        const completions = provider.getCompletions(context);

        expect(completions.map(c => c.label)).toContain('description');
        expect(completions.map(c => c.label)).toContain('input');
        expect(completions.map(c => c.label)).toContain('tasks');
        expect(completions.map(c => c.label)).toContain('output');
        expect(completions.map(c => c.label)).toContain('triggers');
      });

      it('should suggest task step properties inside tasks array', () => {
        const yaml = `kind: Workflow
metadata:
  name: test
spec:
  tasks:
    - `;
        const context: CompletionContext = {
          text: yaml,
          position: { line: 5, character: 6 },
          lineText: '    - ',
        };

        const completions = provider.getCompletions(context);

        expect(completions.map(c => c.label)).toContain('id');
        expect(completions.map(c => c.label)).toContain('taskRef');
        expect(completions.map(c => c.label)).toContain('workflowRef');
        expect(completions.map(c => c.label)).toContain('input');
        expect(completions.map(c => c.label)).toContain('dependsOn');
        expect(completions.map(c => c.label)).toContain('condition');
        expect(completions.map(c => c.label)).toContain('forEach');
        expect(completions.map(c => c.label)).toContain('timeout');
      });
    });

    describe('top-level property completions for WorkflowTask', () => {
      it('should suggest top-level properties at root level of WorkflowTask document', () => {
        const yaml = `kind: WorkflowTask
`;
        const context: CompletionContext = {
          text: yaml,
          position: { line: 1, character: 0 },
          lineText: '',
        };

        const completions = provider.getCompletions(context);

        expect(completions.map(c => c.label)).toContain('apiVersion');
        expect(completions.map(c => c.label)).toContain('kind');
        expect(completions.map(c => c.label)).toContain('metadata');
        expect(completions.map(c => c.label)).toContain('spec');
      });

      it('should suggest WorkflowTask spec properties inside spec block', () => {
        const yaml = `kind: WorkflowTask
metadata:
  name: test
spec:
  `;
        const context: CompletionContext = {
          text: yaml,
          position: { line: 4, character: 2 },
          lineText: '  ',
        };

        const completions = provider.getCompletions(context);

        expect(completions.map(c => c.label)).toContain('type');
        expect(completions.map(c => c.label)).toContain('http');
        expect(completions.map(c => c.label)).toContain('input');
        expect(completions.map(c => c.label)).toContain('output');
      });
    });

    describe('completion item properties', () => {
      it('should include kind Property for schema properties', () => {
        const yaml = `kind: Workflow
`;
        const context: CompletionContext = {
          text: yaml,
          position: { line: 1, character: 0 },
          lineText: '',
        };

        const completions = provider.getCompletions(context);
        const apiVersionCompletion = completions.find(c => c.label === 'apiVersion');

        expect(apiVersionCompletion?.kind).toBe(CompletionItemKind.Property);
      });

      it('should include documentation for properties', () => {
        const yaml = `kind: Workflow
`;
        const context: CompletionContext = {
          text: yaml,
          position: { line: 1, character: 0 },
          lineText: '',
        };

        const completions = provider.getCompletions(context);
        const specCompletion = completions.find(c => c.label === 'spec');

        expect(specCompletion?.documentation).toBeDefined();
      });
    });
  });

  describe('dependsOn completions', () => {
    it('should suggest task IDs defined earlier in the workflow', () => {
      const yaml = `kind: Workflow
metadata:
  name: test
spec:
  tasks:
    - id: fetch-user
      taskRef: get-user
    - id: fetch-orders
      taskRef: get-orders
    - id: process
      taskRef: process-data
      dependsOn:
        - `;
      const context: CompletionContext = {
        text: yaml,
        position: { line: 12, character: 10 },
        lineText: '        - ',
      };

      const completions = provider.getCompletions(context);

      expect(completions.map(c => c.label)).toContain('fetch-user');
      expect(completions.map(c => c.label)).toContain('fetch-orders');
      // Should not suggest itself
      expect(completions.map(c => c.label)).not.toContain('process');
    });
  });

  describe('edge cases', () => {
    it('should handle invalid YAML gracefully', () => {
      const yaml = `kind: Workflow
spec: [invalid`;
      const context: CompletionContext = {
        text: yaml,
        position: { line: 1, character: 0 },
        lineText: '',
      };

      const completions = provider.getCompletions(context);

      // Should return top-level completions as fallback
      expect(completions.map(c => c.label)).toContain('apiVersion');
    });

    it('should handle empty document', () => {
      const context: CompletionContext = {
        text: '',
        position: { line: 0, character: 0 },
        lineText: '',
      };

      const completions = provider.getCompletions(context);

      expect(completions.map(c => c.label)).toContain('apiVersion');
    });

    it('should handle document with null content', () => {
      const yaml = `---`;
      const context: CompletionContext = {
        text: yaml,
        position: { line: 0, character: 0 },
        lineText: '',
      };

      const completions = provider.getCompletions(context);

      expect(completions.map(c => c.label)).toContain('apiVersion');
    });
  });

  describe('template expression completions', () => {
    it('should suggest input. when inside template expression', () => {
      const yaml = `kind: Workflow
metadata:
  name: test
spec:
  input:
    properties:
      userId:
        type: string
  tasks:
    - id: fetch-user
      taskRef: get-user
      input:
        id: "{{input."`;
      const context: CompletionContext = {
        text: yaml,
        position: { line: 12, character: 18 },
        lineText: '        id: "{{input.',
        isInsideTemplateExpression: true,
        templatePrefix: 'input.',
      };

      const completions = provider.getCompletions(context);

      expect(completions.map(c => c.label)).toContain('userId');
    });

    it('should suggest tasks. for task output references', () => {
      const yaml = `kind: Workflow
metadata:
  name: test
spec:
  tasks:
    - id: fetch-user
      taskRef: get-user
    - id: process
      taskRef: process-data
      input:
        user: "{{tasks."`;
      const context: CompletionContext = {
        text: yaml,
        position: { line: 10, character: 20 },
        lineText: '        user: "{{tasks.',
        isInsideTemplateExpression: true,
        templatePrefix: 'tasks.',
      };

      const completions = provider.getCompletions(context);

      expect(completions.map(c => c.label)).toContain('fetch-user');
    });
  });
});
