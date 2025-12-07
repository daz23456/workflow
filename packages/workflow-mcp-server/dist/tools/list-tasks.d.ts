import type { GatewayClient } from '../services/gateway-client.js';
import type { ListTasksParams, TaskSummary } from '../types/index.js';
export interface ListTasksResult {
    tasks: TaskSummary[];
}
/**
 * List available workflow tasks with optional filtering
 */
export declare function listTasks(client: GatewayClient, params: ListTasksParams): Promise<ListTasksResult>;
//# sourceMappingURL=list-tasks.d.ts.map