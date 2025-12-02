# Stage 15: MCP Server for External Workflow Consumption

## Overview

**Scope:** Enable external chatbots and AI assistants to discover and execute workflows via Model Context Protocol
**Deliverables:** 5 substages
**Tests:** ~50 tests
**Dependencies:** Stages 7 (API Gateway), 9.2 (Templates), 14 (Optimization Engine)
**Package:** `packages/workflow-mcp-consumer` (new, separate from Stage 13)
**Value:** "Let any chatbot use your workflows" - democratize workflow access beyond internal users

**Philosophy:** External users (via chatbots) should be able to explore, understand, and invoke workflows without reading documentation. The MCP server provides rich metadata that enables LLMs to reason about which workflow to use and how to use it.

**Key Distinction from Stage 13:** Stage 13 is about *creating* workflows (internal, developer-focused). Stage 15 is about *consuming* existing workflows (external, end-user focused via chatbots).

---

## Stage Execution Framework Compliance

### Substage Profiles & Gates

| Substage | Profile | Gates | Rationale |
|----------|---------|-------|-----------|
| 15.1 | `BACKEND_DOTNET` | 1-8 | .NET metadata enrichment, new API endpoints |
| 15.2 | `FRONTEND_TS` | 1-8, 15 | TypeScript MCP tools, E2E tests |
| 15.3 | `FRONTEND_TS` | 1-8, 15 | Execution tool with structured errors |
| 15.4 | `FRONTEND_TS` | 1-8 | MCP resources and prompts |
| 15.5 | `FRONTEND_TS` | 1-8, 15 | Integration, documentation, E2E |

### Execution Commands

```bash
# Stage 15.1: Backend Metadata Enrichment
./scripts/init-stage.sh --stage 15.1 --name "Metadata Enrichment" --profile BACKEND_DOTNET
./scripts/run-quality-gates.sh --stage 15.1 1 2 3 4 5 6 7 8
./scripts/complete-stage.sh --stage 15.1 --name "Metadata Enrichment"

# Stage 15.2: MCP Discovery Tools
./scripts/init-stage.sh --stage 15.2 --name "MCP Discovery Tools" --profile FRONTEND_TS
./scripts/run-quality-gates.sh --stage 15.2 1 2 3 4 5 6 7 8 15
./scripts/complete-stage.sh --stage 15.2 --name "MCP Discovery Tools"

# Stage 15.3: MCP Execution Tool
./scripts/init-stage.sh --stage 15.3 --name "MCP Execution Tool" --profile FRONTEND_TS
./scripts/run-quality-gates.sh --stage 15.3 1 2 3 4 5 6 7 8 15
./scripts/complete-stage.sh --stage 15.3 --name "MCP Execution Tool"

# Stage 15.4: MCP Resources & Prompts
./scripts/init-stage.sh --stage 15.4 --name "MCP Resources Prompts" --profile FRONTEND_TS
./scripts/run-quality-gates.sh --stage 15.4 1 2 3 4 5 6 7 8
./scripts/complete-stage.sh --stage 15.4 --name "MCP Resources Prompts"

# Stage 15.5: Integration & Documentation
./scripts/init-stage.sh --stage 15.5 --name "Integration Docs" --profile FRONTEND_TS
./scripts/run-quality-gates.sh --stage 15.5 1 2 3 4 5 6 7 8 15
./scripts/complete-stage.sh --stage 15.5 --name "Integration Docs"
```

### Dependencies & Integration

**Dependencies Satisfied (from prior stages):**
- Stage 7: API Gateway (execution endpoints)
- Stage 9.2: Workflow Templates Library (template metadata)
- Stage 14: Optimization Engine (performance suggestions)

**Enables Future Stages:**
- Stage 16: OpenAPI Task Generator (workflow ecosystem expansion)
- Stage 17+: API marketplace, multi-tenant workflow sharing

---

## Design Decisions

