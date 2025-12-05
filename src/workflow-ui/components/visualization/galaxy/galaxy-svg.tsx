/**
 * GalaxySVG - SVG-based Galaxy Visualization for Namespace Display
 *
 * High-performance alternative to 3D Galaxy using SVG with:
 * - Radial gradients for glow effects
 * - Web Animations API for smooth animations
 * - ViewBox manipulation for pan/zoom
 *
 * Part of Stage 12.3: Namespace Galaxy Visualization (Flat Mode)
 */

'use client';

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';

export interface SVGWorkflow {
  id: string;
  name: string;
  taskCount: number;
  color: string;
}

export interface SVGNamespace {
  id: string;
  name: string;
  color: string;
  position: [number, number, number];
  workflows: SVGWorkflow[];
}

export interface GalaxySVGProps {
  namespaces: SVGNamespace[];
  onNamespaceClick?: (id: string) => void;
  onWorkflowClick?: (id: string) => void;
  selectedNamespace?: string | null;
  selectedWorkflow?: string | null;
  className?: string;
}

// Convert 3D position to 2D (simple orthographic projection)
function projectTo2D(pos: [number, number, number]): { x: number; y: number } {
  // Simple projection: use x and z, offset y slightly
  return {
    x: pos[0] * 10 + 400, // Center in viewBox
    y: pos[2] * 10 + 300 + pos[1] * 2,
  };
}

interface NamespaceClusterSVGProps {
  namespace: SVGNamespace;
  selected: boolean;
  onNamespaceClick?: (id: string) => void;
  onWorkflowClick?: (id: string) => void;
  selectedWorkflow?: string | null;
}

