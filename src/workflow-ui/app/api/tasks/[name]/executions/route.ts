import { NextRequest, NextResponse } from 'next/server';
import { getTaskExecutions } from '@/lib/api/client';

/**
 * GET /api/tasks/[name]/executions
 * Get execution history for a specific task (proxied to backend)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    // Get pagination params from query
    const searchParams = request.nextUrl.searchParams;
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '20');

    // Call backend API to get task executions
    const backendResponse = await getTaskExecutions(name, skip, take);

    // Return response directly (no transformation needed)
    return NextResponse.json(backendResponse);
  } catch (error) {
    console.error('Error fetching task executions:', error);

    // Handle errors
    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Failed to fetch task executions', message: error.message },
        { status: 500 }
      );
    }

    // Unknown error
    return NextResponse.json(
      { error: 'Failed to fetch task executions', message: 'An unknown error occurred' },
      { status: 500 }
    );
  }
}
