/**
 * Configuration for the MCP server
 */
export interface Config {
    /** Anthropic API key for LLM calls */
    anthropicApiKey: string | undefined;
    /** Model to use for workflow generation */
    model: string;
    /** Maximum tokens for LLM response */
    maxTokens: number;
    /** Gateway URL for workflow API */
    gatewayUrl: string;
}
/**
 * Load configuration from environment variables
 */
export declare function loadConfig(): Config;
/**
 * Check if LLM is available (API key configured)
 */
export declare function isLlmAvailable(): boolean;
//# sourceMappingURL=index.d.ts.map