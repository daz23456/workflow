/**
 * GalaxyScene - 3D Galaxy Scene for Namespace Visualization
 *
 * Creates a deep space environment where:
 * - Namespaces are displayed as glowing clusters
 * - Workflows are planets within clusters
 * - Tasks are moons orbiting planets
 *
 * Part of Stage 12.3: Namespace Galaxy Visualization
 */

'use client';

import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

export interface GalaxySceneProps {
  children?: React.ReactNode;
  className?: string;
}

function GalaxySceneContent({ children }: { children?: React.ReactNode }) {
  return (
    <>
      {/* Camera */}
      <PerspectiveCamera
        makeDefault
        position={[0, 20, 50]}
        fov={60}
        near={0.1}
        far={2000}
      />

      {/* Controls - extended range for galaxy exploration */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={500}
        enablePan
        panSpeed={0.5}
      />

      {/* Ambient lighting for space */}
      <ambientLight intensity={0.15} />
      <pointLight position={[100, 100, 100]} intensity={0.3} color="#ffffff" />

      {/* Deep space star field - dense for galaxy effect */}
      <Stars
        radius={300}
        depth={100}
        count={10000}
        factor={6}
        saturation={0.2}
        fade
        speed={0.5}
      />

      {/* Post-processing for glow effects */}
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={1.5}
          mipmapBlur
        />
      </EffectComposer>

      {/* Child components (clusters, planets, moons) */}
      {children}
    </>
  );
}

export function GalaxyScene({ children, className }: GalaxySceneProps) {
  return (
    <div
      className={`w-full h-full bg-black ${className || ''}`}
      role="img"
      aria-label="3D Galaxy visualization of workflow namespaces"
    >
      <Canvas
        data-testid="r3f-canvas"
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
        }}
        camera={{ position: [0, 20, 50], fov: 60 }}
      >
        <color attach="background" args={['#000010']} />
        <GalaxySceneContent>{children}</GalaxySceneContent>
      </Canvas>
    </div>
  );
}

export default GalaxyScene;
