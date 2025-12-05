/**
 * TrafficSVG - SVG-based Traffic Visualization for Live Executions
 *
 * High-performance alternative to 3D Traffic using SVG with:
 * - Horizontal workflow lanes
 * - Animated particles via Web Animations API
 * - Gradient trails for movement
 *
 * Part of Stage 12.5: Live Traffic Observatory (Flat Mode)
 */

'use client';

import React, { useRef, useEffect, useMemo } from 'react';

export type SVGExecutionStatus = 'running' | 'succeeded' | 'failed';

export interface SVGTask {
  id: string;
  name: string;
  xPosition: number;
}

export interface SVGWorkflowLane {
  id: string;
  name: string;
  color: string;
  yPosition: number;
  tasks: SVGTask[];
}

export interface SVGParticle {
  id: string;
  workflowId: string;
  status: SVGExecutionStatus;
  progress: number;
}

export interface TrafficSVGProps {
  workflows: SVGWorkflowLane[];
  particles: SVGParticle[];
  className?: string;
}

// Status colors
const STATUS_COLORS: Record<SVGExecutionStatus, string> = {
  running: '#4a9eff',
  succeeded: '#10b981',
  failed: '#ef4444',
};

// Convert lane y position to SVG coordinates
function laneToY(yPosition: number): number {
  // Map from [-5, 5] to [100, 500]
  return 300 - yPosition * 40;
}

// Convert task x position to SVG coordinates
function taskToX(xPosition: number): number {
  // Map from [-10, 20] to [100, 700]
  return (xPosition + 10) * 20 + 100;
}

interface WorkflowLaneSVGProps {
  lane: SVGWorkflowLane;
}

function WorkflowLaneSVG({ lane }: WorkflowLaneSVGProps) {
  const y = laneToY(lane.yPosition);
  const startX = taskToX(-10);
  const endX = taskToX(20);

  return (
    <g className="workflow-lane">
      {/* Lane glow */}
      <defs>
        <linearGradient id={`lane-gradient-${lane.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={lane.color} stopOpacity="0" />
          <stop offset="10%" stopColor={lane.color} stopOpacity="0.3" />
          <stop offset="90%" stopColor={lane.color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={lane.color} stopOpacity="0" />
        </linearGradient>
        <filter id={`glow-${lane.id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Lane line */}
      <line
        x1={startX}
        y1={y}
        x2={endX}
        y2={y}
        stroke={`url(#lane-gradient-${lane.id})`}
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Lane label */}
      <text
        x={startX - 10}
        y={y}
        textAnchor="end"
        dominantBaseline="middle"
        fill="#fff"
        fontSize="11"
        fontWeight="500"
        fillOpacity="0.8"
      >
        {lane.name}
      </text>

      {/* Task nodes */}
      {lane.tasks.map((task) => {
        const taskX = taskToX(task.xPosition);
        return (
          <g key={task.id} className="task-node">
            {/* Task circle */}
            <circle
              cx={taskX}
              cy={y}
              r={8}
              fill="#1e293b"
              stroke={lane.color}
              strokeWidth="2"
            />
            {/* Task label */}
            <text
              x={taskX}
              y={y + 22}
              textAnchor="middle"
              fill="rgba(255,255,255,0.5)"
              fontSize="9"
            >
              {task.name}
            </text>
          </g>
        );
      })}
    </g>
  );
}

interface ParticleSVGProps {
  particle: SVGParticle;
  lane: SVGWorkflowLane;
}

function ParticleSVG({ particle, lane }: ParticleSVGProps) {
  const particleRef = useRef<SVGGElement>(null);
  const y = laneToY(lane.yPosition);
  const startX = taskToX(-10);
  const endX = taskToX(20);
  const currentX = startX + (endX - startX) * particle.progress;
  const color = STATUS_COLORS[particle.status];

  // Pulsing animation for running particles
  useEffect(() => {
    if (!particleRef.current || particle.status !== 'running') return;
    const glow = particleRef.current.querySelector('.particle-glow') as SVGElement;
    if (!glow) return;

    const animation = glow.animate(
      [
        { opacity: 0.4, transform: 'scale(1)' },
        { opacity: 0.7, transform: 'scale(1.3)' },
        { opacity: 0.4, transform: 'scale(1)' },
      ],
      {
        duration: 800,
        iterations: Infinity,
        easing: 'ease-in-out',
      }
    );

    return () => animation.cancel();
  }, [particle.status]);

  // Fade animation for completed particles
  const opacity = particle.status === 'running' ? 1 : Math.max(0, 1 - (particle.progress - 0.9) * 10);

  return (
    <g
      ref={particleRef}
      className="execution-particle"
      style={{ opacity, transition: 'opacity 0.5s' }}
    >
      {/* Trail gradient */}
      <defs>
        <linearGradient id={`trail-${particle.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="100%" stopColor={color} stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* Trail */}
      {particle.progress > 0.05 && (
        <line
          x1={currentX - 40}
          y1={y}
          x2={currentX}
          y2={y}
          stroke={`url(#trail-${particle.id})`}
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}

      {/* Particle glow */}
      <circle
        className="particle-glow"
        cx={currentX}
        cy={y}
        r={12}
        fill={color}
        fillOpacity="0.3"
        style={{ transformOrigin: `${currentX}px ${y}px` }}
      />

      {/* Particle core */}
      <circle
        cx={currentX}
        cy={y}
        r={6}
        fill={color}
      />

      {/* Inner highlight */}
      <circle
        cx={currentX - 1}
        cy={y - 1}
        r={2}
        fill="#fff"
        fillOpacity="0.5"
      />
    </g>
  );
}

export function TrafficSVG({ workflows, particles, className }: TrafficSVGProps) {
  // Grid background dots
  const gridDots = useMemo(() => {
    const dots = [];
    for (let x = 50; x < 750; x += 30) {
      for (let y = 50; y < 550; y += 30) {
        dots.push({ x, y });
      }
    }
    return dots;
  }, []);

  return (
    <div
      className={`w-full h-full bg-[#0a1628] ${className || ''}`}
      role="img"
      aria-label="SVG Traffic visualization of workflow executions"
    >
      <svg
        viewBox="0 0 800 600"
        className="w-full h-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Global filters */}
        <defs>
          <filter id="traffic-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Grid background */}
        <g className="grid" opacity="0.1">
          {gridDots.map((dot, i) => (
            <circle key={i} cx={dot.x} cy={dot.y} r={1} fill="#fff" />
          ))}
        </g>

        {/* Workflow lanes */}
        {workflows.map((workflow) => (
          <WorkflowLaneSVG key={workflow.id} lane={workflow} />
        ))}

        {/* Execution particles */}
        {particles.map((particle) => {
          const lane = workflows.find((w) => w.id === particle.workflowId);
          if (!lane) return null;
          return <ParticleSVG key={particle.id} particle={particle} lane={lane} />;
        })}
      </svg>
    </div>
  );
}

export default TrafficSVG;
