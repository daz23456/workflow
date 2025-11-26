import { NextRequest, NextResponse } from 'next/server';
import { getWorkflowDetail } from '@/lib/api/client';
import { transformWorkflowDetail } from '@/lib/api/transformers';

/**
 * GET /api/workflows/{name}
 * Get workflow details (proxied to backend)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;

    // Call backend API
    const backendResponse = await getWorkflowDetail(name);

    // Transform backend response to match frontend expectations
    const workflow = transformWorkflowDetail(backendResponse);

    return NextResponse.json(workflow);
  } catch (error) {
    console.error('Error fetching workflow:', error);

    // Check if it's a 404 error
    if (error instanceof Error && error.message.includes('404')) {
      return NextResponse.json(
        { error: 'Workflow not found', message: `Workflow not found` },
        { status: 404 }
      );
    }

    // Return appropriate error response
    if (error instanceof Error) {
      return NextResponse.json(
        { error: 'Failed to fetch workflow', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch workflow', message: 'Unknown error occurred' },
      { status: 500 }
    );
  }
}
