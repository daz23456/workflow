import { NextRequest, NextResponse } from 'next/server';
import { listTasks } from '@/lib/api/client';

/**
 * GET /api/tasks
 * Get list of all available workflow tasks (proxied to backend)
 */
export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const namespace = searchParams.get('namespace') || undefined;
    const search = searchParams.get('search') || undefined;
    const skip = searchParams.get('skip') ? parseInt(searchParams.get('skip')!, 10) : undefined;
    const take = searchParams.get('take') ? parseInt(searchParams.get('take')!, 10) : undefined;

    // Call backend API to list tasks
    const backendResponse = await listTasks({ namespace, search, skip, take });

    // Return response directly (no transformation needed)
    return NextResponse.json(backendResponse);
  } catch (error) {
    console.error('Error fetching tasks:', error);

    // Handle errors
    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Failed to fetch tasks', message: error.message },
        { status: 500 }
      );
    }

    // Unknown error
    return NextResponse.json(
      { error: 'Failed to fetch tasks', message: 'An unknown error occurred' },
      { status: 500 }
    );
  }
}
