/**
 * Workflow template types - matches C# models in WorkflowGateway/Models
 */

/**
 * Template categories
 */
export enum TemplateCategory {
  ApiComposition = 'ApiComposition',
  DataProcessing = 'DataProcessing',
  RealTime = 'RealTime',
  Integrations = 'Integrations',
}

/**
 * Template difficulty levels
 */
export enum TemplateDifficulty {
  Beginner = 'Beginner',
  Intermediate = 'Intermediate',
  Advanced = 'Advanced',
}

/**
 * Template metadata for list views
 */
export interface TemplateListItem {
  /** Unique template identifier (same as workflow name) */
  name: string;
  /** Template category */
  category: TemplateCategory;
  /** Difficulty level */
  difficulty: TemplateDifficulty;
  /** Human-readable description */
  description: string;
  /** Tags for filtering and search (e.g., "parallel", "http", "api") */
  tags: string[];
  /** Estimated setup time in minutes */
  estimatedSetupTime: number;
  /** Number of tasks in the workflow */
  taskCount: number;
  /** Whether the workflow uses parallel execution */
  hasParallelExecution: boolean;
  /** Kubernetes namespace */
  namespace: string;
}

/**
 * Detailed template information including YAML definition
 */
export interface TemplateDetail extends TemplateListItem {
  /** Full YAML definition of the workflow template */
  yamlDefinition: string;
}

/**
 * Filter criteria for template browsing
 */
export interface TemplateFilters {
  /** Filter by category */
  category?: TemplateCategory;
  /** Filter by difficulty */
  difficulty?: TemplateDifficulty;
  /** Filter by tags (OR logic - matches any tag) */
  tags?: string[];
  /** Search in name, description, or tags */
  search?: string;
  /** Filter by estimated time (in minutes, show templates <= this value) */
  maxEstimatedTime?: number;
  /** Show only templates with parallel execution */
  parallelOnly?: boolean;
}

/**
 * Template browser state
 */
export interface TemplateBrowserState {
  /** All available templates */
  templates: TemplateListItem[];
  /** Currently applied filters */
  filters: TemplateFilters;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error?: string;
  /** Selected template for preview/deployment */
  selectedTemplate?: TemplateDetail;
}

/**
 * Category display metadata
 */
export interface CategoryInfo {
  value: TemplateCategory;
  label: string;
  description: string;
  icon: string; // Emoji or icon class
  color: string; // Tailwind color class
}

/**
 * Difficulty display metadata
 */
export interface DifficultyInfo {
  value: TemplateDifficulty;
  label: string;
  description: string;
  icon: string; // Emoji or icon class
  color: string; // Tailwind color class
  estimatedTimeRange: string; // e.g., "< 10 min"
}

/**
 * Template deployment request
 */
export interface TemplateDeployRequest {
  /** Template name to deploy */
  templateName: string;
  /** Optional: Custom workflow name (defaults to template name) */
  workflowName?: string;
  /** Optional: Custom namespace (defaults to "default") */
  namespace?: string;
  /** Optional: Input parameter values to pre-fill */
  inputValues?: Record<string, string>;
}

/**
 * Helper functions for template categorization
 */
export const TemplateCategoryInfo: Record<TemplateCategory, CategoryInfo> = {
  [TemplateCategory.ApiComposition]: {
    value: TemplateCategory.ApiComposition,
    label: 'API Composition',
    description: 'Parallel fetches, sequential pipelines, conditional branching',
    icon: '🔗',
    color: 'blue',
  },
  [TemplateCategory.DataProcessing]: {
    value: TemplateCategory.DataProcessing,
    label: 'Data Processing',
    description: 'ETL pipelines, batch processing, aggregation',
    icon: '⚙️',
    color: 'purple',
  },
  [TemplateCategory.RealTime]: {
    value: TemplateCategory.RealTime,
    label: 'Real-Time',
    description: 'WebSocket streams, event-driven, polling',
    icon: '⚡',
    color: 'yellow',
  },
  [TemplateCategory.Integrations]: {
    value: TemplateCategory.Integrations,
    label: 'Integrations',
    description: 'Slack, GitHub, payment processing, webhooks',
    icon: '🔌',
    color: 'green',
  },
};

export const TemplateDifficultyInfo: Record<TemplateDifficulty, DifficultyInfo> = {
  [TemplateDifficulty.Beginner]: {
    value: TemplateDifficulty.Beginner,
    label: 'Beginner',
    description: 'Simple workflows, minimal configuration',
    icon: '🟢',
    color: 'green',
    estimatedTimeRange: '< 10 min',
  },
  [TemplateDifficulty.Intermediate]: {
    value: TemplateDifficulty.Intermediate,
    label: 'Intermediate',
    description: 'Moderate complexity, some advanced features',
    icon: '🟡',
    color: 'yellow',
    estimatedTimeRange: '10-20 min',
  },
  [TemplateDifficulty.Advanced]: {
    value: TemplateDifficulty.Advanced,
    label: 'Advanced',
    description: 'Complex workflows, requires deep understanding',
    icon: '🔴',
    color: 'red',
    estimatedTimeRange: '20+ min',
  },
};

/**
 * Get all unique tags from a list of templates
 */
export function extractUniqueTags(templates: TemplateListItem[]): string[] {
  const tagSet = new Set<string>();
  templates.forEach((template) => {
    template.tags.forEach((tag) => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
}

/**
 * Filter templates based on criteria
 */
export function filterTemplates(
  templates: TemplateListItem[],
  filters: TemplateFilters
): TemplateListItem[] {
  return templates.filter((template) => {
    // Category filter
    if (filters.category && template.category !== filters.category) {
      return false;
    }

    // Difficulty filter
    if (filters.difficulty && template.difficulty !== filters.difficulty) {
      return false;
    }

    // Tags filter (OR logic - template must have at least one of the specified tags)
    if (filters.tags && filters.tags.length > 0) {
      const hasMatchingTag = filters.tags.some((filterTag) => template.tags.includes(filterTag));
      if (!hasMatchingTag) {
        return false;
      }
    }

    // Search filter (search in name, description, and tags)
    if (filters.search && filters.search.trim() !== '') {
      const searchLower = filters.search.toLowerCase();
      const matchesName = template.name.toLowerCase().includes(searchLower);
      const matchesDescription = template.description.toLowerCase().includes(searchLower);
      const matchesTags = template.tags.some((tag) => tag.toLowerCase().includes(searchLower));
      if (!matchesName && !matchesDescription && !matchesTags) {
        return false;
      }
    }

    // Estimated time filter
    if (filters.maxEstimatedTime && template.estimatedSetupTime > filters.maxEstimatedTime) {
      return false;
    }

    // Parallel execution filter
    if (filters.parallelOnly && !template.hasParallelExecution) {
      return false;
    }

    return true;
  });
}
