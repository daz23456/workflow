/**
 * LessonCard Component Tests
 * Stage 9.5: Interactive Documentation & Learning
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LessonCard } from './lesson-card';
import type { Lesson } from '@/types/learning';

const mockLesson: Lesson = {
  id: 'hello-world',
  title: 'Hello World Workflow',
  description: 'Learn the basics of creating your first workflow',
  difficulty: 'beginner',
  estimatedTime: 10,
  order: 1,
  objectives: ['Understand workflow structure', 'Create a simple task', 'Run your first workflow'],
  content: {
    introduction: 'Welcome to your first lesson!',
    steps: [
      { title: 'Step 1', description: 'Introduction to workflows' },
      { title: 'Step 2', description: 'Creating your first task' },
    ],
    summary: 'Great job completing the lesson!',
  },
  yaml: 'apiVersion: workflow.io/v1\nkind: Workflow',
  successCriteria: ['Create a workflow', 'Add a task', 'Execute successfully'],
};

describe('LessonCard', () => {
  const defaultProps = {
    lesson: mockLesson,
    isCompleted: false,
    progress: 0,
    onClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render lesson title', () => {
      render(<LessonCard {...defaultProps} />);
      expect(screen.getByText('Hello World Workflow')).toBeInTheDocument();
    });

    it('should render lesson description', () => {
      render(<LessonCard {...defaultProps} />);
      expect(screen.getByText('Learn the basics of creating your first workflow')).toBeInTheDocument();
    });

    it('should render lesson order number', () => {
      render(<LessonCard {...defaultProps} />);
      expect(screen.getByText('#1')).toBeInTheDocument();
    });

    it('should render estimated time', () => {
      render(<LessonCard {...defaultProps} />);
      expect(screen.getByText('10 min')).toBeInTheDocument();
    });

    it('should render objectives count', () => {
      render(<LessonCard {...defaultProps} />);
      expect(screen.getByText('3 objectives')).toBeInTheDocument();
    });

    it('should render singular objective when count is 1', () => {
      const lessonWithOneObjective = {
        ...mockLesson,
        objectives: ['Single objective'],
      };
      render(<LessonCard {...defaultProps} lesson={lessonWithOneObjective} />);
      expect(screen.getByText('1 objective')).toBeInTheDocument();
    });

    it('should render test id with lesson id', () => {
      render(<LessonCard {...defaultProps} />);
      expect(screen.getByTestId('lesson-card-hello-world')).toBeInTheDocument();
    });
  });

  describe('Difficulty Badge', () => {
    it('should render beginner badge with green styling', () => {
      render(<LessonCard {...defaultProps} />);
      const badge = screen.getByText('Beginner');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-green-100', 'text-green-800');
    });

    it('should render intermediate badge with yellow styling', () => {
      const intermediateLesson = { ...mockLesson, difficulty: 'intermediate' as const };
      render(<LessonCard {...defaultProps} lesson={intermediateLesson} />);
      const badge = screen.getByText('Intermediate');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
    });

    it('should render advanced badge with red styling', () => {
      const advancedLesson = { ...mockLesson, difficulty: 'advanced' as const };
      render(<LessonCard {...defaultProps} lesson={advancedLesson} />);
      const badge = screen.getByText('Advanced');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('bg-red-100', 'text-red-800');
    });
  });

  describe('Completion State', () => {
    it('should show incomplete icon when not completed', () => {
      render(<LessonCard {...defaultProps} isCompleted={false} />);
      expect(screen.getByTestId('incomplete-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('completed-icon')).not.toBeInTheDocument();
    });

    it('should show completed icon when completed', () => {
      render(<LessonCard {...defaultProps} isCompleted={true} />);
      expect(screen.getByTestId('completed-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('incomplete-icon')).not.toBeInTheDocument();
    });

    it('should show completed badge when completed', () => {
      render(<LessonCard {...defaultProps} isCompleted={true} />);
      expect(screen.getByText('Completed!')).toBeInTheDocument();
    });

    it('should apply green background when completed', () => {
      render(<LessonCard {...defaultProps} isCompleted={true} />);
      const card = screen.getByTestId('lesson-card-hello-world');
      expect(card).toHaveClass('bg-green-50', 'border-green-200');
    });
  });

  describe('Progress Bar', () => {
    it('should not show progress bar when progress is 0', () => {
      render(<LessonCard {...defaultProps} progress={0} />);
      expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument();
    });

    it('should not show progress bar when progress is 100', () => {
      render(<LessonCard {...defaultProps} progress={100} />);
      expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument();
    });

    it('should show progress bar when progress is between 0 and 100', () => {
      render(<LessonCard {...defaultProps} progress={50} />);
      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
    });

    it('should display progress percentage', () => {
      render(<LessonCard {...defaultProps} progress={75} />);
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should set correct width on progress bar', () => {
      render(<LessonCard {...defaultProps} progress={60} />);
      const progressBar = screen.getByTestId('progress-bar');
      expect(progressBar).toHaveStyle({ width: '60%' });
    });
  });

  describe('Click Interaction', () => {
    it('should call onClick when clicked', async () => {
      const onClick = vi.fn();
      render(<LessonCard {...defaultProps} onClick={onClick} />);

      const card = screen.getByTestId('lesson-card-hello-world');
      await userEvent.click(card);

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should have cursor-pointer class', () => {
      render(<LessonCard {...defaultProps} />);
      const card = screen.getByTestId('lesson-card-hello-world');
      expect(card).toHaveClass('cursor-pointer');
    });
  });

  describe('Keyboard Accessibility', () => {
    it('should have button role', () => {
      render(<LessonCard {...defaultProps} />);
      const card = screen.getByRole('button');
      expect(card).toBeInTheDocument();
    });

    it('should have tabIndex of 0', () => {
      render(<LessonCard {...defaultProps} />);
      const card = screen.getByTestId('lesson-card-hello-world');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('should call onClick when Enter key is pressed', () => {
      const onClick = vi.fn();
      render(<LessonCard {...defaultProps} onClick={onClick} />);

      const card = screen.getByTestId('lesson-card-hello-world');
      fireEvent.keyDown(card, { key: 'Enter' });

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick when Space key is pressed', () => {
      const onClick = vi.fn();
      render(<LessonCard {...defaultProps} onClick={onClick} />);

      const card = screen.getByTestId('lesson-card-hello-world');
      fireEvent.keyDown(card, { key: ' ' });

      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick for other keys', () => {
      const onClick = vi.fn();
      render(<LessonCard {...defaultProps} onClick={onClick} />);

      const card = screen.getByTestId('lesson-card-hello-world');
      fireEvent.keyDown(card, { key: 'Tab' });

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<LessonCard {...defaultProps} className="custom-class" />);
      const card = screen.getByTestId('lesson-card-hello-world');
      expect(card).toHaveClass('custom-class');
    });
  });
});
