/**
 * Transform a WorkflowTask to TaskSummary format
 * Handles both gateway format (inputSchema/outputSchema) and legacy format (spec.input/spec.output)
 */
function toTaskSummary(task) {
    const defaultSchema = { type: 'object', properties: {} };
    return {
        name: task.name,
        description: task.description ?? '',
        category: task.category ?? task.type ?? 'uncategorized',
        inputSchema: task.inputSchema ?? task.spec?.input ?? defaultSchema,
        outputSchema: task.outputSchema ?? task.spec?.output ?? defaultSchema
    };
}
/**
 * Check if a task matches the search query
 */
function matchesSearch(task, search) {
    const lowerSearch = search.toLowerCase();
    const name = task.name.toLowerCase();
    const description = (task.description ?? '').toLowerCase();
    return name.includes(lowerSearch) || description.includes(lowerSearch);
}
/**
 * List available workflow tasks with optional filtering
 */
export async function listTasks(client, params) {
    const tasks = await client.listTasks();
    let filtered = tasks;
    // Filter by category if provided
    if (params.category) {
        filtered = filtered.filter(t => (t.category ?? t.type) === params.category);
    }
    // Filter by search query if provided
    if (params.search) {
        filtered = filtered.filter(t => matchesSearch(t, params.search));
    }
    return {
        tasks: filtered.map(toTaskSummary)
    };
}
//# sourceMappingURL=list-tasks.js.map