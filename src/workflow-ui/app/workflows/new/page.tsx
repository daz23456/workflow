/**
 * Workflow Builder Page - Visual Workflow Creation
 *
 * Integrates TaskPalette, WorkflowCanvas, and PropertiesPanel
 * for complete visual workflow building experience
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save, Upload, X, AlertTriangle, Play, Code, Copy, Check } from 'lucide-react';
import { TaskPalette } from '@/components/builder/task-palette';
import { WorkflowCanvas } from '@/components/builder/workflow-canvas';
import { PropertiesPanel } from '@/components/builder/properties-panel';
import { InputSchemaPanel } from '@/components/builder/input-schema-panel';
import { OutputMappingPanel } from '@/components/builder/output-mapping-panel';
import { TestRunModal } from '@/components/builder/test-run-modal';
import { useWorkflowBuilderStore } from '@/lib/stores/workflow-builder-store';
import { graphToYaml, yamlToGraph } from '@/lib/adapters/yaml-adapter';
import { useTemplateDetail } from '@/lib/api/queries';
import { cn } from '@/lib/utils';

export default function WorkflowBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateName = searchParams.get('template');

  const graph = useWorkflowBuilderStore((state) => state.graph);
  const metadata = useWorkflowBuilderStore((state) => state.metadata);
  const inputSchema = useWorkflowBuilderStore((state) => state.inputSchema);
  const outputMapping = useWorkflowBuilderStore((state) => state.outputMapping);
  const selection = useWorkflowBuilderStore((state) => state.selection);
  const validation = useWorkflowBuilderStore((state) => state.validation);
  const history = useWorkflowBuilderStore((state) => state.history);
  const autosave = useWorkflowBuilderStore((state) => state.autosave);
  const importFromYaml = useWorkflowBuilderStore((state) => state.importFromYaml);
  const reset = useWorkflowBuilderStore((state) => state.reset);
  const setMetadata = useWorkflowBuilderStore((state) => state.setMetadata);
  const panel = useWorkflowBuilderStore((state) => state.panel);
  const activePanel = panel.activePanel;

  // Load template from URL parameter
  const { data: templateData, isLoading: templateLoading } = useTemplateDetail(
    templateName || '',
    { enabled: !!templateName }
  );

  const [workflowName, setWorkflowName] = useState('');
  const [nameError, setNameError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [showTestRunModal, setShowTestRunModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showTaskPalette, setShowTaskPalette] = useState(true);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true);
  const [showYamlPreview, setShowYamlPreview] = useState(false);
  const [yamlCopied, setYamlCopied] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-import template when loaded from URL parameter
  useEffect(() => {
    if (templateData?.yamlDefinition && !templateLoading) {
      try {
        // Import template YAML into workflow builder
        importFromYaml(templateData.yamlDefinition);

        // Set workflow name from template name
        setWorkflowName(templateData.name);
      } catch (error) {
        setErrorMessage('Failed to load template. Please try again.');
      }
    }
  }, [templateData, templateLoading, importFromYaml]);

  // Validate workflow name (lowercase with hyphens only)
  const validateWorkflowName = (name: string): boolean => {
    if (!name) return false;
    const pattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    if (!pattern.test(name)) {
      setNameError('Workflow name must be lowercase letters, numbers, and hyphens only');
      return false;
    }
    setNameError('');
    return true;
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setWorkflowName(name);
    if (name) {
      validateWorkflowName(name);
    } else {
      setNameError('');
    }
  };

  const handleNameBlur = () => {
    if (workflowName) {
      validateWorkflowName(workflowName);
    }
  };

  // Check if workflow has unsaved changes
  const hasUnsavedChanges = (): boolean => {
    return graph.nodes.length > 0;
  };

  // Check if save should be enabled
  const canSave = (): boolean => {
    return workflowName !== '' && !nameError && graph.nodes.length > 0;
  };

  // Generate YAML preview
  const generateYamlPreview = (): string => {
    try {
      // Filter to only task nodes
      const taskNodes = graph.nodes.filter((n) => n.type === 'task');

      const builderState = {
        graph: { ...graph, nodes: taskNodes },
        metadata: { ...metadata, name: workflowName || 'unnamed-workflow' },
        inputSchema,
        outputMapping,
        selection,
        validation,
        history,
        autosave,
        panel,
      };
      return graphToYaml(builderState, { format: 'string' }) as string;
    } catch {
      return '# Error generating YAML preview';
    }
  };

  // Copy YAML to clipboard
  const handleCopyYaml = async () => {
    const yaml = generateYamlPreview();
    try {
      await navigator.clipboard.writeText(yaml);
      setYamlCopied(true);
      setTimeout(() => setYamlCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = yaml;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setYamlCopied(true);
      setTimeout(() => setYamlCopied(false), 2000);
    }
  };

  // Save workflow to YAML file
  const handleSave = async () => {
    if (!canSave()) return;

    try {
      setSaveStatus('saving');
      setErrorMessage('');

      // Update metadata with current workflow name
      setMetadata({ name: workflowName });

      // Convert current state to YAML
      const builderState = {
        graph,
        metadata: { ...metadata, name: workflowName },
        inputSchema,
        outputMapping,
        selection,
        validation,
        history,
        autosave,
        panel,
      };
      const yaml = graphToYaml(builderState, { format: 'string' }) as string;

      // Use File System Access API to save file
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: `${workflowName}.yaml`,
          types: [
            {
              description: 'YAML Workflow',
              accept: {
                'text/yaml': ['.yaml', '.yml'],
              },
            },
          ],
        });

        const writable = await handle.createWritable();
        await writable.write(yaml);
        await writable.close();

        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error: any) {
      // User cancelled or error occurred
      if (error.name !== 'AbortError') {
        setSaveStatus('error');
        setErrorMessage('Failed to save workflow. Please try again.');
      } else {
        setSaveStatus('idle');
      }
    }
  };

  // Load workflow from YAML file
  const handleLoad = async () => {
    try {
      setErrorMessage('');

      // Use File System Access API to open file
      if ('showOpenFilePicker' in window) {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: 'YAML Workflow',
              accept: {
                'text/yaml': ['.yaml', '.yml'],
              },
            },
          ],
          multiple: false,
        });

        const file = await handle.getFile();
        const yamlContent = await file.text();

        // Parse YAML and import into store
        importFromYaml(yamlContent);

        // Extract workflow name from metadata (after import)
        const importedState = yamlToGraph(yamlContent);
        if (importedState.metadata?.name) {
          setWorkflowName(importedState.metadata.name);
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setErrorMessage('Failed to load workflow. Please check the YAML file.');
      }
    }
  };

  // Cancel and navigate back
  const handleCancel = () => {
    if (hasUnsavedChanges()) {
      setShowUnsavedDialog(true);
    } else {
      router.back();
    }
  };

  const handleDiscardChanges = () => {
    setShowUnsavedDialog(false);
    reset();
    router.back();
  };

  const handleKeepEditing = () => {
    setShowUnsavedDialog(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd+S / Ctrl+S to save
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        if (canSave()) {
          handleSave();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [workflowName, nameError, graph]);

  return (
    <div
      data-testid="workflow-builder-page"
      className={cn('h-[calc(100vh-57px)] flex flex-col bg-gray-50', isMobile && 'flex-col')}
    >
      {/* Header Bar - Spans all columns */}
      <div className="h-14 bg-white border-b border-gray-200 grid grid-cols-[256px_1fr_320px] shrink-0">
        {/* Left: Tasks header */}
        <div className="flex items-center justify-between px-5 border-r border-gray-200">
          <span className="font-semibold text-gray-900">Tasks</span>
        </div>

        {/* Center: Toolbar */}
        <div className="flex items-center justify-center gap-3 px-6">
          <label htmlFor="workflow-name" className="text-sm font-medium text-gray-600">
            Workflow:
          </label>
          <input
            id="workflow-name"
            type="text"
            value={workflowName}
            onChange={handleNameChange}
            onBlur={handleNameBlur}
            placeholder="my-workflow-name"
            className={cn(
              'w-48 px-3 py-1.5 text-sm border rounded-md focus:outline-none focus:ring-2',
              nameError
                ? 'border-red-300 focus:ring-red-500 bg-red-50'
                : 'border-gray-300 focus:ring-blue-500'
            )}
            title={nameError || 'Workflow name'}
          />

          <div className="w-px h-6 bg-gray-200" />

          <button
            onClick={handleLoad}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
            aria-label="Load workflow from file"
            title="Load"
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowYamlPreview(!showYamlPreview)}
            className={cn(
              'p-2 rounded-md',
              showYamlPreview
                ? 'text-purple-600 bg-purple-100'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            )}
            aria-label="Toggle YAML preview"
            title="YAML Preview"
          >
            <Code className="w-4 h-4" />
          </button>

          <div className="w-px h-6 bg-gray-200" />

          <button
            onClick={() => setShowTestRunModal(true)}
            disabled={graph.nodes.length === 0 || !workflowName.trim()}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5',
              graph.nodes.length > 0 && workflowName.trim()
                ? 'text-white bg-green-600 hover:bg-green-700'
                : 'text-gray-400 bg-gray-100 cursor-not-allowed'
            )}
            aria-label="Test run workflow"
            title={!workflowName.trim() ? 'Workflow name required' : graph.nodes.length === 0 ? 'Add a task first' : 'Test'}
          >
            <Play className="w-4 h-4" />
            Test
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave()}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md flex items-center gap-1.5',
              canSave() ? 'text-white bg-blue-600 hover:bg-blue-700' : 'text-gray-400 bg-gray-100 cursor-not-allowed'
            )}
            aria-label="Save workflow to file"
            title="Save"
          >
            <Save className="w-4 h-4" />
            Save
          </button>
          <button
            onClick={handleCancel}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md"
            aria-label="Cancel and go back"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Status indicator */}
          {saveStatus === 'success' && (
            <span className="text-sm text-green-600 font-medium">Saved!</span>
          )}
          {errorMessage && (
            <span className="text-sm text-red-600">{errorMessage}</span>
          )}
        </div>

        {/* Right: Panel header */}
        <div className="flex items-center justify-between px-5 border-l border-gray-200">
          <span className="font-semibold text-gray-900">
            {activePanel === 'input' ? 'Input Schema' : activePanel === 'output' ? 'Output Mapping' : 'Properties'}
          </span>
        </div>
      </div>

      {/* Mobile Panel Toggles */}
      {isMobile && (
        <div className="bg-white border-b border-gray-200 px-4 py-2 flex gap-2">
          <button
            onClick={() => setShowTaskPalette(!showTaskPalette)}
            className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
            aria-label="Toggle tasks panel"
          >
            {showTaskPalette ? 'Hide' : 'Show'} Tasks
          </button>
          <button
            onClick={() => setShowPropertiesPanel(!showPropertiesPanel)}
            className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200"
            aria-label="Toggle properties panel"
          >
            {showPropertiesPanel ? 'Hide' : 'Show'} Properties
          </button>
        </div>
      )}

      {/* Main Content - Three Column Layout */}
      <div
        className={cn(
          'flex-1 min-h-0',
          isMobile ? 'flex flex-col overflow-auto' : 'grid grid-cols-[256px_1fr_320px] grid-rows-[1fr]'
        )}
      >
        {/* Left: Task Palette */}
        {(!isMobile || showTaskPalette) && (
          <div className="h-full min-h-0 overflow-hidden">
            <TaskPalette />
          </div>
        )}

        {/* Center: Canvas */}
        <div className="h-full min-h-0 overflow-hidden">
          <WorkflowCanvas />
        </div>

        {/* Right: Properties Panel / Input Schema Panel / Output Mapping Panel */}
        {(!isMobile || showPropertiesPanel) && (
          <div className="h-full min-h-0 overflow-hidden">
            {activePanel === 'input' ? (
              <InputSchemaPanel />
            ) : activePanel === 'output' ? (
              <OutputMappingPanel />
            ) : (
              <PropertiesPanel />
            )}
          </div>
        )}
      </div>

      {/* Unsaved Changes Dialog */}
      {showUnsavedDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-yellow-500 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Unsaved Changes</h2>
                <p className="text-sm text-gray-600">
                  You have unsaved changes. Are you sure you want to leave? Your changes will be
                  lost.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleKeepEditing}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
                aria-label="Keep editing workflow"
              >
                Keep Editing
              </button>
              <button
                onClick={handleDiscardChanges}
                className="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700"
                aria-label="Discard changes and leave"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Test Run Modal */}
      <TestRunModal
        open={showTestRunModal}
        onOpenChange={setShowTestRunModal}
        state={{
          graph,
          metadata: { ...metadata, name: workflowName },
          inputSchema,
          outputMapping,
          selection,
          validation,
          history,
          autosave,
          panel,
        }}
      />

      {/* YAML Preview Panel */}
      {showYamlPreview && (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-gray-100 shadow-2xl z-40 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <Code className="w-4 h-4 text-purple-400" />
              <span className="font-medium text-sm">YAML Preview</span>
              <span className="text-xs text-gray-400">
                {graph.nodes.filter((n) => n.type === 'task').length} tasks
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyYaml}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded transition-colors"
              >
                {yamlCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-green-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
              <button
                onClick={() => setShowYamlPreview(false)}
                className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                aria-label="Close YAML preview"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="max-h-[40vh] overflow-auto">
            <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
              {generateYamlPreview()}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
