import { NextRequest, NextResponse } from 'next/server';
import { getExecutionDetail } from '@/lib/api/client';

/**
 * GET /api/executions/{id}
 * Get detailed execution information (proxied to backend)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    // Call backend API to get execution details
    const backendResponse = await getExecutionDetail(id);

    // Return response directly (no transformation needed)
    return NextResponse.json(backendResponse);
  } catch (error) {
    console.error('Error fetching execution:', error);

    // Handle specific HTTP error codes from backend
    if (error instanceof Error) {
      const message = error.message;

      // Check for not found error (HTTP 404)
      if (message.includes('404')) {
        return NextResponse.json(
          { error: 'Execution not found', message: `Execution '${id}' not found` },
          { status: 404 }
        );
      }

      // Generic server error
      return NextResponse.json(
        { error: 'Failed to fetch execution', message: message },
        { status: 500 }
      );
    }

    // Unknown error
    return NextResponse.json(
      { error: 'Failed to fetch execution', message: 'An unknown error occurred' },
      { status: 500 }
    );
  }
}
