'use client';

import { useState } from 'react';
import { Clock, Layers, Zap } from 'lucide-react';
import type { TemplateListItem } from '@/types/template';
import { TemplateCategoryInfo, TemplateDifficultyInfo } from '@/types/template';
import { TemplatePreview } from './template-preview';

interface TemplateCardProps {
  template: TemplateListItem;
  onDeploy?: (templateName: string) => void;
}

export function TemplateCard({ template, onDeploy }: TemplateCardProps) {
  const [showPreview, setShowPreview] = useState(false);

  const categoryInfo = TemplateCategoryInfo[template.category];
  const difficultyInfo = TemplateDifficultyInfo[template.difficulty];

  const handleDeploy = () => {
    onDeploy?.(template.name);
  };

  return (
    <>
      <div
        data-testid={`template-card-${template.name}`}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
      >
        {/* Header with Category Badge */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{categoryInfo.icon}</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
              <span className={`text-xs px-2 py-1 rounded-full bg-${categoryInfo.color}-100 text-${categoryInfo.color}-700`}>
                {categoryInfo.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-lg">{difficultyInfo.icon}</span>
            <span className={`text-xs font-medium text-${difficultyInfo.color}-600`}>
              {difficultyInfo.label}
            </span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{template.description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {template.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded"
            >
              {tag}
            </span>
          ))}
          {template.tags.length > 4 && (
            <span className="text-xs text-gray-500">+{template.tags.length - 4} more</span>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{template.estimatedSetupTime} min</span>
          </div>
          <div className="flex items-center gap-1">
            <Layers className="w-4 h-4" />
            <span>{template.taskCount} tasks</span>
          </div>
          {template.hasParallelExecution && (
            <div className="flex items-center gap-1 text-blue-600">
              <Zap className="w-4 h-4" />
              <span>Parallel</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={() => setShowPreview(true)}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            Preview
          </button>
          <button
            onClick={handleDeploy}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Deploy
          </button>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <TemplatePreview
          templateName={template.name}
          onClose={() => setShowPreview(false)}
          onDeploy={handleDeploy}
        />
      )}
    </>
  );
}
