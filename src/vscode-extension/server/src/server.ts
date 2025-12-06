import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  TextDocumentSyncKind,
  InitializeResult,
  Diagnostic,
  DiagnosticSeverity,
  CompletionItem,
  TextDocumentPositionParams,
  Hover
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionProvider } from './completionProvider';
import { HoverProvider } from './hoverProvider';
import { DiagnosticsProvider, DiagnosticSeverity as ProviderDiagnosticSeverity } from './diagnosticsProvider';

// Create a connection for the server using Node's IPC as a transport
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Initialize providers
const completionProvider = new CompletionProvider();
const hoverProvider = new HoverProvider();
const diagnosticsProvider = new DiagnosticsProvider();

connection.onInitialize((params: InitializeParams) => {
  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      // Code completion
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['.', ':', '{']
      },
      // Hover documentation
      hoverProvider: true
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

function validateWorkflowDocument(textDocument: TextDocument): void {
  const text = textDocument.getText();

  // Use DiagnosticsProvider to get diagnostics
  const providerDiagnostics = diagnosticsProvider.getDiagnostics(text);

  // Convert to LSP Diagnostic format
  const diagnostics: Diagnostic[] = providerDiagnostics.map(d => ({
    severity: mapSeverity(d.severity),
    range: d.range,
    message: d.message,
    source: d.source
  }));

  // Send the computed diagnostics to VSCode
  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

function mapSeverity(severity: ProviderDiagnosticSeverity): DiagnosticSeverity {
  switch (severity) {
    case ProviderDiagnosticSeverity.Error:
      return DiagnosticSeverity.Error;
    case ProviderDiagnosticSeverity.Warning:
      return DiagnosticSeverity.Warning;
    case ProviderDiagnosticSeverity.Information:
      return DiagnosticSeverity.Information;
    case ProviderDiagnosticSeverity.Hint:
      return DiagnosticSeverity.Hint;
    default:
      return DiagnosticSeverity.Error;
  }
}

// Handle completion requests
connection.onCompletion((params: TextDocumentPositionParams): CompletionItem[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const text = document.getText();
  const lineText = getLineText(document, params.position.line);

  // Detect if we're inside a template expression
  const templateContext = detectTemplateContext(lineText, params.position.character);

  const context = {
    text,
    position: params.position,
    lineText,
    isInsideTemplateExpression: templateContext.isInside,
    templatePrefix: templateContext.prefix
  };

  return completionProvider.getCompletions(context);
});

// Handle hover requests
connection.onHover((params: TextDocumentPositionParams): Hover | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const text = document.getText();
  const word = getWordAtPosition(document, params.position);

  if (!word) {
    return null;
  }

  const context = {
    text,
    position: params.position,
    word
  };

  const result = hoverProvider.getHover(context);

  if (result) {
    return {
      contents: {
        kind: 'markdown',
        value: result.contents
      }
    };
  }

  return null;
});

function getLineText(document: TextDocument, line: number): string {
  const text = document.getText();
  const lines = text.split('\n');
  return lines[line] || '';
}

function getWordAtPosition(document: TextDocument, position: { line: number; character: number }): string {
  const lineText = getLineText(document, position.line);

  // Find word boundaries
  let start = position.character;
  let end = position.character;

  // Move start backwards
  while (start > 0 && /[\w-]/.test(lineText[start - 1])) {
    start--;
  }

  // Move end forwards
  while (end < lineText.length && /[\w-]/.test(lineText[end])) {
    end++;
  }

  return lineText.substring(start, end);
}

function detectTemplateContext(lineText: string, character: number): { isInside: boolean; prefix: string } {
  // Check if we're inside {{ ... }}
  const beforeCursor = lineText.substring(0, character);
  const openBraceIndex = beforeCursor.lastIndexOf('{{');

  if (openBraceIndex === -1) {
    return { isInside: false, prefix: '' };
  }

  // Check if there's a closing brace between open and cursor
  const afterOpen = beforeCursor.substring(openBraceIndex);
  if (afterOpen.includes('}}')) {
    return { isInside: false, prefix: '' };
  }

  // We're inside a template expression
  // Extract the prefix (e.g., "input." or "tasks.")
  const content = afterOpen.substring(2); // Remove "{{"
  return { isInside: true, prefix: content };
}

// Make the text document manager listen on the connection
documents.listen(connection);

// Listen on the connection
connection.listen();