function NamespaceClusterSVG({
  namespace,
  selected,
  onNamespaceClick,
  onWorkflowClick,
  selectedWorkflow,
}: NamespaceClusterSVGProps) {
  const clusterRef = useRef<SVGGElement>(null);
  const { x, y } = projectTo2D(namespace.position);
  const baseRadius = 30 + namespace.workflows.length * 8;

  // Pulsing animation using Web Animations API
  useEffect(() => {
    if (!clusterRef.current) return;
    const circle = clusterRef.current.querySelector('.cluster-glow') as SVGElement;
    if (!circle) return;

    const animation = circle.animate(
      [
        { opacity: 0.4, transform: 'scale(1)' },
        { opacity: 0.6, transform: 'scale(1.05)' },
        { opacity: 0.4, transform: 'scale(1)' },
      ],
      {
        duration: 3000 + Math.random() * 1000,
        iterations: Infinity,
        easing: 'ease-in-out',
      }
    );

    return () => animation.cancel();
  }, []);

  // Workflow orbit positions
  const workflowPositions = useMemo(() => {
    return namespace.workflows.map((wf, index) => {
      const angle = (index / namespace.workflows.length) * Math.PI * 2;
      const orbitRadius = baseRadius + 25 + index * 12;
      return {
        ...wf,
        cx: x + Math.cos(angle) * orbitRadius,
        cy: y + Math.sin(angle) * orbitRadius,
        radius: 8 + wf.taskCount,
        angle,
        orbitRadius,
      };
    });
  }, [namespace.workflows, x, y, baseRadius]);

  return (
    <g ref={clusterRef} className="namespace-cluster">
      {/* Glow filter definition */}
      <defs>
        <radialGradient id={`glow-${namespace.id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={namespace.color} stopOpacity="0.8" />
          <stop offset="50%" stopColor={namespace.color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={namespace.color} stopOpacity="0" />
        </radialGradient>
        <filter id={`blur-${namespace.id}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" />
        </filter>
      </defs>

      {/* Outer glow */}
      <circle
        className="cluster-glow"
        cx={x}
        cy={y}
        r={baseRadius * 1.5}
        fill={`url(#glow-${namespace.id})`}
        style={{ transformOrigin: `${x}px ${y}px` }}
      />

      {/* Main cluster circle */}
      <circle
        cx={x}
        cy={y}
        r={baseRadius}
        fill={namespace.color}
        fillOpacity={selected ? 0.8 : 0.6}
        stroke={selected ? '#fff' : namespace.color}
        strokeWidth={selected ? 3 : 1}
        className="cursor-pointer transition-all duration-300"
        onClick={() => onNamespaceClick?.(namespace.id)}
      />

      {/* Namespace label */}
      <text
        x={x}
        y={y - baseRadius - 15}
        textAnchor="middle"
        fill="#fff"
        fontSize="12"
        fontWeight="500"
        className="pointer-events-none"
      >
        {namespace.name}
      </text>
      <text
        x={x}
        y={y - baseRadius - 3}
        textAnchor="middle"
        fill="rgba(255,255,255,0.5)"
        fontSize="10"
        className="pointer-events-none"
      >
        ({namespace.workflows.length})
      </text>

      {/* Workflow planets */}
      {workflowPositions.map((wf) => (
        <WorkflowPlanetSVG
          key={wf.id}
          workflow={wf}
          centerX={x}
          centerY={y}
          selected={selectedWorkflow === wf.id}
          onWorkflowClick={onWorkflowClick}
        />
      ))}
    </g>
  );
}

interface WorkflowPlanetSVGProps {
  workflow: SVGWorkflow & { cx: number; cy: number; radius: number; angle: number; orbitRadius: number };
  centerX: number;
  centerY: number;
  selected: boolean;
  onWorkflowClick?: (id: string) => void;
}

function WorkflowPlanetSVG({
  workflow,
  centerX,
  centerY,
  selected,
  onWorkflowClick,
}: WorkflowPlanetSVGProps) {
  const planetRef = useRef<SVGGElement>(null);

  // Orbit animation using Web Animations API
  useEffect(() => {
    if (!planetRef.current) return;

    const duration = 20000 + workflow.orbitRadius * 200;
    const animation = planetRef.current.animate(
      [
        { transform: `rotate(0deg)` },
        { transform: `rotate(360deg)` },
      ],
      {
        duration,
        iterations: Infinity,
        easing: 'linear',
      }
    );

    return () => animation.cancel();
  }, [workflow.orbitRadius]);

  return (
    <g
      ref={planetRef}
      style={{ transformOrigin: `${centerX}px ${centerY}px` }}
    >
      {/* Orbit path (subtle) */}
      <circle
        cx={centerX}
        cy={centerY}
        r={workflow.orbitRadius}
        fill="none"
        stroke="rgba(255,255,255,0.1)"
        strokeWidth="1"
        strokeDasharray="4 4"
      />

      {/* Planet glow */}
      <circle
        cx={workflow.cx}
        cy={workflow.cy}
        r={workflow.radius * 1.5}
        fill={workflow.color}
        fillOpacity={0.3}
      />

      {/* Planet */}
      <circle
        cx={workflow.cx}
        cy={workflow.cy}
        r={workflow.radius}
        fill={workflow.color}
        stroke={selected ? '#fff' : 'rgba(255,255,255,0.3)'}
        strokeWidth={selected ? 2 : 1}
        className="cursor-pointer transition-all duration-200"
        onClick={(e) => {
          e.stopPropagation();
          onWorkflowClick?.(workflow.id);
        }}
      />

      {/* Planet label (only on hover/select for performance) */}
      {selected && (
        <text
          x={workflow.cx}
          y={workflow.cy + workflow.radius + 14}
          textAnchor="middle"
          fill="#fff"
          fontSize="9"
          className="pointer-events-none"
        >
          {workflow.name}
        </text>
      )}
    </g>
  );
}

export function GalaxySVG({
  namespaces,
  onNamespaceClick,
  onWorkflowClick,
  selectedNamespace,
  selectedWorkflow,
  className,
}: GalaxySVGProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 800, height: 600 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Pan handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      const dx = (e.clientX - panStart.x) * (viewBox.width / 800);
      const dy = (e.clientY - panStart.y) * (viewBox.height / 600);
      setViewBox((prev) => ({
        ...prev,
        x: prev.x - dx,
        y: prev.y - dy,
      }));
      setPanStart({ x: e.clientX, y: e.clientY });
    },
    [isPanning, panStart, viewBox.width, viewBox.height]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  // Zoom handling
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    // Zoom towards mouse position
    const mouseX = ((e.clientX - rect.left) / rect.width) * viewBox.width + viewBox.x;
    const mouseY = ((e.clientY - rect.top) / rect.height) * viewBox.height + viewBox.y;

    const newWidth = viewBox.width * zoomFactor;
    const newHeight = viewBox.height * zoomFactor;

    // Clamp zoom
    if (newWidth < 200 || newWidth > 3000) return;

    setViewBox({
      x: mouseX - (mouseX - viewBox.x) * zoomFactor,
      y: mouseY - (mouseY - viewBox.y) * zoomFactor,
      width: newWidth,
      height: newHeight,
    });
  }, [viewBox]);

  // Stars background
  const stars = useMemo(() => {
    const result = [];
    for (let i = 0; i < 200; i++) {
      result.push({
        x: Math.random() * 800,
        y: Math.random() * 600,
        r: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.3,
      });
    }
    return result;
  }, []);

  return (
    <div
      className={`w-full h-full bg-[#000010] ${className || ''}`}
      role="img"
      aria-label="SVG Galaxy visualization of workflow namespaces"
    >
      <svg
        ref={svgRef}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        className="w-full h-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        {/* Global filters */}
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Star field background */}
        <g className="stars">
          {stars.map((star, i) => (
            <circle
              key={i}
              cx={star.x}
              cy={star.y}
              r={star.r}
              fill="#fff"
              fillOpacity={star.opacity}
            />
          ))}
        </g>

        {/* Namespace clusters */}
        {namespaces.map((namespace) => (
          <NamespaceClusterSVG
            key={namespace.id}
            namespace={namespace}
            selected={selectedNamespace === namespace.id}
            onNamespaceClick={onNamespaceClick}
            onWorkflowClick={onWorkflowClick}
            selectedWorkflow={selectedWorkflow}
          />
        ))}
      </svg>
    </div>
  );
}

export default GalaxySVG;
