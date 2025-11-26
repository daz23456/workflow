import { NextRequest, NextResponse } from 'next/server';
import { executeWorkflow } from '@/lib/api/client';
import { transformExecutionResponse } from '@/lib/api/transformers';

/**
 * POST /api/workflows/{name}/execute
 * Execute a workflow with given input (proxied to backend)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  try {
    // Parse request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }

    // Call backend API to execute workflow
    const backendResponse = await executeWorkflow(name, {
      input: requestBody,
    });

    // Transform backend response to match frontend expectations
    const transformedResponse = transformExecutionResponse(backendResponse);

    return NextResponse.json(transformedResponse);
  } catch (error) {
    console.error('Error executing workflow:', error);

    // Handle specific HTTP error codes from backend
    if (error instanceof Error) {
      const message = error.message;

      // Check for validation error (HTTP 400)
      if (message.includes('400') || message.toLowerCase().includes('validation')) {
        return NextResponse.json(
          { error: 'Validation failed', message },
          { status: 400 }
        );
      }

      // Check for not found error (HTTP 404)
      if (message.includes('404')) {
        return NextResponse.json(
          { error: 'Workflow not found', message: `Workflow '${name}' not found` },
          { status: 404 }
        );
      }

      // Check for timeout error (HTTP 408)
      if (message.includes('408') || message.toLowerCase().includes('timeout')) {
        return NextResponse.json(
          { error: 'Execution timeout', message: 'Workflow execution timeout occurred' },
          { status: 408 }
        );
      }

      // Generic server error
      return NextResponse.json(
        { error: 'Execution failed', message: message },
        { status: 500 }
      );
    }

    // Unknown error
    return NextResponse.json(
      { error: 'Execution failed', message: 'An unknown error occurred' },
      { status: 500 }
    );
  }
}
