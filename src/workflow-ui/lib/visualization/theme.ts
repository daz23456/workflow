/**
 * Visualization Theme Configuration
 *
 * Provides configurable themes and signal flow styles for the
 * 3D neural network visualization.
 */

export type ThemePresetName =
  | 'sci-fi-cyber'
  | 'bioluminescent'
  | 'clean-modern'
  | 'cosmic-neural';

export type SignalFlowPresetName =
  | 'electric-pulses'
  | 'particle-stream'
  | 'wave-ripple'
  | 'light-trail';

export type NodeSizeModeName =
  | 'uniform'
  | 'shared-count'
  | 'connection-count'
  | 'execution-duration';

export interface NodeSizeMode {
  name: NodeSizeModeName;
  displayName: string;
  description: string;
  minScale: number;
  maxScale: number;
}

export interface NodeColors {
  idle: string;
  pending: string;
  running: string;
  succeeded: string;
  failed: string;
}

export interface VisualizationTheme {
  name: ThemePresetName;
  displayName: string;
  description: string;

  // Background
  background: string;
  hasStarfield: boolean;
  hasGrid: boolean;

  // Node appearance
  nodeColors: NodeColors;
  nodeSize: number;
  nodeEmissiveIntensity: number;

  // Edge appearance
  edgeColor: string;
  edgeOpacity: number;
  edgeWidth: number;

  // Glow/Bloom effects
  glowIntensity: number;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;

  // Animation
  pulseSpeed: number;
  pulseAmplitude: number;
}

export interface SignalFlowStyle {
  name: SignalFlowPresetName;
  displayName: string;
  description: string;

  // Particle settings
  particleCount: number;
  particleSize: number;
  color: string;
  emissiveColor: string;

  // Animation
  speed: number;
  duration: number;

  // Style-specific settings
  waveAmplitude?: number;
  trailLength?: number;
  sparkFrequency?: number;
}

// ============================================
// Theme Presets
// ============================================

const sciFiCyberTheme: VisualizationTheme = {
  name: 'sci-fi-cyber',
  displayName: 'Sci-Fi Cyber',
  description: 'Tron-like neon grids, sharp edges, digital matrix vibes',

  background: '#0a0a0f',
  hasStarfield: false,
  hasGrid: true,

  nodeColors: {
    idle: '#1a4a6e',
    pending: '#2d5a7e',
    running: '#00ffff',
    succeeded: '#00ff88',
    failed: '#ff3366',
  },
  nodeSize: 0.5,
  nodeEmissiveIntensity: 0.8,

  edgeColor: '#00ffff',
  edgeOpacity: 0.4,
  edgeWidth: 2,

  glowIntensity: 2.5,
  bloomStrength: 1.5,
  bloomRadius: 0.8,
  bloomThreshold: 0.2,

  pulseSpeed: 2.0,
  pulseAmplitude: 0.3,
};

const bioluminescentTheme: VisualizationTheme = {
  name: 'bioluminescent',
  displayName: 'Bioluminescent',
  description: 'Organic deep-sea creature glow, soft pulsing, ethereal and alive',

  background: '#050510',
  hasStarfield: false,
  hasGrid: false,

  nodeColors: {
    idle: '#1a1a4a',
    pending: '#2a2a6a',
    running: '#6666ff',
    succeeded: '#44ffaa',
    failed: '#ff6666',
  },
  nodeSize: 0.6,
  nodeEmissiveIntensity: 1.0,

  edgeColor: '#4444aa',
  edgeOpacity: 0.3,
  edgeWidth: 3,

  glowIntensity: 3.0,
  bloomStrength: 2.0,
  bloomRadius: 1.0,
  bloomThreshold: 0.1,

  pulseSpeed: 1.2,
  pulseAmplitude: 0.4,
};

const cleanModernTheme: VisualizationTheme = {
  name: 'clean-modern',
  displayName: 'Clean Modern',
  description: 'Minimalist with subtle glows, professional feel, less flashy',

  background: '#1a1a2e',
  hasStarfield: false,
  hasGrid: false,

  nodeColors: {
    idle: '#4a5568',
    pending: '#5a6578',
    running: '#4299e1',
    succeeded: '#48bb78',
    failed: '#f56565',
  },
  nodeSize: 0.4,
  nodeEmissiveIntensity: 0.4,

  edgeColor: '#718096',
  edgeOpacity: 0.5,
  edgeWidth: 1.5,

  glowIntensity: 0.8,
  bloomStrength: 0.5,
  bloomRadius: 0.4,
  bloomThreshold: 0.5,

  pulseSpeed: 1.5,
  pulseAmplitude: 0.15,
};

const cosmicNeuralTheme: VisualizationTheme = {
  name: 'cosmic-neural',
  displayName: 'Cosmic Neural',
  description: 'Galaxy/nebula backdrop, stars, cosmic dust, brain-in-space feel',

  background: '#0a0015',
  hasStarfield: true,
  hasGrid: false,

  nodeColors: {
    idle: '#4a2a6a',
    pending: '#5a3a7a',
    running: '#aa66ff',
    succeeded: '#66ffaa',
    failed: '#ff6688',
  },
  nodeSize: 0.55,
  nodeEmissiveIntensity: 0.9,

  edgeColor: '#8844cc',
  edgeOpacity: 0.35,
  edgeWidth: 2,

  glowIntensity: 2.2,
  bloomStrength: 1.8,
  bloomRadius: 0.9,
  bloomThreshold: 0.15,

  pulseSpeed: 1.0,
  pulseAmplitude: 0.35,
};

