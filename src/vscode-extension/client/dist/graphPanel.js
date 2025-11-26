"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowGraphPanel = void 0;
const vscode = __importStar(require("vscode"));
const YAML = __importStar(require("yaml"));
const graph_1 = require("@workflow/graph");
class WorkflowGraphPanel {
    static createOrShow(extensionUri, workflowYaml) {
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
        const panel = vscode.window.createWebviewPanel('workflowGraph', 'Workflow Graph', column || vscode.ViewColumn.Two, {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(extensionUri, 'client', 'dist', 'webview')
            ]
        });
        WorkflowGraphPanel.currentPanel = new WorkflowGraphPanel(panel, extensionUri, workflowYaml);
    }
    constructor(panel, extensionUri, workflowYaml) {
        this._disposables = [];
        this._panel = panel;
        this._extensionUri = extensionUri;
        // Set the webview's initial html content
        this._update(workflowYaml);
        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }
    dispose() {
        WorkflowGraphPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
    _update(workflowYaml) {
        const webview = this._panel.webview;
        try {
            // Parse YAML and build graph
            const workflow = YAML.parse(workflowYaml);
            if (!workflow || workflow.kind !== 'Workflow') {
                webview.postMessage({
                    type: 'error',
                    message: 'Not a valid Workflow document'
                });
                return;
            }
            // Build execution graph
            const graphBuilder = new graph_1.ExecutionGraphBuilder();
            const executionGraph = graphBuilder.buildGraph(workflow.spec);
            // Convert to the format expected by the WebView
            const graph = {
                nodes: executionGraph.nodes.map(node => ({
                    id: node.id,
                    type: 'task',
                    label: node.taskRef || node.id
                })),
                edges: executionGraph.edges.map(edge => ({
                    source: edge.from,
                    target: edge.to
                })),
                parallelGroups: executionGraph.parallelGroups || []
            };
            // Send graph to webview
            webview.postMessage({
                type: 'updateGraph',
                graph
            });
        }
        catch (err) {
            webview.postMessage({
                type: 'error',
                message: `Failed to parse workflow: ${err.message}`
            });
        }
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }
    _getHtmlForWebview(webview) {
        // Get the URI for the bundled React app
        const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'client', 'dist', 'webview', 'bundle.js'));
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
exports.WorkflowGraphPanel = WorkflowGraphPanel;
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=graphPanel.js.map