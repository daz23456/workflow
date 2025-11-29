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

  it('should show empty state when no output', () => {
    render(<PreviewPanel />);
    expect(screen.getByText(/no preview data/i)).toBeInTheDocument();
  });

  it('should display output data', () => {
    const store = useTransformBuilderStore.getState();
    useTransformBuilderStore.setState({ outputData: [{ name: 'Alice', age: 30 }] });
    render(<PreviewPanel />);
    expect(screen.getByText(/alice/i)).toBeInTheDocument();
  });

  it('should show record count', () => {
    useTransformBuilderStore.setState({ outputData: [{ a: 1 }, { b: 2 }, { c: 3 }] });
    render(<PreviewPanel />);
    expect(screen.getByText(/3 records/i)).toBeInTheDocument();
  });

  it('should display JSON data', () => {
    useTransformBuilderStore.setState({ outputData: [{ id: 1, value: 'test' }] });
    render(<PreviewPanel />);
    expect(screen.getByText(/"id"/i)).toBeInTheDocument();
  });

  it('should handle pagination for large datasets', async () => {
    const user = userEvent.setup();
    const data = Array.from({ length: 25 }, (_, i) => ({ id: i }));
    useTransformBuilderStore.setState({ outputData: data });
    render(<PreviewPanel />);

    expect(screen.getByText(/showing 1-10 of 25/i)).toBeInTheDocument();

    const nextButton = screen.getByRole('button', { name: /next/i });
    await user.click(nextButton);

    expect(screen.getByText(/showing 11-20 of 25/i)).toBeInTheDocument();
  });

  it('should allow changing page size', async () => {
    const user = userEvent.setup();
    const data = Array.from({ length: 30 }, (_, i) => ({ id: i }));
    useTransformBuilderStore.setState({ outputData: data });
    render(<PreviewPanel />);

    const pageSizeSelect = screen.getByRole('combobox', { name: /page size/i });
    await user.selectOptions(pageSizeSelect, '25');

    expect(screen.getByText(/showing 1-25 of 30/i)).toBeInTheDocument();
  });

  it('should show execution errors', () => {
    useTransformBuilderStore.setState({
      validation: { isValid: false, errors: ['Transform failed'], warnings: [] },
    });
    render(<PreviewPanel />);
    expect(screen.getByText(/transform failed/i)).toBeInTheDocument();
  });

  it('should show validation warnings', () => {
    useTransformBuilderStore.setState({
      validation: { isValid: true, errors: [], warnings: ['Performance warning'] },
    });
    render(<PreviewPanel />);
    expect(screen.getByText(/performance warning/i)).toBeInTheDocument();
  });

  it('should handle empty arrays gracefully', () => {
    useTransformBuilderStore.setState({ outputData: [] });
    render(<PreviewPanel />);
    expect(screen.getByText(/0 records/i)).toBeInTheDocument();
  });

  it('should format nested objects', () => {
    useTransformBuilderStore.setState({
      outputData: [{ user: { name: 'Bob', email: 'bob@example.com' } }],
    });
    render(<PreviewPanel />);
    expect(screen.getByText(/"user"/i)).toBeInTheDocument();
    expect(screen.getByText(/bob@example.com/i)).toBeInTheDocument();
  });
});
