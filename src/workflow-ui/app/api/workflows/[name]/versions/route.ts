import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowVersions } from '@/lib/api/client';

/**
 * GET /api/workflows/{name}/versions
 * Get workflow version history (proxied to backend)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  try {
    const { name } = await params;

    // Call backend API
    const response = await getWorkflowVersions(name);

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching workflow versions:', error);

    // Return appropriate error response
    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Failed to fetch workflow versions', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch workflow versions', message: 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