| Decision | Choice |
|----------|--------|
| Protocol | Model Context Protocol (MCP) |
| Transport | stdio (Claude Desktop), Streamable HTTP (web chatbots) |
| Package | `packages/workflow-mcp-consumer` |
| Auto-execute | Feature flag with confidence threshold (≥0.8) |
| Input extraction | LLM extracts from user context |
| Error responses | Structured with suggested prompts |

---

## Execution Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| `autoExecute: false` | Show ranked options, user confirms, gather inputs interactively | Exploration, unfamiliar workflows |
| `autoExecute: true` | Auto-select best match if confidence ≥0.8 AND all inputs available | Quick actions, familiar patterns |

### Auto-Execute Flow

```
User: "Get me the profile for user 3"

┌─────────────────────────────────────────────────────────────────┐
│ 1. LLM calls search_workflows                                    │
│    Input: { query: "user profile", autoExecute: true,           │
│             context: { userId: "3" } }                           │
├─────────────────────────────────────────────────────────────────┤
│ 2. MCP Server returns                                            │
│    { bestMatch: { workflow: "user-profile",                     │
│                   confidence: 0.95,                              │
│                   canAutoExecute: true,                          │
│                   extractedInputs: { userId: "3" } } }          │
├─────────────────────────────────────────────────────────────────┤
│ 3. LLM calls execute_workflow                                    │
│    Input: { workflow: "user-profile", input: { userId: "3" } }  │
├─────────────────────────────────────────────────────────────────┤
│ 4. MCP Server returns                                            │
│    { success: true, output: { name: "Clementine", ... } }       │
├─────────────────────────────────────────────────────────────────┤
│ 5. LLM presents result to user                                   │
│    "Here's the profile for user 3: Name: Clementine Bauch..."   │
└─────────────────────────────────────────────────────────────────┘
```

### Fallback to Interactive Mode

```
User: "Send a notification"

┌─────────────────────────────────────────────────────────────────┐
│ 1. search_workflows with autoExecute: true                       │
│    → confidence: 0.6 (below threshold)                          │
│    → canAutoExecute: false (missing required inputs)            │
├─────────────────────────────────────────────────────────────────┤
│ 2. LLM falls back to interactive mode                            │
│    "I found several notification workflows:                      │
│     1. send-email-notification                                   │
│     2. send-slack-notification                                   │
│     3. send-push-notification                                    │
│     Which one would you like? And I'll need the recipient..."   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Stage 15.1: Backend Metadata Enrichment

**Goal:** Enhance workflow and task metadata for LLM consumption

### Deliverables

1. **Extended WorkflowSpec Fields**
   - `categories`: Array of category strings (e.g., ["user-management", "notifications"])
   - `tags`: Array of searchable tags (e.g., ["read-only", "fast", "external-api"])
   - `examples`: Array of example inputs with descriptions
   - `estimatedDuration`: Typical execution time hint
   - `permissions`: Required permissions/scopes

2. **Structured Input Validation Response**
   - `MissingInputsResult` model with field-level details
   - Field names, types, descriptions, examples
   - Suggested prompt for gathering missing inputs

3. **New API Endpoint**
   - `POST /api/v1/workflows/{name}/validate-input`
   - Validates input without executing
   - Returns structured validation result

4. **Updated Existing APIs**
   - `GET /api/v1/workflows` - Include enriched metadata
   - `GET /api/v1/workflows/{name}` - Full metadata with examples

### Extended WorkflowSpec

```yaml
apiVersion: workflow.io/v1
kind: Workflow
metadata:
  name: user-profile
  labels:
    workflow.io/category: user-management
spec:
  # Standard fields...
  description: "Fetch user profile with related data"

  # NEW: Enriched metadata for LLM consumption
  categories:
    - user-management
    - read-only

  tags:
    - fast
    - no-side-effects
    - external-api

  examples:
    - name: "Basic lookup"
      description: "Fetch profile by user ID"
      input:
        userId: "123"
      expectedOutput:
        name: "John Doe"
        email: "john@example.com"

    - name: "With options"
      description: "Fetch profile with related orders"
      input:
        userId: "123"
        includeOrders: true

  estimatedDuration: "500ms"

  permissions:
    - users:read
