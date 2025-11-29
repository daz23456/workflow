'use client';

import { useState, useMemo } from 'react';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useTemplates } from '@/lib/api/queries';
import { filterTemplates, extractUniqueTags, type TemplateFilters } from '@/types/template';
import { TemplateCard } from './template-card';
import { TemplateFiltersComponent } from './template-filters';

export function TemplateBrowser() {
  const [filters, setFilters] = useState<TemplateFilters>({});
  const { data, isLoading, error } = useTemplates();

  // Extract available tags from all templates
  const availableTags = useMemo(() => {
    if (!data?.templates) return [];
    return extractUniqueTags(data.templates);
  }, [data]);

  // Filter templates client-side
  const filteredTemplates = useMemo(() => {
    if (!data?.templates) return [];
    return filterTemplates(data.templates, filters);
  }, [data?.templates, filters]);

  const handleDeploy = (templateName: string) => {
    // Navigate to workflow builder with template parameter
    window.location.href = `/workflows/new?template=${encodeURIComponent(templateName)}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-900 mb-1">Failed to load templates</h3>
            <p className="text-sm text-red-700">
              {error instanceof Error ? error.message : 'An unknown error occurred'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // No templates
  if (!data?.templates || data.templates.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">No templates available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Filters Sidebar */}
      <div className="lg:col-span-1">
        <TemplateFiltersComponent
          filters={filters}
          onFiltersChange={setFilters}
          availableTags={availableTags}
        />
      </div>

      {/* Templates Grid */}
      <div className="lg:col-span-3">
        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredTemplates.length} of {data.templates.length} templates
        </div>

        {/* Templates */}
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-2">No templates match your filters</p>
            <button
              onClick={() => setFilters({})}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.name}
                template={template}
                onDeploy={handleDeploy}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
