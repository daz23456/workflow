import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TemplateCard } from './template-card';
import { TemplateCategory, TemplateDifficulty, type TemplateListItem } from '@/types/template';

// Mock the template-preview component
vi.mock('./template-preview', () => ({
  TemplatePreview: ({ templateName, onClose, onDeploy }: any) => (
    <div data-testid="template-preview">
      <span>Preview: {templateName}</span>
      <button onClick={onClose}>Close</button>
      <button onClick={onDeploy}>Deploy from Preview</button>
    </div>
  ),
}));

const mockTemplate: TemplateListItem = {
  name: 'template-test',
  category: TemplateCategory.ApiComposition,
  difficulty: TemplateDifficulty.Beginner,
  description: 'Test template for unit tests',
  tags: ['test', 'unit', 'example', 'demo', 'additional'],
  estimatedSetupTime: 10,
  taskCount: 5,
  hasParallelExecution: true,
  namespace: 'default',
};

describe('TemplateCard', () => {
  it('should render template basic information', () => {
    render(<TemplateCard template={mockTemplate} />);

    expect(screen.getByText('template-test')).toBeInTheDocument();
    expect(screen.getByText('Test template for unit tests')).toBeInTheDocument();
  });

  it('should display category badge', () => {
    render(<TemplateCard template={mockTemplate} />);

    expect(screen.getByText('API Composition')).toBeInTheDocument();
  });

  it('should display difficulty badge', () => {
    render(<TemplateCard template={mockTemplate} />);

    expect(screen.getByText('Beginner')).toBeInTheDocument();
  });

  it('should display first 4 tags and show +N more indicator', () => {
    render(<TemplateCard template={mockTemplate} />);

    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('unit')).toBeInTheDocument();
    expect(screen.getByText('example')).toBeInTheDocument();
    expect(screen.getByText('demo')).toBeInTheDocument();
    expect(screen.getByText('+1 more')).toBeInTheDocument(); // 5 tags total
  });

  it('should display metadata (time, tasks, parallel)', () => {
    render(<TemplateCard template={mockTemplate} />);

    expect(screen.getByText('10 min')).toBeInTheDocument();
    expect(screen.getByText('5 tasks')).toBeInTheDocument();
    expect(screen.getByText('Parallel')).toBeInTheDocument();
  });

  it('should not show parallel indicator when hasParallelExecution is false', () => {
    const sequentialTemplate = { ...mockTemplate, hasParallelExecution: false };
    render(<TemplateCard template={sequentialTemplate} />);

    expect(screen.queryByText('Parallel')).not.toBeInTheDocument();
  });

  it('should render Preview and Deploy buttons', () => {
    render(<TemplateCard template={mockTemplate} />);

    expect(screen.getByText('Preview')).toBeInTheDocument();
    expect(screen.getByText('Deploy')).toBeInTheDocument();
  });

  it('should open preview modal when Preview button is clicked', async () => {
    render(<TemplateCard template={mockTemplate} />);

    const previewButton = screen.getByText('Preview');
    fireEvent.click(previewButton);

    await waitFor(() => {
      expect(screen.getByTestId('template-preview')).toBeInTheDocument();
      expect(screen.getByText('Preview: template-test')).toBeInTheDocument();
    });
  });

  it('should close preview modal when Close is clicked', async () => {
    render(<TemplateCard template={mockTemplate} />);

    // Open preview
    const previewButton = screen.getByText('Preview');
    fireEvent.click(previewButton);

    await waitFor(() => {
      expect(screen.getByTestId('template-preview')).toBeInTheDocument();
    });

    // Close preview
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByTestId('template-preview')).not.toBeInTheDocument();
    });
  });

  it('should call onDeploy callback when Deploy button is clicked', () => {
    const onDeployMock = vi.fn();
    render(<TemplateCard template={mockTemplate} onDeploy={onDeployMock} />);

    const deployButton = screen.getByText('Deploy');
    fireEvent.click(deployButton);

    expect(onDeployMock).toHaveBeenCalledWith('template-test');
  });

  it('should call onDeploy when deploying from preview modal', async () => {
    const onDeployMock = vi.fn();
    render(<TemplateCard template={mockTemplate} onDeploy={onDeployMock} />);

    // Open preview
    const previewButton = screen.getByText('Preview');
    fireEvent.click(previewButton);

    await waitFor(() => {
      expect(screen.getByTestId('template-preview')).toBeInTheDocument();
    });

    // Deploy from preview
    const deployFromPreviewButton = screen.getByText('Deploy from Preview');
    fireEvent.click(deployFromPreviewButton);

    expect(onDeployMock).toHaveBeenCalledWith('template-test');
  });

  it('should handle template with no tags gracefully', () => {
    const noTagsTemplate = { ...mockTemplate, tags: [] };
    render(<TemplateCard template={noTagsTemplate} />);

    expect(screen.queryByText('+1 more')).not.toBeInTheDocument();
  });

  it('should truncate description to 2 lines with line-clamp', () => {
    const longDescriptionTemplate = {
      ...mockTemplate,
      description:
        'This is a very long description that should be truncated after two lines to prevent the card from becoming too tall and breaking the layout.',
    };
    const { container } = render(<TemplateCard template={longDescriptionTemplate} />);

    const description = container.querySelector('.line-clamp-2');
    expect(description).toBeInTheDocument();
  });
});