```

### MissingInputsResult Model

```csharp
public class MissingInputsResult
{
    public bool IsValid { get; set; }
    public List<MissingInput> MissingInputs { get; set; }
    public List<InvalidInput> InvalidInputs { get; set; }
    public string SuggestedPrompt { get; set; }
}

public class MissingInput
{
    public string Field { get; set; }
    public string Type { get; set; }
    public string Description { get; set; }
    public bool Required { get; set; }
    public object DefaultValue { get; set; }
    public object Example { get; set; }
}

public class InvalidInput
{
    public string Field { get; set; }
    public object ProvidedValue { get; set; }
    public string ExpectedType { get; set; }
    public string ErrorMessage { get; set; }
    public object SuggestedValue { get; set; }
}
```

### API Response Example

```json
// POST /api/v1/workflows/user-profile/validate-input
// Body: { "userId": null }

{
  "isValid": false,
  "missingInputs": [
    {
      "field": "userId",
      "type": "string",
      "description": "The unique identifier of the user",
      "required": true,
      "example": "123"
    }
  ],
  "invalidInputs": [],
  "suggestedPrompt": "Please provide the user ID. For example: '123' or 'user-abc'"
}
```

### Critical Files
- `src/WorkflowCore/Models/WorkflowMetadata.cs` (extend)
- `src/WorkflowCore/Models/MissingInputsResult.cs` (new)
- `src/WorkflowGateway/Controllers/WorkflowValidationController.cs` (new)
- `src/WorkflowGateway/Services/InputValidationService.cs` (new)

### TDD Approach

```csharp
[Fact]
public void WorkflowMetadata_ShouldIncludeCategories()

[Fact]
public void WorkflowMetadata_ShouldIncludeTags()

[Fact]
public void WorkflowMetadata_ShouldIncludeExamples()

[Fact]
public void InputValidation_ShouldReturnMissingInputs()

[Fact]
public void InputValidation_ShouldReturnInvalidInputs()

[Fact]
public void InputValidation_ShouldGenerateSuggestedPrompt()

[Fact]
public void InputValidation_ShouldPassValidInput()

[Fact]
public void WorkflowsApi_ShouldReturnEnrichedMetadata()
```

### TDD Targets
- 20+ tests for metadata and validation

### Artifacts
- `stage-proofs/stage-15.1/reports/coverage/`
- `stage-proofs/stage-15.1/reports/test-results/`

---

## Stage 15.2: MCP Tools for Workflow Discovery

**Goal:** Implement MCP tools for discovering and searching workflows

### Deliverables

1. **`list_workflows` Tool**
   - Returns all workflows with rich metadata
   - Categories, tags, input summary, execution stats
   - Pagination support for large catalogs

2. **`search_workflows` Tool**
   - Query by keywords or natural language intent
   - Ranked matches with confidence scores
   - Category and tag filtering
   - `autoExecute` mode with input extraction

3. **`get_workflow_details` Tool**
   - Full schema, examples, required inputs
   - Execution history summary
   - Related workflows (same category/tags)

### Tool Definitions

```typescript
// list_workflows tool
{
  name: "list_workflows",
  description: "List all available workflows with metadata",
  inputSchema: {
    type: "object",
    properties: {
      category: {
        type: "string",
        description: "Filter by category"
      },
      tags: {
        type: "array",
        items: { type: "string" },
        description: "Filter by tags (AND)"
      },
      limit: {
        type: "number",
        description: "Max results (default 20)"
      },
      offset: {
        type: "number",
        description: "Pagination offset"
      }
    }
  }
}

