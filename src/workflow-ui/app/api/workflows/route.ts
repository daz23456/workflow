import { NextRequest, NextResponse } from 'next/server';
import { listWorkflows } from '@/lib/api/client';

/**
 * GET /api/workflows
 * List all workflows (proxied to backend)
 */
export async function GET(request: NextRequest) {
  try {
    // Get namespace query parameter if provided
    const searchParams = request.nextUrl.searchParams;
    const namespace = searchParams.get('namespace') || undefined;

    // Call backend API
    const response = await listWorkflows(namespace);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching workflows:', error);

    // Return appropriate error response
    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Failed to fetch workflows', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch workflows', message: 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
