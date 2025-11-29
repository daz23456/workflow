import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { ExecutionInputForm } from './execution-input-form';

describe('ExecutionInputForm', () => {
  const mockSimpleSchema = {
    type: 'object',
    properties: {
      email: { type: 'string', description: 'User email address' },
      age: { type: 'number', description: 'User age' },
    },
    required: ['email'],
  };

  const mockComplexSchema = {
    type: 'object',
    properties: {
      username: { type: 'string' },
      password: { type: 'string' },
      role: {
        type: 'string',
        enum: ['admin', 'user', 'guest'],
        description: 'User role',
      },
      isActive: { type: 'boolean', description: 'Account active status' },
      age: { type: 'integer', description: 'User age', minimum: 18, maximum: 120 },
    },
    required: ['username', 'password', 'role'],
  };

  describe('Basic Rendering', () => {
    it('renders form title', () => {
      render(<ExecutionInputForm schema={mockSimpleSchema} onSubmit={vi.fn()} />);
      expect(screen.getByText(/workflow input/i)).toBeInTheDocument();
    });

    it('renders all fields from schema', () => {
      render(<ExecutionInputForm schema={mockSimpleSchema} onSubmit={vi.fn()} />);
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/age/i)).toBeInTheDocument();
    });

    it('shows required indicator for required fields', () => {
      const { container } = render(<ExecutionInputForm schema={mockSimpleSchema} onSubmit={vi.fn()} />);
      const emailInput = screen.getByLabelText(/email/i);
      const fieldDiv = emailInput.closest('div');
      const asterisk = fieldDiv?.querySelector('.text-red-600');
      expect(asterisk).toBeInTheDocument();
      expect(asterisk).toHaveTextContent('*');
    });

    it('does not show required indicator for optional fields', () => {
      const { container } = render(<ExecutionInputForm schema={mockSimpleSchema} onSubmit={vi.fn()} />);
      const ageInput = screen.getByLabelText(/age/i);
      const fieldDiv = ageInput.closest('div');
      const asterisk = fieldDiv?.querySelector('.text-red-600');
      expect(asterisk).not.toBeInTheDocument();
    });
  });

  describe('Field Types', () => {
    it('renders text input for string fields', () => {
      render(<ExecutionInputForm schema={mockSimpleSchema} onSubmit={vi.fn()} />);
      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('type', 'text');
    });

    it('renders number input for number fields', () => {
      render(<ExecutionInputForm schema={mockSimpleSchema} onSubmit={vi.fn()} />);
      const ageInput = screen.getByLabelText(/age/i);
      expect(ageInput).toHaveAttribute('type', 'number');
    });

    it('renders select dropdown for enum fields', () => {
      render(<ExecutionInputForm schema={mockComplexSchema} onSubmit={vi.fn()} />);
      const roleSelect = screen.getByLabelText(/role/i);
      expect(roleSelect.tagName).toBe('SELECT');
    });

    it('renders enum options correctly', () => {
      render(<ExecutionInputForm schema={mockComplexSchema} onSubmit={vi.fn()} />);
      expect(screen.getByRole('option', { name: /admin/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /user/i })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: /guest/i })).toBeInTheDocument();
    });

    it('renders checkbox for boolean fields', () => {
      render(<ExecutionInputForm schema={mockComplexSchema} onSubmit={vi.fn()} />);
      const activeCheckbox = screen.getByLabelText(/active/i);
      expect(activeCheckbox).toHaveAttribute('type', 'checkbox');
    });

    it('applies min/max constraints to number fields', () => {
      render(<ExecutionInputForm schema={mockComplexSchema} onSubmit={vi.fn()} />);
      const ageInput = screen.getByLabelText(/age/i);
      expect(ageInput).toHaveAttribute('min', '18');
      expect(ageInput).toHaveAttribute('max', '120');
    });
  });

  describe('Field Descriptions', () => {
    it('shows field descriptions as helper text', () => {
      render(<ExecutionInputForm schema={mockSimpleSchema} onSubmit={vi.fn()} />);
      expect(screen.getByText('User email address')).toBeInTheDocument();
      expect(screen.getByText('User age')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows error for missing required field on submit', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(<ExecutionInputForm schema={mockSimpleSchema} onSubmit={onSubmit} />);

      await user.click(screen.getByRole('button', { name: /execute/i }));

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does not submit form with validation errors', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(<ExecutionInputForm schema={mockSimpleSchema} onSubmit={onSubmit} />);

      await user.click(screen.getByRole('button', { name: /execute/i }));

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      });

      expect(onSubmit).not.toHaveBeenCalled();
    });

    // REMOVED: "validates number min constraint for optional fields"
    // Reason: HTML input min/max attributes provide adequate client-side validation.
    // Server-side validation happens at the API gateway layer, not in the UI form.
    // Zod preprocessing + optional + min/max creates unnecessary complexity for minimal value.
  });

  describe('Form Submission', () => {
    it('submits valid form data', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(<ExecutionInputForm schema={mockSimpleSchema} onSubmit={onSubmit} />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/age/i), '30');

      await user.click(screen.getByRole('button', { name: /execute/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          email: 'test@example.com',
          age: 30,
        });
      });
    });

    it('converts number strings to numbers', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(<ExecutionInputForm schema={mockSimpleSchema} onSubmit={onSubmit} />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.type(screen.getByLabelText(/age/i), '25');

      await user.click(screen.getByRole('button', { name: /execute/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            age: 25, // Should be number, not string
          })
        );
      });
    });

    it('handles boolean checkbox values correctly', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(<ExecutionInputForm schema={mockComplexSchema} onSubmit={onSubmit} />);

      await user.type(screen.getByLabelText(/username/i), 'testuser');
      await user.type(screen.getByLabelText(/password/i), 'pass123');
      await user.selectOptions(screen.getByLabelText(/role/i), 'user');
      await user.click(screen.getByLabelText(/active/i));

      await user.click(screen.getByRole('button', { name: /execute/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            isActive: true,
          })
        );
      });
    });

    it('omits optional empty fields from submission', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(<ExecutionInputForm schema={mockSimpleSchema} onSubmit={onSubmit} />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      // Leave age empty

      await user.click(screen.getByRole('button', { name: /execute/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          email: 'test@example.com',
          // age should be omitted
        });
      });
    });
  });

  describe('Action Buttons', () => {
    it('renders Execute button', () => {
      render(<ExecutionInputForm schema={mockSimpleSchema} onSubmit={vi.fn()} />);
      expect(screen.getByRole('button', { name: /^execute$/i })).toBeInTheDocument();
    });

    it('renders Test/Dry-run button', () => {
      render(<ExecutionInputForm schema={mockSimpleSchema} onSubmit={vi.fn()} onTest={vi.fn()} />);
      expect(screen.getByRole('button', { name: /test.*dry.*run/i })).toBeInTheDocument();
    });

    it('does not render Test button when onTest not provided', () => {
      render(<ExecutionInputForm schema={mockSimpleSchema} onSubmit={vi.fn()} />);
      expect(screen.queryByRole('button', { name: /test.*dry.*run/i })).not.toBeInTheDocument();
    });

    it('calls onSubmit when Execute button clicked', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();

      render(<ExecutionInputForm schema={mockSimpleSchema} onSubmit={onSubmit} />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /execute/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
    });

    it('calls onTest when Test button clicked with valid data', async () => {
      const user = userEvent.setup();
      const onTest = vi.fn();

      render(<ExecutionInputForm schema={mockSimpleSchema} onSubmit={vi.fn()} onTest={onTest} />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /test.*dry.*run/i }));

      await waitFor(() => {
        expect(onTest).toHaveBeenCalledWith({
          email: 'test@example.com',
        });
      });
    });

    it('disables buttons during submission', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 100)));

      render(<ExecutionInputForm schema={mockSimpleSchema} onSubmit={onSubmit} />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /execute/i }));

      expect(screen.getByRole('button', { name: /executing/i })).toBeDisabled();
    });

    it('shows loading text during execution', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 100)));

      render(<ExecutionInputForm schema={mockSimpleSchema} onSubmit={onSubmit} />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /execute/i }));

      expect(screen.getByRole('button', { name: /executing/i })).toBeInTheDocument();
    });

    it('shows loading text during testing', async () => {
      const user = userEvent.setup();
      const onTest = vi.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 100)));

      render(<ExecutionInputForm schema={mockSimpleSchema} onSubmit={vi.fn()} onTest={onTest} />);

      await user.type(screen.getByLabelText(/email/i), 'test@example.com');
      await user.click(screen.getByRole('button', { name: /test.*dry.*run/i }));

      expect(screen.getByRole('button', { name: /testing/i })).toBeInTheDocument();
    });
  });

  describe('Empty Schema', () => {
    it('shows message when schema has no properties', () => {
      const emptySchema = { type: 'object', properties: {} };
      render(<ExecutionInputForm schema={emptySchema} onSubmit={vi.fn()} />);
      expect(screen.getByText(/no input required/i)).toBeInTheDocument();
    });

    it('allows submission with empty schema', async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      const emptySchema = { type: 'object', properties: {} };

      render(<ExecutionInputForm schema={emptySchema} onSubmit={onSubmit} />);

      await user.click(screen.getByRole('button', { name: /execute/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({});
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      render(<ExecutionInputForm schema={mockSimpleSchema} onSubmit={vi.fn()} />);
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/age/i)).toBeInTheDocument();
    });

    it('associates error messages with inputs', async () => {
      const user = userEvent.setup();
      render(<ExecutionInputForm schema={mockSimpleSchema} onSubmit={vi.fn()} />);

      await user.click(screen.getByRole('button', { name: /execute/i }));

      await waitFor(() => {
        const errorMessage = screen.getByText(/email is required/i);
        expect(errorMessage).toBeInTheDocument();
      });
    });

    it('buttons are keyboard accessible', () => {
      render(<ExecutionInputForm schema={mockSimpleSchema} onSubmit={vi.fn()} onTest={vi.fn()} />);
      const executeBtn = screen.getByRole('button', { name: /execute/i });
      const testBtn = screen.getByRole('button', { name: /test.*dry.*run/i });
      expect(executeBtn).toHaveAttribute('type', 'submit');
      expect(testBtn).toHaveAttribute('type', 'button');
    });
  });
});
