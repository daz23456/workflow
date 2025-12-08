# Workflow MCP Consumer

MCP (Model Context Protocol) server for external chatbots and AI assistants to discover and execute workflows.

## Overview

This package enables external AI assistants (like Claude Desktop, custom chatbots, or any MCP-compatible client) to:

- **Discover** available workflows through natural language search
- **Understand** workflow inputs via JSON Schema and examples
- **Execute** workflows with validation and structured error handling
- **Troubleshoot** failed executions with contextual guidance

## Installation

```bash
npm install @workflow/mcp-consumer
```

## Configuration

### Claude Desktop

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "workflow-consumer": {
      "command": "node",
      "args": ["packages/workflow-mcp-consumer/dist/index.js"],
      "env": {
        "WORKFLOW_GATEWAY_URL": "http://localhost:5001"
      }
    }
  }
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `WORKFLOW_GATEWAY_URL` | URL of the Workflow Gateway API | `http://localhost:5001` |

## Available Tools

### list_workflows

List all available workflows with metadata.

**Input:**
```typescript
{
  category?: string;      // Filter by category (e.g., "orders", "users")
  tags?: string[];        // Filter by tags (AND logic)
  includeStats?: boolean; // Include execution statistics
}
```

**Example:**
```
list_workflows({ category: "orders", includeStats: true })
```

### search_workflows

Search workflows by natural language query with auto-execute support.

**Input:**
```typescript
{
  query: string;           // Natural language query
  autoExecute?: boolean;   // Enable auto-execute mode
  context?: object;        // Context for input extraction
}
```

**Example:**
```
search_workflows({
  query: "process an order for customer 123",
  autoExecute: true,
  context: { customerId: "123" }
})
```

### get_workflow_details

Get full details for a specific workflow.

**Input:**
```typescript
{
  name: string;  // Workflow name
}
```

**Example:**
```
get_workflow_details({ name: "order-processing" })
```

### execute_workflow

Execute a workflow with input validation and dry-run support.

**Input:**
```typescript
{
  workflow: string;        // Workflow name
  input: object;           // Input data
  dryRun?: boolean;        // Preview execution plan
}
```

**Example:**
```
execute_workflow({
  workflow: "order-processing",
  input: { orderId: "ORD-123", customerId: "CUST-456" }
})
```

## Available Resources

### workflow://{name}

Returns full workflow details as JSON.

**Example URI:** `workflow://order-processing`

### workflow://{name}/schema

Returns JSON Schema for workflow input validation.

**Example URI:** `workflow://order-processing/schema`

## Available Prompts

### discover-workflow

Help the user find the right workflow for their task.

**Arguments:**
- `intent` (required): What the user wants to accomplish

### execute-workflow

Guide the user through workflow execution with input validation.

**Arguments:**
- `workflow` (required): Workflow name
- `partialInput` (optional): JSON string of partial input

### troubleshoot-execution

Help diagnose and fix a failed execution.

**Arguments:**
- `executionId` (required): The failed execution ID
- `workflowName` (required): Workflow name
- `error` (required): Error message

## Example Interactions

### Discovery Flow

```
User: "I need to process a customer order"

AI: [Uses search_workflows tool]
    Found "order-processing" workflow (95% match)

    This workflow processes customer orders end-to-end including:
    - Fetching order details
    - Validating payment
    - Processing fulfillment

    Required inputs:
    - orderId (string): The order identifier
    - customerId (string): Customer ID

    Would you like to execute this workflow?
```

### Auto-Execute Flow

```
User: "Get the profile for user 3"

AI: [Uses search_workflows with autoExecute=true, context={userId: "3"}]
    → Best match: user-profile (95% confidence)
    → Can auto-execute: Yes
    → Extracted inputs: { userId: "3" }

AI: [Uses execute_workflow with input={userId: "3"}]
    → Success!

AI: "Here's the profile for user 3:
     - Name: John Doe
     - Email: john@example.com"
```

### Validation Error Handling

```
User: "Run order-processing with orderId ORD-123"

AI: [Uses execute_workflow with input={orderId: "ORD-123"}]
    → Validation error: Missing required input

AI: "I need one more piece of information to process this order.

    Missing: customerId (string) - The customer ID

    What is the customer ID for this order?"
```

## Development

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

### Coverage

```bash
npm run test:coverage
```

## Architecture

```
src/
├── index.ts                    # MCP server entry point
├── tools/
│   ├── list-workflows.ts       # list_workflows tool
│   ├── search-workflows.ts     # search_workflows tool
│   ├── get-workflow-details.ts # get_workflow_details tool
│   └── execute-workflow.ts     # execute_workflow tool
├── resources/
│   └── workflow-resource.ts    # workflow:// resources
├── prompts/
│   └── workflow-prompts.ts     # MCP prompts
├── services/
│   └── consumer-gateway-client.ts  # Gateway API client
└── types.ts                    # Shared type definitions
```

## License

MIT
