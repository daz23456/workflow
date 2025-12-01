/**
 * NamespaceCluster - Glowing sphere representing a namespace
 *
 * Each namespace in the galaxy view is displayed as a glowing, pulsating sphere.
 * The size scales with the number of workflows in the namespace.
 * Workflow "planets" orbit around the cluster.
 *
 * Part of Stage 12.3: Namespace Galaxy Visualization
 */

'use client';

import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Sphere, MeshDistortMaterial } from '@react-three/drei';
import type { Mesh, Group } from 'three';

export interface NamespaceClusterProps {
  id: string;
  name: string;
  position: [number, number, number];
  color: string;
  workflowCount: number;
  children?: React.ReactNode;
  onClick?: (id: string) => void;
  onHover?: (id: string, isHovered: boolean) => void;
}

export function NamespaceCluster({
  id,
  name,
  position,
  color,
  workflowCount,
  children,
  onClick,
  onHover,
}: NamespaceClusterProps) {
  const groupRef = useRef<Group>(null);
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Calculate radius based on workflow count (min 1.5, scales logarithmically)
  const radius = useMemo(() => {
    const baseRadius = 1.5;
    const scaleFactor = Math.log2(Math.max(1, workflowCount) + 1) * 0.5;
    return baseRadius + scaleFactor;
  }, [workflowCount]);

  // Subtle rotation animation
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1;
    }
    if (meshRef.current) {
      // Pulsate effect
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.02;
      meshRef.current.scale.setScalar(hovered ? scale * 1.1 : scale);
    }
  });

  const handleClick = () => {
    onClick?.(id);
  };

  const handlePointerOver = () => {
    setHovered(true);
    onHover?.(id, true);
  };

  const handlePointerOut = () => {
    setHovered(false);
    onHover?.(id, false);
  };

  return (
    <group ref={groupRef} position={position}>
      {/* Main glowing sphere */}
      <Sphere
        ref={meshRef}
        args={[radius, 64, 64]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <MeshDistortMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.8 : 0.5}
          transparent
          opacity={0.7}
          distort={0.3}
          speed={2}
          roughness={0.2}
        />
      </Sphere>

      {/* Inner glow core */}
      <Sphere args={[radius * 0.6, 32, 32]}>
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </Sphere>

      {/* Namespace label */}
      <Html
        position={[0, radius + 1, 0]}
        center
        distanceFactor={15}
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        <div
          className="px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: color,
            border: `1px solid ${color}`,
            textShadow: `0 0 10px ${color}`,
          }}
        >
          {name}
          <span className="ml-2 opacity-70">({workflowCount})</span>
        </div>
      </Html>

      {/* Workflow planets (children) orbit around the cluster */}
      {children}
    </group>
  );
}

export default NamespaceCluster;
