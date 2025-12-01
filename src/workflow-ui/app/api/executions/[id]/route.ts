import { NextRequest, NextResponse } from 'next/server';
import { getExecutionDetail } from '@/lib/api/client';
import type { WorkflowExecutionResponse, TaskExecutionDetail } from '@/types/execution';

/**
 * GET /api/executions/{id}
 * Get detailed execution information (proxied to backend)
 * Transforms DetailedWorkflowExecutionResponse to WorkflowExecutionResponse format
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    // Call backend API to get execution details
    const backendResponse = await getExecutionDetail(id);

    // Transform DetailedWorkflowExecutionResponse to WorkflowExecutionResponse format
    // that the ExecutionResultPanel expects
    const transformedResponse: WorkflowExecutionResponse = {
      executionId: backendResponse.executionId,
      workflowName: backendResponse.workflowName,
      success: backendResponse.status === 'Succeeded',
      input: backendResponse.input || backendResponse.inputSnapshot,
      output: backendResponse.output || backendResponse.outputSnapshot || {},
      tasks: (backendResponse.tasks || []).map((task): TaskExecutionDetail => ({
        taskId: task.taskId,
        taskRef: task.taskRef,
        status: task.success ? 'success' : 'failed',
        startedAt: task.startedAt,
        completedAt: task.completedAt,
        durationMs: task.durationMs || 0,
        output: task.output,
        error: task.errors?.join('; '),
        retryCount: task.retryCount,
      })),
      executionTimeMs: backendResponse.durationMs || 0,
      graphBuildDurationMicros: backendResponse.graphBuildDurationMicros,
      startedAt: backendResponse.startedAt,
      completedAt: backendResponse.completedAt,
      error: backendResponse.errors?.join('; '),
    };

    return NextResponse.json(transformedResponse);
  } catch (error) {
    console.error('Error fetching execution:', error);

    // Handle specific HTTP error codes from backend
    if (error instanceof Error) {
      const message = error.message;

      // Check for not found error (HTTP 404)
      if (message.includes('404')) {
        return NextResponse.json(
          { error: 'Execution not found', message: `Execution '${id}' not found` },
          { status: 404 }
        );
      }

      // Generic server error
      return NextResponse.json(
        { error: 'Failed to fetch execution', message: message },
        { status: 500 }
      );
    }

    // Unknown error
    return NextResponse.json(
      { error: 'Failed to fetch execution', message: 'An unknown error occurred' },
      { status: 500 }
    );
  }
}
