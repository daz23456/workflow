import type { TaskSummary } from '../types/index.js';
/**
 * Format task list for inclusion in system prompt
 */
export declare function formatTaskList(tasks: TaskSummary[]): string;
/**
 * Build the system prompt for workflow generation
 */
export declare function buildSystemPrompt(tasks: TaskSummary[]): string;
//# sourceMappingURL=system-prompt.d.ts.map