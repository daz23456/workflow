/**
 * Live Traffic Observatory Page
 *
 * Real-time visualization of workflow executions flowing
 * through the system as particles in workflow lanes.
 *
 * Stage 12.5: Live Traffic Observatory
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrafficCanvas,
  TrafficSVG,
  WorkflowLane,
  ExecutionParticle,
  ThroughputMeter,
  EventFeed,
  TrafficStats,
  type TrafficEvent,
  type ExecutionStatus,
  type SVGParticle,
} from '../../../components/visualization/traffic';
import { VisualizationSettings } from '../../../components/visualization/visualization-settings';
import { useRenderMode } from '../../../lib/visualization/visualization-store';
import { Button } from '../../../components/ui/button';
import { Play, Pause, Zap, Radio } from 'lucide-react';

// Demo workflow configurations
const DEMO_WORKFLOWS = [
  {
    id: 'wf-user-api',
    name: 'User API Workflow',
    color: '#4a9eff',
    yPosition: 5,
    tasks: [
      { id: 'validate', name: 'Validate', xPosition: -10 },
      { id: 'fetch-user', name: 'Fetch User', xPosition: 0 },
      { id: 'transform', name: 'Transform', xPosition: 10 },
      { id: 'respond', name: 'Respond', xPosition: 20 },
    ],
  },
  {
    id: 'wf-order-process',
    name: 'Order Processing Workflow',
    color: '#f59e0b',
    yPosition: 0,
    tasks: [
      { id: 'order-in', name: 'Order In', xPosition: -10 },
      { id: 'inventory', name: 'Inventory', xPosition: 0 },
      { id: 'payment', name: 'Payment', xPosition: 10 },
      { id: 'ship', name: 'Ship', xPosition: 20 },
    ],
  },
  {
    id: 'wf-etl',
    name: 'ETL Pipeline Workflow',
    color: '#10b981',
    yPosition: -5,
    tasks: [
      { id: 'extract', name: 'Extract', xPosition: -10 },
      { id: 'transform-data', name: 'Transform', xPosition: 0 },
      { id: 'validate-data', name: 'Validate', xPosition: 10 },
      { id: 'load', name: 'Load', xPosition: 20 },
    ],
  },
];

// Particle type for tracking executions
interface Particle {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  progress: number;
  startTime: number;
}

// Generate random execution particle
function generateParticle(workflowId: string): Particle {
  return {
    id: `exec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    workflowId,
    status: 'running',
    progress: 0,
    startTime: Date.now(),
  };
}

export default function TrafficPage() {
  const [isPaused, setIsPaused] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [events, setEvents] = useState<TrafficEvent[]>([]);
  const [throughput, setThroughput] = useState(0);
  const renderMode = useRenderMode();
  const [stats, setStats] = useState({
    activeExecutions: 0,
    totalToday: 0,
    successRate: 99.2,
    avgLatencyMs: 234,
  });

  // Add a new event to the feed
  const addEvent = useCallback((event: Omit<TrafficEvent, 'id' | 'timestamp'>) => {
    const newEvent: TrafficEvent = {
      ...event,
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date(),
    };
    setEvents((prev) => [newEvent, ...prev].slice(0, 100));
  }, []);

  // Spawn new particles periodically (simulation mode)
  useEffect(() => {
    if (isPaused) return;

    const spawnInterval = setInterval(() => {
      const workflow = DEMO_WORKFLOWS[Math.floor(Math.random() * DEMO_WORKFLOWS.length)];
      const newParticle = generateParticle(workflow.id);

      setParticles((prev) => [...prev, newParticle]);
      setStats((prev) => ({
        ...prev,
        activeExecutions: prev.activeExecutions + 1,
        totalToday: prev.totalToday + 1,
      }));

      addEvent({
        type: 'workflow_started',
        workflowName: workflow.name,
        executionId: newParticle.id,
      });
    }, 2000 + Math.random() * 2000); // Random 2-4 seconds

    return () => clearInterval(spawnInterval);
  }, [isPaused, addEvent]);

  // Update particle progress
  useEffect(() => {
    if (isPaused) return;

    const updateInterval = setInterval(() => {
      setParticles((prev) => {
        const updated = prev.map((p) => {
          if (p.status !== 'running') return p;

          const elapsed = Date.now() - p.startTime;
          const progress = Math.min(1, elapsed / 5000); // 5 second execution

          if (progress >= 1) {
            const succeeded = Math.random() > 0.05; // 95% success rate
            const workflow = DEMO_WORKFLOWS.find((w) => w.id === p.workflowId);

            setStats((prev) => ({
              ...prev,
              activeExecutions: Math.max(0, prev.activeExecutions - 1),
            }));

            addEvent({
              type: 'workflow_completed',
              workflowName: workflow?.name || 'Unknown',
              executionId: p.id,
              status: succeeded ? 'succeeded' : 'failed',
            });

            return { ...p, progress: 1, status: (succeeded ? 'succeeded' : 'failed') as ExecutionStatus };
          }

          return { ...p, progress };
        });

        // Remove completed particles after fade-out
        return updated.filter((p) =>
          p.status === 'running' || (Date.now() - p.startTime) < 6000
        );
      });
    }, 50);

    return () => clearInterval(updateInterval);
  }, [isPaused, addEvent]);

  // Update throughput meter
  useEffect(() => {
    const throughputInterval = setInterval(() => {
      // Simulate varying throughput
      setThroughput(30 + Math.random() * 40);
    }, 1000);

    return () => clearInterval(throughputInterval);
  }, []);

  // Convert particles for SVG format
  const svgParticles: SVGParticle[] = particles.map((p) => ({
    id: p.id,
    workflowId: p.workflowId,
    status: p.status,
    progress: p.progress,
  }));

  // Render 3D or SVG based on render mode
  const renderTraffic = () => {
    if (renderMode === 'flat') {
      return (
        <TrafficSVG
          workflows={DEMO_WORKFLOWS}
          particles={svgParticles}
        />
      );
    }

    // 3D mode (quality or performance)
    return (
      <TrafficCanvas>
        {/* Workflow lanes */}
        {DEMO_WORKFLOWS.map((workflow) => (
          <WorkflowLane
            key={workflow.id}
            id={workflow.id}
            name={workflow.name}
            color={workflow.color}
            yPosition={workflow.yPosition}
            tasks={workflow.tasks}
          />
        ))}

        {/* Execution particles */}
        {particles.map((particle) => {
          const workflow = DEMO_WORKFLOWS.find((w) => w.id === particle.workflowId);
          if (!workflow) return null;

          return (
            <ExecutionParticle
              key={particle.id}
              id={particle.id}
              workflowId={particle.workflowId}
              status={particle.status}
              progress={particle.progress}
              laneY={workflow.yPosition}
              startX={-10}
              endX={20}
            />
          );
        })}
      </TrafficCanvas>
    );
  };

  return (
    <div className="h-screen w-full relative bg-[#0a1628] overflow-hidden">
      {/* Traffic Visualization (3D or SVG) */}
      <div className="w-full h-full">
        {renderTraffic()}
      </div>

      {/* Title - Top Center */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-center">
        <h1 className="text-2xl font-bold text-white tracking-wide">
          Live Traffic Observatory
        </h1>
        <p className="text-sm text-white/50 flex items-center justify-center gap-2">
          <Radio className="h-3 w-3 animate-pulse text-green-400" />
          Simulation Mode
        </p>
      </div>

      {/* Controls - Top Left */}
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
          onClick={() => {
            // Trigger burst of particles
            DEMO_WORKFLOWS.forEach((wf) => {
              const p = generateParticle(wf.id);
              setParticles((prev) => [...prev, p]);
              setStats((prev) => ({
                ...prev,
                activeExecutions: prev.activeExecutions + 1,
                totalToday: prev.totalToday + 1,
              }));
            });
          }}
          className="bg-black/50 border-white/20 hover:bg-black/70"
          title="Surge Mode"
        >
          <Zap className="h-4 w-4" />
        </Button>
      </div>

      {/* Throughput Meter - Top Right */}
      <div className="absolute top-4 right-4 w-32">
        <ThroughputMeter currentRate={throughput} maxRate={100} />
      </div>

      {/* Stats Panel - Bottom Left */}
      <div className="absolute bottom-4 left-4 w-64">
        <TrafficStats
          activeExecutions={stats.activeExecutions}
          totalToday={stats.totalToday}
          successRate={stats.successRate}
          avgLatencyMs={stats.avgLatencyMs}
        />
      </div>

      {/* Event Feed - Bottom Right */}
      <div className="absolute bottom-4 right-4 w-80">
        <EventFeed events={events} maxEvents={50} />
      </div>
    </div>
  );
}
