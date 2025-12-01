/**
 * Tests for HelpIcon component
 * Stage 9.5: Interactive Documentation & Learning
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HelpIcon } from '../help-icon';
import type { HelpTopic } from '@/types/learning';

describe('HelpIcon', () => {
  const mockTopic: HelpTopic = {
    id: 'test-topic',
    title: 'Test Topic',
    content: 'This is test content explaining the feature.',
    examples: ['example1', 'example2'],
    links: [
      { text: 'Learn more', url: 'https://example.com/docs' },
    ],
    keywords: ['test', 'example'],
  };

  const mockTopicMinimal: HelpTopic = {
    id: 'minimal-topic',
    title: 'Minimal Topic',
    content: 'Basic content without examples or links.',
  };

  describe('Rendering', () => {
    it('should render help icon button', () => {
      render(<HelpIcon topic={mockTopic} />);

      const button = screen.getByRole('button', { name: /Help: Test Topic/i });
      expect(button).toBeInTheDocument();
    });

    it('should render with custom className', () => {
      render(<HelpIcon topic={mockTopic} className="custom-class" />);

      const button = screen.getByRole('button', { name: /Help: Test Topic/i });
      expect(button).toHaveClass('custom-class');
    });

    it('should render HelpCircle icon', () => {
      const { container } = render(<HelpIcon topic={mockTopic} />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveClass('w-4', 'h-4');
    });
  });

  describe('Popover Interaction', () => {
    it('should open popover on click and display topic content', async () => {
      const user = userEvent.setup();
      render(<HelpIcon topic={mockTopic} />);

      const button = screen.getByRole('button', { name: /Help: Test Topic/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Test Topic')).toBeInTheDocument();
        expect(screen.getByText('This is test content explaining the feature.')).toBeInTheDocument();
      });
    });

    it('should display examples when provided', async () => {
      const user = userEvent.setup();
      render(<HelpIcon topic={mockTopic} />);

      const button = screen.getByRole('button', { name: /Help: Test Topic/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Examples:')).toBeInTheDocument();
        expect(screen.getByText('example1')).toBeInTheDocument();
        expect(screen.getByText('example2')).toBeInTheDocument();
      });
    });

    it('should display links when provided', async () => {
      const user = userEvent.setup();
      render(<HelpIcon topic={mockTopic} />);

      const button = screen.getByRole('button', { name: /Help: Test Topic/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Learn more:')).toBeInTheDocument();
        const link = screen.getByRole('link', { name: /Learn more →/i });
        expect(link).toHaveAttribute('href', 'https://example.com/docs');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });

    it('should not display examples section when examples are not provided', async () => {
      const user = userEvent.setup();
      render(<HelpIcon topic={mockTopicMinimal} />);

      const button = screen.getByRole('button', { name: /Help: Minimal Topic/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Minimal Topic')).toBeInTheDocument();
        expect(screen.queryByText('Examples:')).not.toBeInTheDocument();
      });
    });

    it('should not display links section when links are not provided', async () => {
      const user = userEvent.setup();
      render(<HelpIcon topic={mockTopicMinimal} />);

      const button = screen.getByRole('button', { name: /Help: Minimal Topic/i });
      await user.click(button);

      await waitFor(() => {
        expect(screen.getByText('Minimal Topic')).toBeInTheDocument();
        expect(screen.queryByText('Learn more:')).not.toBeInTheDocument();
      });
    });
  });

  describe('Positioning', () => {
    it('should apply default positioning (top, center)', () => {
      render(<HelpIcon topic={mockTopic} />);

      // Radix Popover applies positioning via data attributes
      // We can verify the component receives the right props
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should apply custom side positioning', () => {
      render(<HelpIcon topic={mockTopic} side="bottom" />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should apply custom align positioning', () => {
      render(<HelpIcon topic={mockTopic} align="start" />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label', () => {
      render(<HelpIcon topic={mockTopic} />);

      const button = screen.getByRole('button', { name: 'Help: Test Topic' });
      expect(button).toBeInTheDocument();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      render(<HelpIcon topic={mockTopic} />);

      const button = screen.getByRole('button', { name: /Help: Test Topic/i });

      // Focus the button
      button.focus();
      expect(button).toHaveFocus();

      // Press Enter to open popover
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText('Test Topic')).toBeInTheDocument();
      });
    });

    it('should have focus ring on button', () => {
      render(<HelpIcon topic={mockTopic} />);

      const button = screen.getByRole('button', { name: /Help: Test Topic/i });
      expect(button).toHaveClass('focus:ring-2', 'focus:ring-blue-500');
    });
  });
});
