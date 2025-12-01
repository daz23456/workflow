/**
 * LessonViewer Component Tests
 * Stage 9.5: Interactive Documentation & Learning
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LessonViewer } from './lesson-viewer';
import type { Lesson } from '@/types/learning';

// Mock CodeEditor component
vi.mock('./code-editor', () => ({
  CodeEditor: ({ value, onChange }: { value: string; onChange?: (v: string) => void }) => (
    <div data-testid="mock-code-editor">
      <textarea
        data-testid="code-editor-textarea"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </div>
  ),
}));

const mockLesson: Lesson = {
  id: 'hello-world',
  title: 'Hello World Workflow',
  description: 'Learn the basics of creating your first workflow',
  difficulty: 'beginner',
  estimatedTime: 10,
  order: 1,
  objectives: ['Understand workflow structure', 'Create a simple task'],
  content: {
    introduction: 'Welcome to your first lesson!',
    steps: [
      {
        title: 'Step 1: Introduction',
        description: 'Learn about workflow basics',
        codeExample: 'apiVersion: workflow.io/v1',
        tips: ['Tip 1: Start simple', 'Tip 2: Read docs'],
      },
      {
        title: 'Step 2: Create Task',
        description: 'Add your first task to the workflow',
        codeExample: 'tasks:\n  - name: my-task',
      },
      {
        title: 'Step 3: Execute',
        description: 'Run your workflow and see results',
      },
    ],
    summary: 'Great job completing the lesson!',
  },
  yaml: 'apiVersion: workflow.io/v1\nkind: Workflow\nmetadata:\n  name: hello-world',
  successCriteria: ['Create a workflow', 'Add a task', 'Execute successfully'],
};

describe('LessonViewer', () => {
  const defaultProps = {
    lesson: mockLesson,
    onComplete: vi.fn(),
    onExit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render lesson viewer container', () => {
      render(<LessonViewer {...defaultProps} />);
      expect(screen.getByTestId('lesson-viewer')).toBeInTheDocument();
    });

    it('should render lesson title', () => {
      render(<LessonViewer {...defaultProps} />);
      expect(screen.getByText('Hello World Workflow')).toBeInTheDocument();
    });

    it('should render lesson description', () => {
      render(<LessonViewer {...defaultProps} />);
      expect(screen.getByText('Learn the basics of creating your first workflow')).toBeInTheDocument();
    });

    it('should render exit button', () => {
      render(<LessonViewer {...defaultProps} />);
      expect(screen.getByTestId('exit-button')).toBeInTheDocument();
      expect(screen.getByText('Exit Lesson')).toBeInTheDocument();
    });

    it('should render code editor', () => {
      render(<LessonViewer {...defaultProps} />);
      expect(screen.getByTestId('mock-code-editor')).toBeInTheDocument();
    });

    it('should render success criteria list', () => {
      render(<LessonViewer {...defaultProps} />);
      expect(screen.getByTestId('success-criteria-list')).toBeInTheDocument();
      expect(screen.getByText('Create a workflow')).toBeInTheDocument();
      expect(screen.getByText('Add a task')).toBeInTheDocument();
      expect(screen.getByText('Execute successfully')).toBeInTheDocument();
    });
  });

  describe('Step Navigation', () => {
    it('should show first step initially', () => {
      render(<LessonViewer {...defaultProps} />);
      expect(screen.getByText('Step 1: Introduction')).toBeInTheDocument();
      expect(screen.getByText('Learn about workflow basics')).toBeInTheDocument();
    });

    it('should show step counter', () => {
      render(<LessonViewer {...defaultProps} />);
      expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    });

    it('should disable Previous button on first step', () => {
      render(<LessonViewer {...defaultProps} />);
      const prevButton = screen.getByTestId('previous-step-button');
      expect(prevButton).toBeDisabled();
    });

    it('should enable Next button on first step', () => {
      render(<LessonViewer {...defaultProps} />);
      const nextButton = screen.getByTestId('next-step-button');
      expect(nextButton).not.toBeDisabled();
    });

    it('should navigate to next step when Next is clicked', async () => {
      render(<LessonViewer {...defaultProps} />);

      const nextButton = screen.getByTestId('next-step-button');
      await userEvent.click(nextButton);

      expect(screen.getByText('Step 2: Create Task')).toBeInTheDocument();
      expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    });

    it('should navigate to previous step when Previous is clicked', async () => {
      render(<LessonViewer {...defaultProps} />);

      // Go to step 2
      await userEvent.click(screen.getByTestId('next-step-button'));
      expect(screen.getByText('Step 2: Create Task')).toBeInTheDocument();

      // Go back to step 1
      await userEvent.click(screen.getByTestId('previous-step-button'));
      expect(screen.getByText('Step 1: Introduction')).toBeInTheDocument();
    });

    it('should disable Next button on last step', async () => {
      render(<LessonViewer {...defaultProps} />);

      // Navigate to last step
      await userEvent.click(screen.getByTestId('next-step-button'));
      await userEvent.click(screen.getByTestId('next-step-button'));

      expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
      expect(screen.getByTestId('next-step-button')).toBeDisabled();
    });

    it('should enable Previous button after navigating away from first step', async () => {
      render(<LessonViewer {...defaultProps} />);

      await userEvent.click(screen.getByTestId('next-step-button'));

      expect(screen.getByTestId('previous-step-button')).not.toBeDisabled();
    });
  });

  describe('Progress Bar', () => {
    it('should render progress bar', () => {
      render(<LessonViewer {...defaultProps} />);
      expect(screen.getByTestId('lesson-progress-bar')).toBeInTheDocument();
    });

    it('should update progress bar width as steps are navigated', async () => {
      render(<LessonViewer {...defaultProps} />);

      // Step 1 of 3 = ~33%
      const progressBar = screen.getByTestId('lesson-progress-bar');
      expect(progressBar).toHaveStyle({ width: '33.33333333333333%' });

      // Navigate to step 2
      await userEvent.click(screen.getByTestId('next-step-button'));
      expect(progressBar).toHaveStyle({ width: '66.66666666666666%' });

      // Navigate to step 3
      await userEvent.click(screen.getByTestId('next-step-button'));
      expect(progressBar).toHaveStyle({ width: '100%' });
    });
  });

  describe('Code Example', () => {
    it('should display code example when step has one', () => {
      render(<LessonViewer {...defaultProps} />);
      expect(screen.getByText('apiVersion: workflow.io/v1')).toBeInTheDocument();
    });

    it('should not show code example section when step has none', async () => {
      render(<LessonViewer {...defaultProps} />);

      // Navigate to step 3 (no code example)
      await userEvent.click(screen.getByTestId('next-step-button'));
      await userEvent.click(screen.getByTestId('next-step-button'));

      expect(screen.queryByText('Code Example:')).not.toBeInTheDocument();
    });
  });

  describe('Hints/Tips', () => {
    it('should show toggle hints button when step has tips', () => {
      render(<LessonViewer {...defaultProps} />);
      expect(screen.getByTestId('toggle-hints-button')).toBeInTheDocument();
      expect(screen.getByText('Show Hints (2)')).toBeInTheDocument();
    });

    it('should toggle hints visibility when button is clicked', async () => {
      render(<LessonViewer {...defaultProps} />);

      // Hints should be hidden initially
      expect(screen.queryByTestId('hints-list')).not.toBeInTheDocument();

      // Show hints
      await userEvent.click(screen.getByTestId('toggle-hints-button'));
      expect(screen.getByTestId('hints-list')).toBeInTheDocument();
      expect(screen.getByText('Tip 1: Start simple')).toBeInTheDocument();

      // Hide hints
      await userEvent.click(screen.getByTestId('toggle-hints-button'));
      expect(screen.queryByTestId('hints-list')).not.toBeInTheDocument();
    });

    it('should update button text when hints are shown', async () => {
      render(<LessonViewer {...defaultProps} />);

      await userEvent.click(screen.getByTestId('toggle-hints-button'));

      expect(screen.getByText('Hide Hints (2)')).toBeInTheDocument();
    });

    it('should hide hints when navigating to next step', async () => {
      render(<LessonViewer {...defaultProps} />);

      // Show hints
      await userEvent.click(screen.getByTestId('toggle-hints-button'));
      expect(screen.getByTestId('hints-list')).toBeInTheDocument();

      // Navigate to next step
      await userEvent.click(screen.getByTestId('next-step-button'));

      // Hints should be hidden
      expect(screen.queryByTestId('hints-list')).not.toBeInTheDocument();
    });
  });

  describe('Success Criteria Checklist', () => {
    it('should render all criteria as unchecked initially', () => {
      render(<LessonViewer {...defaultProps} />);

      // All criteria checkboxes should exist
      expect(screen.getByTestId('criteria-checkbox-0')).toBeInTheDocument();
      expect(screen.getByTestId('criteria-checkbox-1')).toBeInTheDocument();
      expect(screen.getByTestId('criteria-checkbox-2')).toBeInTheDocument();
    });

    it('should toggle criteria when checkbox is clicked', async () => {
      render(<LessonViewer {...defaultProps} />);

      const checkbox = screen.getByTestId('criteria-checkbox-0');
      await userEvent.click(checkbox);

      // After clicking, the criteria text should have styling for checked state
      const criteriaText = screen.getByText('Create a workflow');
      expect(criteriaText).toHaveClass('text-gray-900', 'font-medium');
    });

    it('should have accessible labels for checkboxes', () => {
      render(<LessonViewer {...defaultProps} />);

      const checkbox = screen.getByTestId('criteria-checkbox-0');
      expect(checkbox).toHaveAttribute('aria-label', 'Toggle Create a workflow');
    });
  });

  describe('Complete Lesson Button', () => {
    it('should be disabled when not all criteria are checked', () => {
      render(<LessonViewer {...defaultProps} />);
      const completeButton = screen.getByTestId('complete-lesson-button');
      expect(completeButton).toBeDisabled();
      expect(screen.getByText('Complete All Criteria to Continue')).toBeInTheDocument();
    });

    it('should be enabled when all criteria are checked', async () => {
      render(<LessonViewer {...defaultProps} />);

      // Check all criteria
      await userEvent.click(screen.getByTestId('criteria-checkbox-0'));
      await userEvent.click(screen.getByTestId('criteria-checkbox-1'));
      await userEvent.click(screen.getByTestId('criteria-checkbox-2'));

      const completeButton = screen.getByTestId('complete-lesson-button');
      expect(completeButton).not.toBeDisabled();
      expect(screen.getByText('✓ Complete Lesson')).toBeInTheDocument();
    });

    it('should call onComplete when clicked with all criteria checked', async () => {
      const onComplete = vi.fn();
      render(<LessonViewer {...defaultProps} onComplete={onComplete} />);

      // Check all criteria
      await userEvent.click(screen.getByTestId('criteria-checkbox-0'));
      await userEvent.click(screen.getByTestId('criteria-checkbox-1'));
      await userEvent.click(screen.getByTestId('criteria-checkbox-2'));

      // Click complete button
      await userEvent.click(screen.getByTestId('complete-lesson-button'));

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('should become disabled again if criteria is unchecked', async () => {
      render(<LessonViewer {...defaultProps} />);

      // Check all criteria
      await userEvent.click(screen.getByTestId('criteria-checkbox-0'));
      await userEvent.click(screen.getByTestId('criteria-checkbox-1'));
      await userEvent.click(screen.getByTestId('criteria-checkbox-2'));

      // Uncheck one criteria
      await userEvent.click(screen.getByTestId('criteria-checkbox-1'));

      const completeButton = screen.getByTestId('complete-lesson-button');
      expect(completeButton).toBeDisabled();
    });
  });

  describe('Exit Callback', () => {
    it('should call onExit when exit button is clicked', async () => {
      const onExit = vi.fn();
      render(<LessonViewer {...defaultProps} onExit={onExit} />);

      await userEvent.click(screen.getByTestId('exit-button'));

      expect(onExit).toHaveBeenCalledTimes(1);
    });
  });

  describe('Code Editor Integration', () => {
    it('should initialize code editor with lesson yaml', () => {
      render(<LessonViewer {...defaultProps} />);
      const textarea = screen.getByTestId('code-editor-textarea');
      expect(textarea).toHaveValue(mockLesson.yaml);
    });

    it('should update code when editor changes', async () => {
      render(<LessonViewer {...defaultProps} />);
      const textarea = screen.getByTestId('code-editor-textarea');

      fireEvent.change(textarea, { target: { value: 'new yaml content' } });

      expect(textarea).toHaveValue('new yaml content');
    });
  });

  describe('Custom className', () => {
    it('should apply custom className', () => {
      render(<LessonViewer {...defaultProps} className="custom-class" />);
      const viewer = screen.getByTestId('lesson-viewer');
      expect(viewer).toHaveClass('custom-class');
    });
  });
});
