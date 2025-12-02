/**
 * EventFeed Tests - TDD
 *
 * Tests for the live event stream panel showing workflow execution events.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { EventFeed, type EventFeedProps, type TrafficEvent } from './event-feed';

const mockEvents: TrafficEvent[] = [
  {
    id: 'evt-1',
    type: 'workflow_started',
    workflowName: 'User API',
    executionId: 'exec-123',
    timestamp: new Date('2024-01-15T10:30:00Z'),
  },
  {
    id: 'evt-2',
    type: 'task_started',
    workflowName: 'User API',
    executionId: 'exec-123',
    taskName: 'Validate Input',
    timestamp: new Date('2024-01-15T10:30:01Z'),
  },
  {
    id: 'evt-3',
    type: 'task_completed',
    workflowName: 'User API',
    executionId: 'exec-123',
    taskName: 'Validate Input',
    status: 'succeeded',
    timestamp: new Date('2024-01-15T10:30:02Z'),
  },
  {
    id: 'evt-4',
    type: 'workflow_completed',
    workflowName: 'User API',
    executionId: 'exec-123',
    status: 'succeeded',
    timestamp: new Date('2024-01-15T10:30:05Z'),
  },
];

const defaultProps: EventFeedProps = {
  events: mockEvents,
  maxEvents: 50,
};

describe('EventFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the event feed container', () => {
      render(<EventFeed {...defaultProps} />);
      expect(screen.getByTestId('event-feed')).toBeInTheDocument();
    });

    it('renders all events', () => {
      render(<EventFeed {...defaultProps} />);
      expect(screen.getByTestId('event-evt-1')).toBeInTheDocument();
      expect(screen.getByTestId('event-evt-2')).toBeInTheDocument();
      expect(screen.getByTestId('event-evt-3')).toBeInTheDocument();
      expect(screen.getByTestId('event-evt-4')).toBeInTheDocument();
    });

    it('displays workflow name in events', () => {
      render(<EventFeed {...defaultProps} />);
      const userApiTexts = screen.getAllByText(/User API/);
      expect(userApiTexts.length).toBeGreaterThan(0);
    });

    it('displays event type indicators', () => {
      render(<EventFeed {...defaultProps} />);
      // Events should have type-specific styling/icons
      expect(screen.getByTestId('event-evt-1')).toBeInTheDocument();
    });
  });

  describe('filtering', () => {
    it('has filter buttons for event types', () => {
      render(<EventFeed {...defaultProps} />);
      expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /started/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /completed/i })).toBeInTheDocument();
    });

    it('filters events when filter is clicked', () => {
      render(<EventFeed {...defaultProps} />);
      const allButton = screen.getByRole('button', { name: /all/i });
      fireEvent.click(allButton);
      // Events should still be visible with "all" filter
      expect(screen.getByTestId('event-evt-1')).toBeInTheDocument();
    });

    it('filters to show only started events', () => {
      render(<EventFeed {...defaultProps} />);
      const startedButton = screen.getByRole('button', { name: /started/i });
      fireEvent.click(startedButton);
      // Should show workflow_started and task_started
      expect(screen.getByTestId('event-evt-1')).toBeInTheDocument();
      expect(screen.getByTestId('event-evt-2')).toBeInTheDocument();
      // Should not show completed events
      expect(screen.queryByTestId('event-evt-3')).not.toBeInTheDocument();
    });

    it('filters to show only completed events', () => {
      render(<EventFeed {...defaultProps} />);
      const completedButton = screen.getByRole('button', { name: /completed/i });
      fireEvent.click(completedButton);
      // Should show task_completed and workflow_completed with succeeded status
      expect(screen.getByTestId('event-evt-3')).toBeInTheDocument();
      expect(screen.getByTestId('event-evt-4')).toBeInTheDocument();
    });
  });

  describe('failed events', () => {
    const eventsWithFailed: TrafficEvent[] = [
      ...mockEvents,
      {
        id: 'evt-5',
        type: 'task_completed',
        workflowName: 'User API',
        executionId: 'exec-456',
        taskName: 'Payment',
        status: 'failed',
        timestamp: new Date('2024-01-15T10:31:00Z'),
      },
    ];

    it('displays failed events with error styling', () => {
      render(<EventFeed events={eventsWithFailed} />);
      const failedEvent = screen.getByTestId('event-evt-5');
      expect(failedEvent).toBeInTheDocument();
      expect(failedEvent).toHaveClass('bg-red-900/20');
    });
  });

  describe('empty state', () => {
    it('shows empty message when no events', () => {
      render(<EventFeed events={[]} />);
      expect(screen.getByText(/no events to display/i)).toBeInTheDocument();
    });
  });

  describe('maxEvents', () => {
    it('limits the number of displayed events', () => {
      const manyEvents: TrafficEvent[] = Array.from({ length: 10 }, (_, i) => ({
        id: `evt-${i}`,
        type: 'workflow_started' as const,
        workflowName: 'Test Workflow',
        executionId: `exec-${i}`,
        timestamp: new Date(),
      }));
      render(<EventFeed events={manyEvents} maxEvents={5} />);
      // Should only render 5 events
      expect(screen.getByTestId('event-evt-0')).toBeInTheDocument();
      expect(screen.getByTestId('event-evt-4')).toBeInTheDocument();
      expect(screen.queryByTestId('event-evt-5')).not.toBeInTheDocument();
    });
  });
});
