#!/usr/bin/env npx tsx
/**
 * Test script to verify LLM integration in generate_workflow
 *
 * Usage:
 *   ANTHROPIC_API_KEY=your-key GATEWAY_URL=http://localhost:5001 npx tsx test-llm.ts
 */

import { GatewayClient } from './src/services/gateway-client.js';
import { generateWorkflow } from './src/tools/generate-workflow.js';
import { loadConfig, isLlmAvailable } from './src/config/index.js';

async function main() {
  console.log('=== MCP Server LLM Integration Test ===\n');

  // Check config
  const config = loadConfig();
  console.log('Configuration:');
  console.log(`  Gateway URL: ${config.gatewayUrl}`);
  console.log(`  Model: ${config.model}`);
  console.log(`  Max Tokens: ${config.maxTokens}`);
  console.log(`  LLM Available: ${isLlmAvailable()}\n`);

  if (!isLlmAvailable()) {
    console.error('ERROR: ANTHROPIC_API_KEY not set');
    console.log('\nRun with:');
    console.log('  ANTHROPIC_API_KEY=sk-... GATEWAY_URL=http://localhost:5001 npx tsx test-llm.ts');
    process.exit(1);
  }

  // Create gateway client
  const client = new GatewayClient(config.gatewayUrl);

  // Test 1: List available tasks
  console.log('--- Test 1: List Tasks ---');
  try {
    const tasks = await client.listTasks();
    console.log(`Found ${tasks.length} tasks`);
    const fetchTasks = tasks.filter(t => t.type === 'fetch' || t.type === 'http').slice(0, 5);
    console.log('Sample fetch tasks:', fetchTasks.map(t => t.name).join(', '));
  } catch (err) {
    console.error('Failed to list tasks:', err);
    process.exit(1);
  }

  // Test 2: Generate workflow with LLM
  console.log('\n--- Test 2: Generate Workflow (LLM) ---');
  const intent = 'fetch the ISS location and then fetch a dad joke';
  console.log(`Intent: "${intent}"\n`);

  try {
    const result = await generateWorkflow(client, {
      intent,
      useLLM: true  // Force LLM usage
    });

    console.log('Generated Workflow:');
    console.log('---');
    console.log(result.yaml);
    console.log('---');
    console.log(`\nPattern: ${result.pattern}`);
    console.log(`Task Count: ${result.taskCount}`);
    console.log(`Explanation: ${result.explanation}`);

    // Validate the generated workflow
    console.log('\n--- Test 3: Validate Generated Workflow ---');
    const validation = await client.validateWorkflow(result.yaml);
    console.log(`Valid: ${validation.valid}`);
    if (!validation.valid && validation.errors.length > 0) {
      console.log('Errors:', validation.errors.map(e => e.message));
      console.log('\nGenerated YAML (for debugging):');
      console.log('---');
      console.log(result.yaml);
      console.log('---');
    }

  } catch (err) {
    console.error('Failed to generate workflow:', err);
    process.exit(1);
  }

  console.log('\n=== LLM Integration Test Complete ===');
  console.log('✅ LLM generation is working');
  if (true) {  // Always show summary
    console.log('⚠️  Validation may fail if generated tasks don\'t exist in gateway');
  }
}

main().catch(console.error);