// search_workflows tool
{
  name: "search_workflows",
  description: "Search workflows by query or intent",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query or natural language intent"
      },
      autoExecute: {
        type: "boolean",
        description: "Enable auto-execution mode (returns best match with confidence)"
      },
      context: {
        type: "object",
        description: "User context for input extraction (e.g., { userId: '3' })"
      },
      category: {
        type: "string",
        description: "Filter by category"
      },
      minConfidence: {
        type: "number",
        description: "Minimum confidence threshold (default 0.5)"
      }
    },
    required: ["query"]
  }
}

// get_workflow_details tool
{
  name: "get_workflow_details",
  description: "Get full details for a specific workflow",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Workflow name"
      },
      includeExamples: {
        type: "boolean",
        description: "Include usage examples (default true)"
      },
      includeStats: {
        type: "boolean",
        description: "Include execution statistics (default false)"
      }
    },
    required: ["name"]
  }
}
```

### Response Structures

```typescript
// list_workflows response
interface ListWorkflowsResponse {
  workflows: WorkflowSummary[];
  total: number;
  offset: number;
  limit: number;
}

interface WorkflowSummary {
  name: string;
  description: string;
  categories: string[];
  tags: string[];
  inputSummary: string;  // e.g., "userId (required), includeOrders (optional)"
  estimatedDuration: string;
  lastExecuted?: string;
  executionCount?: number;
}

// search_workflows response
interface SearchWorkflowsResponse {
  matches: WorkflowMatch[];
  // Auto-execute mode additions
  bestMatch?: {
    workflow: string;
    confidence: number;
    canAutoExecute: boolean;
    extractedInputs?: Record<string, unknown>;
    missingInputs?: string[];
  };
}

interface WorkflowMatch {
  workflow: WorkflowSummary;
  confidence: number;
  matchedTerms: string[];
  relevanceReason: string;
}

// get_workflow_details response
interface WorkflowDetailsResponse {
  name: string;
  description: string;
  categories: string[];
  tags: string[];
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
  examples: WorkflowExample[];
  relatedWorkflows: string[];
  stats?: {
    totalExecutions: number;
    successRate: number;
    avgDuration: string;
    p95Duration: string;
  };
}
```

### Critical Files
- `packages/workflow-mcp-consumer/src/tools/list-workflows.ts` (new)
- `packages/workflow-mcp-consumer/src/tools/search-workflows.ts` (new)
- `packages/workflow-mcp-consumer/src/tools/get-workflow-details.ts` (new)
- `packages/workflow-mcp-consumer/src/services/workflow-search.ts` (new)
- `packages/workflow-mcp-consumer/src/services/input-extractor.ts` (new)

### TDD Approach

```typescript
describe('list_workflows', () => {
  it('should return all workflows with metadata')
  it('should filter by category')
  it('should filter by tags')
  it('should paginate results')
})

describe('search_workflows', () => {
  it('should return ranked matches')
  it('should calculate confidence scores')
  it('should filter by category')
  it('should extract inputs from context in autoExecute mode')
  it('should return canAutoExecute=true when all inputs available')
  it('should return canAutoExecute=false when inputs missing')
  it('should return missingInputs when partially extractable')
  it('should respect minConfidence threshold')
})

describe('get_workflow_details', () => {
  it('should return full workflow schema')
  it('should include examples')
  it('should include related workflows')
  it('should include stats when requested')
})
```

### TDD Targets
- 18+ tests for discovery tools

### Artifacts
- `stage-proofs/stage-15.2/reports/coverage/`
- `stage-proofs/stage-15.2/reports/test-results/`
- `stage-proofs/stage-15.2/reports/playwright/` (E2E)

---

## Stage 15.3: MCP Tool for Workflow Execution

**Goal:** Implement MCP tool for executing workflows with structured responses

### Deliverables

1. **`execute_workflow` Tool**
   - Execute workflow with provided inputs
   - Structured success response
   - Structured error responses (validation, execution)
   - Suggested prompts for error recovery

### Tool Definition

```typescript
{
  name: "execute_workflow",
  description: "Execute a workflow with provided inputs",
  inputSchema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Workflow name to execute"
      },
      input: {
        type: "object",
        description: "Input values for the workflow"
      },
      dryRun: {
        type: "boolean",
        description: "Validate without executing (default false)"
      },
      timeout: {
        type: "string",
        description: "Execution timeout (e.g., '30s', '5m')"
      }
    },
    required: ["name", "input"]
  }
}
```

### Response Structures

```typescript
// Success response
interface ExecutionSuccessResponse {
  success: true;
  executionId: string;
  workflow: string;
  output: Record<string, unknown>;
  duration: string;
  taskResults: TaskResult[];
}

