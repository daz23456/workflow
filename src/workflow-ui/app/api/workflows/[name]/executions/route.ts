import { NextRequest, NextResponse } from 'next/server';
import { listWorkflowExecutions } from '@/lib/api/client';
import type { ExecutionStatus } from '@/lib/api/types';

/**
 * GET /api/workflows/{name}/executions
 * List workflow executions (proxied to backend)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const namespace = searchParams.get('namespace') || undefined;
    const status = (searchParams.get('status') as ExecutionStatus | null) || undefined;

    // Support both skip/take and offset/limit parameter names
    const skip = searchParams.get('skip') || searchParams.get('offset');
    const take = searchParams.get('take') || searchParams.get('limit');

    const skipNum = skip ? parseInt(skip) : undefined;
    const takeNum = take ? parseInt(take) : undefined;

    // Call backend API
    const response = await listWorkflowExecutions(name, {
      namespace,
      status,
      skip: skipNum,
      take: takeNum,
    });

    // Return full response object (executions array + total count)
    return NextResponse.json(response);
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
