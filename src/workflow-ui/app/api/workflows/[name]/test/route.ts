import { NextRequest, NextResponse } from 'next/server';
import { testWorkflow } from '@/lib/api/client';

/**
 * POST /api/workflows/{name}/test
 * Test/dry-run a workflow with given input (proxied to backend)
 * Returns validation results and execution plan without actually executing
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

    // Call backend API to test workflow (dry-run)
    const backendResponse = await testWorkflow(name, {
      input: requestBody,
    });

    // Return response directly (no transformation needed)
    return NextResponse.json(backendResponse);
  } catch (error) {
    console.error('Error testing workflow:', error);

    // Handle specific HTTP error codes from backend
    if (error instanceof Error) {
      const message = error.message;

      // Check for not found error (HTTP 404)
      if (message.includes('404')) {
        return NextResponse.json(
          { error: 'Workflow not found', message: `Workflow '${name}' not found` },
          { status: 404 }
        );
      }

      // Generic server error
      return NextResponse.json(
        { error: 'Test failed', message: message },
        { status: 500 }
      );
    }

    // Unknown error
    return NextResponse.json(
      { error: 'Test failed', message: 'An unknown error occurred' },
      { status: 500 }
    );
  }
}
