import { HoverProvider, HoverContext } from './hoverProvider';

describe('HoverProvider', () => {
  let provider: HoverProvider;

  beforeEach(() => {
    provider = new HoverProvider();
  });

  describe('getHover', () => {
    describe('top-level property hover', () => {
      it('should return documentation for apiVersion', () => {
        const yaml = `apiVersion: workflow.io/v1
kind: Workflow`;
        const context: HoverContext = {
          text: yaml,
          position: { line: 0, character: 5 },
          word: 'apiVersion',
        };

        const hover = provider.getHover(context);

        expect(hover).not.toBeNull();
        expect(hover?.contents).toContain('API version');
      });

      it('should return documentation for kind', () => {
        const yaml = `apiVersion: workflow.io/v1
kind: Workflow`;
        const context: HoverContext = {
          text: yaml,
          position: { line: 1, character: 2 },
          word: 'kind',
        };

        const hover = provider.getHover(context);

        expect(hover).not.toBeNull();
        expect(hover?.contents).toContain('Resource type');
      });

      it('should return documentation for spec', () => {
        const yaml = `apiVersion: workflow.io/v1
kind: Workflow
spec:
  tasks: []`;
        const context: HoverContext = {
          text: yaml,
          position: { line: 2, character: 2 },
          word: 'spec',
        };

        const hover = provider.getHover(context);

        expect(hover).not.toBeNull();
        expect(hover?.contents).toContain('specification');
      });
    });

    describe('workflow spec property hover', () => {
      it('should return documentation for tasks', () => {
        const yaml = `kind: Workflow
spec:
  tasks:
    - id: test`;
        const context: HoverContext = {
          text: yaml,
          position: { line: 2, character: 4 },
          word: 'tasks',
        };

        const hover = provider.getHover(context);

        expect(hover).not.toBeNull();
        expect(hover?.contents).toContain('task');
      });

      it('should return documentation for input', () => {
        const yaml = `kind: Workflow
spec:
  input:
    properties: {}`;
        const context: HoverContext = {
          text: yaml,
          position: { line: 2, character: 4 },
          word: 'input',
        };

        const hover = provider.getHover(context);

        expect(hover).not.toBeNull();
        expect(hover?.contents).toContain('Input');
      });
    });

    describe('task step property hover', () => {
      it('should return documentation for taskRef', () => {
        const yaml = `kind: Workflow
spec:
  tasks:
    - id: fetch
      taskRef: get-user`;
        const context: HoverContext = {
          text: yaml,
          position: { line: 4, character: 8 },
          word: 'taskRef',
        };

        const hover = provider.getHover(context);

        expect(hover).not.toBeNull();
        expect(hover?.contents).toContain('WorkflowTask');
      });

      it('should return documentation for dependsOn', () => {
        const yaml = `kind: Workflow
spec:
  tasks:
    - id: process
      taskRef: process-data
      dependsOn:
        - fetch`;
        const context: HoverContext = {
          text: yaml,
          position: { line: 5, character: 8 },
          word: 'dependsOn',
        };

        const hover = provider.getHover(context);

        expect(hover).not.toBeNull();
        expect(hover?.contents).toContain('depend');
      });

      it('should return documentation for timeout', () => {
        const yaml = `kind: Workflow
spec:
  tasks:
    - id: fetch
      taskRef: get-user
      timeout: 30s`;
        const context: HoverContext = {
          text: yaml,
          position: { line: 5, character: 8 },
          word: 'timeout',
        };

        const hover = provider.getHover(context);

        expect(hover).not.toBeNull();
        expect(hover?.contents).toContain('Timeout');
      });
    });

    describe('unknown property hover', () => {
      it('should return null for unknown property', () => {
        const yaml = `kind: Workflow
spec:
  unknownProperty: value`;
        const context: HoverContext = {
          text: yaml,
          position: { line: 2, character: 4 },
          word: 'unknownProperty',
        };

        const hover = provider.getHover(context);

        expect(hover).toBeNull();
      });
    });
  });
});
