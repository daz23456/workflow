/**
 * Neural Network Visualization Page
 *
 * Radial 3D visualization where:
 * - Inputs are at the center of the sphere
 * - Shared tasks merge into single nodes
 * - Outputs fan out to the outer shell
 *
 * Supports two data sources:
 * - Live: Real-time SignalR events from workflow executions
 * - Simulation: Demo mode with fake workflow traffic
 */

'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { NeuralNetworkVisualization } from '../../components/visualization';
import { useVisualizationStore } from '../../lib/visualization';
import {
  WorkflowWebSocketClient,
  type WorkflowStartedEvent,
  type TaskStartedEvent,
  type TaskCompletedEvent,
  type SignalFlowEvent,
} from '../../lib/api/workflow-websocket-client';

// Gateway URL for SignalR connection
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:5001';

type DataSource = 'live' | 'simulation';

// Types
interface WorkflowDefinition {
  id: string;
  name: string;
  namespace: string;
  tasks: TaskDefinition[];
}

interface TaskDefinition {
  id: string;
  label: string;
  type: 'input' | 'process' | 'output';
  dependsOn: string[]; // Labels of tasks this depends on
}

// Demo workflows - tasks reference each other by LABEL for sharing
const DEMO_WORKFLOWS: WorkflowDefinition[] = [
  {
    id: 'wf-user-api',
    name: 'user-api-composition',
    namespace: 'production',
    tasks: [
      { id: 'ua-input', label: 'Input', type: 'input', dependsOn: [] },
      { id: 'ua-validate', label: 'Validate', type: 'process', dependsOn: ['Input'] },
      { id: 'ua-fetch-user', label: 'Fetch User', type: 'process', dependsOn: ['Validate'] },
      { id: 'ua-fetch-prefs', label: 'Fetch Prefs', type: 'process', dependsOn: ['Validate'] },
      { id: 'ua-merge', label: 'Merge Data', type: 'process', dependsOn: ['Fetch User', 'Fetch Prefs'] },
      { id: 'ua-output', label: 'API Response', type: 'output', dependsOn: ['Merge Data'] },
    ],
  },
  {
    id: 'wf-order-process',
    name: 'order-processing',
    namespace: 'production',
    tasks: [
      { id: 'op-input', label: 'Input', type: 'input', dependsOn: [] },
      { id: 'op-validate', label: 'Validate', type: 'process', dependsOn: ['Input'] },
      { id: 'op-inventory', label: 'Check Inventory', type: 'process', dependsOn: ['Validate'] },
      { id: 'op-payment', label: 'Process Payment', type: 'process', dependsOn: ['Validate'] },
      { id: 'op-fulfill', label: 'Fulfill Order', type: 'process', dependsOn: ['Check Inventory', 'Process Payment'] },
      { id: 'op-notify', label: 'Send Notification', type: 'output', dependsOn: ['Fulfill Order'] },
    ],
  },
  {
    id: 'wf-etl-pipeline',
    name: 'data-etl-pipeline',
    namespace: 'data-team',
    tasks: [
      { id: 'etl-input', label: 'Input', type: 'input', dependsOn: [] },
      { id: 'etl-extract', label: 'Extract', type: 'process', dependsOn: ['Input'] },
      { id: 'etl-transform', label: 'Transform', type: 'process', dependsOn: ['Extract'] },
      { id: 'etl-validate', label: 'Validate Data', type: 'process', dependsOn: ['Transform'] },
      { id: 'etl-load', label: 'Load to DB', type: 'output', dependsOn: ['Validate Data'] },
    ],
  },
  {
    id: 'wf-analytics',
    name: 'realtime-analytics',
    namespace: 'data-team',
    tasks: [
      { id: 'an-input', label: 'Input', type: 'input', dependsOn: [] },
      { id: 'an-parse', label: 'Parse Events', type: 'process', dependsOn: ['Input'] },
      { id: 'an-enrich', label: 'Enrich Data', type: 'process', dependsOn: ['Parse Events'] },
      { id: 'an-aggregate', label: 'Aggregate', type: 'process', dependsOn: ['Enrich Data'] },
      { id: 'an-store', label: 'Store Metrics', type: 'output', dependsOn: ['Aggregate'] },
      { id: 'an-alert', label: 'Send Alerts', type: 'output', dependsOn: ['Aggregate'] },
    ],
  },
  {
    id: 'wf-notification',
    name: 'notification-service',
    namespace: 'production',
    tasks: [
      { id: 'ns-input', label: 'Input', type: 'input', dependsOn: [] },
      { id: 'ns-validate', label: 'Validate', type: 'process', dependsOn: ['Input'] },
      { id: 'ns-template', label: 'Load Template', type: 'process', dependsOn: ['Validate'] },
      { id: 'ns-render', label: 'Render Message', type: 'process', dependsOn: ['Load Template'] },
      { id: 'ns-send', label: 'Send Notification', type: 'output', dependsOn: ['Render Message'] },
    ],
  },
  {
    id: 'wf-auth',
    name: 'authentication',
    namespace: 'production',
    tasks: [
      { id: 'auth-input', label: 'Input', type: 'input', dependsOn: [] },
      { id: 'auth-validate', label: 'Validate', type: 'process', dependsOn: ['Input'] },
      { id: 'auth-lookup', label: 'Lookup User', type: 'process', dependsOn: ['Validate'] },
      { id: 'auth-verify', label: 'Verify Credentials', type: 'process', dependsOn: ['Lookup User'] },
      { id: 'auth-token', label: 'Generate Token', type: 'output', dependsOn: ['Verify Credentials'] },
    ],
  },
];

