'use client';

/**
 * CodeEditor - Live YAML Editor with CodeMirror
 * Stage 9.5: Interactive Documentation & Learning - Day 2
 *
 * Features:
 * - Syntax highlighting for YAML
 * - Line numbers
 * - Real-time editing
 * - Validation feedback
 * - Accessibility support
 */

import { useEffect, useRef, useState } from 'react';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState, Compartment } from '@codemirror/state';
import { yaml } from '@codemirror/lang-yaml';
import { oneDark } from '@codemirror/theme-one-dark';
import type { ViewUpdate } from '@codemirror/view';

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string;
  className?: string;
  placeholder?: string;
  theme?: 'light' | 'dark';
}

/**
 * Live YAML editor powered by CodeMirror
 *
 * Usage:
 * ```tsx
 * <CodeEditor
 *   value={yamlContent}
 *   onChange={(newValue) => setYamlContent(newValue)}
 *   height="400px"
 * />
 * ```
 */
export function CodeEditor({
  value,
  onChange,
  readOnly = false,
  height = '400px',
  className = '',
  placeholder,
  theme = 'light',
}: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const editableCompartment = useRef(new Compartment());
  const [isMounted, setIsMounted] = useState(false);

  // Initialize CodeMirror editor
  useEffect(() => {
    if (!editorRef.current || isMounted) return;

    const extensions = [
      basicSetup,
      yaml(),
      editableCompartment.current.of(EditorView.editable.of(!readOnly)),
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged && onChange) {
          const newValue = update.state.doc.toString();
          onChange(newValue);
        }
      }),
    ];

    // Add theme if dark mode
    if (theme === 'dark') {
      extensions.push(oneDark);
    }

    // Add placeholder if provided
    if (placeholder) {
      extensions.push(
        EditorView.contentAttributes.of({
          'aria-placeholder': placeholder,
        })
      );
    }

    const state = EditorState.create({
      doc: value,
      extensions,
    });

    const view = new EditorView({
      state,
      parent: editorRef.current,
    });

    viewRef.current = view;
    setIsMounted(true);

    return () => {
      view.destroy();
      viewRef.current = null;
      setIsMounted(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update editor content when value prop changes (but only if different from editor content)
  useEffect(() => {
    if (!viewRef.current || !isMounted) return;

    const currentValue = viewRef.current.state.doc.toString();
    if (currentValue !== value) {
      viewRef.current.dispatch({
        changes: {
          from: 0,
          to: currentValue.length,
          insert: value,
        },
      });
    }
  }, [value, isMounted]);

  // Update readOnly state
  useEffect(() => {
    if (!viewRef.current || !isMounted) return;

    viewRef.current.dispatch({
      effects: editableCompartment.current.reconfigure(EditorView.editable.of(!readOnly)),
    });
  }, [readOnly, isMounted]);

  return (
    <div
      className={`border border-gray-300 rounded-lg overflow-hidden ${className}`}
      style={{ height }}
      data-testid="code-editor"
    >
      <div
        ref={editorRef}
        className="h-full"
        aria-label={readOnly ? 'Read-only code editor' : 'Code editor'}
        role="textbox"
        aria-readonly={readOnly}
      />
    </div>
  );
}