// ============================================
// Signal Flow Presets
// ============================================

const electricPulsesStyle: SignalFlowStyle = {
  name: 'electric-pulses',
  displayName: 'Electric Pulses',
  description: 'Lightning-like energy bursts traveling along edges',

  particleCount: 8,
  particleSize: 0.15,
  color: '#00ffff',
  emissiveColor: '#ffffff',

  speed: 4.0,
  duration: 500,

  sparkFrequency: 0.3,
};

const particleStreamStyle: SignalFlowStyle = {
  name: 'particle-stream',
  displayName: 'Particle Stream',
  description: 'Flowing particles like data packets or glowing orbs',

  particleCount: 12,
  particleSize: 0.08,
  color: '#66aaff',
  emissiveColor: '#aaccff',

  speed: 2.5,
  duration: 800,
};

const waveRippleStyle: SignalFlowStyle = {
  name: 'wave-ripple',
  displayName: 'Wave Ripple',
  description: 'Rippling wave effect propagating from source to target',

  particleCount: 20,
  particleSize: 0.05,
  color: '#44ffaa',
  emissiveColor: '#88ffcc',

  speed: 2.0,
  duration: 1000,

  waveAmplitude: 0.2,
};

const lightTrailStyle: SignalFlowStyle = {
  name: 'light-trail',
  displayName: 'Light Trail',
  description: 'Smooth light beam that traces the path like a shooting star',

  particleCount: 1,
  particleSize: 0.12,
  color: '#ffaa44',
  emissiveColor: '#ffcc88',

  speed: 3.5,
  duration: 600,

  trailLength: 0.8,
};

// ============================================
// Exports
// ============================================

export const THEME_PRESETS: Record<ThemePresetName, VisualizationTheme> = {
  'sci-fi-cyber': sciFiCyberTheme,
  'bioluminescent': bioluminescentTheme,
  'clean-modern': cleanModernTheme,
  'cosmic-neural': cosmicNeuralTheme,
};

export const SIGNAL_FLOW_PRESETS: Record<SignalFlowPresetName, SignalFlowStyle> = {
  'electric-pulses': electricPulsesStyle,
  'particle-stream': particleStreamStyle,
  'wave-ripple': waveRippleStyle,
  'light-trail': lightTrailStyle,
};

export const DEFAULT_THEME = sciFiCyberTheme;
export const DEFAULT_SIGNAL_FLOW = particleStreamStyle;

export function getThemePreset(name: ThemePresetName): VisualizationTheme {
  return THEME_PRESETS[name] || DEFAULT_THEME;
}

export function getSignalFlowPreset(name: SignalFlowPresetName): SignalFlowStyle {
  return SIGNAL_FLOW_PRESETS[name] || DEFAULT_SIGNAL_FLOW;
}

export function getAllThemePresets(): VisualizationTheme[] {
  return Object.values(THEME_PRESETS);
}

export function getAllSignalFlowPresets(): SignalFlowStyle[] {
  return Object.values(SIGNAL_FLOW_PRESETS);
}

// ============================================
// Node Size Mode Presets
// ============================================

const uniformSizeMode: NodeSizeMode = {
  name: 'uniform',
  displayName: 'Uniform',
  description: 'All nodes the same size',
  minScale: 1.0,
  maxScale: 1.0,
};

const sharedCountSizeMode: NodeSizeMode = {
  name: 'shared-count',
  displayName: 'Shared Count',
  description: 'Larger nodes are shared by more workflows',
  minScale: 0.6,
  maxScale: 2.0,
};

const connectionCountSizeMode: NodeSizeMode = {
  name: 'connection-count',
  displayName: 'Connections',
  description: 'Larger nodes have more dependencies',
  minScale: 0.6,
  maxScale: 2.0,
};

const executionDurationSizeMode: NodeSizeMode = {
  name: 'execution-duration',
  displayName: 'Duration',
  description: 'Larger nodes take longer to execute',
  minScale: 0.6,
  maxScale: 2.0,
};

export const NODE_SIZE_MODES: Record<NodeSizeModeName, NodeSizeMode> = {
  'uniform': uniformSizeMode,
  'shared-count': sharedCountSizeMode,
  'connection-count': connectionCountSizeMode,
  'execution-duration': executionDurationSizeMode,
};

export const DEFAULT_NODE_SIZE_MODE = uniformSizeMode;

export function getNodeSizeMode(name: NodeSizeModeName): NodeSizeMode {
  return NODE_SIZE_MODES[name] || DEFAULT_NODE_SIZE_MODE;
}

export function getAllNodeSizeModes(): NodeSizeMode[] {
  return Object.values(NODE_SIZE_MODES);
}
