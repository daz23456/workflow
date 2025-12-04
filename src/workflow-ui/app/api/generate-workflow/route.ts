/**
 * API Route: AI Workflow Generation
 *
 * Uses Anthropic SDK to generate workflows from natural language
 */

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const GATEWAY_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:5001/api/v1';

interface GenerateRequest {
  intent: string;
  useLLM?: boolean;
}

interface Task {
  name: string;
  type?: string;
  description?: string | null;
}

type WorkflowPattern = 'sequential' | 'parallel' | 'diamond' | 'complex';

// Build system prompt with available tasks
function buildSystemPrompt(tasks: Task[]): string {
  const taskList = tasks.map(t => `- ${t.name} (${t.type || 'http'})`).join('\n');

  return `You are a workflow generation assistant for a Kubernetes-native workflow orchestration engine.

## Workflow Structure (Kubernetes CRD Format)
Workflows are Kubernetes Custom Resources with this structure:
\`\`\`yaml
apiVersion: workflow.io/v1
kind: Workflow
metadata:
  name: workflow-name
spec:
  description: "What this workflow does"
  input: {}
  output:
    fieldName: "{{ tasks.taskId.output.field }}"
  tasks:
    - id: task-id
      taskRef: task-name
      input: {}
\`\`\`

## Task Structure
Each task in spec.tasks has:
- \`id\`: Unique identifier within workflow (lowercase, hyphens allowed)
- \`taskRef\`: Reference to a WorkflowTask (must be from available tasks below)
- \`input\`: Object mapping task inputs
- \`dependsOn\`: Array of task IDs this task waits for (optional)

## Template Syntax
- \`{{ input.fieldName }}\` - Reference workflow input
- \`{{ tasks.taskId.output.fieldName }}\` - Reference another task's output
- \`{{ tasks.taskId.output }}\` - Reference entire task output

## Available Tasks
${taskList}

## Rules
1. Always use the Kubernetes CRD format with apiVersion, kind, metadata, spec
2. metadata.name is REQUIRED
3. taskRef MUST reference one of the available tasks listed above - NO EXCEPTIONS
4. Use descriptive task IDs (e.g., "fetch-iss", "get-joke")

## CRITICAL: Task Availability
- You can ONLY use tasks from the "Available Tasks" list above
- DO NOT invent, guess, or approximate task names
- DO NOT use similar-sounding tasks that don't exist
- If the user's intent requires tasks that are not available, you MUST refuse

## When Tasks Are Missing
If the required tasks do not exist in the available list, respond with:
\`\`\`yaml
# CANNOT_GENERATE
\`\`\`

Then explain:
1. What tasks would be needed to fulfill the intent
2. Which of those tasks are NOT available
3. Suggest the user create the missing tasks first

## Output Format
Generate valid YAML that can be deployed directly. Always wrap YAML in \`\`\`yaml code blocks.
After the YAML, briefly explain the pattern used (sequential, parallel, or diamond).`;
}

// Detect pattern from YAML
function detectPattern(yaml: string): WorkflowPattern {
  const dependsOnMatches = yaml.match(/dependsOn:/g) || [];
  const taskMatches = yaml.match(/- id:/g) || [];
  const taskCount = taskMatches.length;
  const dependencyCount = dependsOnMatches.length;

  if (dependencyCount === 0 && taskCount > 1) return 'parallel';
  const multipleDepPattern = /dependsOn:\s*\n\s*-[^\n]+\n\s*-/;
  if (multipleDepPattern.test(yaml)) return 'diamond';
  if (dependencyCount === taskCount - 1) return 'sequential';
  if (taskCount > 3) return 'complex';
  return 'sequential';
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();

    if (!body.intent || body.intent.trim().length === 0) {
      return NextResponse.json(
        { error: 'Intent is required' },
        { status: 400 }
      );
    }

    // Fetch available tasks from gateway
    const tasksResponse = await fetch(`${GATEWAY_URL}/tasks`);
    if (!tasksResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch available tasks from gateway' },
        { status: 502 }
      );
    }
    const tasksData = await tasksResponse.json();
    const tasks: Task[] = tasksData.tasks || tasksData;

    // Check for API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error: 'AI generation not configured',
          message: 'Set ANTHROPIC_API_KEY environment variable to enable AI generation'
        },
        { status: 501 }
      );
    }

    // Initialize Anthropic client
    const anthropic = new Anthropic({ apiKey });

    // Build prompt
    const systemPrompt = buildSystemPrompt(tasks);

    // Call Claude
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Generate a workflow for this intent: "${body.intent.trim()}"

Remember to:
1. Use only the available tasks listed in the system prompt
2. Follow the Kubernetes CRD format exactly
3. Return valid YAML wrapped in \`\`\`yaml code blocks
4. Add proper dependencies between tasks if needed`
        }
      ]
    });

    // Extract text from response
    const responseText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('\n');

    // Parse YAML from response
    const yamlMatch = responseText.match(/```yaml\n([\s\S]*?)```/);
    if (!yamlMatch) {
      return NextResponse.json(
        { error: 'LLM response did not contain valid YAML' },
        { status: 500 }
      );
    }

    const yaml = yamlMatch[1].trim();

    // Check if LLM indicated it cannot generate the workflow
    if (yaml.includes('CANNOT_GENERATE')) {
      // Extract the explanation after the yaml block
      const afterYaml = responseText.split('```')[2]?.trim() || '';
      return NextResponse.json(
        {
          error: 'Cannot generate workflow - required tasks not available',
          cannotGenerate: true,
          explanation: afterYaml || 'The requested workflow requires tasks that are not available in the task library.'
        },
        { status: 422 }
      );
    }

    // Validate that all taskRef values exist in available tasks
    const availableTaskNames = new Set(tasks.map(t => t.name));
    const taskRefMatches = yaml.matchAll(/taskRef:\s*([a-z0-9-]+)/g);
    const usedTaskRefs = [...taskRefMatches].map(m => m[1]);
    const invalidTasks = usedTaskRefs.filter(ref => !availableTaskNames.has(ref));

    if (invalidTasks.length > 0) {
      return NextResponse.json(
        {
          error: `Generated workflow references tasks that don't exist: ${invalidTasks.join(', ')}`,
          invalidTasks,
          availableTasks: tasks.map(t => t.name),
          suggestion: 'Try rephrasing your intent or create the missing tasks first.'
        },
        { status: 422 }
      );
    }

    const pattern = detectPattern(yaml);
    const taskCount = (yaml.match(/- id:/g) || []).length;

    // Extract explanation
    const afterYaml = responseText.split('```')[2]?.trim() || '';
    const explanation = afterYaml.split('\n')[0] || `Generated ${pattern} workflow with ${taskCount} tasks`;

    return NextResponse.json({
      yaml,
      explanation,
      taskCount,
      pattern
    });

  } catch (error: any) {
    console.error('AI generation error:', error);

    // Handle specific Anthropic errors
    if (error?.status === 400 && error?.message?.includes('credit')) {
      return NextResponse.json(
        { error: 'Anthropic API credits exhausted. Please check your billing.' },
        { status: 402 }
      );
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to generate workflow. Please try again.' },
      { status: 500 }
    );
  }
}
