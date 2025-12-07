/**
 * Configuration for the MCP server
 */
/**
 * Load configuration from environment variables
 */
export function loadConfig() {
    return {
        anthropicApiKey: process.env.ANTHROPIC_API_KEY,
        model: process.env.WORKFLOW_MCP_MODEL ?? 'claude-sonnet-4-20250514',
        maxTokens: parseInt(process.env.WORKFLOW_MCP_MAX_TOKENS ?? '4096', 10),
        gatewayUrl: process.env.GATEWAY_URL ?? 'http://localhost:5000'
    };
}
/**
 * Check if LLM is available (API key configured)
 */
export function isLlmAvailable() {
    return !!process.env.ANTHROPIC_API_KEY;
}
//# sourceMappingURL=index.js.map