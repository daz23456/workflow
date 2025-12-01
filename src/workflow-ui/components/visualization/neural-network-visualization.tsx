/**
 * NeuralNetworkVisualization - Main 3D neural network visualization component
 *
 * Integrates all visualization components:
 * - NeuralScene (3D canvas with theme support)
 * - TaskNode3D (task nodes as neurons)
 * - DependencyEdge3D (connections between tasks)
 * - SignalFlowEffect (animated data flow)
 */

'use client';

import React, { useEffect, useCallback } from 'react';
import { NeuralScene } from './neural-scene';
import { TaskNode3D } from './task-node-3d';
import { DependencyEdge3D } from './dependency-edge-3d';
import { SignalFlowEffect } from './signal-flow-effect';
import { VisualizationSettings } from './visualization-settings';
import {
  useVisualizationStore,
  type VisualizationNode,
  type VisualizationEdge,
  type ActiveSignal,
} from '../../lib/visualization/visualization-store';

interface NeuralNetworkVisualizationProps {
  className?: string;
  showSettings?: boolean;
  showLabels?: boolean;
  onNodeClick?: (nodeId: string) => void;
  onNodeHover?: (nodeId: string, isHovered: boolean) => void;
}

export function NeuralNetworkVisualization({
  className,
  showSettings = true,
  showLabels = true,
  onNodeClick,
  onNodeHover,
}: NeuralNetworkVisualizationProps) {
  const nodes = useVisualizationStore((state) => state.nodes);
  const edges = useVisualizationStore((state) => state.edges);
  const activeSignals = useVisualizationStore((state) => state.activeSignals);
  const completeSignal = useVisualizationStore((state) => state.completeSignal);

  // Convert Map to array for rendering
  const nodeArray = Array.from(nodes.values());

  // Handle signal completion
  const handleSignalComplete = useCallback(
    (signalId: string) => {
      completeSignal(signalId);
    },
    [completeSignal]
  );

  return (
    <div className={`relative w-full h-full ${className || ''}`} data-testid="neural-visualization">
      {/* 3D Canvas */}
      <NeuralScene className="w-full h-full">
        {/* Render edges first (behind nodes) */}
        {edges.map((edge: VisualizationEdge) => (
          <DependencyEdge3D
            key={edge.id}
            id={edge.id}
            sourceId={edge.source}
            targetId={edge.target}
            curved
          />
        ))}

        {/* Render nodes */}
        {nodeArray.map((node: VisualizationNode) => (
          <TaskNode3D
            key={node.id}
            id={node.id}
            label={node.label}
            status={node.status}
            position={node.position}
            showLabel={showLabels}
            sizeScale={node.sizeScale}
            onClick={onNodeClick}
            onHover={onNodeHover}
          />
        ))}

        {/* Render active signals */}
        {activeSignals.map((signal: ActiveSignal) => (
          <SignalFlowEffect
            key={signal.id}
            id={signal.id}
            fromNodeId={signal.fromNodeId}
            toNodeId={signal.toNodeId}
            onComplete={() => handleSignalComplete(signal.id)}
          />
        ))}
      </NeuralScene>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-4 right-4 z-10">
          <VisualizationSettings />
        </div>
      )}

      {/* Info overlay */}
      <div className="absolute bottom-4 left-4 z-10 text-xs text-white/50 font-mono">
        <p>Nodes: {nodeArray.length} | Edges: {edges.length} | Signals: {activeSignals.length}</p>
      </div>
    </div>
  );
}
