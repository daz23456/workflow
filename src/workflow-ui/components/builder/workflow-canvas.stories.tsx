import type { Meta, StoryObj } from '@storybook/react';
import { ReactFlowProvider, ReactFlow, Background, Controls, MiniMap, Panel } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

/**
 * WorkflowCanvas is the main interactive canvas for building workflows.
 *
 * Features:
 * - Drag-and-drop node repositioning
 * - Edge creation (connect nodes)
 * - Keyboard shortcuts (Delete, Undo, Redo)
 * - Empty state when no nodes
 * - Zoom, pan, and minimap controls
 *
 * Note: The actual component uses Zustand store. These stories demonstrate
 * the visual states without the store integration.
 */
const meta = {
  title: 'Builder/WorkflowCanvas',
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const CanvasWrapper = ({ children }: { children: React.ReactNode }) => (
  <div style={{ width: '100%', height: '600px' }}>
    <ReactFlowProvider>
      {children}
    </ReactFlowProvider>
  </div>
);

// Mock node component for stories
const MockNode = ({ data }: { data: { label: string; taskRef: string; description?: string; validation?: 'valid' | 'warning' | 'error' } }) => (
  <div className={`relative px-4 py-3 rounded-lg border-2 bg-white shadow-md min-w-[180px] ${
    data.validation === 'error' ? 'border-red-300' :
    data.validation === 'warning' ? 'border-yellow-300' :
    'border-green-300'
  }`}>
    <div className={`absolute -top-2 -right-2 rounded-full p-1 ${
      data.validation === 'error' ? 'bg-red-500' :
      data.validation === 'warning' ? 'bg-yellow-500' :
      'bg-green-500'
    }`}>
      <div className="w-4 h-4 text-white flex items-center justify-center">
        {data.validation === 'error' ? '!' : data.validation === 'warning' ? '!' : '✓'}
      </div>
    </div>
    <div className="font-semibold text-gray-900 text-sm mb-1">{data.label}</div>
    <div className="text-xs text-gray-500 font-mono">{data.taskRef}</div>
    {data.description && (
      <div className="text-xs text-gray-600 mt-2 border-t border-gray-200 pt-2">{data.description}</div>
    )}
  </div>
);

const nodeTypes = { task: MockNode };

/**
 * Empty canvas with getting started message
 */
export const Empty: Story = {
  render: () => (
    <CanvasWrapper>
      <ReactFlow nodes={[]} edges={[]} nodeTypes={nodeTypes} fitView>
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap />
        <Panel position="top-center">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Get Started</h3>
            <p className="text-sm text-gray-600">
              Drag and drop tasks from the palette on the left to create your workflow
            </p>
          </div>
        </Panel>
      </ReactFlow>
    </CanvasWrapper>
  ),
};

/**
 * Canvas with a simple linear workflow
 */
export const LinearWorkflow: Story = {
  render: () => {
    const nodes = [
      { id: '1', type: 'task', position: { x: 250, y: 50 }, data: { label: 'Validate Input', taskRef: 'validator-task', description: 'Validates user input', validation: 'valid' as const } },
      { id: '2', type: 'task', position: { x: 250, y: 200 }, data: { label: 'Fetch User', taskRef: 'user-service-task', description: 'Fetches user data', validation: 'valid' as const } },
      { id: '3', type: 'task', position: { x: 250, y: 350 }, data: { label: 'Send Email', taskRef: 'email-service-task', description: 'Sends notification', validation: 'valid' as const } },
    ];
    const edges = [
      { id: 'e1-2', source: '1', target: '2', type: 'smoothstep', animated: true },
      { id: 'e2-3', source: '2', target: '3', type: 'smoothstep', animated: true },
    ];
    return (
      <CanvasWrapper>
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
          <Background color="#aaa" gap={16} />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </CanvasWrapper>
    );
  },
};

/**
 * Canvas with parallel tasks
 */
export const ParallelWorkflow: Story = {
  render: () => {
    const nodes = [
      { id: '1', type: 'task', position: { x: 250, y: 50 }, data: { label: 'Validate', taskRef: 'validator-task', validation: 'valid' as const } },
      { id: '2', type: 'task', position: { x: 50, y: 200 }, data: { label: 'Fetch Users', taskRef: 'user-service', validation: 'valid' as const } },
      { id: '3', type: 'task', position: { x: 250, y: 200 }, data: { label: 'Fetch Orders', taskRef: 'order-service', validation: 'valid' as const } },
      { id: '4', type: 'task', position: { x: 450, y: 200 }, data: { label: 'Fetch Products', taskRef: 'product-service', validation: 'valid' as const } },
      { id: '5', type: 'task', position: { x: 250, y: 350 }, data: { label: 'Aggregate', taskRef: 'aggregator-task', validation: 'valid' as const } },
    ];
    const edges = [
      { id: 'e1-2', source: '1', target: '2', type: 'smoothstep', animated: true },
      { id: 'e1-3', source: '1', target: '3', type: 'smoothstep', animated: true },
      { id: 'e1-4', source: '1', target: '4', type: 'smoothstep', animated: true },
      { id: 'e2-5', source: '2', target: '5', type: 'smoothstep', animated: true },
      { id: 'e3-5', source: '3', target: '5', type: 'smoothstep', animated: true },
      { id: 'e4-5', source: '4', target: '5', type: 'smoothstep', animated: true },
    ];
    return (
      <CanvasWrapper>
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
          <Background color="#aaa" gap={16} />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </CanvasWrapper>
    );
  },
};

/**
 * Canvas with validation errors
 */
export const WithValidationErrors: Story = {
  render: () => {
    const nodes = [
      { id: '1', type: 'task', position: { x: 250, y: 50 }, data: { label: 'Validate', taskRef: 'validator-task', description: 'Input validation', validation: 'valid' as const } },
      { id: '2', type: 'task', position: { x: 250, y: 200 }, data: { label: 'Process', taskRef: 'processor-task', validation: 'warning' as const } },
      { id: '3', type: 'task', position: { x: 250, y: 350 }, data: { label: 'New Task', taskRef: '', validation: 'error' as const } },
    ];
    const edges = [
      { id: 'e1-2', source: '1', target: '2', type: 'smoothstep', animated: true },
      { id: 'e2-3', source: '2', target: '3', type: 'smoothstep', animated: true },
    ];
    return (
      <CanvasWrapper>
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
          <Background color="#aaa" gap={16} />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </CanvasWrapper>
    );
  },
};

/**
 * Complex workflow with many nodes
 */
export const ComplexWorkflow: Story = {
  render: () => {
    const nodes = [
      { id: '1', type: 'task', position: { x: 300, y: 0 }, data: { label: 'Start', taskRef: 'start-task', validation: 'valid' as const } },
      { id: '2', type: 'task', position: { x: 300, y: 100 }, data: { label: 'Auth', taskRef: 'auth-task', validation: 'valid' as const } },
      { id: '3', type: 'task', position: { x: 100, y: 200 }, data: { label: 'Fetch A', taskRef: 'fetch-a', validation: 'valid' as const } },
      { id: '4', type: 'task', position: { x: 300, y: 200 }, data: { label: 'Fetch B', taskRef: 'fetch-b', validation: 'valid' as const } },
      { id: '5', type: 'task', position: { x: 500, y: 200 }, data: { label: 'Fetch C', taskRef: 'fetch-c', validation: 'valid' as const } },
      { id: '6', type: 'task', position: { x: 200, y: 300 }, data: { label: 'Process AB', taskRef: 'process-ab', validation: 'valid' as const } },
      { id: '7', type: 'task', position: { x: 400, y: 300 }, data: { label: 'Process C', taskRef: 'process-c', validation: 'valid' as const } },
      { id: '8', type: 'task', position: { x: 300, y: 400 }, data: { label: 'Merge', taskRef: 'merge-task', validation: 'valid' as const } },
      { id: '9', type: 'task', position: { x: 300, y: 500 }, data: { label: 'Notify', taskRef: 'notify-task', validation: 'valid' as const } },
    ];
    const edges = [
      { id: 'e1-2', source: '1', target: '2', type: 'smoothstep', animated: true },
      { id: 'e2-3', source: '2', target: '3', type: 'smoothstep', animated: true },
      { id: 'e2-4', source: '2', target: '4', type: 'smoothstep', animated: true },
      { id: 'e2-5', source: '2', target: '5', type: 'smoothstep', animated: true },
      { id: 'e3-6', source: '3', target: '6', type: 'smoothstep', animated: true },
      { id: 'e4-6', source: '4', target: '6', type: 'smoothstep', animated: true },
      { id: 'e5-7', source: '5', target: '7', type: 'smoothstep', animated: true },
      { id: 'e6-8', source: '6', target: '8', type: 'smoothstep', animated: true },
      { id: 'e7-8', source: '7', target: '8', type: 'smoothstep', animated: true },
      { id: 'e8-9', source: '8', target: '9', type: 'smoothstep', animated: true },
    ];
    return (
      <CanvasWrapper>
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView>
          <Background color="#aaa" gap={16} />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </CanvasWrapper>
    );
  },
};

/**
 * Single node on canvas
 */
export const SingleNode: Story = {
  render: () => {
    const nodes = [
      { id: '1', type: 'task', position: { x: 200, y: 100 }, data: { label: 'Process Data', taskRef: 'processor-task', description: 'Processes incoming data', validation: 'valid' as const } },
    ];
    return (
      <CanvasWrapper>
        <ReactFlow nodes={nodes} edges={[]} nodeTypes={nodeTypes} fitView>
          <Background color="#aaa" gap={16} />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </CanvasWrapper>
    );
  },
};
