/**
 * SignalFlowEffect - Animated signal flow between nodes
 *
 * Renders animated effects representing data flow through the workflow.
 * Effects follow the curved edge paths (quadratic bezier curves).
 * In hub-spoke mode, signals route through the center hub.
 *
 * Different presets create distinct visual styles:
 * - Electric Pulses: Sparking, jittery particles with flashes
 * - Particle Stream: Multiple flowing orbs in sequence
 * - Wave Ripple: Expanding ring that travels along the path
 * - Light Trail: Single particle with a glowing trailing tail
 */

'use client';

import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sphere, Ring } from '@react-three/drei';
import * as THREE from 'three';
import { useVisualizationStore, type LayoutMode } from '../../lib/visualization/visualization-store';
import { getSignalFlowPreset } from '../../lib/visualization/theme';

interface SignalFlowEffectProps {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  onComplete?: () => void;
}

/**
 * Quadratic bezier curve interpolation
 * B(t) = (1-t)² * P0 + 2(1-t)t * P1 + t² * P2
 */
function quadraticBezier(
  start: THREE.Vector3,
  control: THREE.Vector3,
  end: THREE.Vector3,
  t: number
): THREE.Vector3 {
  const t1 = 1 - t;
  return new THREE.Vector3(
    t1 * t1 * start.x + 2 * t1 * t * control.x + t * t * end.x,
    t1 * t1 * start.y + 2 * t1 * t * control.y + t * t * end.y,
    t1 * t1 * start.z + 2 * t1 * t * control.z + t * t * end.z
  );
}

// Check if a position is at/near the hub center
function isAtHub(pos: THREE.Vector3): boolean {
  const threshold = 1.0;
  return Math.abs(pos.x) < threshold &&
         Math.abs(pos.y) < threshold &&
         Math.abs(pos.z) < threshold;
}

// Hub center position
const HUB_CENTER = new THREE.Vector3(0, 0, 0.5);

/**
 * Linear interpolation between two points
 */
function lerp(start: THREE.Vector3, end: THREE.Vector3, t: number): THREE.Vector3 {
  return new THREE.Vector3(
    start.x + (end.x - start.x) * t,
    start.y + (end.y - start.y) * t,
    start.z + (end.z - start.z) * t
  );
}

/**
 * Calculate animation position for hub-spoke mode
 * Animates in two segments: source → hub (0-0.5), hub → target (0.5-1)
 */
function hubSpokePosition(
  start: THREE.Vector3,
  end: THREE.Vector3,
  progress: number
): THREE.Vector3 {
  if (progress <= 0.5) {
    // First half: source spoke → hub
    const t = progress * 2; // 0-1 for first segment
    return lerp(start, HUB_CENTER, t);
  } else {
    // Second half: hub → target spoke
    const t = (progress - 0.5) * 2; // 0-1 for second segment
    return lerp(HUB_CENTER, end, t);
  }
}

/**
 * Calculate the curved midpoint for the bezier curve
 * In hub-spoke mode, routes through center if both nodes are spokes
 */
function calculateCurveControl(
  start: THREE.Vector3,
  end: THREE.Vector3,
  layoutMode: LayoutMode
): THREE.Vector3 {
  // Hub-spoke mode: use hub center (actual animation uses hubSpokePosition)
  if (layoutMode === 'hub-spoke') {
    const startIsHub = isAtHub(start);
    const endIsHub = isAtHub(end);

    if (!startIsHub && !endIsHub) {
      // Both are spokes - control point at hub
      return HUB_CENTER.clone();
    }

    // One is hub - direct path (midpoint)
    return new THREE.Vector3(
      (start.x + end.x) / 2,
      (start.y + end.y) / 2,
      (start.z + end.z) / 2
    );
  }

  // Default curve calculation
  const midX = (start.x + end.x) / 2;
  const midY = (start.y + end.y) / 2;
  const midZ = (start.z + end.z) / 2;

  // Calculate perpendicular offset for curve
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const curveOffset = Math.min(distance * 0.3, 1.5);

  // Perpendicular offset
  const perpX = -dy / (distance || 1);
  const perpY = dx / (distance || 1);

  return new THREE.Vector3(
    midX + perpX * curveOffset,
    midY + perpY * curveOffset,
    midZ + 0.2
  );
}

