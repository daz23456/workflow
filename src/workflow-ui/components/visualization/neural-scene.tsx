/**
 * NeuralScene - Base 3D scene for neural network visualization
 *
 * Provides:
 * - Three.js Canvas with proper setup
 * - Camera controls (orbit, zoom, pan)
 * - Theme-based background and effects
 * - Bloom/glow post-processing
 */

'use client';

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Grid, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useVisualizationStore } from '../../lib/visualization/visualization-store';
import { getThemePreset } from '../../lib/visualization/theme';

interface NeuralSceneProps {
  children?: React.ReactNode;
  className?: string;
}

function SceneContent({ children }: { children?: React.ReactNode }) {
  const themePreset = useVisualizationStore((state) => state.themePreset);
  const cameraPosition = useVisualizationStore((state) => state.cameraPosition);
  const cameraTarget = useVisualizationStore((state) => state.cameraTarget);

  const theme = getThemePreset(themePreset);

  return (
    <>
      {/* Camera */}
      <PerspectiveCamera
        makeDefault
        position={[cameraPosition.x, cameraPosition.y, cameraPosition.z]}
        fov={60}
        near={0.1}
        far={1000}
      />

      {/* Controls */}
      <OrbitControls
        target={[cameraTarget.x, cameraTarget.y, cameraTarget.z]}
        enableDamping
        dampingFactor={0.05}
        minDistance={2}
        maxDistance={50}
      />

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />

      {/* Theme-based background elements */}
      {theme.hasStarfield && (
        <Stars
          radius={100}
          depth={50}
          count={5000}
          factor={4}
          saturation={0}
          fade
          speed={1}
        />
      )}

      {theme.hasGrid && (
        <Grid
          args={[30, 30]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#1a4a6e"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#00ffff"
          fadeDistance={30}
          fadeStrength={1}
          followCamera={false}
          position={[0, -5, 0]}
        />
      )}

      {/* Post-processing effects */}
      <EffectComposer>
        <Bloom
          intensity={theme.bloomStrength}
          luminanceThreshold={theme.bloomThreshold}
          luminanceSmoothing={0.9}
          radius={theme.bloomRadius}
        />
      </EffectComposer>

      {/* Scene children (nodes, edges, signals) */}
      {children}
    </>
  );
}

export function NeuralScene({ children, className }: NeuralSceneProps) {
  const themePreset = useVisualizationStore((state) => state.themePreset);
  const theme = getThemePreset(themePreset);

  return (
    <Canvas
      data-testid="r3f-canvas"
      className={className}
      style={{ background: theme.background }}
      gl={{
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
      }}
      dpr={[1, 2]}
    >
      <SceneContent>{children}</SceneContent>
    </Canvas>
  );
}