const NAMESPACES = [...new Set(DEMO_WORKFLOWS.map((w) => w.namespace))];

// Calculate spherical position from depth and index (radial layout)
function sphericalPosition(
  depth: number,
  maxDepth: number,
  index: number,
  totalAtDepth: number,
  sphereRadius: number
): { x: number; y: number; z: number } {
  // Radius increases with depth (input at center, output at edge)
  const radius = (depth / maxDepth) * sphereRadius;

  if (depth === 0) {
    // Center node
    return { x: 0, y: 0, z: 0 };
  }

  // Distribute nodes on a sphere at this radius
  // Use golden angle for even distribution
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const theta = goldenAngle * index;
  const phi = Math.acos(1 - 2 * (index + 0.5) / Math.max(totalAtDepth, 1));

  return {
    x: radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
}

// Calculate stacked/vertical position (top to bottom, spread horizontally)
function stackedPosition(
  depth: number,
  maxDepth: number,
  index: number,
  totalAtDepth: number
): { x: number; y: number; z: number } {
  const layerSpacing = 2.5; // Vertical spacing between layers
  const nodeSpacing = 2.0; // Horizontal spacing between nodes

  // Y goes from top (high) to bottom (low) based on depth
  const y = (maxDepth / 2 - depth) * layerSpacing;

  // X spreads nodes horizontally, centered
  const totalWidth = (totalAtDepth - 1) * nodeSpacing;
  const x = -totalWidth / 2 + index * nodeSpacing;

  // Z adds slight depth variation for visual interest
  const z = Math.sin(index * 0.5) * 0.5;

  return { x, y, z };
}

type LayoutMode = 'radial' | 'stacked';

export default function VisualizationPage() {
  // Data source toggle
  const [dataSource, setDataSource] = useState<DataSource>('live');
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsClientRef = useRef<WorkflowWebSocketClient | null>(null);

  // Live mode: dynamically discovered tasks and edges
  const [liveTasks, setLiveTasks] = useState<Map<string, { workflowName: string; status: 'idle' | 'running' | 'succeeded' | 'failed' }>>(new Map());
  const [liveEdges, setLiveEdges] = useState<Map<string, { from: string; to: string }>>(new Map());

  const [layoutMode, setLayoutMode] = useState<LayoutMode>('radial');
  const [showLabels, setShowLabels] = useState(true);
  const [selectedNamespace, setSelectedNamespace] = useState<string>('all');
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('all');
  const [isPaused, setIsPaused] = useState(false);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [sphereRadius, setSphereRadius] = useState(5);
  const [isAutoRunning, setIsAutoRunning] = useState(false);

  const [activeExecutions, setActiveExecutions] = useState(0);
  const [totalSignals, setTotalSignals] = useState(0);

  const autoRunRef = useRef<NodeJS.Timeout | null>(null);

  const addNode = useVisualizationStore((state) => state.addNode);
  const addEdge = useVisualizationStore((state) => state.addEdge);
  const updateNodeStatus = useVisualizationStore((state) => state.updateNodeStatus);
  const triggerSignal = useVisualizationStore((state) => state.triggerSignal);
  const clearGraph = useVisualizationStore((state) => state.clearGraph);
  const nodeSizeMode = useVisualizationStore((state) => state.nodeSizeMode);

  // Generate node ID from task name
  const taskToNodeId = useCallback((taskName: string): string => {
    return `node-${taskName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
  }, []);

  // Calculate position for a dynamically added node
  const calculateDynamicPosition = useCallback((taskName: string, existingCount: number): { x: number; y: number; z: number } => {
    // Use golden angle distribution for even spreading
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const theta = goldenAngle * existingCount;
    const radius = 3 + (existingCount * 0.15); // Gradually expand
    const y = (Math.random() - 0.5) * 4; // Random vertical spread

    return {
      x: radius * Math.cos(theta),
      y,
      z: radius * Math.sin(theta),
    };
  }, []);

  // SignalR connection for Live mode
  useEffect(() => {
    if (dataSource !== 'live') {
      // Disconnect when switching to simulation
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
        wsClientRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    const client = new WorkflowWebSocketClient(`${GATEWAY_URL}/hubs/workflow`);
    wsClientRef.current = client;

    const connect = async () => {
      try {
        setConnectionError(null);
        await client.connect();
        await client.joinVisualizationGroup();
        setIsConnected(true);

        // Handle workflow started - track the workflow
        client.onWorkflowStarted((event: WorkflowStartedEvent) => {
          setActiveExecutions((n) => n + 1);
        });

        // Handle task started - add node if not exists, update status
        client.onTaskStarted((event: TaskStartedEvent) => {
          const nodeId = taskToNodeId(event.taskName);

          setLiveTasks((prev) => {
            const updated = new Map(prev);
            const existing = updated.get(nodeId);
            if (!existing) {
              // New task discovered - add to visualization
              const position = calculateDynamicPosition(event.taskName, prev.size);
              addNode({
                id: nodeId,
                label: event.taskName,
                position,
                status: 'running',
                sizeScale: 1.0,
              });
            }
            updated.set(nodeId, { workflowName: event.taskName, status: 'running' });
            return updated;
          });

          updateNodeStatus(nodeId, 'running');
        });

        // Handle task completed - update status
        client.onTaskCompleted((event: TaskCompletedEvent) => {
          const nodeId = taskToNodeId(event.taskName);
          const status = event.status === 'Succeeded' ? 'succeeded' : 'failed';

          setLiveTasks((prev) => {
            const updated = new Map(prev);
            const existing = updated.get(nodeId);
            if (existing) {
              updated.set(nodeId, { ...existing, status });
            }
            return updated;
          });

          updateNodeStatus(nodeId, status);
        });

        // Handle signal flow - add edge if not exists, trigger animation
        client.onSignalFlow((event: SignalFlowEvent) => {
          const fromNodeId = taskToNodeId(event.fromTaskId);
          const toNodeId = taskToNodeId(event.toTaskId);
          const edgeKey = `${fromNodeId}->${toNodeId}`;

          setLiveEdges((prev) => {
            if (!prev.has(edgeKey)) {
              const updated = new Map(prev);
              updated.set(edgeKey, { from: fromNodeId, to: toNodeId });
              addEdge({
                id: `edge-${prev.size}`,
                source: fromNodeId,
                target: toNodeId,
              });
              return updated;
            }
            return prev;
          });

          triggerSignal(fromNodeId, toNodeId);
          setTotalSignals((n) => n + 1);
        });

        // Handle workflow completed
        client.onWorkflowCompleted(() => {
          setActiveExecutions((n) => Math.max(0, n - 1));
        });

      } catch (error) {
        console.error('Failed to connect to SignalR hub:', error);
        setConnectionError(error instanceof Error ? error.message : 'Connection failed');
        setIsConnected(false);
      }
    };

    connect();

    return () => {
      if (wsClientRef.current) {
        wsClientRef.current.disconnect();
        wsClientRef.current = null;
        setIsConnected(false);
      }
    };
  }, [dataSource, taskToNodeId, calculateDynamicPosition, addNode, addEdge, updateNodeStatus, triggerSignal]);

  // Filter workflows
  const filteredWorkflows = useMemo(() => {
    return DEMO_WORKFLOWS.filter((w) => {
      if (selectedNamespace !== 'all' && w.namespace !== selectedNamespace) return false;
      if (selectedWorkflow !== 'all' && w.id !== selectedWorkflow) return false;
      return true;
    });
  }, [selectedNamespace, selectedWorkflow]);

  const availableWorkflows = selectedNamespace === 'all'
    ? DEMO_WORKFLOWS
    : DEMO_WORKFLOWS.filter((w) => w.namespace === selectedNamespace);

  // Build merged graph - shared nodes across workflows
  const { mergedNodes, mergedEdges, nodesByLabel, labelToDepth } = useMemo(() => {
    const labelToTasks = new Map<string, { workflows: string[]; type: TaskDefinition['type'] }>();
    const edges = new Map<string, { source: string; target: string }>();

    // Collect all unique labels and their dependencies
    filteredWorkflows.forEach((workflow) => {
      workflow.tasks.forEach((task) => {
        const existing = labelToTasks.get(task.label);
        if (existing) {
          existing.workflows.push(workflow.id);
        } else {
          labelToTasks.set(task.label, { workflows: [workflow.id], type: task.type });
        }

        // Add edges (by label)
        task.dependsOn.forEach((depLabel) => {
          const edgeKey = `${depLabel}->${task.label}`;
          if (!edges.has(edgeKey)) {
            edges.set(edgeKey, { source: depLabel, target: task.label });
          }
        });
      });
    });

    // Calculate depth for each node using BFS
    const depths = new Map<string, number>();
    const queue: string[] = [];

    // Start with input nodes (depth 0)
    labelToTasks.forEach((info, label) => {
      if (info.type === 'input') {
        depths.set(label, 0);
        queue.push(label);
      }
    });

    // BFS to calculate depths
    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentDepth = depths.get(current)!;

      edges.forEach((edge) => {
        if (edge.source === current) {
          const existingDepth = depths.get(edge.target);
          const newDepth = currentDepth + 1;
          if (existingDepth === undefined || newDepth > existingDepth) {
            depths.set(edge.target, newDepth);
            queue.push(edge.target);
          }
        }
      });
    }

    // Find max depth
    const maxDepth = Math.max(...Array.from(depths.values()), 1);

    // Group nodes by depth for positioning
    const nodesByDepth = new Map<number, string[]>();
    depths.forEach((depth, label) => {
      const existing = nodesByDepth.get(depth) || [];
      existing.push(label);
      nodesByDepth.set(depth, existing);
    });

    // Calculate connection counts per node
    const connectionCounts = new Map<string, number>();
    edges.forEach((edge) => {
      connectionCounts.set(edge.source, (connectionCounts.get(edge.source) || 0) + 1);
      connectionCounts.set(edge.target, (connectionCounts.get(edge.target) || 0) + 1);
    });

    // Create positioned nodes
    const nodes: { id: string; label: string; position: { x: number; y: number; z: number }; workflows: string[]; connectionCount: number }[] = [];
    const nodeMap = new Map<string, typeof nodes[0]>();

    nodesByDepth.forEach((labels, depth) => {
      labels.forEach((label, index) => {
        // Choose position based on layout mode
        const position = layoutMode === 'radial'
          ? sphericalPosition(depth, maxDepth, index, labels.length, sphereRadius)
          : stackedPosition(depth, maxDepth, index, labels.length);
        const info = labelToTasks.get(label)!;
        const node = {
          id: `node-${label.toLowerCase().replace(/\s+/g, '-')}`,
          label,
          position,
          workflows: info.workflows,
          connectionCount: connectionCounts.get(label) || 0,
        };
        nodes.push(node);
        nodeMap.set(label, node);
      });
    });

    // Create edges with node IDs
    const edgeArray = Array.from(edges.values()).map((edge, i) => {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      return {
        id: `edge-${i}`,
        source: sourceNode?.id || '',
        target: targetNode?.id || '',
      };
    }).filter((e) => e.source && e.target);

    return {
      mergedNodes: nodes,
      mergedEdges: edgeArray,
      nodesByLabel: nodeMap,
      labelToDepth: depths,
    };
  }, [filteredWorkflows, sphereRadius, layoutMode]);

  // Calculate size scale based on mode
  const calculateSizeScale = useCallback((node: typeof mergedNodes[0]): number => {
    if (nodeSizeMode === 'uniform') {
      return 1.0;
    }

    // Get min/max values for normalization
    const maxShared = Math.max(...mergedNodes.map((n) => n.workflows.length), 1);
    const maxConnections = Math.max(...mergedNodes.map((n) => n.connectionCount), 1);

    let value = 0;
    let maxValue = 1;

    switch (nodeSizeMode) {
      case 'shared-count':
        value = node.workflows.length;
        maxValue = maxShared;
        break;
      case 'connection-count':
        value = node.connectionCount;
        maxValue = maxConnections;
        break;
      case 'execution-duration':
        // Simulate duration based on label (for demo purposes)
        // In production, this would come from actual execution data
        const durationMap: Record<string, number> = {
          'Input': 0.1,
          'Validate': 0.3,
          'Fetch User': 0.8,
          'Fetch Prefs': 0.6,
          'Merge Data': 0.4,
          'Check Inventory': 0.9,
          'Process Payment': 1.0,
          'Fulfill Order': 0.7,
          'Extract': 0.5,
          'Transform': 0.8,
          'Load to DB': 0.6,
          'Aggregate': 0.7,
        };
        value = durationMap[node.label] || 0.5;
        maxValue = 1.0;
        break;
    }

    // Normalize to scale range [0.6, 2.0]
    const normalized = value / maxValue;
    return 0.6 + normalized * 1.4;
  }, [nodeSizeMode, mergedNodes]);

  // Initialize visualization (simulation mode only)
  const initializeVisualization = useCallback(() => {
    if (dataSource !== 'simulation') return;

    clearGraph(); // Use clearGraph to preserve theme settings

    mergedNodes.forEach((node) => {
      addNode({
        id: node.id,
        label: `${node.label}${node.workflows.length > 1 ? ` (${node.workflows.length})` : ''}`,
        position: node.position,
        status: 'idle' as const,
        sizeScale: calculateSizeScale(node),
      });
    });

    mergedEdges.forEach((edge) => {
      addEdge(edge);
    });
  }, [dataSource, mergedNodes, mergedEdges, addNode, addEdge, clearGraph, calculateSizeScale]);

  useEffect(() => {
    if (dataSource === 'simulation') {
      initializeVisualization();
    } else {
      // Clear simulation nodes when switching to live
      clearGraph();
      setLiveTasks(new Map());
      setLiveEdges(new Map());
    }
  }, [dataSource, initializeVisualization, clearGraph]);

  // Execute a workflow through the merged graph
  const runWorkflowExecution = useCallback(async (workflow: WorkflowDefinition) => {
    if (isPaused) return;

    const delay = (ms: number) => new Promise((resolve) =>
      setTimeout(resolve, ms / speedMultiplier)
    );

    setActiveExecutions((n) => n + 1);

    // Get tasks in execution order (by depth)
    const tasksWithDepth = workflow.tasks.map((task) => ({
      task,
      depth: labelToDepth.get(task.label) || 0,
      nodeId: nodesByLabel.get(task.label)?.id || '',
    })).sort((a, b) => a.depth - b.depth);

    // Execute tasks
    for (const { task, nodeId } of tasksWithDepth) {
      if (isPaused || !nodeId) break;

      updateNodeStatus(nodeId, 'running');
      await delay(300 + Math.random() * 400);

      // 5% chance of failure
      if (Math.random() < 0.05) {
        updateNodeStatus(nodeId, 'failed');
        setActiveExecutions((n) => Math.max(0, n - 1));
        return;
      }

      updateNodeStatus(nodeId, 'succeeded');

      // Trigger signals to dependent tasks
      const dependentTasks = workflow.tasks.filter((t) => t.dependsOn.includes(task.label));
      for (const depTask of dependentTasks) {
        const targetNodeId = nodesByLabel.get(depTask.label)?.id;
        if (targetNodeId && !isPaused) {
          triggerSignal(nodeId, targetNodeId);
          setTotalSignals((n) => n + 1);
        }
      }

      await delay(100);
    }

    setActiveExecutions((n) => Math.max(0, n - 1));
  }, [isPaused, speedMultiplier, labelToDepth, nodesByLabel, updateNodeStatus, triggerSignal]);

  const runRandomWorkflow = useCallback(() => {
    if (filteredWorkflows.length === 0) return;
    const workflow = filteredWorkflows[Math.floor(Math.random() * filteredWorkflows.length)];
    runWorkflowExecution(workflow);
  }, [filteredWorkflows, runWorkflowExecution]);

  const runAllWorkflows = useCallback(() => {
    filteredWorkflows.forEach((workflow) => {
      runWorkflowExecution(workflow);
    });
  }, [filteredWorkflows, runWorkflowExecution]);

  const toggleAutoRun = useCallback(() => {
    if (isAutoRunning) {
      if (autoRunRef.current) {
        clearInterval(autoRunRef.current);
        autoRunRef.current = null;
      }
      setIsAutoRunning(false);
    } else {
      setIsAutoRunning(true);
      const runLoop = () => {
        if (!isPaused) {
          runRandomWorkflow();
        }
        autoRunRef.current = setTimeout(runLoop, (400 + Math.random() * 800) / speedMultiplier);
      };
      runLoop();
    }
  }, [isAutoRunning, isPaused, speedMultiplier, runRandomWorkflow]);

  useEffect(() => {
    return () => {
      if (autoRunRef.current) {
        clearTimeout(autoRunRef.current);
      }
    };
  }, []);

  const resetStats = () => {
    setTotalSignals(0);
    setActiveExecutions(0);

    if (dataSource === 'simulation') {
      initializeVisualization();
    } else {
      // Reset live mode - clear discovered nodes/edges
      clearGraph();
      setLiveTasks(new Map());
      setLiveEdges(new Map());
    }
  };

  return (
    <div className="h-screen w-screen bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-black/50 border-b border-white/10">
        <div className="flex items-center justify-between px-6 py-3">
          <div>
            <h1 className="text-xl font-bold text-white">Neural Network Visualization</h1>
            <p className="text-sm text-white/60">
              {dataSource === 'live'
                ? isConnected
                  ? 'Live: Connected to SignalR - watching for real workflow executions'
                  : connectionError
                    ? `Live: Connection failed - ${connectionError}`
                    : 'Live: Connecting to SignalR...'
                : layoutMode === 'radial'
                  ? 'Simulation: Radial layout with shared task merging'
                  : 'Simulation: Stacked layout with shared task merging'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Data Source Toggle */}
            <div className="flex items-center rounded-lg overflow-hidden border border-white/20">
              <button
                onClick={() => setDataSource('live')}
                className={`px-4 py-2 text-sm font-medium transition-all ${
                  dataSource === 'live'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-800 text-white/60 hover:text-white hover:bg-gray-700'
                }`}
              >
                {dataSource === 'live' && isConnected && (
                  <span className="inline-block w-2 h-2 rounded-full bg-green-300 animate-pulse mr-2" />
                )}
                Live
              </button>
              <button
                onClick={() => setDataSource('simulation')}
                className={`px-4 py-2 text-sm font-medium transition-all ${
                  dataSource === 'simulation'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 text-white/60 hover:text-white hover:bg-gray-700'
                }`}
              >
                Simulation
              </button>
            </div>

            {/* Simulation controls - only shown in simulation mode */}
            {dataSource === 'simulation' && (
              <>
                <div className="w-px h-8 bg-white/20" />

                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className={`px-3 py-2 rounded-lg font-medium transition-all ${
                    isPaused
                      ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                      : 'bg-gray-700 hover:bg-gray-600 text-white'
                  }`}
                >
                  {isPaused ? '▶ Resume' : '⏸ Pause'}
                </button>

                <button
                  onClick={runRandomWorkflow}
                  disabled={isPaused || filteredWorkflows.length === 0}
                  className="px-4 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-500 text-white disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-all"
                >
                  Run Random
                </button>

                <button
                  onClick={runAllWorkflows}
                  disabled={isPaused || filteredWorkflows.length === 0}
                  className="px-4 py-2 rounded-lg font-medium bg-green-600 hover:bg-green-500 text-white disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-all"
                >
                  Run All ({filteredWorkflows.length})
                </button>

                <button
                  onClick={toggleAutoRun}
                  disabled={isPaused}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    isAutoRunning
                      ? 'bg-red-600 hover:bg-red-500 text-white'
                      : 'bg-purple-600 hover:bg-purple-500 text-white'
                  } disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed`}
                >
                  {isAutoRunning ? '■ Stop Auto' : '● Auto Run'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-6 px-6 py-3 border-t border-white/5">
          {/* Layout toggle - available in both modes */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-white/60">Layout:</label>
            <button
              onClick={() => setLayoutMode(layoutMode === 'radial' ? 'stacked' : 'radial')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                layoutMode === 'radial'
                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {layoutMode === 'radial' ? 'Radial' : 'Stacked'}
            </button>
          </div>

          {/* Simulation-only filters */}
          {dataSource === 'simulation' && (
            <>
              <div className="flex items-center gap-2">
                <label className="text-sm text-white/60">Namespace:</label>
                <select
                  value={selectedNamespace}
                  onChange={(e) => {
                    setSelectedNamespace(e.target.value);
                    setSelectedWorkflow('all');
                  }}
                  className="bg-gray-800 text-white rounded-lg px-3 py-1.5 text-sm border border-white/10 focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">All Namespaces</option>
                  {NAMESPACES.map((ns) => (
                    <option key={ns} value={ns}>{ns}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-white/60">Workflow:</label>
                <select
                  value={selectedWorkflow}
                  onChange={(e) => setSelectedWorkflow(e.target.value)}
                  className="bg-gray-800 text-white rounded-lg px-3 py-1.5 text-sm border border-white/10 focus:border-blue-500 focus:outline-none"
                >
                  <option value="all">All Workflows ({availableWorkflows.length})</option>
                  {availableWorkflows.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-white/60">Speed:</label>
                <input
                  type="range"
                  min="0.25"
                  max="4"
                  step="0.25"
                  value={speedMultiplier}
                  onChange={(e) => setSpeedMultiplier(parseFloat(e.target.value))}
                  className="w-24 accent-blue-500"
                />
                <span className="text-sm text-white/80 w-12">{speedMultiplier}x</span>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-sm text-white/60">Radius:</label>
                <input
                  type="range"
                  min="3"
                  max="10"
                  step="0.5"
                  value={sphereRadius}
                  onChange={(e) => setSphereRadius(parseFloat(e.target.value))}
                  className="w-20 accent-blue-500"
                />
                <span className="text-sm text-white/80 w-8">{sphereRadius}</span>
              </div>
            </>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showLabels}
              onChange={(e) => setShowLabels(e.target.checked)}
              className="w-4 h-4 rounded border-white/30 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
            />
            <span className="text-sm text-white/60">Labels</span>
          </label>

          <button
            onClick={resetStats}
            className="px-3 py-1.5 rounded-lg text-sm bg-gray-700 hover:bg-gray-600 text-white transition-all"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Visualization */}
      <div className="flex-1 relative">
        <NeuralNetworkVisualization
          className="w-full h-full"
          showSettings={true}
          showLabels={showLabels}
          onNodeClick={(nodeId) => console.log('Clicked:', nodeId)}
          onNodeHover={(nodeId, isHovered) => console.log('Hover:', nodeId, isHovered)}
        />

        {/* Stats overlay */}
        <div className="absolute top-4 left-4 bg-black/70 rounded-lg px-4 py-3 text-sm">
          <div className="text-white/60 mb-2">
            {dataSource === 'live' ? 'Live Stats' : 'Simulation Stats'}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {dataSource === 'live' && (
              <>
                <span className="text-white/60">Status:</span>
                <span className={`font-mono ${isConnected ? 'text-green-400' : 'text-yellow-400'}`}>
                  {isConnected ? 'Connected' : 'Connecting...'}
                </span>
              </>
            )}
            <span className="text-white/60">Active:</span>
            <span className={`font-mono ${activeExecutions > 0 ? 'text-green-400' : 'text-white/80'}`}>
              {activeExecutions}
            </span>
            <span className="text-white/60">Signals:</span>
            <span className="text-white/80 font-mono">{totalSignals}</span>
            <span className="text-white/60">Nodes:</span>
            <span className="text-white/80 font-mono">
              {dataSource === 'live' ? liveTasks.size : mergedNodes.length}
            </span>
            {dataSource === 'live' && (
              <>
                <span className="text-white/60">Edges:</span>
                <span className="text-white/80 font-mono">{liveEdges.size}</span>
              </>
            )}
            {dataSource === 'simulation' && (
              <>
                <span className="text-white/60">Shared:</span>
                <span className="text-cyan-400 font-mono">
                  {mergedNodes.filter((n) => n.workflows.length > 1).length}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="absolute top-4 right-20 bg-black/70 rounded-lg px-4 py-3 text-sm">
          <div className="text-white/60 mb-2">Layout</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400" />
              <span className="text-white/60">Center = Input</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-400" />
              <span className="text-white/60">Middle = Processing</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-white/60">Outer = Output</span>
            </div>
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10">
              <span className="text-white/40">(n)</span>
              <span className="text-white/60">= shared by n workflows</span>
            </div>
          </div>
        </div>

        {isPaused && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
            <div className="bg-black/80 rounded-xl px-8 py-4 text-white text-xl font-bold">
              ⏸ PAUSED
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="flex-shrink-0 px-6 py-3 bg-black/50 border-t border-white/10">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-6">
            <span className="text-white/60">
              Mode:{' '}
              <span className={dataSource === 'live' ? 'text-green-400' : 'text-purple-400'}>
                {dataSource === 'live' ? 'Live' : 'Simulation'}
              </span>
            </span>
            {dataSource === 'live' && (
              <>
                <span className="text-white/40">|</span>
                <span className="text-white/60">
                  SignalR:{' '}
                  <span className={isConnected ? 'text-green-400' : 'text-yellow-400'}>
                    {isConnected ? 'Connected' : connectionError || 'Connecting...'}
                  </span>
                </span>
              </>
            )}
            {dataSource === 'simulation' && (
              <>
                <span className="text-white/40">|</span>
                <span className="text-white/60">
                  Status:{' '}
                  <span className={
                    isPaused ? 'text-yellow-400' :
                    isAutoRunning ? 'text-purple-400' :
                    activeExecutions > 0 ? 'text-green-400' : 'text-white/80'
                  }>
                    {isPaused ? 'Paused' : isAutoRunning ? 'Auto-Running' : activeExecutions > 0 ? 'Executing' : 'Ready'}
                  </span>
                </span>
                <span className="text-white/40">|</span>
                <span className="text-white/60">
                  Filter: {selectedNamespace === 'all' ? 'All Namespaces' : selectedNamespace}
                  {selectedWorkflow !== 'all' && ` / ${availableWorkflows.find(w => w.id === selectedWorkflow)?.name}`}
                </span>
              </>
            )}
          </div>
          <span className="text-white/40">
            Drag to rotate | Scroll to zoom | Right-click to pan
          </span>
        </div>
      </div>
    </div>
  );
}