/**
 * Get position along path based on layout mode
 */
function getPathPosition(
  start: THREE.Vector3,
  control: THREE.Vector3,
  end: THREE.Vector3,
  progress: number,
  layoutMode: LayoutMode
): THREE.Vector3 {
  // Hub-spoke with both nodes as spokes: use two-segment linear path
  if (layoutMode === 'hub-spoke' && !isAtHub(start) && !isAtHub(end)) {
    return hubSpokePosition(start, end, progress);
  }
  // Default: quadratic bezier
  return quadraticBezier(start, control, end, progress);
}

export function SignalFlowEffect({
  id: _id,
  fromNodeId,
  toNodeId,
  onComplete,
}: SignalFlowEffectProps) {
  const progressRef = useRef(0);
  const isCompleteRef = useRef(false);
  const [, forceUpdate] = useState(0);

  const signalFlowPreset = useVisualizationStore((state) => state.signalFlowPreset);
  const layoutMode = useVisualizationStore((state) => state.layoutMode);
  const nodes = useVisualizationStore((state) => state.nodes);

  const preset = getSignalFlowPreset(signalFlowPreset);

  // Get node positions
  const sourceNode = nodes.get(fromNodeId);
  const targetNode = nodes.get(toNodeId);

  // Start, control, and end positions for bezier curve
  const startPos = useMemo(
    () =>
      sourceNode
        ? new THREE.Vector3(sourceNode.position.x, sourceNode.position.y, sourceNode.position.z)
        : new THREE.Vector3(),
    [sourceNode]
  );

  const endPos = useMemo(
    () =>
      targetNode
        ? new THREE.Vector3(targetNode.position.x, targetNode.position.y, targetNode.position.z)
        : new THREE.Vector3(),
    [targetNode]
  );

  // Calculate curve control point (same as edge curve, hub-spoke aware)
  const controlPos = useMemo(
    () => calculateCurveControl(startPos, endPos, layoutMode),
    [startPos, endPos, layoutMode]
  );

  // Don't render if nodes don't exist or animation is complete
  if (!sourceNode || !targetNode || isCompleteRef.current) {
    return null;
  }

  // Render based on preset type
  switch (signalFlowPreset) {
    case 'electric-pulses':
      return (
        <ElectricPulsesEffect
          startPos={startPos}
          controlPos={controlPos}
          endPos={endPos}
          preset={preset}
          progressRef={progressRef}
          isCompleteRef={isCompleteRef}
          onComplete={onComplete}
          forceUpdate={forceUpdate}
          layoutMode={layoutMode}
        />
      );
    case 'wave-ripple':
      return (
        <WaveRippleEffect
          startPos={startPos}
          controlPos={controlPos}
          endPos={endPos}
          preset={preset}
          progressRef={progressRef}
          isCompleteRef={isCompleteRef}
          onComplete={onComplete}
          forceUpdate={forceUpdate}
          layoutMode={layoutMode}
        />
      );
    case 'light-trail':
      return (
        <LightTrailEffect
          startPos={startPos}
          controlPos={controlPos}
          endPos={endPos}
          preset={preset}
          progressRef={progressRef}
          isCompleteRef={isCompleteRef}
          onComplete={onComplete}
          forceUpdate={forceUpdate}
          layoutMode={layoutMode}
        />
      );
    case 'particle-stream':
    default:
      return (
        <ParticleStreamEffect
          startPos={startPos}
          controlPos={controlPos}
          endPos={endPos}
          preset={preset}
          progressRef={progressRef}
          isCompleteRef={isCompleteRef}
          onComplete={onComplete}
          forceUpdate={forceUpdate}
          layoutMode={layoutMode}
        />
      );
  }
}

