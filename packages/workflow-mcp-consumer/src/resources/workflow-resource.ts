/**
 * MCP Resources for workflow discovery
 * Stage 15.4: MCP Resources & Prompts
 */

import type { ConsumerGatewayClient } from '../services/consumer-gateway-client.js';

/**
 * Resource metadata for listing
 */
export interface ResourceInfo {
  uri: string;
  name: string;
  description?: string;
  mimeType: string;
}

/**
 * Resource content for reading
 */
export interface ResourceContent {
  uri: string;
  name: string;
  mimeType: string;
  text: string;
}

/**
 * List all available workflow resources
 */
export async function listWorkflowResources(
  client: ConsumerGatewayClient
): Promise<ResourceInfo[]> {
  const workflows = await client.listWorkflows();
  const resources: ResourceInfo[] = [];

  for (const workflow of workflows) {
    // Main workflow resource
    resources.push({
      uri: `workflow://${workflow.name}`,
      name: workflow.name,
      description: workflow.description,
      mimeType: 'application/json'
    });

    // Schema resource
    resources.push({
      uri: `workflow://${workflow.name}/schema`,
      name: `${workflow.name} input schema`,
      description: `Input schema for ${workflow.name}`,
      mimeType: 'application/json'
    });
  }

  return resources;
}

/**
 * Get workflow resource by name
 */
export async function getWorkflowResource(
  client: ConsumerGatewayClient,
  workflowName: string
): Promise<ResourceContent> {
  const workflow = await client.getWorkflow(workflowName);

  const content = {
    name: workflow.name,
    description: workflow.description ?? '',
    categories: workflow.categories ?? [],
    tags: workflow.tags ?? [],
    examples: workflow.examples ?? [],
    input: workflow.input ?? {},
    tasks: (workflow.tasks ?? []).map(t => ({
      id: t.id,
      taskRef: t.taskRef,
      description: t.description,
      dependencies: t.dependsOn ?? []
    }))
  };

  return {
    uri: `workflow://${workflowName}`,
    name: workflowName,
    mimeType: 'application/json',
    text: JSON.stringify(content, null, 2)
  };
}

/**
 * Get workflow input schema as JSON Schema resource
 */
export async function getWorkflowSchemaResource(
  client: ConsumerGatewayClient,
  workflowName: string
): Promise<ResourceContent> {
  const workflow = await client.getWorkflow(workflowName);
  const input = workflow.input ?? {};

  // Build JSON Schema from workflow input definition
  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [fieldName, fieldDef] of Object.entries(input)) {
    properties[fieldName] = {
      type: fieldDef.type,
      description: fieldDef.description,
      default: fieldDef.default
    };

    if (fieldDef.required) {
      required.push(fieldName);
    }
  }

  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: `${workflowName} Input`,
    type: 'object',
    properties,
    required
  };

  return {
    uri: `workflow://${workflowName}/schema`,
    name: `${workflowName} input schema`,
    mimeType: 'application/json',
    text: JSON.stringify(schema, null, 2)
  };
}
