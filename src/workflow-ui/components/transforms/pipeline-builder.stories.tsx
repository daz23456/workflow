import type { Meta, StoryObj } from '@storybook/react';
import { ReactFlow, Background, Controls, MiniMap, Panel, type Node, type Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

/**
 * PipelineBuilder is a React Flow-based visual transform pipeline builder.
 *
 * Features:
 * - React Flow canvas with zoom/pan
 * - Operation nodes displayed sequentially
 * - Animated edges between operations
 * - Mini map for navigation
 * - Empty state message
 * - Keyboard shortcuts (Delete, Cmd+Z)
 *
 * Note: This is a visual-only story since the actual component uses Zustand store.
 */

interface PipelineBuilderVisualProps {
  operations: Array<{ operation: string }>;
}

function OperationNode({ data }: { data: { label: string } }) {
  return (
    <div className="px-4 py-2 border-2 border-gray-300 rounded-lg bg-white hover:border-blue-500">
      <div className="font-medium text-gray-900">{data.label}</div>
    </div>
  );
}

const nodeTypes = { operation: OperationNode };

function PipelineBuilderVisual({ operations }: PipelineBuilderVisualProps) {
  const nodes: Node[] = operations.map((op, index) => ({
    id: `operation-${index}`,
    type: 'operation',
    position: { x: 250, y: index * 150 + 50 },
    data: { label: op.operation },
  }));

  const edges: Edge[] = operations.slice(0, -1).map((_, i) => ({
    id: `edge-${i}`,
    source: `operation-${i}`,
    target: `operation-${i + 1}`,
    type: 'smoothstep',
    animated: true,
  }));

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
      >
        <Background />
        <Controls />
        <MiniMap />
        {operations.length === 0 && (
          <Panel position="top-center">
            <div className="bg-white border border-gray-300 rounded-lg px-6 py-4 shadow-sm">
              <p className="text-gray-600 text-sm">Drag operations here to build your pipeline</p>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

const meta = {
  title: 'Transforms/PipelineBuilder',
  component: PipelineBuilderVisual,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="h-[500px] w-full border">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PipelineBuilderVisual>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Empty pipeline - ready for operations
 */
export const Empty: Story = {
  args: {
    operations: [],
  },
};

/**
 * Simple pipeline with 3 operations
 */
export const SimplePipeline: Story = {
  args: {
    operations: [
      { operation: 'filter' },
      { operation: 'select' },
      { operation: 'sortBy' },
    ],
  },
};

/**
 * Complex ETL pipeline
 */
export const ComplexPipeline: Story = {
  args: {
    operations: [
      { operation: 'filter' },
      { operation: 'map' },
      { operation: 'flatMap' },
      { operation: 'groupBy' },
      { operation: 'aggregate' },
      { operation: 'sortBy' },
      { operation: 'limit' },
    ],
  },
};

/**
 * Data transformation pipeline
 */
export const TransformPipeline: Story = {
  args: {
    operations: [
      { operation: 'select' },
      { operation: 'enrich' },
      { operation: 'map' },
    ],
  },
};

/**
 * Aggregation pipeline
 */
export const AggregationPipeline: Story = {
  args: {
    operations: [
      { operation: 'filter' },
      { operation: 'groupBy' },
      { operation: 'aggregate' },
    ],
  },
};

/**
 * Pagination pipeline
 */
export const PaginationPipeline: Story = {
  args: {
    operations: [
      { operation: 'sortBy' },
      { operation: 'skip' },
      { operation: 'limit' },
    ],
  },
};
