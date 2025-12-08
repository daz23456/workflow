/**
 * Unit tests for Workflows Page
 *
 * Tests the workflows list page including "Create New Workflow" button
 * Following TDD: RED phase - these tests should FAIL until implementation
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import WorkflowsPage from './page';

// Mock WorkflowList component
vi.mock('@/components/workflows/workflow-list', () => ({
  WorkflowList: () => <div data-testid="workflow-list">Workflow List Component</div>,
}));

describe('WorkflowsPage', () => {
  describe('Page Header', () => {
    it('should render page title', () => {
      render(<WorkflowsPage />);
      expect(screen.getByRole('heading', { name: /workflows/i })).toBeInTheDocument();
    });

    it('should render page description', () => {
      render(<WorkflowsPage />);
      expect(screen.getByText(/browse and manage all workflows/i)).toBeInTheDocument();
    });
  });

  describe('Create New Workflow Button', () => {
    it('should render Create New Workflow button', () => {
      render(<WorkflowsPage />);
      const button = screen.getByRole('link', { name: /create.*workflow/i });
      expect(button).toBeInTheDocument();
    });

    it('should link to /workflows/new', () => {
      render(<WorkflowsPage />);
      const button = screen.getByRole('link', { name: /create.*workflow/i });
      expect(button).toHaveAttribute('href', '/workflows/new');
    });

    it('should have proper styling classes', () => {
      render(<WorkflowsPage />);
      const button = screen.getByRole('link', { name: /create.*workflow/i });
      expect(button).toHaveClass('theme-button');
    });

    it('should be keyboard accessible', () => {
      render(<WorkflowsPage />);
      const button = screen.getByRole('link', { name: /create.*workflow/i });
      button.focus();
      expect(button).toHaveFocus();
    });
  });

  describe('Layout', () => {
    it('should render WorkflowList component', () => {
      render(<WorkflowsPage />);
      expect(screen.getByTestId('workflow-list')).toBeInTheDocument();
    });

    it('should position button in header section', () => {
      render(<WorkflowsPage />);
      const heading = screen.getByRole('heading', { name: /workflows/i });
      const button = screen.getByRole('link', { name: /create.*workflow/i });

      // Both should be in the same section (heading should come before button in DOM)
      const headingPosition = heading.compareDocumentPosition(button);
      expect(headingPosition & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible button label', () => {
      render(<WorkflowsPage />);
      const button = screen.getByRole('link', { name: /create.*workflow/i });
      expect(button).toHaveAccessibleName();
    });
  });
});
