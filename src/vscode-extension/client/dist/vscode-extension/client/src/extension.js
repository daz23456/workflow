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
exports.activate = activate;
exports.deactivate = deactivate;
const path = __importStar(require("path"));
const vscode_1 = require("vscode");
const node_1 = require("vscode-languageclient/node");
const graphPanel_1 = require("./graphPanel");
let client;
function activate(context) {
    // Register command to show workflow graph
    const showGraphCommand = vscode_1.commands.registerCommand('workflow.showGraph', () => {
        const editor = vscode_1.window.activeTextEditor;
        if (!editor) {
            vscode_1.window.showErrorMessage('No active editor');
            return;
        }
        const document = editor.document;
        if (!document.fileName.includes('workflow')) {
            vscode_1.window.showWarningMessage('This is not a workflow file');
            return;
        }
        const workflowYaml = document.getText();
        graphPanel_1.WorkflowGraphPanel.createOrShow(context.extensionUri, workflowYaml);
    });
    context.subscriptions.push(showGraphCommand);
    // The server is implemented in node
    const serverModule = context.asAbsolutePath(path.join('server', 'dist', 'server.js'));
    // The debug options for the server
    const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };
    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions = {
        run: { module: serverModule, transport: node_1.TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: node_1.TransportKind.ipc,
            options: debugOptions
        }
    };
    // Options to control the language client
    const clientOptions = {
        // Register the server for workflow YAML documents
        documentSelector: [
            { scheme: 'file', language: 'yaml', pattern: '**/*workflow*.{yaml,yml}' },
            { scheme: 'file', language: 'yaml', pattern: '**/*task*.{yaml,yml}' }
        ],
        synchronize: {
            // Notify the server about file changes to '.yaml' and '.yml' files in the workspace
            fileEvents: vscode_1.workspace.createFileSystemWatcher('**/*.{yaml,yml}')
        }
    };
    // Create the language client and start the client
    client = new node_1.LanguageClient('workflowLanguageServer', 'Workflow Language Server', serverOptions, clientOptions);
    // Start the client. This will also launch the server
    client.start();
}
function deactivate() {
    if (!client) {
        return undefined;
    }
    return client.stop();
}
//# sourceMappingURL=extension.js.map