import { NextRequest, NextResponse } from 'next/server';
import { mockTemplateList } from '@/lib/mocks/templates';

/**
 * GET /api/templates - List all workflow templates
 *
 * Query parameters:
 * - search: Search in name, description, or tags
 * - category: Filter by TemplateCategory
 * - difficulty: Filter by TemplateDifficulty
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const search = searchParams.get('search')?.toLowerCase();
  const category = searchParams.get('category');
  const difficulty = searchParams.get('difficulty');

  // Filter templates
  let filtered = [...mockTemplateList];

  // Apply search filter
  if (search) {
    filtered = filtered.filter(
      (t) =>
        t.name.toLowerCase().includes(search) ||
        t.description.toLowerCase().includes(search) ||
        t.tags.some((tag) => tag.toLowerCase().includes(search))
    );
  }

  // Apply category filter
  if (category) {
    filtered = filtered.filter((t) => t.category === category);
  }

  // Apply difficulty filter
  if (difficulty) {
    filtered = filtered.filter((t) => t.difficulty === difficulty);
  }

  // Sort alphabetically by name
  filtered.sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({
    templates: filtered,
    total: filtered.length,
  });
}
