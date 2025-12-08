/**
 * Preview Panel Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { PreviewPanel } from './preview-panel';
import { useTransformBuilderStore } from '@/lib/stores/transform-builder-store';

describe('PreviewPanel', () => {
  beforeEach(() => {
    useTransformBuilderStore.getState().reset();
  });

  it('should show empty state when no data', () => {
    render(<PreviewPanel />);
    expect(screen.getByText(/no data loaded/i)).toBeInTheDocument();
  });

  it('should display output data when pipeline has transforms', () => {
    useTransformBuilderStore.setState({
      outputData: [{ name: 'Alice', age: 30 }],
      pipeline: [{ id: '1', type: 'filter', config: {} }],
    });
    render(<PreviewPanel />);
    expect(screen.getByText(/alice/i)).toBeInTheDocument();
  });

  it('should show record count in input label', () => {
    useTransformBuilderStore.setState({
      inputData: [{ a: 1 }, { b: 2 }, { c: 3 }],
      outputData: [{ a: 1 }, { b: 2 }, { c: 3 }],
      pipeline: [{ id: '1', type: 'filter', config: {} }],
    });
    render(<PreviewPanel />);
    expect(screen.getByText(/input \(3 records\)/i)).toBeInTheDocument();
  });

  it('should display JSON data when pipeline has transforms', () => {
    useTransformBuilderStore.setState({
      outputData: [{ id: 1, value: 'test' }],
      pipeline: [{ id: '1', type: 'filter', config: {} }],
    });
    render(<PreviewPanel />);
    expect(screen.getByText(/"id"/i)).toBeInTheDocument();
  });

  it('should handle pagination for large datasets', async () => {
    const user = userEvent.setup();
    const data = Array.from({ length: 10 }, (_, i) => ({ id: i }));
    useTransformBuilderStore.setState({
      inputData: data,
      outputData: data,
      pipeline: [{ id: '1', type: 'filter', config: {} }],
    });
    render(<PreviewPanel />);

    // With pageSize of 3, should show 1-3/10
    expect(screen.getByText(/1-3\/10/)).toBeInTheDocument();

    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    expect(screen.getByText(/4-6\/10/)).toBeInTheDocument();
  });

  it('should show execution errors', () => {
    useTransformBuilderStore.setState({
      inputData: [{ a: 1 }],
      validation: { isValid: false, errors: ['Transform failed'], warnings: [] },
    });
    render(<PreviewPanel />);
    expect(screen.getByText(/transform failed/i)).toBeInTheDocument();
  });

  it('should show validation warnings', () => {
    useTransformBuilderStore.setState({
      inputData: [{ a: 1 }],
      validation: { isValid: true, errors: [], warnings: ['Performance warning'] },
    });
    render(<PreviewPanel />);
    expect(screen.getByText(/performance warning/i)).toBeInTheDocument();
  });

  it('should handle empty arrays gracefully', () => {
    useTransformBuilderStore.setState({ inputData: [], outputData: [] });
    render(<PreviewPanel />);
    expect(screen.getByText(/no data loaded/i)).toBeInTheDocument();
  });

  it('should format nested objects when pipeline has transforms', () => {
    useTransformBuilderStore.setState({
      outputData: [{ user: { name: 'Bob', email: 'bob@example.com' } }],
      pipeline: [{ id: '1', type: 'filter', config: {} }],
    });
    render(<PreviewPanel />);
    expect(screen.getByText(/"user"/i)).toBeInTheDocument();
    expect(screen.getByText(/bob@example.com/i)).toBeInTheDocument();
  });

  it('should show "Add transforms to see output" when no pipeline', () => {
    useTransformBuilderStore.setState({
      inputData: [{ a: 1 }],
      outputData: [{ a: 1 }],
      pipeline: [],
    });
    render(<PreviewPanel />);
    expect(screen.getByText(/add transforms to see output/i)).toBeInTheDocument();
  });
});
