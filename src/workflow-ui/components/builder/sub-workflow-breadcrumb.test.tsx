/**
 * Unit tests for SubWorkflowBreadcrumb component
 *
 * Tests navigation breadcrumb for nested workflow views
 * Following TDD: RED phase
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubWorkflowBreadcrumb } from './sub-workflow-breadcrumb';

describe('SubWorkflowBreadcrumb', () => {
  const mockOnNavigate = vi.fn();

  beforeEach(() => {
    mockOnNavigate.mockClear();
  });

  describe('Rendering', () => {
    it('should render single item for root workflow', () => {
      render(
        <SubWorkflowBreadcrumb
          path={[{ name: 'parent-workflow', label: 'Parent Workflow' }]}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText('Parent Workflow')).toBeInTheDocument();
    });

    it('should render all items in path', () => {
      render(
        <SubWorkflowBreadcrumb
          path={[
            { name: 'parent', label: 'Parent' },
            { name: 'child', label: 'Child' },
            { name: 'grandchild', label: 'Grandchild' },
          ]}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByText('Parent')).toBeInTheDocument();
      expect(screen.getByText('Child')).toBeInTheDocument();
      expect(screen.getByText('Grandchild')).toBeInTheDocument();
    });

    it('should render separators between items', () => {
      render(
        <SubWorkflowBreadcrumb
          path={[
            { name: 'parent', label: 'Parent' },
            { name: 'child', label: 'Child' },
          ]}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByTestId('breadcrumb-separator')).toBeInTheDocument();
    });

    it('should render current item without link', () => {
      render(
        <SubWorkflowBreadcrumb
          path={[
            { name: 'parent', label: 'Parent' },
            { name: 'current', label: 'Current' },
          ]}
          onNavigate={mockOnNavigate}
        />
      );

      const currentItem = screen.getByText('Current');
      expect(currentItem).toHaveAttribute('aria-current', 'page');
    });
  });

  describe('Navigation', () => {
    it('should call onNavigate when ancestor item clicked', async () => {
      const user = userEvent.setup();
      render(
        <SubWorkflowBreadcrumb
          path={[
            { name: 'parent', label: 'Parent' },
            { name: 'child', label: 'Child' },
            { name: 'current', label: 'Current' },
          ]}
          onNavigate={mockOnNavigate}
        />
      );

      await user.click(screen.getByText('Parent'));
      expect(mockOnNavigate).toHaveBeenCalledWith(0);
    });

    it('should not call onNavigate when current item clicked', async () => {
      const user = userEvent.setup();
      render(
        <SubWorkflowBreadcrumb
          path={[
            { name: 'parent', label: 'Parent' },
            { name: 'current', label: 'Current' },
          ]}
          onNavigate={mockOnNavigate}
        />
      );

      await user.click(screen.getByText('Current'));
      expect(mockOnNavigate).not.toHaveBeenCalled();
    });

    it('should navigate to correct depth level', async () => {
      const user = userEvent.setup();
      render(
        <SubWorkflowBreadcrumb
          path={[
            { name: 'root', label: 'Root' },
            { name: 'level1', label: 'Level 1' },
            { name: 'level2', label: 'Level 2' },
            { name: 'level3', label: 'Level 3' },
          ]}
          onNavigate={mockOnNavigate}
        />
      );

      await user.click(screen.getByText('Level 1'));
      expect(mockOnNavigate).toHaveBeenCalledWith(1);
    });
  });

  describe('Accessibility', () => {
    it('should have nav landmark role', () => {
      render(
        <SubWorkflowBreadcrumb
          path={[{ name: 'parent', label: 'Parent' }]}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByRole('navigation')).toBeInTheDocument();
    });

    it('should have aria-label on nav', () => {
      render(
        <SubWorkflowBreadcrumb
          path={[{ name: 'parent', label: 'Parent' }]}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Workflow breadcrumb');
    });

    it('should render as list', () => {
      render(
        <SubWorkflowBreadcrumb
          path={[
            { name: 'parent', label: 'Parent' },
            { name: 'child', label: 'Child' },
          ]}
          onNavigate={mockOnNavigate}
        />
      );

      expect(screen.getByRole('list')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });
  });

  describe('Empty State', () => {
    it('should render nothing when path is empty', () => {
      const { container } = render(
        <SubWorkflowBreadcrumb
          path={[]}
          onNavigate={mockOnNavigate}
        />
      );

      expect(container.querySelector('nav')).toBeNull();
    });
  });

  describe('Truncation', () => {
    it('should show ellipsis for deep nesting (more than 3 levels)', () => {
      render(
        <SubWorkflowBreadcrumb
          path={[
            { name: 'root', label: 'Root' },
            { name: 'level1', label: 'Level 1' },
            { name: 'level2', label: 'Level 2' },
            { name: 'level3', label: 'Level 3' },
            { name: 'level4', label: 'Level 4' },
          ]}
          onNavigate={mockOnNavigate}
          maxVisible={3}
        />
      );

      // Should show root, ellipsis, and last 2 items
      expect(screen.getByText('Root')).toBeInTheDocument();
      expect(screen.getByTestId('breadcrumb-ellipsis')).toBeInTheDocument();
      expect(screen.getByText('Level 3')).toBeInTheDocument();
      expect(screen.getByText('Level 4')).toBeInTheDocument();
    });
  });
});
