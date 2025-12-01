import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { TaskDetailPanel } from './task-detail-panel';
import type { TaskDetail } from '@/types/workflow';

describe('TaskDetailPanel', () => {
  const mockTask: TaskDetail = {
    id: 'create-user',
    taskRef: 'user-service',
    description: 'Create user account in database',
    timeout: '10s',
    retryCount: 3,
    inputMapping: {
      email: '{{input.email}}',
      password: '{{input.password}}',
      username: '{{input.username}}',
    },
    outputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        createdAt: { type: 'string' },
      },
    },
    httpRequest: {
      method: 'POST',
      url: 'https://api.example.com/users',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer {{env.API_TOKEN}}',
      },
      bodyTemplate: '{"email": "{{input.email}}", "password": "{{input.password}}"}',
    },
    dependsOn: ['validate-email'],
  };

  describe('Basic Rendering', () => {
    it('renders task ID', () => {
      render(<TaskDetailPanel task={mockTask} />);
      expect(screen.getByText('create-user')).toBeInTheDocument();
    });

    it('renders task reference', () => {
      render(<TaskDetailPanel task={mockTask} />);
      expect(screen.getByText(/user-service/i)).toBeInTheDocument();
    });

    it('renders task description', () => {
      render(<TaskDetailPanel task={mockTask} />);
      expect(screen.getByText('Create user account in database')).toBeInTheDocument();
    });
  });

  describe('Configuration Display', () => {
    it('renders timeout value', () => {
      render(<TaskDetailPanel task={mockTask} />);
      expect(screen.getByText(/timeout/i)).toBeInTheDocument();
      expect(screen.getByText('10s')).toBeInTheDocument();
    });

    it('renders retry count', () => {
      render(<TaskDetailPanel task={mockTask} />);
      expect(screen.getByText(/retries/i)).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('handles missing timeout', () => {
      const taskWithoutTimeout = { ...mockTask, timeout: undefined };
      render(<TaskDetailPanel task={taskWithoutTimeout} />);
      expect(screen.queryByText(/timeout/i)).not.toBeInTheDocument();
    });

    it('handles missing retry count', () => {
      const taskWithoutRetry = { ...mockTask, retryCount: undefined };
      render(<TaskDetailPanel task={taskWithoutRetry} />);
      expect(screen.queryByText(/retries/i)).not.toBeInTheDocument();
    });
  });

  describe('Input Mapping Display', () => {
    it('renders input mapping section', () => {
      render(<TaskDetailPanel task={mockTask} />);
      expect(screen.getByText(/input mapping/i)).toBeInTheDocument();
    });

    it('renders all input mappings', () => {
      render(<TaskDetailPanel task={mockTask} />);
      expect(screen.getByText('email')).toBeInTheDocument();
      expect(screen.getByText('{{input.email}}')).toBeInTheDocument();
      expect(screen.getByText('password')).toBeInTheDocument();
      expect(screen.getByText('{{input.password}}')).toBeInTheDocument();
      expect(screen.getByText('username')).toBeInTheDocument();
      expect(screen.getByText('{{input.username}}')).toBeInTheDocument();
    });

    it('handles task without input mapping', () => {
      const taskWithoutInput = { ...mockTask, inputMapping: undefined };
      render(<TaskDetailPanel task={taskWithoutInput} />);
      expect(screen.queryByText(/input mapping/i)).not.toBeInTheDocument();
    });
  });

  describe('Output Schema Display', () => {
    it('renders output schema section', () => {
      render(<TaskDetailPanel task={mockTask} />);
      expect(screen.getByText(/output schema/i)).toBeInTheDocument();
    });

    it('renders output schema properties', () => {
      render(<TaskDetailPanel task={mockTask} />);
      expect(screen.getByText('id')).toBeInTheDocument();
      expect(screen.getAllByText('string').length).toBeGreaterThan(0);
      expect(screen.getByText('createdAt')).toBeInTheDocument();
    });

    it('handles task without output schema', () => {
      const taskWithoutOutput = { ...mockTask, outputSchema: undefined };
      render(<TaskDetailPanel task={taskWithoutOutput} />);
      expect(screen.queryByText(/output schema/i)).not.toBeInTheDocument();
    });
  });

  describe('HTTP Request Display', () => {
    it('renders HTTP method and URL', () => {
      render(<TaskDetailPanel task={mockTask} />);
      expect(screen.getByText('POST')).toBeInTheDocument();
      expect(screen.getByText('https://api.example.com/users')).toBeInTheDocument();
    });

    it('renders HTTP headers', () => {
      render(<TaskDetailPanel task={mockTask} />);
      expect(screen.getByText('Content-Type')).toBeInTheDocument();
      expect(screen.getByText('application/json')).toBeInTheDocument();
      expect(screen.getByText('Authorization')).toBeInTheDocument();
      expect(screen.getByText('Bearer {{env.API_TOKEN}}')).toBeInTheDocument();
    });

    it('renders request body template', () => {
      render(<TaskDetailPanel task={mockTask} />);
      expect(screen.getByText(/body/i)).toBeInTheDocument();
      expect(screen.getByText(/"email": "{{input.email}}"/)).toBeInTheDocument();
    });

    it('handles task without HTTP request', () => {
      const taskWithoutHttp = { ...mockTask, httpRequest: undefined };
      render(<TaskDetailPanel task={taskWithoutHttp} />);
      expect(screen.queryByText(/https:\/\//)).not.toBeInTheDocument();
    });
  });

  describe('Dependencies Display', () => {
    it('renders dependencies section', () => {
      render(<TaskDetailPanel task={mockTask} />);
      expect(screen.getByText(/dependencies/i)).toBeInTheDocument();
    });

    it('renders all dependencies', () => {
      render(<TaskDetailPanel task={mockTask} />);
      expect(screen.getByText('validate-email')).toBeInTheDocument();
    });

    it('handles task with no dependencies', () => {
      const taskWithoutDeps = { ...mockTask, dependsOn: [] };
      render(<TaskDetailPanel task={taskWithoutDeps} />);
      expect(screen.getByText(/no dependencies/i)).toBeInTheDocument();
    });

    it('handles task with missing dependencies array', () => {
      const taskWithoutDeps = { ...mockTask, dependsOn: undefined };
      render(<TaskDetailPanel task={taskWithoutDeps} />);
      expect(screen.getByText(/no dependencies/i)).toBeInTheDocument();
    });

    it('renders multiple dependencies', () => {
      const taskWithMultipleDeps = {
        ...mockTask,
        dependsOn: ['task1', 'task2', 'task3'],
      };
      render(<TaskDetailPanel task={taskWithMultipleDeps} />);
      expect(screen.getByText('task1')).toBeInTheDocument();
      expect(screen.getByText('task2')).toBeInTheDocument();
      expect(screen.getByText('task3')).toBeInTheDocument();
    });
  });

  describe('Close Button', () => {
    it('renders close button', () => {
      render(<TaskDetailPanel task={mockTask} />);
      expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
    });

    it('calls onClose when close button clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<TaskDetailPanel task={mockTask} onClose={onClose} />);

      await user.click(screen.getByRole('button', { name: /close/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Collapsible Sections', () => {
    it('can toggle HTTP request section', async () => {
      const user = userEvent.setup();
      render(<TaskDetailPanel task={mockTask} />);

      const httpToggle = screen.getByRole('button', { name: /http request/i });

      // Initially expanded
      expect(screen.getByText('POST')).toBeInTheDocument();

      // Click to collapse
      await user.click(httpToggle);
      expect(screen.queryByText('POST')).not.toBeInTheDocument();

      // Click to expand
      await user.click(httpToggle);
      expect(screen.getByText('POST')).toBeInTheDocument();
    });

    it('can toggle input mapping section', async () => {
      const user = userEvent.setup();
      render(<TaskDetailPanel task={mockTask} />);

      const inputToggle = screen.getByRole('button', { name: /input mapping/i });

      // Initially expanded
      expect(screen.getByText('{{input.email}}')).toBeInTheDocument();

      // Click to collapse
      await user.click(inputToggle);
      expect(screen.queryByText('{{input.email}}')).not.toBeInTheDocument();

      // Click to expand
      await user.click(inputToggle);
      expect(screen.getByText('{{input.email}}')).toBeInTheDocument();
    });
  });

  describe('HTTP Method Badge Styling', () => {
    it('applies correct color for POST method', () => {
      const { container } = render(<TaskDetailPanel task={mockTask} />);
      const badge = container.querySelector('.bg-green-100');
      expect(badge).toHaveTextContent('POST');
    });

    it('applies correct color for GET method', () => {
      const getTask = {
        ...mockTask,
        httpRequest: { ...mockTask.httpRequest!, method: 'GET' },
      };
      const { container } = render(<TaskDetailPanel task={getTask} />);
      const badge = container.querySelector('.bg-blue-100');
      expect(badge).toHaveTextContent('GET');
    });

    it('applies correct color for DELETE method', () => {
      const deleteTask = {
        ...mockTask,
        httpRequest: { ...mockTask.httpRequest!, method: 'DELETE' },
      };
      const { container } = render(<TaskDetailPanel task={deleteTask} />);
      const badge = container.querySelector('.bg-red-100');
      expect(badge).toHaveTextContent('DELETE');
    });

    it('applies correct color for PUT method', () => {
      const putTask = {
        ...mockTask,
        httpRequest: { ...mockTask.httpRequest!, method: 'PUT' },
      };
      const { container } = render(<TaskDetailPanel task={putTask} />);
      const badge = container.querySelector('.bg-yellow-100');
      expect(badge).toHaveTextContent('PUT');
    });
  });

  describe('Accessibility', () => {
    it('has proper section headings', () => {
      render(<TaskDetailPanel task={mockTask} />);
      expect(screen.getByRole('heading', { level: 2, name: /create-user/i })).toBeInTheDocument();
    });

    it('close button is keyboard accessible', () => {
      render(<TaskDetailPanel task={mockTask} />);
      const closeBtn = screen.getByRole('button', { name: /close/i });
      expect(closeBtn).toHaveAttribute('type', 'button');
    });
  });
});
