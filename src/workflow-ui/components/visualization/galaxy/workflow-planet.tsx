/**
 * WorkflowPlanet - Orbiting planet representing a workflow
 *
 * Each workflow orbits around its namespace cluster as a glowing planet.
 * Task "moons" orbit around the planet.
 *
 * Part of Stage 12.3: Namespace Galaxy Visualization
 */

'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Sphere } from '@react-three/drei';
import type { Group } from 'three';

export interface WorkflowPlanetProps {
  id: string;
  name: string;
  orbitRadius: number;
  orbitSpeed: number;
  color: string;
  taskCount: number;
  initialAngle?: number;
  children?: React.ReactNode;
  onClick?: (id: string) => void;
  onHover?: (id: string, isHovered: boolean) => void;
}

export function WorkflowPlanet({
  id,
  name,
  orbitRadius,
  orbitSpeed,
  color,
  taskCount,
  initialAngle = 0,
  children,
  onClick,
  onHover,
}: WorkflowPlanetProps) {
  const groupRef = useRef<Group>(null);
  const angleRef = useRef(initialAngle);

  // Calculate radius based on task count (smaller than namespace clusters)
  const radius = useMemo(() => {
    const baseRadius = 0.4;
    const scaleFactor = Math.log2(Math.max(1, taskCount) + 1) * 0.15;
    return baseRadius + scaleFactor;
  }, [taskCount]);

  // Orbital animation
  useFrame((state, delta) => {
    if (groupRef.current) {
      angleRef.current += orbitSpeed * delta;
      const x = Math.cos(angleRef.current) * orbitRadius;
      const z = Math.sin(angleRef.current) * orbitRadius;
      groupRef.current.position.set(x, 0, z);
    }
  });

  const handleClick = () => {
    onClick?.(id);
  };

  const handlePointerOver = () => {
    onHover?.(id, true);
  };

  const handlePointerOut = () => {
    onHover?.(id, false);
  };

  return (
    <group ref={groupRef}>
      {/* Planet sphere */}
      <Sphere
        args={[radius, 32, 32]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          roughness={0.3}
          metalness={0.7}
        />
      </Sphere>

      {/* Workflow label */}
      <Html
        position={[0, radius + 0.5, 0]}
        center
        distanceFactor={10}
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div
          className="px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: color,
            border: `1px solid ${color}`,
          }}
        >
          {name}
        </div>
      </Html>

      {/* Task moons (children) */}
      {children}
    </group>
  );
}

export default WorkflowPlanet;