// Common props for effect components
interface EffectProps {
  startPos: THREE.Vector3;
  controlPos: THREE.Vector3;
  endPos: THREE.Vector3;
  preset: ReturnType<typeof getSignalFlowPreset>;
  progressRef: React.MutableRefObject<number>;
  isCompleteRef: React.MutableRefObject<boolean>;
  onComplete?: () => void;
  forceUpdate: React.Dispatch<React.SetStateAction<number>>;
  layoutMode: LayoutMode;
}

/**
 * Electric Pulses - Sparking particles with jittery movement following the curve
 */
function ElectricPulsesEffect({
  startPos,
  controlPos,
  endPos,
  preset,
  progressRef,
  isCompleteRef,
  onComplete,
  forceUpdate,
  layoutMode,
}: EffectProps) {
  const groupRef = useRef<THREE.Group>(null);
  const sparkRefs = useRef<THREE.Mesh[]>([]);
  const flashRef = useRef(0);

  // Create spark offsets for jittery movement
  const sparkOffsets = useMemo(() => {
    return Array.from({ length: 5 }, () => ({
      x: (Math.random() - 0.5) * 0.2,
      y: (Math.random() - 0.5) * 0.2,
      z: (Math.random() - 0.5) * 0.2,
      phase: Math.random() * Math.PI * 2,
    }));
  }, []);

  useFrame((_state, delta) => {
    if (isCompleteRef.current) return;

    progressRef.current += (delta * preset.speed) / 2;
    flashRef.current += delta * 25;

    if (progressRef.current >= 1) {
      isCompleteRef.current = true;
      onComplete?.();
      forceUpdate((n) => n + 1);
      return;
    }

    if (groupRef.current) {
      // Follow path (hub-spoke aware)
      const basePos = getPathPosition(startPos, controlPos, endPos, progressRef.current, layoutMode);
      groupRef.current.position.copy(basePos);

      // Update individual sparks with jittery movement
      sparkRefs.current.forEach((spark, i) => {
        if (spark) {
          const offset = sparkOffsets[i];
          const jitter = Math.sin(flashRef.current + offset.phase) * 0.08;
          spark.position.set(
            offset.x + jitter,
            offset.y + Math.cos(flashRef.current + offset.phase) * 0.08,
            offset.z + jitter
          );
          // Random flash intensity
          const material = spark.material as THREE.MeshBasicMaterial;
          material.opacity = 0.4 + Math.random() * 0.6;
        }
      });
    }
  });

  return (
    <group ref={groupRef} position={[startPos.x, startPos.y, startPos.z]}>
      {/* Main bright core */}
      <Sphere args={[preset.particleSize * 1.2, 16, 16]}>
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </Sphere>
      {/* Surrounding sparks */}
      {sparkOffsets.map((offset, i) => (
        <Sphere
          key={i}
          ref={(el) => { if (el) sparkRefs.current[i] = el; }}
          args={[preset.particleSize * 0.35, 8, 8]}
          position={[offset.x, offset.y, offset.z]}
        >
          <meshBasicMaterial color={preset.color} transparent opacity={0.8} />
        </Sphere>
      ))}
      {/* Glow sphere */}
      <Sphere args={[preset.particleSize * 2, 16, 16]}>
        <meshBasicMaterial color={preset.color} transparent opacity={0.2} />
      </Sphere>
    </group>
  );
}

/**
 * Particle Stream - Multiple flowing orbs in sequence along the curve
 */
