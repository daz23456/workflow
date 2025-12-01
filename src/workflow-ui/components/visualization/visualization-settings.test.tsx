/**
 * VisualizationSettings Component Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

// Mock the visualization store
const mockSetThemePreset = vi.fn();
const mockSetSignalFlowPreset = vi.fn();

vi.mock('../../lib/visualization/visualization-store', () => ({
  useVisualizationStore: vi.fn((selector?: (state: unknown) => unknown) => {
    const state = {
      themePreset: 'sci-fi-cyber',
      signalFlowPreset: 'particle-stream',
      setThemePreset: mockSetThemePreset,
      setSignalFlowPreset: mockSetSignalFlowPreset,
    };
    return selector ? selector(state) : state;
  }),
}));

// Mock the theme module
vi.mock('../../lib/visualization/theme', () => ({
  getAllThemePresets: vi.fn(() => [
    {
      name: 'sci-fi-cyber',
      displayName: 'Sci-Fi Cyber',
      description: 'Neon grids and digital vibes',
    },
    {
      name: 'bioluminescent',
      displayName: 'Bioluminescent',
      description: 'Organic deep-sea glow',
    },
  ]),
  getAllSignalFlowPresets: vi.fn(() => [
    {
      name: 'particle-stream',
      displayName: 'Particle Stream',
      description: 'Flowing particles',
    },
    {
      name: 'electric-pulses',
      displayName: 'Electric Pulses',
      description: 'Lightning energy',
    },
  ]),
  getAllNodeSizeModes: vi.fn(() => [
    {
      name: 'uniform',
      displayName: 'Uniform',
      description: 'All nodes same size',
    },
    {
      name: 'by-duration',
      displayName: 'By Duration',
      description: 'Size by execution time',
    },
  ]),
}));

import { VisualizationSettings } from './visualization-settings';

describe('VisualizationSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('collapsed state', () => {
    it('should render toggle button when collapsed', () => {
      render(<VisualizationSettings />);
      expect(screen.getByTestId('settings-toggle')).toBeInTheDocument();
    });

    it('should open panel when toggle is clicked', () => {
      render(<VisualizationSettings />);

      const toggle = screen.getByTestId('settings-toggle');
      fireEvent.click(toggle);

      expect(screen.getByTestId('settings-panel')).toBeInTheDocument();
    });
  });

  describe('expanded state', () => {
    it('should show theme options', () => {
      render(<VisualizationSettings />);
      fireEvent.click(screen.getByTestId('settings-toggle'));

      expect(screen.getByText('Sci-Fi Cyber')).toBeInTheDocument();
      expect(screen.getByText('Bioluminescent')).toBeInTheDocument();
    });

    it('should show signal flow options', () => {
      render(<VisualizationSettings />);
      fireEvent.click(screen.getByTestId('settings-toggle'));

      expect(screen.getByText('Particle Stream')).toBeInTheDocument();
      expect(screen.getByText('Electric Pulses')).toBeInTheDocument();
    });

    it('should close panel when close button is clicked', () => {
      render(<VisualizationSettings />);
      fireEvent.click(screen.getByTestId('settings-toggle'));

      const closeButton = screen.getByTestId('settings-close');
      fireEvent.click(closeButton);

      expect(screen.queryByTestId('settings-panel')).not.toBeInTheDocument();
    });

    it('should call setThemePreset when theme is selected', () => {
      render(<VisualizationSettings />);
      fireEvent.click(screen.getByTestId('settings-toggle'));

      const themeButton = screen.getByTestId('theme-bioluminescent');
      fireEvent.click(themeButton);

      expect(mockSetThemePreset).toHaveBeenCalledWith('bioluminescent');
    });

    it('should call setSignalFlowPreset when signal flow is selected', () => {
      render(<VisualizationSettings />);
      fireEvent.click(screen.getByTestId('settings-toggle'));

      const signalButton = screen.getByTestId('signal-electric-pulses');
      fireEvent.click(signalButton);

      expect(mockSetSignalFlowPreset).toHaveBeenCalledWith('electric-pulses');
    });
  });
});