interface TaskResult {
  name: string;
  status: "completed" | "skipped";
  duration: string;
  output?: Record<string, unknown>;
}

// Validation failure response
interface ValidationFailureResponse {
  success: false;
  error: "validation";
  workflow: string;
  missingInputs: MissingInput[];
  invalidInputs: InvalidInput[];
  suggestedPrompt: string;
}

// Execution failure response
interface ExecutionFailureResponse {
  success: false;
  error: "execution";
  executionId: string;
  workflow: string;
  failedTask: string;
  errorMessage: string;
  errorCode?: string;
  partialOutput?: Record<string, unknown>;
  completedTasks: string[];
  suggestedAction: string;
}
```

### Error Response Examples

```json
// Validation failure
{
  "success": false,
  "error": "validation",
  "workflow": "send-email",
  "missingInputs": [
    {
      "field": "recipient",
      "type": "string",
      "description": "Email address of the recipient",
      "required": true,
      "example": "user@example.com"
    }
  ],
  "invalidInputs": [
    {
      "field": "priority",
      "providedValue": "urgent",
      "expectedType": "enum",
      "errorMessage": "Must be one of: low, medium, high",
      "suggestedValue": "high"
    }
  ],
  "suggestedPrompt": "Please provide the recipient email address. Also, did you mean 'high' instead of 'urgent' for priority?"
}

// Execution failure
{
  "success": false,
  "error": "execution",
  "executionId": "exec-abc123",
  "workflow": "fetch-user-data",
  "failedTask": "get-user-orders",
  "errorMessage": "HTTP 404: User orders not found",
  "errorCode": "NOT_FOUND",
  "partialOutput": {
    "user": { "id": "123", "name": "John" }
  },
  "completedTasks": ["get-user-profile"],
  "suggestedAction": "The user exists but has no orders. You may want to proceed without order data or verify the user ID."
}
```

### Critical Files
- `packages/workflow-mcp-consumer/src/tools/execute-workflow.ts` (new)
- `packages/workflow-mcp-consumer/src/services/execution-handler.ts` (new)
- `packages/workflow-mcp-consumer/src/models/execution-response.ts` (new)

### TDD Approach

```typescript
describe('execute_workflow', () => {
  it('should execute workflow successfully')
  it('should return structured output')
  it('should include task results')
  it('should return validation error with missing inputs')
  it('should return validation error with invalid inputs')
  it('should generate suggested prompt for validation errors')
  it('should return execution error with failed task')
  it('should include partial output on failure')
  it('should suggest action for execution errors')
  it('should support dry-run mode')
})
```

### TDD Targets
- 10+ tests for execution tool

### Artifacts
- `stage-proofs/stage-15.3/reports/coverage/`
- `stage-proofs/stage-15.3/reports/test-results/`
- `stage-proofs/stage-15.3/reports/playwright/` (E2E)

---

## Stage 15.4: MCP Resources & Prompts

**Goal:** Implement MCP resources and prompts for enhanced LLM interaction

### Deliverables

1. **MCP Resources**
   - `workflow://{name}` - Workflow overview
   - `workflow://{name}/schema` - Full input/output schema
   - `workflow://{name}/examples` - Usage examples
   - `workflow://{name}/stats` - Execution statistics

