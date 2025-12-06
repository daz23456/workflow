import { DiagnosticsProvider, DiagnosticSeverity } from './diagnosticsProvider';

describe('DiagnosticsProvider', () => {
  let provider: DiagnosticsProvider;

  beforeEach(() => {
    provider = new DiagnosticsProvider();
  });

  describe('getDiagnostics', () => {
    describe('YAML parsing errors', () => {
      it('should return error for invalid YAML', () => {
        const yaml = `kind: Workflow
spec:
  tasks:
    - id: test
    invalid: [unclosed`;

        const diagnostics = provider.getDiagnostics(yaml);

        expect(diagnostics.length).toBeGreaterThan(0);
        expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Error);
        expect(diagnostics[0].message).toContain('YAML');
      });
    });

    describe('Workflow validation', () => {
      it('should return error when metadata.name is missing', () => {
        const yaml = `kind: Workflow
metadata:
  labels: {}
spec:
  tasks:
    - id: test
      taskRef: my-task`;

        const diagnostics = provider.getDiagnostics(yaml);

        expect(diagnostics.some(d => d.message.includes('metadata.name'))).toBe(true);
      });

      it('should return error when spec.tasks is missing', () => {
        const yaml = `kind: Workflow
metadata:
  name: test-workflow
spec:
  description: "missing tasks"`;

        const diagnostics = provider.getDiagnostics(yaml);

        expect(diagnostics.some(d => d.message.includes('tasks'))).toBe(true);
      });

      it('should return error when task is missing id', () => {
        const yaml = `kind: Workflow
metadata:
  name: test-workflow
spec:
  tasks:
    - taskRef: my-task`;

        const diagnostics = provider.getDiagnostics(yaml);

        expect(diagnostics.some(d => d.message.includes('id'))).toBe(true);
      });

      it('should return error when task is missing taskRef', () => {
        const yaml = `kind: Workflow
metadata:
  name: test-workflow
spec:
  tasks:
    - id: fetch-data`;

        const diagnostics = provider.getDiagnostics(yaml);

        expect(diagnostics.some(d => d.message.includes('taskRef'))).toBe(true);
      });

      it('should return correct line number for missing task id', () => {
        const yaml = `kind: Workflow
metadata:
  name: test-workflow
spec:
  tasks:
    - taskRef: my-task`;

        const diagnostics = provider.getDiagnostics(yaml);
        const idError = diagnostics.find(d => d.message.includes('id'));

        expect(idError).toBeDefined();
        expect(idError?.range.start.line).toBe(5); // 0-indexed, line with "- taskRef"
      });
    });

    describe('WorkflowTask validation', () => {
      it('should return error when WorkflowTask metadata.name is missing', () => {
        const yaml = `kind: WorkflowTask
metadata:
  labels: {}
spec:
  type: http`;

        const diagnostics = provider.getDiagnostics(yaml);

        expect(diagnostics.some(d => d.message.includes('metadata.name'))).toBe(true);
      });

      it('should return error when WorkflowTask spec.type is missing', () => {
        const yaml = `kind: WorkflowTask
metadata:
  name: my-task
spec:
  http:
    url: "http://example.com"`;

        const diagnostics = provider.getDiagnostics(yaml);

        expect(diagnostics.some(d => d.message.includes('type'))).toBe(true);
      });
    });

    describe('dependency validation', () => {
      it('should return error for circular dependency', () => {
        const yaml = `kind: Workflow
metadata:
  name: test-workflow
spec:
  tasks:
    - id: task-a
      taskRef: my-task
      dependsOn:
        - task-b
    - id: task-b
      taskRef: my-task
      dependsOn:
        - task-a`;

        const diagnostics = provider.getDiagnostics(yaml);

        expect(diagnostics.some(d =>
          d.message.toLowerCase().includes('circular') ||
          d.message.toLowerCase().includes('cycle')
        )).toBe(true);
      });

      it('should return error for unknown dependency', () => {
        const yaml = `kind: Workflow
metadata:
  name: test-workflow
spec:
  tasks:
    - id: task-a
      taskRef: my-task
      dependsOn:
        - non-existent-task`;

        const diagnostics = provider.getDiagnostics(yaml);

        expect(diagnostics.some(d =>
          d.message.includes('non-existent-task') ||
          d.message.toLowerCase().includes('unknown')
        )).toBe(true);
      });
    });

    describe('valid documents', () => {
      it('should return no errors for valid Workflow', () => {
        const yaml = `kind: Workflow
metadata:
  name: test-workflow
spec:
  tasks:
    - id: fetch-data
      taskRef: my-task`;

        const diagnostics = provider.getDiagnostics(yaml);

        expect(diagnostics.length).toBe(0);
      });

      it('should return no errors for valid WorkflowTask', () => {
        const yaml = `kind: WorkflowTask
metadata:
  name: my-task
spec:
  type: http
  http:
    url: "http://example.com"`;

        const diagnostics = provider.getDiagnostics(yaml);

        expect(diagnostics.length).toBe(0);
      });

      it('should return no errors for empty document', () => {
        const yaml = '';

        const diagnostics = provider.getDiagnostics(yaml);

        expect(diagnostics.length).toBe(0);
      });
    });
  });
});
