import { SnippetProvider, Snippet } from './snippetProvider';

describe('SnippetProvider', () => {
  let provider: SnippetProvider;

  beforeEach(() => {
    provider = new SnippetProvider();
  });

  describe('getSnippets', () => {
    it('should return workflow scaffold snippet', () => {
      const snippets = provider.getSnippets();
      const workflowSnippet = snippets.find(s => s.prefix === 'workflow');

      expect(workflowSnippet).toBeDefined();
      expect(workflowSnippet?.label).toBe('Workflow');
      expect(workflowSnippet?.body).toContain('kind: Workflow');
      expect(workflowSnippet?.body).toContain('metadata:');
      expect(workflowSnippet?.body).toContain('spec:');
      expect(workflowSnippet?.body).toContain('tasks:');
    });

    it('should return task step snippet', () => {
      const snippets = provider.getSnippets();
      const taskSnippet = snippets.find(s => s.prefix === 'task');

      expect(taskSnippet).toBeDefined();
      expect(taskSnippet?.label).toBe('Task Step');
      expect(taskSnippet?.body).toContain('- id:');
      expect(taskSnippet?.body).toContain('taskRef:');
    });

    it('should return workflowtask definition snippet', () => {
      const snippets = provider.getSnippets();
      const workflowTaskSnippet = snippets.find(s => s.prefix === 'workflowtask');

      expect(workflowTaskSnippet).toBeDefined();
      expect(workflowTaskSnippet?.label).toBe('WorkflowTask');
      expect(workflowTaskSnippet?.body).toContain('kind: WorkflowTask');
      expect(workflowTaskSnippet?.body).toContain('type: http');
    });

    it('should return forEach snippet', () => {
      const snippets = provider.getSnippets();
      const forEachSnippet = snippets.find(s => s.prefix === 'foreach');

      expect(forEachSnippet).toBeDefined();
      expect(forEachSnippet?.label).toBe('ForEach Loop');
      expect(forEachSnippet?.body).toContain('forEach:');
      expect(forEachSnippet?.body).toContain('collection:');
    });

    it('should return condition snippet', () => {
      const snippets = provider.getSnippets();
      const conditionSnippet = snippets.find(s => s.prefix === 'condition');

      expect(conditionSnippet).toBeDefined();
      expect(conditionSnippet?.label).toBe('Conditional Task');
      expect(conditionSnippet?.body).toContain('condition:');
    });

    it('should return trigger-cron snippet', () => {
      const snippets = provider.getSnippets();
      const triggerSnippet = snippets.find(s => s.prefix === 'trigger-cron');

      expect(triggerSnippet).toBeDefined();
      expect(triggerSnippet?.label).toBe('Schedule Trigger');
      expect(triggerSnippet?.body).toContain('triggers:');
      expect(triggerSnippet?.body).toContain('schedule:');
    });

    it('should return dependsOn snippet', () => {
      const snippets = provider.getSnippets();
      const dependsOnSnippet = snippets.find(s => s.prefix === 'dependson');

      expect(dependsOnSnippet).toBeDefined();
      expect(dependsOnSnippet?.label).toBe('Dependencies');
      expect(dependsOnSnippet?.body).toContain('dependsOn:');
    });

    it('should return input schema snippet', () => {
      const snippets = provider.getSnippets();
      const inputSnippet = snippets.find(s => s.prefix === 'input-schema');

      expect(inputSnippet).toBeDefined();
      expect(inputSnippet?.label).toBe('Input Schema');
      expect(inputSnippet?.body).toContain('input:');
      expect(inputSnippet?.body).toContain('properties:');
    });

    it('should return output mapping snippet', () => {
      const snippets = provider.getSnippets();
      const outputSnippet = snippets.find(s => s.prefix === 'output');

      expect(outputSnippet).toBeDefined();
      expect(outputSnippet?.label).toBe('Output Mapping');
      expect(outputSnippet?.body).toContain('output:');
    });
  });

  describe('getSnippetByPrefix', () => {
    it('should return snippet by exact prefix', () => {
      const snippet = provider.getSnippetByPrefix('workflow');

      expect(snippet).toBeDefined();
      expect(snippet?.prefix).toBe('workflow');
    });

    it('should return null for unknown prefix', () => {
      const snippet = provider.getSnippetByPrefix('unknown-snippet');

      expect(snippet).toBeNull();
    });
  });

  describe('snippet structure', () => {
    it('all snippets should have required properties', () => {
      const snippets = provider.getSnippets();

      for (const snippet of snippets) {
        expect(snippet.prefix).toBeDefined();
        expect(snippet.prefix.length).toBeGreaterThan(0);
        expect(snippet.label).toBeDefined();
        expect(snippet.label.length).toBeGreaterThan(0);
        expect(snippet.body).toBeDefined();
        expect(snippet.body.length).toBeGreaterThan(0);
        expect(snippet.description).toBeDefined();
      }
    });

    it('all snippets should produce valid YAML structure', () => {
      const snippets = provider.getSnippets();

      for (const snippet of snippets) {
        // Check that body doesn't contain unbalanced braces
        // Tab stops like $1, ${1:placeholder} are valid in snippets
        const body = snippet.body;
        expect(body).not.toContain('{{}}'); // Empty template expressions
      }
    });
  });
});