2. **MCP Prompts**
   - `discover-workflow` - Guide user through workflow selection
   - `execute-workflow` - Guide through execution with validation
   - `troubleshoot-execution` - Debug failed executions

### Resource Definitions

```typescript
// Resource templates
{
  resources: [
    {
      uriTemplate: "workflow://{name}",
      name: "Workflow Overview",
      description: "Get overview of a specific workflow",
      mimeType: "application/json"
    },
    {
      uriTemplate: "workflow://{name}/schema",
      name: "Workflow Schema",
      description: "Get input/output schema for a workflow",
      mimeType: "application/json"
    },
    {
      uriTemplate: "workflow://{name}/examples",
      name: "Workflow Examples",
      description: "Get usage examples for a workflow",
      mimeType: "application/json"
    },
    {
      uriTemplate: "workflow://{name}/stats",
      name: "Workflow Statistics",
      description: "Get execution statistics for a workflow",
      mimeType: "application/json"
    }
  ]
}
```

### Prompt Definitions

```typescript
{
  prompts: [
    {
      name: "discover-workflow",
      description: "Help user find the right workflow for their task",
      arguments: [
        {
          name: "intent",
          description: "What the user wants to accomplish",
          required: true
        },
        {
          name: "context",
          description: "Any additional context (e.g., user ID, data type)",
          required: false
        }
      ]
    },
    {
      name: "execute-workflow",
      description: "Guide user through executing a workflow",
      arguments: [
        {
          name: "workflow",
          description: "Name of the workflow to execute",
          required: true
        },
        {
          name: "partialInput",
          description: "Any inputs already known",
          required: false
        }
      ]
    },
    {
      name: "troubleshoot-execution",
      description: "Help debug a failed workflow execution",
      arguments: [
        {
          name: "executionId",
          description: "ID of the failed execution",
          required: true
        }
      ]
    }
  ]
}
```

### Prompt Response Examples

```typescript
// discover-workflow prompt response
{
  messages: [
    {
      role: "user",
      content: {
        type: "text",
        text: "I want to find a workflow for: ${intent}\nContext: ${context}"
      }
    },
    {
      role: "assistant",
      content: {
        type: "text",
        text: `Based on your intent, here are the most relevant workflows:

1. **user-profile** (95% match)
   - Description: Fetch user profile with related data
   - Required inputs: userId
   - Estimated time: ~500ms

2. **user-summary** (78% match)
   - Description: Get aggregated user statistics
   - Required inputs: userId, timeRange
   - Estimated time: ~2s

Would you like to proceed with one of these, or should I search for something else?`
      }
    }
  ]
}
```

### Critical Files
- `packages/workflow-mcp-consumer/src/resources/workflow-resource.ts` (new)
- `packages/workflow-mcp-consumer/src/prompts/discover-prompt.ts` (new)
- `packages/workflow-mcp-consumer/src/prompts/execute-prompt.ts` (new)
- `packages/workflow-mcp-consumer/src/prompts/troubleshoot-prompt.ts` (new)

### TDD Approach

```typescript
describe('MCP Resources', () => {
  it('should return workflow overview')
  it('should return full schema')
  it('should return examples')
  it('should return stats')
  it('should handle unknown workflow')
})

describe('MCP Prompts', () => {
  it('should generate discover-workflow prompt')
  it('should generate execute-workflow prompt')
  it('should generate troubleshoot-execution prompt')
  it('should include relevant context in prompts')
})
```

### TDD Targets
- 10+ tests for resources and prompts

### Artifacts
- `stage-proofs/stage-15.4/reports/coverage/`
- `stage-proofs/stage-15.4/reports/test-results/`

---

## Stage 15.5: Integration & Documentation

**Goal:** Complete integration, documentation, and E2E testing

### Deliverables

1. **Claude Desktop Configuration**
   - Configuration example for stdio transport
   - Step-by-step setup guide
   - Troubleshooting guide

