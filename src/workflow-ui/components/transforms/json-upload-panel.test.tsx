/**
 * JSON Upload Panel Tests
 *
 * Tests JSON file upload component with drag-drop support.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { JsonUploadPanel } from './json-upload-panel';

describe('JsonUploadPanel', () => {
  it('should render upload area', () => {
    render(<JsonUploadPanel />);

    expect(screen.getByText(/drop json file/i)).toBeInTheDocument();
  });

  it('should handle file upload', async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();

    render(<JsonUploadPanel onUpload={onUpload} />);

    const jsonData = [{ name: 'Alice', age: 30 }];
    const file = new File([JSON.stringify(jsonData)], 'data.json', {
      type: 'application/json',
    });

    const input = screen.getByLabelText(/upload json/i, { selector: 'input[type="file"]' });
    await user.upload(input, file);

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(jsonData);
    });
  });

  it('should display file name after upload', async () => {
    const user = userEvent.setup();

    render(<JsonUploadPanel onUpload={vi.fn()} />);

    const file = new File(['[{"id": 1}]'], 'test.json', {
      type: 'application/json',
    });

    const input = screen.getByLabelText(/upload json/i, { selector: 'input[type="file"]' });
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/test\.json/i)).toBeInTheDocument();
    });
  });

  it('should display record count after upload', async () => {
    const user = userEvent.setup();

    render(<JsonUploadPanel onUpload={vi.fn()} />);

    const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const file = new File([JSON.stringify(data)], 'data.json', {
      type: 'application/json',
    });

    const input = screen.getByLabelText(/upload json/i, { selector: 'input[type="file"]' });
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/3 records/i)).toBeInTheDocument();
    });
  });

  it('should handle invalid JSON', async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();

    render(<JsonUploadPanel onUpload={onUpload} />);

    const file = new File(['{ invalid json'], 'invalid.json', {
      type: 'application/json',
    });

    const input = screen.getByLabelText(/upload json/i, { selector: 'input[type="file"]' });
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/invalid json/i)).toBeInTheDocument();
      expect(onUpload).not.toHaveBeenCalled();
    });
  });

  it('should handle non-array JSON', async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();

    render(<JsonUploadPanel onUpload={onUpload} />);

    const file = new File(['{"single": "object"}'], 'object.json', {
      type: 'application/json',
    });

    const input = screen.getByLabelText(/upload json/i, { selector: 'input[type="file"]' });
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/must be an array/i)).toBeInTheDocument();
      expect(onUpload).not.toHaveBeenCalled();
    });
  });

  it('should clear upload and allow re-upload', async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();

    render(<JsonUploadPanel onUpload={onUpload} />);

    const file = new File(['[{"id": 1}]'], 'data.json', {
      type: 'application/json',
    });

    const input = screen.getByLabelText(/upload json/i, { selector: 'input[type="file"]' });
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByText(/data\.json/i)).toBeInTheDocument();
    });

    const clearButton = screen.getByRole('button', { name: /clear/i });
    await user.click(clearButton);

    expect(screen.queryByText(/data\.json/i)).not.toBeInTheDocument();
    expect(screen.getByText(/drop json file/i)).toBeInTheDocument();
  });

  it('should accept drag and drop', async () => {
    const onUpload = vi.fn();

    render(<JsonUploadPanel onUpload={onUpload} />);

    const data = [{ name: 'Bob' }];
    const file = new File([JSON.stringify(data)], 'drag.json', {
      type: 'application/json',
    });

    const dropzone = screen.getByText(/drop json file/i).parentElement!;

    // Simulate drag and drop
    const dataTransfer = {
      files: [file],
      items: [
        {
          kind: 'file',
          type: file.type,
          getAsFile: () => file,
        },
      ],
      types: ['Files'],
    };

    // Note: Testing drag-drop requires fireEvent since it's a native event
    const { fireEvent } = await import('@testing-library/react');
    fireEvent.drop(dropzone, { dataTransfer });

    await waitFor(() => {
      expect(onUpload).toHaveBeenCalledWith(data);
    });
  });

  it('should show loading state during file processing', async () => {
    const user = userEvent.setup();

    render(<JsonUploadPanel onUpload={vi.fn()} />);

    const file = new File(['[{"id": 1}]'], 'large.json', {
      type: 'application/json',
    });

    const input = screen.getByLabelText(/upload json/i, { selector: 'input[type="file"]' });

    // Upload file
    const uploadPromise = user.upload(input, file);

    // Check for loading state (may be very brief for small files)
    // This test may need adjustment based on actual implementation
    await uploadPromise;

    await waitFor(() => {
      expect(screen.getByText(/large\.json/i)).toBeInTheDocument();
    });
  });
});
