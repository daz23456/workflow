import type { Meta, StoryObj } from '@storybook/react';
import { TemplateCard } from './template-card';
import { TemplateFiltersComponent } from './template-filters';
import { TemplateCategory, TemplateDifficulty, type TemplateListItem } from '@/types/template';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Loader2, AlertCircle } from 'lucide-react';

// Create a client for the QueryClientProvider wrapper
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

/**
 * TemplateBrowser composition showing the template browser layout.
 *
 * This story demonstrates the full composition of TemplateBrowser components
 * since the actual TemplateBrowser uses hooks that require app context.
 *
 * Features shown:
 * - Filters sidebar
 * - Template cards grid
 * - Loading state
 * - Error state
 * - Empty state
 */
const meta = {
  title: 'Templates/TemplateBrowser',
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const mockTemplates: TemplateListItem[] = [
  {
    name: 'parallel-api-fetch',
    category: TemplateCategory.ApiComposition,
    difficulty: TemplateDifficulty.Beginner,
    description: 'Fetch data from multiple APIs in parallel and aggregate the results',
    tags: ['parallel', 'http', 'api', 'aggregation'],
    estimatedSetupTime: 5,
    taskCount: 4,
    hasParallelExecution: true,
    namespace: 'default',
  },
  {
    name: 'sequential-pipeline',
    category: TemplateCategory.ApiComposition,
    difficulty: TemplateDifficulty.Beginner,
    description: 'Process data through a sequence of API calls',
    tags: ['sequential', 'http', 'api', 'pipeline'],
    estimatedSetupTime: 5,
    taskCount: 3,
    hasParallelExecution: false,
    namespace: 'default',
  },
  {
    name: 'etl-pipeline',
    category: TemplateCategory.DataProcessing,
    difficulty: TemplateDifficulty.Intermediate,
    description: 'Extract, transform, and load data between systems',
    tags: ['etl', 'transform', 'batch', 'data'],
    estimatedSetupTime: 15,
    taskCount: 6,
    hasParallelExecution: false,
    namespace: 'default',
  },
  {
    name: 'batch-processing',
    category: TemplateCategory.DataProcessing,
    difficulty: TemplateDifficulty.Intermediate,
    description: 'Process large batches of data with parallel execution',
    tags: ['batch', 'parallel', 'data', 'processing'],
    estimatedSetupTime: 20,
    taskCount: 8,
    hasParallelExecution: true,
    namespace: 'default',
  },
  {
    name: 'websocket-stream',
    category: TemplateCategory.RealTime,
    difficulty: TemplateDifficulty.Advanced,
    description: 'Process real-time data streams with WebSocket connections',
    tags: ['websocket', 'streaming', 'real-time', 'event-driven'],
    estimatedSetupTime: 25,
    taskCount: 8,
    hasParallelExecution: true,
    namespace: 'default',
  },
  {
    name: 'slack-notification',
    category: TemplateCategory.Integrations,
    difficulty: TemplateDifficulty.Beginner,
    description: 'Send notifications to Slack channels',
    tags: ['slack', 'notification', 'webhook', 'integration'],
    estimatedSetupTime: 10,
    taskCount: 3,
    hasParallelExecution: false,
    namespace: 'default',
  },
];

const availableTags = ['parallel', 'http', 'api', 'etl', 'webhook', 'streaming', 'batch', 'sequential'];

/**
 * Default browser with templates loaded
 */
export const Default: Story = {
  render: () => (
    <QueryClientProvider client={queryClient}>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Workflow Templates</h1>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <TemplateFiltersComponent
              filters={{}}
              onFiltersChange={(filters) => console.log('Filters:', filters)}
              availableTags={availableTags}
            />
          </div>
          <div className="lg:col-span-3">
            <div className="mb-4 text-sm text-gray-600">
              Showing {mockTemplates.length} of {mockTemplates.length} templates
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {mockTemplates.map((template) => (
                <TemplateCard
                  key={template.name}
                  template={template}
                  onDeploy={(name) => console.log('Deploy:', name)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  ),
};

/**
 * Loading state
 */
export const Loading: Story = {
  render: () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Workflow Templates</h1>
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading templates...</p>
        </div>
      </div>
    </div>
  ),
};

/**
 * Error state
 */
export const Error: Story = {
  render: () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Workflow Templates</h1>
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-red-900 mb-1">Failed to load templates</h3>
            <p className="text-sm text-red-700">Network error: Unable to connect to server</p>
          </div>
        </div>
      </div>
    </div>
  ),
};

/**
 * Empty state - no templates available
 */
export const Empty: Story = {
  render: () => (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Workflow Templates</h1>
      <div className="text-center py-12">
        <p className="text-gray-600">No templates available</p>
      </div>
    </div>
  ),
};

/**
 * No matching results after filtering
 */
export const NoResults: Story = {
  render: () => (
    <QueryClientProvider client={queryClient}>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Workflow Templates</h1>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <TemplateFiltersComponent
              filters={{
                category: TemplateCategory.RealTime,
                difficulty: TemplateDifficulty.Beginner,
              }}
              onFiltersChange={(filters) => console.log('Filters:', filters)}
              availableTags={availableTags}
            />
          </div>
          <div className="lg:col-span-3">
            <div className="mb-4 text-sm text-gray-600">
              Showing 0 of {mockTemplates.length} templates
            </div>
            <div className="text-center py-12">
              <p className="text-gray-600 mb-2">No templates match your filters</p>
              <button className="text-blue-600 hover:text-blue-700 font-medium">
                Clear filters
              </button>
            </div>
          </div>
        </div>
      </div>
    </QueryClientProvider>
  ),
};

/**
 * Filtered view - API Composition only
 */
export const FilteredByCategory: Story = {
  render: () => {
    const filtered = mockTemplates.filter((t) => t.category === TemplateCategory.ApiComposition);
    return (
      <QueryClientProvider client={queryClient}>
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Workflow Templates</h1>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
              <TemplateFiltersComponent
                filters={{ category: TemplateCategory.ApiComposition }}
                onFiltersChange={(filters) => console.log('Filters:', filters)}
                availableTags={availableTags}
              />
            </div>
            <div className="lg:col-span-3">
              <div className="mb-4 text-sm text-gray-600">
                Showing {filtered.length} of {mockTemplates.length} templates
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map((template) => (
                  <TemplateCard
                    key={template.name}
                    template={template}
                    onDeploy={(name) => console.log('Deploy:', name)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </QueryClientProvider>
    );
  },
};
