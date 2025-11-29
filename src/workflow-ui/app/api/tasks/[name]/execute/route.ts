import { NextRequest, NextResponse } from 'next/server';
import { executeTask } from '@/lib/api/client';

/**
 * POST /api/tasks/[name]/execute
 * Execute a task standalone (proxied to backend)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    // Parse request body
    const body = await request.json();

    // Call backend API to execute task
    const backendResponse = await executeTask(name, body);

    // Return response directly (no transformation needed)
    return NextResponse.json(backendResponse);
  } catch (error) {
    console.error('Error executing task:', error);

    // Handle errors
    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Failed to execute task', message: error.message },
        { status: 500 }
      );
    }

    // Unknown error
    return NextResponse.json(
      { error: 'Failed to execute task', message: 'An unknown error occurred' },
      { status: 500 }
    );
  }
}
