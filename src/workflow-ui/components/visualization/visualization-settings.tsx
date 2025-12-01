/**
 * VisualizationSettings - Settings panel for 3D visualization themes
 *
 * Allows users to select:
 * - Visual theme (Sci-Fi Cyber, Bioluminescent, Clean Modern, Cosmic Neural)
 * - Signal flow style (Electric Pulses, Particle Stream, Wave Ripple, Light Trail)
 */

'use client';

import React, { useState } from 'react';
import { useVisualizationStore } from '../../lib/visualization/visualization-store';
import {
  getAllThemePresets,
  getAllSignalFlowPresets,
  getAllNodeSizeModes,
  type NodeSizeModeName,
} from '../../lib/visualization/theme';

export function VisualizationSettings() {
  const [isOpen, setIsOpen] = useState(false);

  const themePreset = useVisualizationStore((state) => state.themePreset);
  const signalFlowPreset = useVisualizationStore((state) => state.signalFlowPreset);
  const nodeSizeMode = useVisualizationStore((state) => state.nodeSizeMode);
  const setThemePreset = useVisualizationStore((state) => state.setThemePreset);
  const setSignalFlowPreset = useVisualizationStore((state) => state.setSignalFlowPreset);
  const setNodeSizeMode = useVisualizationStore((state) => state.setNodeSizeMode);

  const themes = getAllThemePresets();
  const signalFlows = getAllSignalFlowPresets();
  const nodeSizeModes = getAllNodeSizeModes();

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 rounded-lg bg-black/50 border border-white/20 hover:bg-black/70 transition-colors"
        data-testid="settings-toggle"
        title="Visualization Settings"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-white"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    );
  }

  return (
    <div
      className="p-4 rounded-lg bg-black/80 border border-white/20 backdrop-blur-sm"
      data-testid="settings-panel"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold text-sm">Visualization Settings</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white/60 hover:text-white transition-colors"
          data-testid="settings-close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </div>

      {/* Three-column layout */}
      <div className="grid grid-cols-3 gap-4">
        {/* Theme Selection */}
        <div>
          <label className="block text-white/70 text-xs mb-2 uppercase tracking-wide">
            Visual Theme
          </label>
          <div className="space-y-2">
            {themes.map((theme) => (
              <button
                key={theme.name}
                onClick={() => setThemePreset(theme.name)}
                className={`w-full text-left p-2 rounded border transition-all ${
                  themePreset === theme.name
                    ? 'border-cyan-400 bg-cyan-400/10 text-white'
                    : 'border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10'
                }`}
                data-testid={`theme-${theme.name}`}
              >
                <div className="font-medium text-sm">{theme.displayName}</div>
                <div className="text-xs opacity-60 mt-0.5">{theme.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Signal Flow Selection */}
        <div>
          <label className="block text-white/70 text-xs mb-2 uppercase tracking-wide">
            Signal Flow Style
          </label>
          <div className="space-y-2">
            {signalFlows.map((style) => (
              <button
                key={style.name}
                onClick={() => setSignalFlowPreset(style.name)}
                className={`w-full text-left p-2 rounded border transition-all ${
                  signalFlowPreset === style.name
                    ? 'border-purple-400 bg-purple-400/10 text-white'
                    : 'border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10'
                }`}
                data-testid={`signal-${style.name}`}
              >
                <div className="font-medium text-sm">{style.displayName}</div>
                <div className="text-xs opacity-60 mt-0.5">{style.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Node Size Mode Selection */}
        <div>
          <label className="block text-white/70 text-xs mb-2 uppercase tracking-wide">
            Node Size
          </label>
          <div className="space-y-2">
            {nodeSizeModes.map((mode) => (
              <button
                key={mode.name}
                onClick={() => setNodeSizeMode(mode.name)}
                className={`w-full text-left p-2 rounded border transition-all ${
                  nodeSizeMode === mode.name
                    ? 'border-green-400 bg-green-400/10 text-white'
                    : 'border-white/10 bg-white/5 text-white/70 hover:border-white/30 hover:bg-white/10'
                }`}
                data-testid={`nodesize-${mode.name}`}
              >
                <div className="font-medium text-sm">{mode.displayName}</div>
                <div className="text-xs opacity-60 mt-0.5">{mode.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
