import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VariableWatcher } from './variable-watcher';

describe('VariableWatcher', () => {
  const mockVariables = [
    {
      name: 'input.userId',
      value: '123',
      timestamp: '2025-01-01T10:00:00Z',
    },
    {
      name: 'tasks.fetch-user.output.name',
      value: 'John Doe',
      timestamp: '2025-01-01T10:00:02Z',
    },
    {
      name: 'tasks.fetch-user.output.email',
      value: 'john@example.com',
      timestamp: '2025-01-01T10:00:02Z',
    },
    {
      name: 'tasks.send-email.output.messageId',
      value: 'msg-456',
      timestamp: '2025-01-01T10:00:05Z',
    },
  ];

  const mockVariableHistory = [
    {
      name: 'input.userId',
      changes: [{ value: '123', timestamp: '2025-01-01T10:00:00Z' }],
    },
    {
      name: 'tasks.fetch-user.output.name',
      changes: [{ value: 'John Doe', timestamp: '2025-01-01T10:00:02Z' }],
    },
  ];

  it('should render variable watcher container', () => {
    render(<VariableWatcher variables={mockVariables} />);

    const watcher = screen.getByRole('region', { name: /variable watcher/i });
    expect(watcher).toBeInTheDocument();
  });

  it('should display all variables', () => {
    render(<VariableWatcher variables={mockVariables} />);

    expect(screen.getByText(/input\.userId/i)).toBeInTheDocument();
    expect(screen.getByText(/tasks\.fetch-user\.output\.name/i)).toBeInTheDocument();
    expect(screen.getByText(/tasks\.fetch-user\.output\.email/i)).toBeInTheDocument();
    expect(screen.getByText(/tasks\.send-email\.output\.messageId/i)).toBeInTheDocument();
  });

  it('should show variable values', () => {
    render(<VariableWatcher variables={mockVariables} />);

    expect(screen.getByText('123')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getByText('msg-456')).toBeInTheDocument();
  });

  it('should allow filtering variables by name', async () => {
    const user = userEvent.setup();
    render(<VariableWatcher variables={mockVariables} />);

    const searchInput = screen.getByPlaceholderText(/search variables/i);
    await user.type(searchInput, 'fetch-user');

    // Should show only fetch-user variables
    expect(screen.getByText(/tasks\.fetch-user\.output\.name/i)).toBeInTheDocument();
    expect(screen.getByText(/tasks\.fetch-user\.output\.email/i)).toBeInTheDocument();
    expect(screen.queryByText(/input\.userId/i)).not.toBeInTheDocument();
  });

  it('should pin/unpin variables for tracking', async () => {
    const user = userEvent.setup();
    const onPin = vi.fn();
    render(<VariableWatcher variables={mockVariables} onPin={onPin} />);

    const pinButton = screen.getAllByRole('button', { name: /pin/i })[0];
    await user.click(pinButton);

    expect(onPin).toHaveBeenCalledWith('input.userId');
  });

  it('should show pinned variables section', () => {
    const pinnedVariables = ['input.userId', 'tasks.fetch-user.output.name'];
    render(<VariableWatcher variables={mockVariables} pinnedVariables={pinnedVariables} />);

    expect(screen.getByText(/pinned variables/i)).toBeInTheDocument();
    // Pinned section should show pinned variables
    const pinnedSection = screen.getByText(/pinned variables/i).closest('div');
    expect(pinnedSection).toBeInTheDocument();
  });

  it('should display variable change history', async () => {
    const user = userEvent.setup();
    render(<VariableWatcher variables={mockVariables} variableHistory={mockVariableHistory} />);

    const variableName = screen.getByText(/input\.userId/i);
    await user.click(variableName);

    // Should show history of changes
    expect(screen.getByText(/history/i)).toBeInTheDocument();
    expect(screen.getByText('123')).toBeInTheDocument();
  });

  it('should handle empty variables array', () => {
    render(<VariableWatcher variables={[]} />);

    expect(screen.getByText(/no variables/i)).toBeInTheDocument();
  });

  it('should group variables by source', () => {
    const { container } = render(<VariableWatcher variables={mockVariables} groupBySource />);

    // Should show group headings
    const headings = container.querySelectorAll('h4');
    const headingTexts = Array.from(headings).map((h) => h.textContent);

    expect(headingTexts).toContain('input');
    expect(headingTexts).toContain('tasks.fetch-user');
    expect(headingTexts).toContain('tasks.send-email');
  });

  it('should highlight changed variables', () => {
    const { container } = render(
      <VariableWatcher variables={mockVariables} changedVariables={['input.userId']} />
    );

    const changedElements = container.querySelectorAll('[data-changed="true"]');
    expect(changedElements.length).toBeGreaterThan(0);
  });

  it('should copy variable value to clipboard', async () => {
    const user = userEvent.setup();
    const mockWriteText = vi.fn();

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    render(<VariableWatcher variables={mockVariables} />);

    const copyButton = screen.getAllByRole('button', { name: /copy/i })[0];
    await user.click(copyButton);

    expect(mockWriteText).toHaveBeenCalledWith('123');
  });

  it('should expand/collapse variable details', async () => {
    const user = userEvent.setup();
    const complexVariable = {
      name: 'tasks.fetch-user.output',
      value: { id: '123', name: 'John Doe', email: 'john@example.com' },
      timestamp: '2025-01-01T10:00:02Z',
    };

    render(<VariableWatcher variables={[complexVariable]} />);

    const expandButton = screen.getByRole('button', { name: /expand/i });
    await user.click(expandButton);

    // Should show JSON view of complex value
    expect(screen.getByText(/john@example.com/i)).toBeInTheDocument();
  });
});
