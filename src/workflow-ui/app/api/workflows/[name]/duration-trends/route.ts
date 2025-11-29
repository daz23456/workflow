import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowDurationTrends } from '@/lib/api/client';

/**
 * GET /api/workflows/{name}/duration-trends
 * Get workflow duration trends over time (proxied to backend)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const daysBack = searchParams.get('daysBack') ? parseInt(searchParams.get('daysBack')!) : 30;

    // Validate daysBack parameter
    if (daysBack < 1 || daysBack > 90) {
      return NextResponse.json({ error: 'daysBack must be between 1 and 90' }, { status: 400 });
    }

    // Call backend API
    const response = await getWorkflowDurationTrends(name, daysBack);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching workflow duration trends:', error);

    // Return appropriate error response
    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Failed to fetch duration trends', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch duration trends', message: 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
