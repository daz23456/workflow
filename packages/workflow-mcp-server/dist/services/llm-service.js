import Anthropic from '@anthropic-ai/sdk';
import { buildSystemPrompt } from '../prompts/system-prompt.js';
import { selectRelevantExample, formatExample } from '../prompts/few-shot-examples.js';
import { loadConfig } from '../config/index.js';
/**
 * Service for LLM-powered workflow generation
 */
export class LlmService {
    client = null;
    model;
    maxTokens;
    constructor() {
        const config = loadConfig();
        this.model = config.model;
        this.maxTokens = config.maxTokens;
        if (config.anthropicApiKey) {
            this.client = new Anthropic({ apiKey: config.anthropicApiKey });
        }
    }
    /**
     * Check if LLM is available
     */
    isAvailable() {
        return this.client !== null;
    }
    /**
     * Generate a workflow using the LLM
     */
    async generateWorkflow(intent, availableTasks) {
        if (!this.client) {
            throw new Error('LLM not available: ANTHROPIC_API_KEY not configured');
        }
        // Build system prompt with task list
        const systemPrompt = buildSystemPrompt(availableTasks);
        // Select relevant few-shot example
        const example = selectRelevantExample(intent);
        const formattedExample = formatExample(example);
        // Build the messages
        const messages = [
            {
                role: 'user',
                content: `Here's an example of how to generate a workflow:

${formattedExample}

Now, please generate a workflow for this intent:
"${intent}"

Remember to:
1. Use only the available tasks listed in the system prompt
2. Follow the template syntax for input/output references
3. Add proper dependencies between tasks
4. Return valid YAML wrapped in \`\`\`yaml code blocks`
            }
        ];
        // Call the LLM
        const response = await this.client.messages.create({
            model: this.model,
            max_tokens: this.maxTokens,
            system: systemPrompt,
            messages
        });
        // Extract the response text
        const responseText = response.content
            .filter((block) => block.type === 'text')
            .map(block => block.text)
            .join('\n');
        // Parse the response
        return this.parseResponse(responseText, intent);
    }
    /**
     * Parse LLM response to extract YAML and metadata
     */
    parseResponse(responseText, intent) {
        // Extract YAML from code blocks
        const yamlMatch = responseText.match(/```yaml\n([\s\S]*?)```/);
        if (!yamlMatch) {
            throw new Error('LLM response did not contain valid YAML block');
        }
        const yaml = yamlMatch[1].trim();
        // Detect pattern from the workflow structure
        const pattern = this.detectPattern(yaml);
        // Count tasks
        const taskCount = (yaml.match(/- id:/g) || []).length;
        // Extract explanation (text after YAML block or before it)
        let explanation = '';
        const afterYaml = responseText.split('```')[2]?.trim();
        const beforeYaml = responseText.split('```yaml')[0]?.trim();
        if (afterYaml && afterYaml.length > 10) {
            explanation = afterYaml.split('\n')[0];
        }
        else if (beforeYaml && beforeYaml.length > 10) {
            explanation = beforeYaml.split('\n').pop() || '';
        }
        if (!explanation) {
            explanation = `Generated ${pattern} workflow with ${taskCount} tasks for: ${intent}`;
        }
        return {
            yaml,
            explanation,
            taskCount,
            pattern
        };
    }
    /**
     * Detect workflow pattern from YAML structure
     */
    detectPattern(yaml) {
        const dependsOnMatches = yaml.match(/dependsOn:/g) || [];
        const taskMatches = yaml.match(/- id:/g) || [];
        const taskCount = taskMatches.length;
        const dependencyCount = dependsOnMatches.length;
        // No dependencies = parallel
        if (dependencyCount === 0 && taskCount > 1) {
            return 'parallel';
        }
        // Check for multiple dependencies on same task (fork) or task with multiple dependsOn (join)
        const multipleDepPattern = /dependsOn:\s*\n\s*-[^\n]+\n\s*-/;
        if (multipleDepPattern.test(yaml)) {
            return 'diamond';
        }
        // Linear chain = sequential
        if (dependencyCount === taskCount - 1) {
            return 'sequential';
        }
        // More complex patterns
        if (taskCount > 3) {
            return 'complex';
        }
        return 'sequential';
    }
}
//# sourceMappingURL=llm-service.js.map