2. **Streamable HTTP Transport**
   - HTTP transport for web-based chatbots
   - Server-Sent Events for long-running operations
   - CORS configuration

3. **Documentation**
   - README with quick start
   - Tool reference documentation
   - Example conversations
   - Troubleshooting guide

4. **E2E Integration Tests**
   - Full discover → execute flow
   - Auto-execute mode scenarios
   - Error handling scenarios

### Claude Desktop Configuration

```json
// claude_desktop_config.json
{
  "mcpServers": {
    "workflow-consumer": {
      "command": "npx",
      "args": [
        "-y",
        "@workflow/mcp-consumer"
      ],
      "env": {
        "WORKFLOW_API_URL": "http://localhost:5000",
        "WORKFLOW_API_KEY": "${WORKFLOW_API_KEY}"
      }
    }
  }
}
```

### HTTP Transport Setup

```typescript
// server.ts
import { createServer } from '@workflow/mcp-consumer';

const server = createServer({
  transport: 'http',
  port: 3001,
  cors: {
    origin: ['https://chatbot.example.com'],
    credentials: true
  },
  auth: {
    type: 'bearer',
    validateToken: async (token) => {
      // Validate API key
      return isValidToken(token);
    }
  }
});

server.listen();
```

### Example Conversations

```markdown
## Example 1: Simple Query

**User:** What workflows do you have?

**Assistant:** I have access to several workflows:

1. **user-profile** - Fetch user profile with related data
   - Category: user-management
   - Inputs: userId (required)

2. **send-notification** - Send notification to user
   - Category: notifications
   - Inputs: userId, message, channel

3. **generate-report** - Generate analytics report
   - Category: analytics
   - Inputs: reportType, dateRange

Would you like details on any of these?

---

## Example 2: Auto-Execute

**User:** Get me the profile for user 3

**Assistant:** Here's the profile for user 3:

- **Name:** Clementine Bauch
- **Email:** Nathan@yesenia.net
- **Phone:** 1-463-123-4447
- **Company:** Romaguera-Jacobson

Is there anything specific you'd like to know about this user?

---

## Example 3: Validation Error

**User:** Send a notification

**Assistant:** I can help you send a notification. I need a few more details:

1. **User ID** (required) - Who should receive this notification?
2. **Message** (required) - What message should be sent?
3. **Channel** (optional) - Email, SMS, or Push? (default: Email)

Please provide the user ID and message.
```

### Critical Files
- `packages/workflow-mcp-consumer/src/index.ts` (main entry)
- `packages/workflow-mcp-consumer/src/transports/stdio.ts` (new)
- `packages/workflow-mcp-consumer/src/transports/http.ts` (new)
- `packages/workflow-mcp-consumer/README.md` (new)
- `packages/workflow-mcp-consumer/docs/tool-reference.md` (new)
- `packages/workflow-mcp-consumer/docs/troubleshooting.md` (new)

### TDD Approach

```typescript
describe('E2E Integration', () => {
  it('should complete discover → select → execute flow')
  it('should handle auto-execute with high confidence')
  it('should fallback to interactive on low confidence')
  it('should handle validation errors gracefully')
  it('should handle execution errors with suggestions')
})

describe('HTTP Transport', () => {
  it('should handle tool calls over HTTP')
  it('should stream responses with SSE')
  it('should validate bearer tokens')
  it('should handle CORS correctly')
})
```

### TDD Targets
- 5+ E2E tests for full integration

### Artifacts
- `stage-proofs/stage-15.5/reports/coverage/`
- `stage-proofs/stage-15.5/reports/test-results/`
- `stage-proofs/stage-15.5/reports/playwright/` (E2E)

---

