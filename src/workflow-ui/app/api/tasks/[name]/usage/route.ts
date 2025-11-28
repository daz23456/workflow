import { NextRequest, NextResponse } from 'next/server';
import { getTaskUsage } from '@/lib/api/client';

/**
 * GET /api/tasks/[name]/usage
 * Get workflows that use a specific task (proxied to backend)
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

    // Call backend API to get task usage
    const backendResponse = await getTaskUsage(name, skip, take);

    // Return response directly (no transformation needed)
    return NextResponse.json(backendResponse);
  } catch (error) {
    console.error('Error fetching task usage:', error);

    // Handle errors
    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Failed to fetch task usage', message: error.message },
        { status: 500 }
      );
    }

    // Unknown error
    return NextResponse.json(
      { error: 'Failed to fetch task usage', message: 'An unknown error occurred' },
      { status: 500 }
    );
  }
}
