/**
 * TaskNode3D - 3D task node (neuron) component
 *
 * Renders a glowing sphere representing a task in the workflow.
 * Provides:
 * - Status-based color coding (idle, running, succeeded, failed)
 * - Pulse animation when running
 * - Hover and click interactions
 * - Label display
 */

'use client';

import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useVisualizationStore, type NodeStatus, type Vector3 } from '../../lib/visualization/visualization-store';
import { getThemePreset } from '../../lib/visualization/theme';

interface TaskNode3DProps {
  id: string;
  label: string;
  status: NodeStatus;
  position: Vector3;
  selected?: boolean;
  showLabel?: boolean;
  sizeScale?: number;
  onClick?: (id: string) => void;
  onHover?: (id: string, isHovered: boolean) => void;
}

export function TaskNode3D({
  id,
  label,
  status,
  position,
  selected = false,
  showLabel = true,
  sizeScale = 1,
  onClick,
  onHover,
}: TaskNode3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [isHovered, setIsHovered] = useState(false);

  const themePreset = useVisualizationStore((state) => state.themePreset);
  const theme = getThemePreset(themePreset);

  // Get color based on status
  const color = useMemo(() => {
    return theme.nodeColors[status] || theme.nodeColors.idle;
  }, [theme, status]);

  // Calculate emissive intensity
  const emissiveIntensity = useMemo(() => {
    let intensity = theme.nodeEmissiveIntensity;
    if (status === 'running') {
      intensity *= 1.5;
    }
    if (isHovered || selected) {
      intensity *= 1.3;
    }
    return intensity;
  }, [theme, status, isHovered, selected]);

  // Node size (base * scale, slightly larger when selected or hovered)
  const nodeSize = useMemo(() => {
    let size = theme.nodeSize * sizeScale;
    if (selected) {
      size *= 1.2;
    } else if (isHovered) {
      size *= 1.1;
    }
    return size;
  }, [theme, sizeScale, selected, isHovered]);

  // Animation for running state
  useFrame(({ clock }) => {
    if (!meshRef.current) return;

    if (status === 'running') {
      // Pulsing animation
      const time = clock.getElapsedTime();
      const pulse = Math.sin(time * theme.pulseSpeed * Math.PI) * theme.pulseAmplitude;
      meshRef.current.scale.setScalar(1 + pulse);

      // Also animate emissive intensity
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      if (material.emissiveIntensity !== undefined) {
        material.emissiveIntensity = emissiveIntensity * (1 + pulse * 0.5);
      }
    } else if (status === 'succeeded') {
      // Brief flash animation on success
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      if (material.emissiveIntensity !== undefined) {
        // Fade emissive back to normal
        material.emissiveIntensity = Math.max(
          emissiveIntensity,
          material.emissiveIntensity * 0.98
        );
      }
    }
  });

  const handleClick = () => {
    onClick?.(id);
  };

  const handlePointerOver = () => {
    setIsHovered(true);
    onHover?.(id, true);
  };

  const handlePointerOut = () => {
    setIsHovered(false);
    onHover?.(id, false);
  };

  return (
    <group position={[position.x, position.y, position.z]}>
      {/* Main sphere */}
      <Sphere
        ref={meshRef}
        args={[nodeSize, 32, 32]}
        position={[0, 0, 0]}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          roughness={0.2}
          metalness={0.8}
          transparent
          opacity={selected ? 1 : 0.9}
        />
      </Sphere>

      {/* Glow ring for selected state */}
      {selected && (
        <Sphere args={[nodeSize * 1.3, 16, 16]}>
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.2}
            side={THREE.BackSide}
          />
        </Sphere>
      )}

      {/* Label */}
      {showLabel && (
        <Html
          position={[0, nodeSize + 0.3, 0]}
          center
          distanceFactor={8}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.75)',
              color: '#fff',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
              border: `1px solid ${color}`,
              boxShadow: `0 0 10px ${color}40`,
            }}
          >
            {label}
            {status === 'running' && (
              <span style={{ marginLeft: '6px', color: theme.nodeColors.running }}>
                ●
              </span>
            )}
            {status === 'succeeded' && (
              <span style={{ marginLeft: '6px', color: theme.nodeColors.succeeded }}>
                ✓
              </span>
            )}
            {status === 'failed' && (
              <span style={{ marginLeft: '6px', color: theme.nodeColors.failed }}>
                ✗
              </span>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}
