/**
 * Tasks Command
 * List and show workflow task definitions
 */
import { JsonSchemaDefinition, HttpRequest } from '../loaders.js';
/**
 * Task summary for listing
 */
export interface TaskSummary {
    name: string;
    type: string;
    namespace: string;
}
/**
 * Task details for showing
 */
export interface TaskDetails extends TaskSummary {
    request?: HttpRequest;
    inputSchema?: JsonSchemaDefinition;
    outputSchema?: JsonSchemaDefinition;
}
/**
 * Result of listTasks command
 */
export interface TaskListResult {
    tasks: TaskSummary[];
    count: number;
    error?: string;
}
/**
 * Result of showTask command
 */
export interface TaskShowResult {
    found: boolean;
    task?: TaskDetails;
    error?: string;
}
/**
 * Options for listTasks command
 */
export interface ListTasksOptions {
    tasksPath: string;
    filter?: string;
    namespace?: string;
}
/**
 * Options for showTask command
 */
export interface ShowTaskOptions {
    tasksPath: string;
}
/**
 * List all tasks from a directory
 */
export declare function listTasks(options: ListTasksOptions): Promise<TaskListResult>;
/**
 * Show details of a specific task
 */
export declare function showTask(taskName: string, options: ShowTaskOptions): Promise<TaskShowResult>;
//# sourceMappingURL=tasks.d.ts.map