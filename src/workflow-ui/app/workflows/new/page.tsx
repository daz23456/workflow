/**
 * Workflow Builder Page - Visual Workflow Creation
 *
 * Integrates TaskPalette, WorkflowCanvas, and PropertiesPanel
 * for complete visual workflow building experience
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save, Upload, X, AlertTriangle } from 'lucide-react';
import { TaskPalette } from '@/components/builder/task-palette';
import { WorkflowCanvas } from '@/components/builder/workflow-canvas';
import { PropertiesPanel } from '@/components/builder/properties-panel';
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
  const [isMobile, setIsMobile] = useState(false);
  const [showTaskPalette, setShowTaskPalette] = useState(true);
  const [showPropertiesPanel, setShowPropertiesPanel] = useState(true);

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
      className={cn('h-screen flex flex-col bg-gray-50', isMobile && 'flex-col')}
    >
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex-1 max-w-md">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Create New Workflow</h1>
            <div>
              <label
                htmlFor="workflow-name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Workflow Name
              </label>
              <input
                id="workflow-name"
                type="text"
                value={workflowName}
                onChange={handleNameChange}
                onBlur={handleNameBlur}
                placeholder="user-onboarding"
                className={cn(
                  'w-full px-3 py-2 border rounded focus:outline-none focus:ring-2',
                  nameError
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                )}
                aria-label="Workflow Name"
              />
              {nameError && <p className="mt-1 text-sm text-red-600">{nameError}</p>}
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleLoad}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Load workflow from file"
            >
              <Upload className="w-4 h-4 inline mr-2" />
              Load
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave()}
              className={cn(
                'px-4 py-2 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500',
                canSave() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'
              )}
              aria-label="Save workflow to file"
            >
              <Save className="w-4 h-4 inline mr-2" />
              Save
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Cancel and go back"
            >
              <X className="w-4 h-4 inline mr-2" />
              Cancel
            </button>
          </div>
        </div>

        {/* Status Messages */}
        {saveStatus === 'success' && (
          <div role="status" className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
            <p className="text-sm text-green-700">Workflow saved successfully!</p>
          </div>
        )}
        {saveStatus === 'error' && errorMessage && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}
        {errorMessage && saveStatus === 'idle' && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-700">{errorMessage}</p>
          </div>
        )}
      </header>

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
          'flex-1 overflow-hidden',
          isMobile ? 'flex flex-col' : 'grid grid-cols-[256px_1fr_320px]'
        )}
      >
        {/* Left: Task Palette */}
        {(!isMobile || showTaskPalette) && <TaskPalette />}

        {/* Center: Canvas */}
        <WorkflowCanvas />

        {/* Right: Properties Panel */}
        {(!isMobile || showPropertiesPanel) && <PropertiesPanel />}
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
    </div>
  );
}