## MCP Server Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    MCP Consumer Server                           │
├─────────────────────────────────────────────────────────────────┤
│  Transport Layer                                                 │
│  ┌─────────────┐  ┌─────────────┐                              │
│  │    stdio    │  │    HTTP     │                              │
│  │ (Claude)    │  │ (Web bots)  │                              │
│  └──────┬──────┘  └──────┬──────┘                              │
│         │                │                                      │
│         └───────┬────────┘                                      │
│                 ▼                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │               MCP Protocol Handler                        │   │
│  │  - Tool registration                                      │   │
│  │  - Resource handler                                       │   │
│  │  - Prompt handler                                         │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                              │                                   │
│  ┌───────────────────────────┼───────────────────────────────┐  │
│  │                           ▼                                │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │  │
│  │  │   Tools     │  │  Resources  │  │     Prompts     │   │  │
│  │  ├─────────────┤  ├─────────────┤  ├─────────────────┤   │  │
│  │  │ list_       │  │ workflow:// │  │ discover-       │   │  │
│  │  │ workflows   │  │ {name}      │  │ workflow        │   │  │
│  │  │             │  │             │  │                 │   │  │
│  │  │ search_     │  │ workflow:// │  │ execute-        │   │  │
│  │  │ workflows   │  │ {name}/     │  │ workflow        │   │  │
│  │  │             │  │ schema      │  │                 │   │  │
│  │  │ get_        │  │             │  │ troubleshoot-   │   │  │
│  │  │ workflow_   │  │ workflow:// │  │ execution       │   │  │
│  │  │ details     │  │ {name}/     │  │                 │   │  │
│  │  │             │  │ examples    │  │                 │   │  │
│  │  │ execute_    │  │             │  │                 │   │  │
│  │  │ workflow    │  │             │  │                 │   │  │
│  │  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘   │  │
│  │         │                │                   │            │  │
│  └─────────┼────────────────┼───────────────────┼────────────┘  │
│            │                │                   │                │
│            └────────────────┼───────────────────┘                │
│                             ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Workflow API Client                          │   │
│  │  - GET /api/v1/workflows                                  │   │
│  │  - GET /api/v1/workflows/{name}                           │   │
│  │  - POST /api/v1/workflows/{name}/validate-input           │   │
│  │  - POST /api/v1/workflows/{name}/execute                  │   │
│  └──────────────────────────┬──────────────────────────────┘   │
│                              │                                   │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  WorkflowGateway    │
                    │  (Stage 7)          │
                    └─────────────────────┘
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Workflow discovery accuracy | >90% |
| Input validation clarity | 100% (always includes description) |
| Execution success rate | >95% (after valid input) |
| Response latency (discovery) | <500ms |
| Response latency (execution) | <5s (p95) |
| Auto-execute accuracy | >85% when confidence ≥0.8 |
| Test coverage | ≥90% |

---

## TDD Targets Summary

| Substage | Tests |
|----------|-------|
| 15.1 Backend Metadata Enrichment | 20+ |
| 15.2 MCP Discovery Tools | 18+ |
| 15.3 MCP Execution Tool | 10+ |
| 15.4 MCP Resources & Prompts | 10+ |
| 15.5 Integration & Documentation | 5+ |
| **Total** | **~50+ tests** |

**Coverage Target:** 90%+ overall

---

## Value Delivered

**To the Project:**
> Stage 15 transforms the workflow engine from an internal tool to an externally consumable platform. Any AI assistant or chatbot can now discover, understand, and execute workflows through a standardized protocol. This opens up the platform to a much wider audience beyond developers.

**To Users:**
> "I just asked my chatbot to 'get user 3's profile' and it instantly found the right workflow, extracted the user ID, and returned the data. No documentation reading, no API exploration - just natural language. And when I made a mistake, it told me exactly what was wrong and how to fix it."

**Business Value:**
> - **Democratizes workflow access** - Non-technical users can leverage workflows
> - **Reduces integration effort** - Standard MCP protocol, works with any MCP client
> - **Improves user experience** - Natural language interaction, helpful error messages
> - **Enables new use cases** - Customer support bots, internal assistants, automation
> - **Future-proof** - MCP is becoming the standard for AI tool integration
