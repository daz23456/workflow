/**
 * TrafficCanvas Component
 *
 * 3D canvas container for workflow traffic visualization.
 * Provides the rendering context for execution particles
 * flowing through workflow lanes.
 *
 * Stage 12.5: Live Traffic Observatory
 */

'use client';

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

export interface TrafficCanvasProps {
  children?: React.ReactNode;
  className?: string;
}

function TrafficSceneContent({ children }: { children?: React.ReactNode }) {
  return (
    <>
      {/* Camera setup */}
      <PerspectiveCamera makeDefault position={[0, 10, 30]} fov={60} />
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={100}
        maxPolarAngle={Math.PI / 2}
      />

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, 10, -10]} intensity={0.5} color="#4a9eff" />

      {/* Grid for visual reference */}
      <Grid
        args={[100, 100]}
        cellSize={2}
        cellThickness={0.5}
        cellColor="#1a3a5c"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#2a5a8c"
        fadeDistance={50}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
        position={[0, -5, 0]}
      />

      {/* Post-processing effects */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={0.5}
        />
      </EffectComposer>

      {/* Child components (lanes, particles, etc.) */}
      {children}
    </>
  );
}

export function TrafficCanvas({ children, className = '' }: TrafficCanvasProps) {
  return (
    <div
      className={`w-full h-full bg-[#0a1628] ${className}`}
      role="img"
      aria-label="Live traffic visualization of workflow executions"
    >
      <Canvas
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
      >
        <color attach="background" args={['#0a1628']} />
        <TrafficSceneContent>{children}</TrafficSceneContent>
      </Canvas>
    </div>
  );
}
