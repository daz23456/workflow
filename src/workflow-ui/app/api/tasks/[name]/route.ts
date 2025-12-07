import { NextRequest, NextResponse } from 'next/server';
import { getTaskDetail } from '@/lib/api/client';

/**
 * GET /api/tasks/[name]
 * Get detailed information about a specific task (proxied to backend)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;

    // Call backend API to get task details
    const backendResponse = await getTaskDetail(name);

    // Return response directly (no transformation needed)
    return NextResponse.json(backendResponse);
  } catch (error) {
    console.error('Error fetching task detail:', error);

    // Handle errors - check for 404/not found
    if (error instanceof Error) {
      const isNotFound =
        error.message.includes('404') ||
        error.message.toLowerCase().includes('not found');

      if (isNotFound) {
        return NextResponse.json(
          { error: 'Task not found', message: error.message },
          { status: 404 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch task detail', message: error.message },
        { status: 500 }
      );
    }

    // Unknown error
    return NextResponse.json(
      { error: 'Failed to fetch task detail', message: 'An unknown error occurred' },
      { status: 500 }
    );
  }
}
