import * as vscode from 'vscode';
export declare class WorkflowGraphPanel {
    static currentPanel: WorkflowGraphPanel | undefined;
    private readonly _panel;
    private readonly _extensionUri;
    private _disposables;
    static createOrShow(extensionUri: vscode.Uri, workflowYaml: string): void;
    private constructor();
    dispose(): void;
    private _update;
    private _getHtmlForWebview;
}
//# sourceMappingURL=graphPanel.d.ts.map