/**
 * Init Command
 * Initialize a new workflow project from templates
 */
/**
 * Workflow template definition
 */
export interface WorkflowTemplate {
    id: string;
    name: string;
    description: string;
}
/**
 * Result of init command
 */
export interface InitResult {
    success: boolean;
    workflowPath?: string;
    template?: string;
    createdFiles?: string[];
    error?: string;
}
/**
 * Options for init command
 */
export interface InitOptions {
    outputPath?: string;
    template?: string;
}
/**
 * Get list of available templates
 */
export declare function getAvailableTemplates(): WorkflowTemplate[];
/**
 * Initialize a new workflow project
 */
export declare function initWorkflow(name: string, options: InitOptions): Promise<InitResult>;
//# sourceMappingURL=init.d.ts.map