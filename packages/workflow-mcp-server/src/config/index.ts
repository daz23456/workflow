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
export function loadConfig(): Config {
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
export function isLlmAvailable(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}
