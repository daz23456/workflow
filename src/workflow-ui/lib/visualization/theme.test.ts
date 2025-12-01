/**
 * Visualization Theme Configuration Tests
 * TDD: RED phase - tests written before implementation
 */

import { describe, it, expect } from 'vitest';
import {
  getThemePreset,
  getSignalFlowPreset,
  DEFAULT_THEME,
  THEME_PRESETS,
  SIGNAL_FLOW_PRESETS,
} from './theme';

describe('Visualization Theme', () => {
  describe('Theme Presets', () => {
    it('should have sci-fi cyber preset', () => {
      const theme = getThemePreset('sci-fi-cyber');

      expect(theme).toBeDefined();
      expect(theme.name).toBe('sci-fi-cyber');
      expect(theme.background).toBeDefined();
      expect(theme.nodeColors).toBeDefined();
      expect(theme.nodeColors.idle).toBeDefined();
      expect(theme.nodeColors.running).toBeDefined();
      expect(theme.nodeColors.succeeded).toBeDefined();
      expect(theme.nodeColors.failed).toBeDefined();
    });

    it('should have bioluminescent preset', () => {
      const theme = getThemePreset('bioluminescent');

      expect(theme).toBeDefined();
      expect(theme.name).toBe('bioluminescent');
      expect(theme.glowIntensity).toBeGreaterThan(0);
    });

    it('should have clean modern preset', () => {
      const theme = getThemePreset('clean-modern');

      expect(theme).toBeDefined();
      expect(theme.name).toBe('clean-modern');
      // Clean modern should have lower glow intensity
      expect(theme.glowIntensity).toBeLessThan(2);
    });

    it('should have cosmic neural preset', () => {
      const theme = getThemePreset('cosmic-neural');

      expect(theme).toBeDefined();
      expect(theme.name).toBe('cosmic-neural');
      expect(theme.hasStarfield).toBe(true);
    });

    it('should return default theme for unknown preset', () => {
      const theme = getThemePreset('unknown-preset' as any);

      expect(theme).toEqual(DEFAULT_THEME);
    });

    it('should export all theme presets', () => {
      expect(THEME_PRESETS).toBeDefined();
      expect(Object.keys(THEME_PRESETS).length).toBe(4);
      expect(THEME_PRESETS['sci-fi-cyber']).toBeDefined();
      expect(THEME_PRESETS['bioluminescent']).toBeDefined();
      expect(THEME_PRESETS['clean-modern']).toBeDefined();
      expect(THEME_PRESETS['cosmic-neural']).toBeDefined();
    });
  });

  describe('Signal Flow Presets', () => {
    it('should have electric pulses preset', () => {
      const style = getSignalFlowPreset('electric-pulses');

      expect(style).toBeDefined();
      expect(style.name).toBe('electric-pulses');
      expect(style.particleCount).toBeGreaterThan(0);
      expect(style.speed).toBeGreaterThan(0);
      expect(style.color).toBeDefined();
    });

    it('should have particle stream preset', () => {
      const style = getSignalFlowPreset('particle-stream');

      expect(style).toBeDefined();
      expect(style.name).toBe('particle-stream');
      expect(style.particleSize).toBeGreaterThan(0);
    });

    it('should have wave ripple preset', () => {
      const style = getSignalFlowPreset('wave-ripple');

      expect(style).toBeDefined();
      expect(style.name).toBe('wave-ripple');
      expect(style.waveAmplitude).toBeGreaterThan(0);
    });

    it('should have light trail preset', () => {
      const style = getSignalFlowPreset('light-trail');

      expect(style).toBeDefined();
      expect(style.name).toBe('light-trail');
      expect(style.trailLength).toBeGreaterThan(0);
    });

    it('should return default signal flow for unknown preset', () => {
      const style = getSignalFlowPreset('unknown' as any);

      expect(style).toBeDefined();
      expect(style.name).toBe('particle-stream'); // Default
    });

    it('should export all signal flow presets', () => {
      expect(SIGNAL_FLOW_PRESETS).toBeDefined();
      expect(Object.keys(SIGNAL_FLOW_PRESETS).length).toBe(4);
    });
  });

  describe('Theme Structure', () => {
    it('should have required node colors for all states', () => {
      const theme = DEFAULT_THEME;

      expect(theme.nodeColors.idle).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.nodeColors.running).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.nodeColors.succeeded).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.nodeColors.failed).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(theme.nodeColors.pending).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('should have edge configuration', () => {
      const theme = DEFAULT_THEME;

      expect(theme.edgeColor).toBeDefined();
      expect(theme.edgeOpacity).toBeGreaterThan(0);
      expect(theme.edgeOpacity).toBeLessThanOrEqual(1);
    });

    it('should have glow settings', () => {
      const theme = DEFAULT_THEME;

      expect(theme.glowIntensity).toBeGreaterThanOrEqual(0);
      expect(theme.bloomStrength).toBeGreaterThanOrEqual(0);
      expect(theme.bloomRadius).toBeGreaterThanOrEqual(0);
    });

    it('should have node size settings', () => {
      const theme = DEFAULT_THEME;

      expect(theme.nodeSize).toBeGreaterThan(0);
      expect(theme.nodeSize).toBeLessThan(10); // Reasonable size
    });
  });

  describe('Signal Flow Structure', () => {
    it('should have animation settings', () => {
      const style = getSignalFlowPreset('particle-stream');

      expect(style.speed).toBeGreaterThan(0);
      expect(style.duration).toBeGreaterThan(0);
    });

    it('should have particle configuration', () => {
      const style = getSignalFlowPreset('particle-stream');

      expect(style.particleCount).toBeGreaterThan(0);
      expect(style.particleSize).toBeGreaterThan(0);
    });
  });
});
