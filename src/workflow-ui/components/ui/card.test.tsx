import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from './card';

describe('Card Components', () => {
  describe('Card', () => {
    it('renders with default classes', () => {
      render(<Card>Card content</Card>);
      const card = screen.getByText('Card content');
      expect(card).toHaveAttribute('data-slot', 'card');
      expect(card).toHaveClass('bg-card');
    });

    it('applies custom className', () => {
      render(<Card className="custom-class">Card content</Card>);
      const card = screen.getByText('Card content');
      expect(card).toHaveClass('custom-class');
    });

    it('passes through additional props', () => {
      render(<Card data-testid="test-card">Card content</Card>);
      expect(screen.getByTestId('test-card')).toBeInTheDocument();
    });
  });

  describe('CardHeader', () => {
    it('renders with default classes', () => {
      render(<CardHeader>Header content</CardHeader>);
      const header = screen.getByText('Header content');
      expect(header).toHaveAttribute('data-slot', 'card-header');
    });

    it('applies custom className', () => {
      render(<CardHeader className="custom-header">Header content</CardHeader>);
      const header = screen.getByText('Header content');
      expect(header).toHaveClass('custom-header');
    });
  });

  describe('CardTitle', () => {
    it('renders with default classes', () => {
      render(<CardTitle>Title content</CardTitle>);
      const title = screen.getByText('Title content');
      expect(title).toHaveAttribute('data-slot', 'card-title');
      expect(title).toHaveClass('font-semibold');
    });

    it('applies custom className', () => {
      render(<CardTitle className="custom-title">Title content</CardTitle>);
      const title = screen.getByText('Title content');
      expect(title).toHaveClass('custom-title');
    });
  });

  describe('CardDescription', () => {
    it('renders with default classes', () => {
      render(<CardDescription>Description content</CardDescription>);
      const description = screen.getByText('Description content');
      expect(description).toHaveAttribute('data-slot', 'card-description');
      expect(description).toHaveClass('text-muted-foreground');
    });

    it('applies custom className', () => {
      render(<CardDescription className="custom-desc">Description content</CardDescription>);
      const description = screen.getByText('Description content');
      expect(description).toHaveClass('custom-desc');
    });
  });

  describe('CardAction', () => {
    it('renders with default classes', () => {
      render(<CardAction>Action content</CardAction>);
      const action = screen.getByText('Action content');
      expect(action).toHaveAttribute('data-slot', 'card-action');
    });

    it('applies custom className', () => {
      render(<CardAction className="custom-action">Action content</CardAction>);
      const action = screen.getByText('Action content');
      expect(action).toHaveClass('custom-action');
    });
  });

  describe('CardContent', () => {
    it('renders with default classes', () => {
      render(<CardContent>Content area</CardContent>);
      const content = screen.getByText('Content area');
      expect(content).toHaveAttribute('data-slot', 'card-content');
      expect(content).toHaveClass('px-6');
    });

    it('applies custom className', () => {
      render(<CardContent className="custom-content">Content area</CardContent>);
      const content = screen.getByText('Content area');
      expect(content).toHaveClass('custom-content');
    });
  });

  describe('CardFooter', () => {
    it('renders with default classes', () => {
      render(<CardFooter>Footer content</CardFooter>);
      const footer = screen.getByText('Footer content');
      expect(footer).toHaveAttribute('data-slot', 'card-footer');
      expect(footer).toHaveClass('flex');
    });

    it('applies custom className', () => {
      render(<CardFooter className="custom-footer">Footer content</CardFooter>);
      const footer = screen.getByText('Footer content');
      expect(footer).toHaveClass('custom-footer');
    });
  });

  describe('Card composition', () => {
    it('renders a complete card with all sub-components', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Test Title</CardTitle>
            <CardDescription>Test Description</CardDescription>
            <CardAction>Action</CardAction>
          </CardHeader>
          <CardContent>Main content</CardContent>
          <CardFooter>Footer</CardFooter>
        </Card>
      );

      expect(screen.getByText('Test Title')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
      expect(screen.getByText('Main content')).toBeInTheDocument();
      expect(screen.getByText('Footer')).toBeInTheDocument();
    });
  });
});
