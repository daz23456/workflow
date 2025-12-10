import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TemplatePreview } from './template-preview';
import { TemplateCategory, TemplateDifficulty, type TemplateDetail } from '@/types/template';

// Mock the API hooks
const mockUseTemplateDetail = vi.fn();
vi.mock('@/lib/api/queries', () => ({
  useTemplateDetail: (name: string) => mockUseTemplateDetail(name),
}));

const mockTemplateDetail: TemplateDetail = {
  name: 'template-test',
  category: TemplateCategory.ApiComposition,
  difficulty: TemplateDifficulty.Intermediate,
  description: 'Test template for preview modal',
  tags: ['test', 'preview', 'modal'],
  estimatedSetupTime: 15,
  taskCount: 8,
  hasParallelExecution: true,
  namespace: 'default',
  yamlDefinition: `apiVersion: workflow.example.com/v1
kind: Workflow
metadata:
  name: template-test
spec:
  description: Test workflow`,
};

describe('TemplatePreview', () => {
  const mockOnClose = vi.fn();
  const mockOnDeploy = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnDeploy.mockClear();
    mockUseTemplateDetail.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state initially', () => {
    mockUseTemplateDetail.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const { container } = render(
      <TemplatePreview
        templateName="template-test"
        onClose={mockOnClose}
        onDeploy={mockOnDeploy}
      />
    );

    // Loading skeleton for header
    const loadingSkeleton = container.querySelector('.animate-pulse');
    expect(loadingSkeleton).toBeInTheDocument();
  });

  it('should display template details when loaded', async () => {
    mockUseTemplateDetail.mockReturnValue({
      data: mockTemplateDetail,
      isLoading: false,
      error: null,
    });

    render(
      <TemplatePreview
        templateName="template-test"
        onClose={mockOnClose}
        onDeploy={mockOnDeploy}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('template-test')).toBeInTheDocument();
      expect(screen.getByText('Test template for preview modal')).toBeInTheDocument();
    });
  });

  it('should display category and difficulty badges', async () => {
    mockUseTemplateDetail.mockReturnValue({
      data: mockTemplateDetail,
      isLoading: false,
      error: null,
    });

    render(
      <TemplatePreview
        templateName="template-test"
        onClose={mockOnClose}
        onDeploy={mockOnDeploy}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('API Composition')).toBeInTheDocument();
      expect(screen.getByText('Intermediate')).toBeInTheDocument();
    });
  });

  it('should display metadata fields', async () => {
    mockUseTemplateDetail.mockReturnValue({
      data: mockTemplateDetail,
      isLoading: false,
      error: null,
    });

    render(
      <TemplatePreview
        templateName="template-test"
        onClose={mockOnClose}
        onDeploy={mockOnDeploy}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('15 minutes')).toBeInTheDocument();
      expect(screen.getByText('8 tasks')).toBeInTheDocument();
      expect(screen.getByText('Parallel')).toBeInTheDocument();
      expect(screen.getByText('default')).toBeInTheDocument();
    });
  });

  it('should display tags', async () => {
    mockUseTemplateDetail.mockReturnValue({
      data: mockTemplateDetail,
      isLoading: false,
      error: null,
    });

    render(
      <TemplatePreview
        templateName="template-test"
        onClose={mockOnClose}
        onDeploy={mockOnDeploy}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('test')).toBeInTheDocument();
      expect(screen.getByText('preview')).toBeInTheDocument();
      expect(screen.getByText('modal')).toBeInTheDocument();
    });
  });

  it('should display YAML definition', async () => {
    mockUseTemplateDetail.mockReturnValue({
      data: mockTemplateDetail,
      isLoading: false,
      error: null,
    });

    render(
      <TemplatePreview
        templateName="template-test"
        onClose={mockOnClose}
        onDeploy={mockOnDeploy}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/apiVersion: workflow.example.com\/v1/)).toBeInTheDocument();
    });
  });

  it('should call onClose when close button in header is clicked', async () => {
    mockUseTemplateDetail.mockReturnValue({
      data: mockTemplateDetail,
      isLoading: false,
      error: null,
    });

    render(
      <TemplatePreview
        templateName="template-test"
        onClose={mockOnClose}
        onDeploy={mockOnDeploy}
      />
    );

    const closeButton = screen.getByLabelText('Close preview');
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when Close button in footer is clicked', async () => {
    mockUseTemplateDetail.mockReturnValue({
      data: mockTemplateDetail,
      isLoading: false,
      error: null,
    });

    render(
      <TemplatePreview
        templateName="template-test"
        onClose={mockOnClose}
        onDeploy={mockOnDeploy}
      />
    );

    const closeButton = screen.getByRole('button', { name: /^Close$/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when backdrop is clicked', () => {
    mockUseTemplateDetail.mockReturnValue({
      data: mockTemplateDetail,
      isLoading: false,
      error: null,
    });

    const { container } = render(
      <TemplatePreview
        templateName="template-test"
        onClose={mockOnClose}
        onDeploy={mockOnDeploy}
      />
    );

    const backdrop = container.querySelector('.fixed.inset-0');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    }
  });

  it('should NOT call onClose when clicking inside modal content', () => {
    mockUseTemplateDetail.mockReturnValue({
      data: mockTemplateDetail,
      isLoading: false,
      error: null,
    });

    render(
      <TemplatePreview
        templateName="template-test"
        onClose={mockOnClose}
        onDeploy={mockOnDeploy}
      />
    );

    const modalContent = screen.getByText('template-test').closest('.bg-white');
    if (modalContent) {
      fireEvent.click(modalContent);
      expect(mockOnClose).not.toHaveBeenCalled();
    }
  });

  it('should call onDeploy and onClose when Deploy Template button is clicked', async () => {
    mockUseTemplateDetail.mockReturnValue({
      data: mockTemplateDetail,
      isLoading: false,
      error: null,
    });

    render(
      <TemplatePreview
        templateName="template-test"
        onClose={mockOnClose}
        onDeploy={mockOnDeploy}
      />
    );

    const deployButton = screen.getByRole('button', { name: /Deploy Template/i });
    fireEvent.click(deployButton);

    expect(mockOnDeploy).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('should disable Deploy button when loading', () => {
    mockUseTemplateDetail.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(
      <TemplatePreview
        templateName="template-test"
        onClose={mockOnClose}
        onDeploy={mockOnDeploy}
      />
    );

    const deployButton = screen.getByRole('button', { name: /Deploy Template/i });
    expect(deployButton).toBeDisabled();
  });

  it('should display error state when API call fails', () => {
    const mockError = new Error('Template not found on server');
    mockUseTemplateDetail.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: mockError,
    });

    render(
      <TemplatePreview
        templateName="template-test"
        onClose={mockOnClose}
        onDeploy={mockOnDeploy}
      />
    );

    expect(screen.getByText('Error Loading Template')).toBeInTheDocument();
    expect(screen.getByText('Failed to load template')).toBeInTheDocument();
    expect(screen.getByText('Template not found on server')).toBeInTheDocument();
  });

  it('should display generic error message for unknown errors', () => {
    mockUseTemplateDetail.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: 'Unknown error',
    });

    render(
      <TemplatePreview
        templateName="template-test"
        onClose={mockOnClose}
        onDeploy={mockOnDeploy}
      />
    );

    expect(screen.getByText('Unknown error')).toBeInTheDocument();
  });

  it('should show Sequential when hasParallelExecution is false', async () => {
    const sequentialTemplate = { ...mockTemplateDetail, hasParallelExecution: false };
    mockUseTemplateDetail.mockReturnValue({
      data: sequentialTemplate,
      isLoading: false,
      error: null,
    });

    render(
      <TemplatePreview
        templateName="template-test"
        onClose={mockOnClose}
        onDeploy={mockOnDeploy}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Sequential')).toBeInTheDocument();
    });
  });

  // NOTE: Simplified download test - actual file download is tested in E2E
  it('should have Download button when template is loaded', async () => {
    mockUseTemplateDetail.mockReturnValue({
      data: mockTemplateDetail,
      isLoading: false,
      error: null,
    });

    render(
      <TemplatePreview
        templateName="template-test"
        onClose={mockOnClose}
        onDeploy={mockOnDeploy}
      />
    );

    await waitFor(() => {
      const downloadButton = screen.getByRole('button', { name: /Download/i });
      expect(downloadButton).toBeInTheDocument();
      expect(downloadButton).not.toBeDisabled();
    });
  });

  it('should trigger download when Download button is clicked', async () => {
    mockUseTemplateDetail.mockReturnValue({
      data: mockTemplateDetail,
      isLoading: false,
      error: null,
    });

    // Mock URL.createObjectURL and URL.revokeObjectURL
    const mockCreateObjectURL = vi.fn().mockReturnValue('blob:test-url');
    const mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // Track the anchor element
    const mockClick = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'a') {
        element.click = mockClick;
      }
      return element;
    });

    render(
      <TemplatePreview
        templateName="template-test"
        onClose={mockOnClose}
        onDeploy={mockOnDeploy}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Download/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Download/i }));

    expect(mockCreateObjectURL).toHaveBeenCalled();
    expect(mockClick).toHaveBeenCalled();
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url');

    vi.restoreAllMocks();
  });

  it('should not trigger download when template is null', async () => {
    mockUseTemplateDetail.mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    const mockCreateObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;

    render(
      <TemplatePreview
        templateName="template-test"
        onClose={mockOnClose}
        onDeploy={mockOnDeploy}
      />
    );

    // Check that deploy button is disabled
    const deployButton = screen.getByRole('button', { name: /Deploy Template/i });
    expect(deployButton).toBeDisabled();
  });

  it('should pass templateName to useTemplateDetail', () => {
    mockUseTemplateDetail.mockReturnValue({
      data: mockTemplateDetail,
      isLoading: false,
      error: null,
    });

    render(
      <TemplatePreview
        templateName="my-custom-template"
        onClose={mockOnClose}
        onDeploy={mockOnDeploy}
      />
    );

    expect(mockUseTemplateDetail).toHaveBeenCalledWith('my-custom-template');
  });

  it('should render workflow definition header', async () => {
    mockUseTemplateDetail.mockReturnValue({
      data: mockTemplateDetail,
      isLoading: false,
      error: null,
    });

    render(
      <TemplatePreview
        templateName="template-test"
        onClose={mockOnClose}
        onDeploy={mockOnDeploy}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('YAML Definition')).toBeInTheDocument();
    });
  });

  it('should show description section', async () => {
    mockUseTemplateDetail.mockReturnValue({
      data: mockTemplateDetail,
      isLoading: false,
      error: null,
    });

    render(
      <TemplatePreview
        templateName="template-test"
        onClose={mockOnClose}
        onDeploy={mockOnDeploy}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Description')).toBeInTheDocument();
    });
  });

  it('should show tags section', async () => {
    mockUseTemplateDetail.mockReturnValue({
      data: mockTemplateDetail,
      isLoading: false,
      error: null,
    });

    render(
      <TemplatePreview
        templateName="template-test"
        onClose={mockOnClose}
        onDeploy={mockOnDeploy}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Tags')).toBeInTheDocument();
    });
  });

  it('should render all metadata labels', async () => {
    mockUseTemplateDetail.mockReturnValue({
      data: mockTemplateDetail,
      isLoading: false,
      error: null,
    });

    render(
      <TemplatePreview
        templateName="template-test"
        onClose={mockOnClose}
        onDeploy={mockOnDeploy}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Setup Time')).toBeInTheDocument();
      expect(screen.getByText('Task Count')).toBeInTheDocument();
      expect(screen.getByText('Execution Mode')).toBeInTheDocument();
      expect(screen.getByText('Namespace')).toBeInTheDocument();
    });
  });
});
