import { NextRequest, NextResponse } from 'next/server';
import { mockTemplateDetails } from '@/lib/mocks/templates';

/**
 * GET /api/templates/:name - Get template details by name
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;

  const template = mockTemplateDetails[name];

  if (!template) {
    return NextResponse.json({ error: `Template "${name}" not found` }, { status: 404 });
  }

  return NextResponse.json(template);
}
