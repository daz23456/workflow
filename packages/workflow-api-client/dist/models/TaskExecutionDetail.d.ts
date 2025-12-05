export type TaskExecutionDetail = {
    taskId?: string | null;
    taskRef?: string | null;
    success?: boolean;
    output?: Record<string, any> | null;
    errors?: Array<string> | null;
    retryCount?: number;
    durationMs?: number;
    startedAt?: string;
    completedAt?: string;
};
//# sourceMappingURL=TaskExecutionDetail.d.ts.map