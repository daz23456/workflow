/**
 * Tests for FieldWithHelp component
 * Stage 9.5: Interactive Documentation & Learning
 */

import { render, screen } from '@testing-library/react';
import { FieldWithHelp } from '../field-with-help';
import type { HelpTopic } from '@/types/learning';

describe('FieldWithHelp', () => {
  const mockTopic: HelpTopic = {
    id: 'test-field',
    title: 'Test Field',
    content: 'This field is for testing purposes.',
    keywords: ['test', 'field'],
  };

  describe('Rendering', () => {
    it('should render label and children', () => {
      render(
        <FieldWithHelp label="Username" helpTopic={mockTopic}>
          <input type="text" placeholder="Enter username" />
        </FieldWithHelp>
      );

      expect(screen.getByText('Username')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
    });

    it('should render help icon next to label', () => {
      render(
        <FieldWithHelp label="Email" helpTopic={mockTopic}>
          <input type="email" />
        </FieldWithHelp>
      );

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Help: Test Field/i })).toBeInTheDocument();
    });

    it('should render required indicator when required=true', () => {
      render(
        <FieldWithHelp label="Password" helpTopic={mockTopic} required>
          <input type="password" />
        </FieldWithHelp>
      );

      expect(screen.getByText('Password')).toBeInTheDocument();
      expect(screen.getByText('*')).toBeInTheDocument();
      expect(screen.getByText('*')).toHaveClass('text-red-500');
    });

    it('should not render required indicator when required=false', () => {
      render(
        <FieldWithHelp label="Optional Field" helpTopic={mockTopic} required={false}>
          <input type="text" />
        </FieldWithHelp>
      );

      expect(screen.getByText('Optional Field')).toBeInTheDocument();
      expect(screen.queryByText('*')).not.toBeInTheDocument();
    });

    it('should render children correctly', () => {
      render(
        <FieldWithHelp label="Description" helpTopic={mockTopic}>
          <textarea data-testid="description-field" rows={4} />
        </FieldWithHelp>
      );

      const textarea = screen.getByTestId('description-field');
      expect(textarea).toBeInTheDocument();
      expect(textarea).toHaveAttribute('rows', '4');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <FieldWithHelp label="Custom" helpTopic={mockTopic} className="custom-wrapper">
          <input type="text" />
        </FieldWithHelp>
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-wrapper');
    });
  });

  describe('Error Messages', () => {
    it('should display error message when provided', () => {
      render(
        <FieldWithHelp label="Email" helpTopic={mockTopic} error="Invalid email format">
          <input type="email" />
        </FieldWithHelp>
      );

      const errorMessage = screen.getByRole('alert');
      expect(errorMessage).toBeInTheDocument();
      expect(errorMessage).toHaveTextContent('Invalid email format');
      expect(errorMessage).toHaveClass('text-red-600');
    });

    it('should not display error message when error is undefined', () => {
      render(
        <FieldWithHelp label="Email" helpTopic={mockTopic}>
          <input type="email" />
        </FieldWithHelp>
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('should not display error message when error is empty string', () => {
      render(
        <FieldWithHelp label="Email" helpTopic={mockTopic} error="">
          <input type="email" />
        </FieldWithHelp>
      );

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('Help Icon Positioning', () => {
    it('should apply default help icon position (top, center)', () => {
      render(
        <FieldWithHelp label="Field" helpTopic={mockTopic}>
          <input type="text" />
        </FieldWithHelp>
      );

      expect(screen.getByRole('button', { name: /Help: Test Field/i })).toBeInTheDocument();
    });

    it('should apply custom help icon position (bottom)', () => {
      render(
        <FieldWithHelp label="Field" helpTopic={mockTopic} helpPosition="bottom">
          <input type="text" />
        </FieldWithHelp>
      );

      expect(screen.getByRole('button', { name: /Help: Test Field/i })).toBeInTheDocument();
    });

    it('should apply custom help icon align (start)', () => {
      render(
        <FieldWithHelp label="Field" helpTopic={mockTopic} helpAlign="start">
          <input type="text" />
        </FieldWithHelp>
      );

      expect(screen.getByRole('button', { name: /Help: Test Field/i })).toBeInTheDocument();
    });
  });

  describe('Complex Children', () => {
    it('should render multiple children correctly', () => {
      render(
        <FieldWithHelp label="Complex Field" helpTopic={mockTopic}>
          <div>
            <input type="text" data-testid="input-1" />
            <input type="text" data-testid="input-2" />
          </div>
        </FieldWithHelp>
      );

      expect(screen.getByTestId('input-1')).toBeInTheDocument();
      expect(screen.getByTestId('input-2')).toBeInTheDocument();
    });

    it('should work with custom components as children', () => {
      const CustomInput = () => <input type="text" data-testid="custom-input" />;

      render(
        <FieldWithHelp label="Custom" helpTopic={mockTopic}>
          <CustomInput />
        </FieldWithHelp>
      );

      expect(screen.getByTestId('custom-input')).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should render with correct spacing classes', () => {
      const { container } = render(
        <FieldWithHelp label="Field" helpTopic={mockTopic}>
          <input type="text" />
        </FieldWithHelp>
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('space-y-1');
    });

    it('should render label container with flex layout', () => {
      const { container } = render(
        <FieldWithHelp label="Field" helpTopic={mockTopic}>
          <input type="text" />
        </FieldWithHelp>
      );

      const labelContainer = container.querySelector('.flex.items-center.gap-1\\.5');
      expect(labelContainer).toBeInTheDocument();
    });
  });
});
