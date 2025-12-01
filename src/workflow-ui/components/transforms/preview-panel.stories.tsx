import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { AlertCircle, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * PreviewPanel displays transformed data output with pagination.
 *
 * Features:
 * - Paginated data display
 * - Page size selector
 * - Record count display
 * - Error messages display
 * - Warning messages display
 * - JSON formatted output
 *
 * Note: This is a visual-only story since the actual component uses Zustand store.
 */

interface PreviewPanelVisualProps {
  outputData: unknown[];
  errors?: string[];
  warnings?: string[];
}

function PreviewPanelVisual({ outputData, errors = [], warnings = [] }: PreviewPanelVisualProps) {
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const totalRecords = outputData.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  const startIdx = page * pageSize;
  const endIdx = Math.min(startIdx + pageSize, totalRecords);
  const pageData = outputData.slice(startIdx, endIdx);

  return (
    <div className="h-full flex flex-col space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Preview</h3>
          <p className="text-sm text-gray-600">
            {totalRecords} record{totalRecords !== 1 ? 's' : ''}
          </p>
        </div>

        {totalRecords > 0 && (
          <div className="flex items-center gap-2">
            <label htmlFor="page-size" className="text-sm text-gray-700">
              Page size:
            </label>
            <select
              id="page-size"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
            </select>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700 px-2">
                {startIdx + 1}-{endIdx} of {totalRecords}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {errors.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <div>
            {errors.map((error, idx) => (
              <p key={idx} className="text-sm text-red-900">{error}</p>
            ))}
          </div>
        </div>
      )}

      {warnings.length > 0 && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <div>
            {warnings.map((warning, idx) => (
              <p key={idx} className="text-sm text-yellow-900">{warning}</p>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        {totalRecords === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <p>No preview data available</p>
          </div>
        ) : (
          <pre className="bg-gray-50 rounded-lg p-4 text-sm font-mono overflow-auto">
            {JSON.stringify(pageData, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

const meta = {
  title: 'Transforms/PreviewPanel',
  component: PreviewPanelVisual,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="w-[500px] h-[400px] border rounded-lg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PreviewPanelVisual>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockData = [
  { id: 1, name: 'Alice', email: 'alice@example.com', active: true },
  { id: 2, name: 'Bob', email: 'bob@example.com', active: false },
  { id: 3, name: 'Charlie', email: 'charlie@example.com', active: true },
  { id: 4, name: 'Diana', email: 'diana@example.com', active: true },
  { id: 5, name: 'Eve', email: 'eve@example.com', active: false },
];

/**
 * Default with data
 */
export const Default: Story = {
  args: {
    outputData: mockData,
  },
};

/**
 * Empty state - no data
 */
export const Empty: Story = {
  args: {
    outputData: [],
  },
};

/**
 * With validation errors
 */
export const WithErrors: Story = {
  args: {
    outputData: mockData,
    errors: ['Invalid JSONPath expression: $.invalid[', 'Field "email" not found in source data'],
  },
};

/**
 * With validation warnings
 */
export const WithWarnings: Story = {
  args: {
    outputData: mockData,
    warnings: ['3 records had null values for "status" field', 'Performance may degrade with large datasets'],
  },
};

/**
 * Many records (pagination)
 */
export const ManyRecords: Story = {
  args: {
    outputData: Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      score: Math.floor(Math.random() * 100),
    })),
  },
};

/**
 * Complex nested data
 */
export const ComplexData: Story = {
  args: {
    outputData: [
      {
        id: 1,
        user: { name: 'Alice', profile: { avatar: 'url', bio: 'Developer' } },
        orders: [{ id: 'ord-1', total: 99.99 }, { id: 'ord-2', total: 149.99 }],
        metadata: { lastLogin: '2024-01-15', tier: 'premium' },
      },
      {
        id: 2,
        user: { name: 'Bob', profile: { avatar: 'url', bio: 'Designer' } },
        orders: [{ id: 'ord-3', total: 49.99 }],
        metadata: { lastLogin: '2024-01-14', tier: 'basic' },
      },
    ],
  },
};
