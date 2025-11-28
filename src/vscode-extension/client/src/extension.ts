import * as path from 'path';
import { workspace, ExtensionContext, commands, window } from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from 'vscode-languageclient/node';
import { WorkflowGraphPanel } from './graphPanel';

let client: LanguageClient;

export function activate(context: ExtensionContext) {
  console.log('[Extension] Activating workflow extension');

  // Register command to show workflow graph
  const showGraphCommand = commands.registerCommand('workflow.showGraph', () => {
    console.log('[Extension] workflow.showGraph command triggered');
    const editor = window.activeTextEditor;
    if (!editor) {
      console.log('[Extension] No active editor');
      window.showErrorMessage('No active editor');
      return;
    }

    const document = editor.document;
    console.log('[Extension] Active document:', document.fileName);

    const workflowYaml = document.getText();
    console.log('[Extension] Creating graph panel with YAML length:', workflowYaml.length);
    WorkflowGraphPanel.createOrShow(context.extensionUri, workflowYaml);
  });

  context.subscriptions.push(showGraphCommand);
  console.log('[Extension] Command workflow.showGraph registered');

  // The server is implemented in node
  const serverModule = context.asAbsolutePath(
    path.join('server', 'dist', 'server.js')
  );

  // The debug options for the server
  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions
    }
  };

  // Options to control the language client
  const clientOptions: LanguageClientOptions = {
    // Register the server for workflow YAML documents
    documentSelector: [
      { scheme: 'file', language: 'yaml', pattern: '**/*workflow*.{yaml,yml}' },
      { scheme: 'file', language: 'yaml', pattern: '**/*task*.{yaml,yml}' }
    ],
    synchronize: {
      // Notify the server about file changes to '.yaml' and '.yml' files in the workspace
      fileEvents: workspace.createFileSystemWatcher('**/*.{yaml,yml}')
    }
  };

  // Create the language client and start the client
  client = new LanguageClient(
    'workflowLanguageServer',
    'Workflow Language Server',
    serverOptions,
    clientOptions
  );

  // Start the client. This will also launch the server
  client.start();
}

export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
