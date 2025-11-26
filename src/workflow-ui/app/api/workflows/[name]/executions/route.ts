import { NextRequest, NextResponse } from 'next/server';
import { listWorkflowExecutions } from '@/lib/api/client';
import type { ExecutionStatus } from '@/lib/api/types';

/**
 * GET /api/workflows/{name}/executions
 * List workflow executions (proxied to backend)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const namespace = searchParams.get('namespace') || undefined;
    const status = searchParams.get('status') as ExecutionStatus | undefined;
    const skip = searchParams.get('skip') ? parseInt(searchParams.get('skip')!) : undefined;
    const take = searchParams.get('take') ? parseInt(searchParams.get('take')!) : undefined;

    // Call backend API
    const response = await listWorkflowExecutions(name, {
      namespace,
      status,
      skip,
      take,
    });

    // Return executions array for backward compatibility with frontend
    // (frontend expects array, not the full response object)
    return NextResponse.json(response.executions);
  } catch (error) {
    console.error('Error fetching workflow executions:', error);

    // Return appropriate error response
    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Failed to fetch executions', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch executions', message: 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
