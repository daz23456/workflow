/**
 * ExecutionParticle Component
 *
 * Animated glowing orb representing a workflow execution
 * flowing through the traffic visualization.
 *
 * Stage 12.5: Live Traffic Observatory
 */

'use client';

import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Trail } from '@react-three/drei';
import { Mesh, Color } from 'three';

export type ExecutionStatus = 'running' | 'succeeded' | 'failed';

export interface ExecutionParticleProps {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  progress: number; // 0 to 1
  laneY: number;
  startX: number;
  endX: number;
  speed?: number;
  size?: number;
}

// Status to color mapping
const STATUS_COLORS: Record<ExecutionStatus, string> = {
  running: '#4a9eff',   // Blue
  succeeded: '#4ade80', // Green
  failed: '#ef4444',    // Red
};

export function ExecutionParticle({
  id,
  status,
  progress,
  laneY,
  startX,
  endX,
  speed = 1,
  size = 0.3,
}: ExecutionParticleProps) {
  const meshRef = useRef<Mesh>(null);
  const _progressRef = useRef(progress);

  const color = useMemo(() => new Color(STATUS_COLORS[status]), [status]);

  // Calculate current X position based on progress
  const currentX = useMemo(() => {
    const range = endX - startX;
    return startX + range * Math.min(1, Math.max(0, progress));
  }, [startX, endX, progress]);

  // Animate pulsing glow
  useFrame((state) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(state.clock.getElapsedTime() * 3 * speed) * 0.1;
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group
      data-testid={`execution-particle-${id}`}
      position={[currentX, laneY, 0]}
    >
      <Trail
        width={1}
        length={5}
        color={color}
        attenuation={(t) => t * t}
      >
        <Sphere ref={meshRef} args={[size, 16, 16]}>
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={status === 'running' ? 0.8 : 0.5}
            transparent
            opacity={status === 'succeeded' ? 0.7 : 1}
          />
        </Sphere>
      </Trail>

      {/* Glow effect - larger transparent sphere */}
      <Sphere args={[size * 2, 8, 8]}>
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.15}
        />
      </Sphere>
    </group>
  );
}
