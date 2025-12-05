/**
 * Namespace Galaxy Visualization Page
 *
 * 3D cosmic visualization where:
 * - Namespaces are glowing clusters
 * - Workflows are planets orbiting clusters
 * - Tasks are moons orbiting planets
 *
 * Features semantic zoom: Galaxy → Namespace → Workflow → Task
 *
 * Stage 12.3: Namespace Galaxy
 */

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { GalaxyScene, GalaxySVG, NamespaceCluster, WorkflowPlanet } from '../../../components/visualization/galaxy';
import { VisualizationSettings } from '../../../components/visualization/visualization-settings';
import { useRenderMode } from '../../../lib/visualization/visualization-store';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Play, Pause, RotateCcw, Info } from 'lucide-react';

// Demo data for namespaces, workflows, and tasks
interface DemoWorkflow {
  id: string;
  name: string;
  taskCount: number;
  color: string;
}

interface DemoNamespace {
  id: string;
  name: string;
  color: string;
  position: [number, number, number];
  workflows: DemoWorkflow[];
}

const DEMO_NAMESPACES: DemoNamespace[] = [
  {
    id: 'ns-production',
    name: 'production',
    color: '#ff6b6b',
    position: [0, 0, 0],
    workflows: [
      { id: 'wf-user-api', name: 'user-api-composition', taskCount: 6, color: '#4ecdc4' },
      { id: 'wf-order-process', name: 'order-processing', taskCount: 6, color: '#45b7d1' },
      { id: 'wf-payment', name: 'payment-gateway', taskCount: 4, color: '#96ceb4' },
    ],
  },
  {
    id: 'ns-data-team',
    name: 'data-team',
    color: '#a8e6cf',
    position: [25, 5, -10],
    workflows: [
      { id: 'wf-etl', name: 'data-etl-pipeline', taskCount: 5, color: '#dfe6e9' },
      { id: 'wf-analytics', name: 'realtime-analytics', taskCount: 6, color: '#74b9ff' },
    ],
  },
  {
    id: 'ns-notifications',
    name: 'notifications',
    color: '#ffeaa7',
    position: [-20, -5, 15],
    workflows: [
      { id: 'wf-email', name: 'email-service', taskCount: 3, color: '#fd79a8' },
      { id: 'wf-push', name: 'push-notifications', taskCount: 4, color: '#e17055' },
    ],
  },
  {
    id: 'ns-auth',
    name: 'authentication',
    color: '#81ecec',
    position: [15, -8, 20],
    workflows: [
      { id: 'wf-login', name: 'login-flow', taskCount: 5, color: '#00b894' },
      { id: 'wf-oauth', name: 'oauth-provider', taskCount: 7, color: '#00cec9' },
    ],
  },
];

// Namespace colors for the legend
const NAMESPACE_COLORS = DEMO_NAMESPACES.map((ns) => ({
  name: ns.name,
  color: ns.color,
  workflowCount: ns.workflows.length,
}));