function ParticleStreamEffect({
  startPos,
  controlPos,
  endPos,
  preset,
  progressRef,
  isCompleteRef,
  onComplete,
  forceUpdate,
  layoutMode,
}: EffectProps) {
  const particleRefs = useRef<THREE.Mesh[]>([]);
  const particleCount = 6;
  const spacing = 0.12;

  useFrame((_, delta) => {
    if (isCompleteRef.current) return;

    progressRef.current += (delta * preset.speed) / 2;

    if (progressRef.current >= 1 + spacing * particleCount) {
      isCompleteRef.current = true;
      onComplete?.();
      forceUpdate((n) => n + 1);
      return;
    }

    particleRefs.current.forEach((particle, i) => {
      if (particle) {
        const particleProgress = Math.max(0, Math.min(1, progressRef.current - i * spacing));
        // Follow path (hub-spoke aware)
        const pos = getPathPosition(startPos, controlPos, endPos, particleProgress, layoutMode);
        particle.position.copy(pos);

        // Fade in at start, fade out at end
        const material = particle.material as THREE.MeshBasicMaterial;
        const fadeIn = Math.min(1, particleProgress * 5);
        const fadeOut = Math.min(1, (1 - particleProgress) * 5);
        material.opacity = fadeIn * fadeOut * 0.9;

        // Pulse scale
        const pulse = 1 + Math.sin(particleProgress * Math.PI * 6 + i) * 0.2;
        particle.scale.setScalar(pulse);
      }
    });
  });

  return (
    <group>
      {Array.from({ length: particleCount }, (_, i) => (
        <Sphere
          key={i}
          ref={(el) => { if (el) particleRefs.current[i] = el; }}
          args={[preset.particleSize * (1 - i * 0.08), 16, 16]}
          position={[startPos.x, startPos.y, startPos.z]}
        >
          <meshBasicMaterial color={preset.color} transparent opacity={0.9} />
        </Sphere>
      ))}
    </group>
  );
}

/**
 * Wave Ripple - Expanding rings that travel along the curved path
 */
function WaveRippleEffect({
  startPos,
  controlPos,
  endPos,
  preset,
  progressRef,
  isCompleteRef,
  onComplete,
  forceUpdate,
  layoutMode,
}: EffectProps) {
  const ringRefs = useRef<THREE.Mesh[]>([]);
  const centerRef = useRef<THREE.Mesh>(null);
  const ringCount = 3;
  const ringSpacing = 0.15;

  useFrame((_, delta) => {
    if (isCompleteRef.current) return;

    progressRef.current += (delta * preset.speed) / 2.5;

    if (progressRef.current >= 1 + ringSpacing * ringCount) {
      isCompleteRef.current = true;
      onComplete?.();
      forceUpdate((n) => n + 1);
      return;
    }

    // Update center particle
    if (centerRef.current) {
      const centerProgress = Math.min(1, progressRef.current);
      const pos = getPathPosition(startPos, controlPos, endPos, centerProgress, layoutMode);
      centerRef.current.position.copy(pos);
    }

    // Update rings - they follow the path and expand
    ringRefs.current.forEach((ring, i) => {
      if (ring) {
        const ringProgress = Math.max(0, Math.min(1, progressRef.current - i * ringSpacing));
        const pos = getPathPosition(startPos, controlPos, endPos, ringProgress, layoutMode);
        ring.position.copy(pos);

        // Calculate tangent direction for ring orientation
        const t = ringProgress;
        const tangent = new THREE.Vector3(
          2 * (1 - t) * (controlPos.x - startPos.x) + 2 * t * (endPos.x - controlPos.x),
          2 * (1 - t) * (controlPos.y - startPos.y) + 2 * t * (endPos.y - controlPos.y),
          2 * (1 - t) * (controlPos.z - startPos.z) + 2 * t * (endPos.z - controlPos.z)
        ).normalize();

        // Orient ring perpendicular to travel direction
        const quaternion = new THREE.Quaternion();
        quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
        ring.quaternion.copy(quaternion);

        // Expand ring as it travels
        const expansion = 1 + ringProgress * (preset.waveAmplitude || 0.8);
        ring.scale.setScalar(expansion);

        // Fade out as it expands
        const material = ring.material as THREE.MeshBasicMaterial;
        const fadeIn = Math.min(1, ringProgress * 3);
        const fadeOut = Math.min(1, (1 - ringProgress) * 3);
        material.opacity = fadeIn * fadeOut * 0.6;
      }
    });
  });

  return (
    <group>
      {/* Expanding rings */}
      {Array.from({ length: ringCount }, (_, i) => (
        <Ring
          key={i}
          ref={(el) => { if (el) ringRefs.current[i] = el; }}
          args={[preset.particleSize * 1.2, preset.particleSize * 1.8, 32]}
          position={[startPos.x, startPos.y, startPos.z]}
        >
          <meshBasicMaterial
            color={preset.color}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </Ring>
      ))}
      {/* Center particle */}
      <Sphere
        ref={centerRef}
        args={[preset.particleSize * 0.5, 16, 16]}
        position={[startPos.x, startPos.y, startPos.z]}
      >
        <meshBasicMaterial color={preset.color} transparent opacity={0.9} />
      </Sphere>
    </group>
  );
}

