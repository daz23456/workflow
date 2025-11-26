import * as vscode from 'vscode';
import * as path from 'path';
import * as YAML from 'yaml';
import { ExecutionGraphBuilder } from '@workflow/graph';
import type { WorkflowSpec } from '@workflow/types';

export class WorkflowGraphPanel {
  public static currentPanel: WorkflowGraphPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri, workflowYaml: string) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (WorkflowGraphPanel.currentPanel) {
      WorkflowGraphPanel.currentPanel._panel.reveal(column);
      WorkflowGraphPanel.currentPanel._update(workflowYaml);
      return;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      'workflowGraph',
      'Workflow Graph',
      column || vscode.ViewColumn.Two,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'client', 'dist', 'webview')
        ]
      }
    );

    WorkflowGraphPanel.currentPanel = new WorkflowGraphPanel(panel, extensionUri, workflowYaml);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, workflowYaml: string) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Set the webview's initial html content
    this._update(workflowYaml);

    // Listen for when the panel is disposed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public dispose() {
    WorkflowGraphPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  private _update(workflowYaml: string) {
    const webview = this._panel.webview;

    try {
      // Parse YAML and build graph
      const workflow = YAML.parse(workflowYaml) as any;

      if (!workflow || workflow.kind !== 'Workflow') {
        webview.postMessage({
          type: 'error',
          message: 'Not a valid Workflow document'
        });
        return;
      }

      // Build execution graph
      const graphBuilder = new ExecutionGraphBuilder();
      const executionGraph = graphBuilder.build(workflow.spec as WorkflowSpec);

      // Convert to the format expected by the WebView
      const graph = {
        nodes: executionGraph.nodes.map((node: any) => ({
          id: node.id,
          type: 'task',
          label: node.taskRef || node.id
        })),
        edges: executionGraph.edges.map((edge: any) => ({
          source: edge.from,
          target: edge.to
        })),
        parallelGroups: []
      };

      // Send graph to webview
      webview.postMessage({
        type: 'updateGraph',
        graph
      });

    } catch (err: any) {
      webview.postMessage({
        type: 'error',
        message: `Failed to parse workflow: ${err.message}`
      });
    }

    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview) {
    // Get the URI for the bundled React app
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'client', 'dist', 'webview', 'bundle.js')
    );

    // Use a nonce to only allow specific scripts to be run
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>Workflow Graph</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
    #root {
      width: 100vw;
      height: 100vh;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce() {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
