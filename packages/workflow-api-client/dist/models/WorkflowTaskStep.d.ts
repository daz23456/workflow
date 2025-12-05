export type WorkflowTaskStep = {
    id?: string | null;
    taskRef?: string | null;
    input?: Record<string, string> | null;
    dependsOn?: Array<string> | null;
    condition?: string | null;
};
//# sourceMappingURL=WorkflowTaskStep.d.ts.map