/**
 * Light Trail - Single particle with a glowing trailing tail along the curve
 */
function LightTrailEffect({
  startPos,
  controlPos,
  endPos,
  preset,
  progressRef,
  isCompleteRef,
  onComplete,
  forceUpdate,
  layoutMode,
}: EffectProps) {
  const leadRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const trailRefs = useRef<THREE.Mesh[]>([]);
  const trailLength = 10;
  const trailSpacing = 0.03;

  useFrame((_, delta) => {
    if (isCompleteRef.current) return;

    progressRef.current += (delta * preset.speed) / 2;

    if (progressRef.current >= 1) {
      isCompleteRef.current = true;
      onComplete?.();
      forceUpdate((n) => n + 1);
      return;
    }

    // Update lead particle
    if (leadRef.current) {
      const pos = getPathPosition(startPos, controlPos, endPos, progressRef.current, layoutMode);
      leadRef.current.position.copy(pos);
    }

    // Update halo to follow lead
    if (haloRef.current && leadRef.current) {
      haloRef.current.position.copy(leadRef.current.position);
    }

    // Update trail particles - each follows the path at a delayed position
    trailRefs.current.forEach((trail, i) => {
      if (trail) {
        const trailProgress = Math.max(0, progressRef.current - (i + 1) * trailSpacing);
        const pos = getPathPosition(startPos, controlPos, endPos, trailProgress, layoutMode);
        trail.position.copy(pos);

        // Fade trail based on position in trail
        const material = trail.material as THREE.MeshBasicMaterial;
        const fadeAmount = 1 - (i + 1) / trailLength;
        material.opacity = fadeAmount * 0.6;

        // Shrink trail particles
        const scale = fadeAmount * 0.7;
        trail.scale.setScalar(Math.max(0.1, scale));
      }
    });
  });

  return (
    <group>
      {/* Lead bright particle */}
      <Sphere
        ref={leadRef}
        args={[preset.particleSize * 1.2, 16, 16]}
        position={[startPos.x, startPos.y, startPos.z]}
      >
        <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
      </Sphere>
      {/* Glowing halo around lead */}
      <Sphere
        ref={haloRef}
        args={[preset.particleSize * 2.2, 16, 16]}
        position={[startPos.x, startPos.y, startPos.z]}
      >
        <meshBasicMaterial color={preset.color} transparent opacity={0.3} />
      </Sphere>
      {/* Trail particles */}
      {Array.from({ length: trailLength }, (_, i) => (
        <Sphere
          key={i}
          ref={(el) => { if (el) trailRefs.current[i] = el; }}
          args={[preset.particleSize * 0.9, 12, 12]}
          position={[startPos.x, startPos.y, startPos.z]}
        >
          <meshBasicMaterial color={preset.color} transparent opacity={0.6} />
        </Sphere>
      ))}
    </group>
  );
}
