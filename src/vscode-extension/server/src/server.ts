import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
  Diagnostic,
  DiagnosticSeverity
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import * as YAML from 'yaml';
import { SchemaValidator } from '@workflow/validation';

// Create a connection for the server using Node's IPC as a transport
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Initialize schema validator
const schemaValidator = new SchemaValidator();

connection.onInitialize((params: InitializeParams) => {
  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Tell the client that this server supports code completion
      completionProvider: {
        resolveProvider: true
      }
    }
  };
  return result;
});

connection.onInitialized(() => {
  connection.console.log('Workflow Language Server initialized!');
});

// The content of a text document has changed
documents.onDidChangeContent(change => {
  validateWorkflowDocument(change.document);
});

async function validateWorkflowDocument(textDocument: TextDocument): Promise<void> {
  const text = textDocument.getText();
  const diagnostics: Diagnostic[] = [];

  try {
    // Parse YAML
    const doc = YAML.parse(text);
    
    if (!doc) {
      return; // Empty document
    }

    // Check if it's a Workflow or WorkflowTask
    const kind = doc.kind;
    
    if (kind === 'Workflow') {
      // Validate workflow structure
      validateWorkflow(doc, diagnostics, textDocument);
    } else if (kind === 'WorkflowTask') {
      // Validate task structure
      validateWorkflowTask(doc, diagnostics, textDocument);
    }
  } catch (err) {
    // YAML parsing error
    const message = err instanceof Error ? err.message : String(err);
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: Number.MAX_VALUE }
      },
      message: `YAML Parse Error: ${message}`,
      source: 'workflow-validator'
    });
  }

  // Send the computed diagnostics to VSCode
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

function validateWorkflow(
  doc: any,
  diagnostics: Diagnostic[],
  textDocument: TextDocument
): void {
  // Basic structure validation
  if (!doc.metadata?.name) {
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: Number.MAX_VALUE }
      },
      message: 'Workflow must have metadata.name',
      source: 'workflow-validator'
    });
  }

  if (!doc.spec?.tasks || !Array.isArray(doc.spec.tasks)) {
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: Number.MAX_VALUE }
      },
      message: 'Workflow must have spec.tasks array',
      source: 'workflow-validator'
    });
  }

  // Validate each task step
  if (doc.spec?.tasks) {
    for (const task of doc.spec.tasks) {
      if (!task.id) {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: Number.MAX_VALUE }
          },
          message: 'Task must have an id',
          source: 'workflow-validator'
        });
      }
      if (!task.taskRef) {
        diagnostics.push({
          severity: DiagnosticSeverity.Error,
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: Number.MAX_VALUE }
          },
          message: `Task '${task.id}' must have a taskRef`,
          source: 'workflow-validator'
        });
      }
    }
  }
}

function validateWorkflowTask(
  doc: any,
  diagnostics: Diagnostic[],
  textDocument: TextDocument
): void {
  if (!doc.metadata?.name) {
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: Number.MAX_VALUE }
      },
      message: 'WorkflowTask must have metadata.name',
      source: 'workflow-validator'
    });
  }

  if (!doc.spec?.type) {
    diagnostics.push({
      severity: DiagnosticSeverity.Error,
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: Number.MAX_VALUE }
      },
      message: 'WorkflowTask must have spec.type',
      source: 'workflow-validator'
    });
  }
}

// Make the text document manager listen on the connection
documents.listen(connection);

// Listen on the connection
connection.listen();