export default function GalaxyPage() {
  const [isPaused, setIsPaused] = useState(false);
  const [selectedNamespace, setSelectedNamespace] = useState<string | null>(null);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);
  const [showLegend, setShowLegend] = useState(true);
  const renderMode = useRenderMode();

  const handleNamespaceClick = useCallback((id: string) => {
    setSelectedNamespace((prev) => (prev === id ? null : id));
    setSelectedWorkflow(null);
  }, []);

  const handleWorkflowClick = useCallback((id: string) => {
    setSelectedWorkflow((prev) => (prev === id ? null : id));
  }, []);

  const handleReset = useCallback(() => {
    setSelectedNamespace(null);
    setSelectedWorkflow(null);
  }, []);

  // Get selected namespace details
  const selectedNsDetails = useMemo(() => {
    if (!selectedNamespace) return null;
    return DEMO_NAMESPACES.find((ns) => ns.id === selectedNamespace);
  }, [selectedNamespace]);

  // Get selected workflow details
  const selectedWfDetails = useMemo(() => {
    if (!selectedWorkflow || !selectedNsDetails) return null;
    return selectedNsDetails.workflows.find((wf) => wf.id === selectedWorkflow);
  }, [selectedWorkflow, selectedNsDetails]);

  // Render 3D or SVG based on render mode
  const renderGalaxy = () => {
    if (renderMode === 'flat') {
      return (
        <GalaxySVG
          namespaces={DEMO_NAMESPACES}
          onNamespaceClick={handleNamespaceClick}
          onWorkflowClick={handleWorkflowClick}
          selectedNamespace={selectedNamespace}
          selectedWorkflow={selectedWorkflow}
        />
      );
    }

    // 3D mode (quality or performance)
    return (
      <GalaxyScene>
        {DEMO_NAMESPACES.map((namespace) => (
          <NamespaceCluster
            key={namespace.id}
            id={namespace.id}
            name={namespace.name}
            position={namespace.position}
            color={namespace.color}
            workflowCount={namespace.workflows.length}
            onClick={handleNamespaceClick}
          >
            {/* Workflow planets orbiting this namespace */}
            {namespace.workflows.map((workflow, index) => (
              <WorkflowPlanet
                key={workflow.id}
                id={workflow.id}
                name={workflow.name}
                orbitRadius={4 + index * 1.5}
                orbitSpeed={0.3 - index * 0.05}
                color={workflow.color}
                taskCount={workflow.taskCount}
                initialAngle={(index * Math.PI * 2) / namespace.workflows.length}
                onClick={handleWorkflowClick}
              />
            ))}
          </NamespaceCluster>
        ))}
      </GalaxyScene>
    );
  };

  return (
    <div className="h-screen w-full relative bg-black">
      {/* Galaxy Scene (3D or SVG) */}
      {renderGalaxy()}

      {/* Controls Overlay - Top Left */}
      <div className="absolute top-4 left-4 flex gap-2">
        <VisualizationSettings />
        <Button
          variant="outline"
          size="icon"
          onClick={() => setIsPaused(!isPaused)}
          className="bg-black/50 border-white/20 hover:bg-black/70"
        >
          {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={handleReset}
          className="bg-black/50 border-white/20 hover:bg-black/70"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setShowLegend(!showLegend)}
          className="bg-black/50 border-white/20 hover:bg-black/70"
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>

      {/* Title Overlay - Top Center */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2">
        <h1 className="text-2xl font-bold text-white/90 tracking-wide">
          Namespace Galaxy
        </h1>
        <p className="text-sm text-white/50 text-center">
          Click clusters to explore • Scroll to zoom
        </p>
      </div>

      {/* Legend - Bottom Left */}
      {showLegend && (
        <Card className="absolute bottom-4 left-4 bg-black/70 border-white/20 text-white w-64">
          <CardHeader className="py-3">
            <CardTitle className="text-sm">Namespaces</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="space-y-2">
              {NAMESPACE_COLORS.map((ns) => (
                <div
                  key={ns.name}
                  className="flex items-center gap-2 cursor-pointer hover:bg-white/10 px-2 py-1 rounded"
                  onClick={() => handleNamespaceClick(`ns-${ns.name}`)}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: ns.color, boxShadow: `0 0 8px ${ns.color}` }}
                  />
                  <span className="text-sm flex-1">{ns.name}</span>
                  <span className="text-xs text-white/50">{ns.workflowCount} workflows</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selection Details - Bottom Right */}
      {(selectedNsDetails || selectedWfDetails) && (
        <Card className="absolute bottom-4 right-4 bg-black/70 border-white/20 text-white w-72">
          <CardHeader className="py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: selectedWfDetails?.color || selectedNsDetails?.color,
                  boxShadow: `0 0 8px ${selectedWfDetails?.color || selectedNsDetails?.color}`,
                }}
              />
              {selectedWfDetails?.name || selectedNsDetails?.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            {selectedWfDetails ? (
              <div className="space-y-1 text-sm">
                <p className="text-white/70">Workflow</p>
                <p>Tasks: {selectedWfDetails.taskCount}</p>
                <p className="text-white/50 text-xs">
                  Part of {selectedNsDetails?.name} namespace
                </p>
              </div>
            ) : selectedNsDetails ? (
              <div className="space-y-2 text-sm">
                <p className="text-white/70">Namespace</p>
                <p>Workflows: {selectedNsDetails.workflows.length}</p>
                <div className="mt-2 space-y-1">
                  {selectedNsDetails.workflows.map((wf) => (
                    <div
                      key={wf.id}
                      className="flex items-center gap-2 text-xs cursor-pointer hover:bg-white/10 px-1 py-0.5 rounded"
                      onClick={() => handleWorkflowClick(wf.id)}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: wf.color }}
                      />
                      {wf.name}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Keyboard Shortcuts Hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/30 text-xs">
        Drag to rotate • Scroll to zoom • Click to select
      </div>
    </div>
  );
}
