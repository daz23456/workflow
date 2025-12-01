import type { Meta, StoryObj } from '@storybook/react';
import { TemplateFiltersComponent } from './template-filters';
import { TemplateCategory, TemplateDifficulty, type TemplateFilters } from '@/types/template';

/**
 * TemplateFiltersComponent provides filtering controls for the template browser.
 *
 * Features:
 * - Search input
 * - Category filter buttons
 * - Difficulty filter buttons
 * - Tags toggle buttons
 * - Max setup time slider
 * - Parallel execution checkbox
 * - Clear all filters button
 */
const meta = {
  title: 'Templates/TemplateFilters',
  component: TemplateFiltersComponent,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TemplateFiltersComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

const availableTags = ['parallel', 'http', 'api', 'etl', 'webhook', 'streaming', 'batch', 'caching'];

/**
 * Default state with no filters applied
 */
export const Default: Story = {
  args: {
    filters: {},
    onFiltersChange: (filters) => console.log('Filters changed:', filters),
    availableTags,
  },
};

/**
 * With category filter applied
 */
export const WithCategoryFilter: Story = {
  args: {
    filters: {
      category: TemplateCategory.ApiComposition,
    },
    onFiltersChange: (filters) => console.log('Filters changed:', filters),
    availableTags,
  },
};

/**
 * With difficulty filter applied
 */
export const WithDifficultyFilter: Story = {
  args: {
    filters: {
      difficulty: TemplateDifficulty.Beginner,
    },
    onFiltersChange: (filters) => console.log('Filters changed:', filters),
    availableTags,
  },
};

/**
 * With search term
 */
export const WithSearch: Story = {
  args: {
    filters: {
      search: 'api composition',
    },
    onFiltersChange: (filters) => console.log('Filters changed:', filters),
    availableTags,
  },
};

/**
 * With tags selected
 */
export const WithTags: Story = {
  args: {
    filters: {
      tags: ['parallel', 'http'],
    },
    onFiltersChange: (filters) => console.log('Filters changed:', filters),
    availableTags,
  },
};

/**
 * With max setup time filter
 */
export const WithMaxTime: Story = {
  args: {
    filters: {
      maxEstimatedTime: 15,
    },
    onFiltersChange: (filters) => console.log('Filters changed:', filters),
    availableTags,
  },
};

/**
 * With parallel only filter
 */
export const ParallelOnly: Story = {
  args: {
    filters: {
      parallelOnly: true,
    },
    onFiltersChange: (filters) => console.log('Filters changed:', filters),
    availableTags,
  },
};

/**
 * Multiple filters applied (shows Clear All button)
 */
export const MultipleFilters: Story = {
  args: {
    filters: {
      category: TemplateCategory.DataProcessing,
      difficulty: TemplateDifficulty.Intermediate,
      tags: ['etl', 'batch'],
      maxEstimatedTime: 20,
    },
    onFiltersChange: (filters) => console.log('Filters changed:', filters),
    availableTags,
  },
};

/**
 * No tags available
 */
export const NoTags: Story = {
  args: {
    filters: {},
    onFiltersChange: (filters) => console.log('Filters changed:', filters),
    availableTags: [],
  },
};

/**
 * Many tags available
 */
export const ManyTags: Story = {
  args: {
    filters: {},
    onFiltersChange: (filters) => console.log('Filters changed:', filters),
    availableTags: [
      'parallel',
      'http',
      'api',
      'etl',
      'webhook',
      'streaming',
      'batch',
      'caching',
      'retry',
      'timeout',
      'logging',
      'monitoring',
      'validation',
      'transformation',
    ],
  },
};
