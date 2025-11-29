/**
 * Transform YAML Adapter
 * Converts TransformDslDefinition to YAML formats
 */

import type { TransformDslDefinition } from '../types/transform-dsl';

/**
 * Convert TransformDslDefinition to WorkflowTask CRD YAML
 */
export function transformToWorkflowTask(
  dsl: TransformDslDefinition,
  name: string,
  description?: string,
  metadata?: Record<string, string>
): string {
  const yamlLines: string[] = [];

  // CRD header
  yamlLines.push('apiVersion: workflows.example.com/v1');
  yamlLines.push('kind: WorkflowTask');
  yamlLines.push('metadata:');
  yamlLines.push(`  name: ${name}`);

  // Optional metadata labels
  if (metadata && Object.keys(metadata).length > 0) {
    yamlLines.push('  labels:');
    for (const [key, value] of Object.entries(metadata)) {
      yamlLines.push(`    ${key}: ${value}`);
    }
  }

  yamlLines.push('spec:');

  // Optional description
  if (description) {
    yamlLines.push(`  description: ${escapeYamlString(description)}`);
  }

  // Transform configuration as inline YAML
  yamlLines.push('  type: transform');
  yamlLines.push('  config:');

  // Indent the inline YAML by 4 spaces
  const inlineYaml = transformToInlineYaml(dsl);
  const indentedConfig = inlineYaml
    .split('\n')
    .map((line) => `    ${line}`)
    .join('\n');

  yamlLines.push(indentedConfig);

  return yamlLines.join('\n');
}

/**
 * Convert TransformDslDefinition to inline YAML config
 */
export function transformToInlineYaml(dsl: TransformDslDefinition): string {
  const yamlLines: string[] = [];

  yamlLines.push(`version: "${dsl.version}"`);

  if (dsl.pipeline.length === 0) {
    yamlLines.push('pipeline: []');
  } else {
    yamlLines.push('pipeline:');
    for (const operation of dsl.pipeline) {
      yamlLines.push(`  - operation: ${operation.operation}`);

      // Render operation-specific fields
      const fields = Object.entries(operation).filter(([key]) => key !== 'operation');
      for (const [key, value] of fields) {
        const renderedValue = renderYamlValue(value, 4);
        yamlLines.push(`    ${key}: ${renderedValue}`);
      }
    }
  }

  return yamlLines.join('\n');
}

/**
 * Render a value as YAML with proper indentation
 */
function renderYamlValue(value: unknown, indent: number): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (typeof value === 'string') {
    return escapeYamlString(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }

    // Multi-line array
    const lines: string[] = [];
    for (const item of value) {
      if (typeof item === 'object' && item !== null) {
        // Object in array
        lines.push('');
        const objLines = renderObject(item as Record<string, unknown>, indent + 2);
        lines.push(objLines);
      } else {
        lines.push('');
        lines.push(`${' '.repeat(indent)}- ${renderYamlValue(item, indent + 2)}`);
      }
    }
    return lines.join('\n');
  }

  if (typeof value === 'object') {
    // Inline object on same line or multi-line
    const obj = value as Record<string, unknown>;
    const entries = Object.entries(obj);

    if (entries.length === 0) {
      return '{}';
    }

    // Multi-line object
    const lines: string[] = [''];
    for (const [key, val] of entries) {
      const renderedVal = renderYamlValue(val, indent + 2);
      if (renderedVal.startsWith('\n')) {
        lines.push(`${' '.repeat(indent)}${key}:${renderedVal}`);
      } else {
        lines.push(`${' '.repeat(indent)}${key}: ${renderedVal}`);
      }
    }
    return lines.join('\n');
  }

  return String(value);
}

/**
 * Render an object as YAML lines with proper indentation
 */
function renderObject(obj: Record<string, unknown>, indent: number): string {
  const lines: string[] = [];
  const entries = Object.entries(obj);

  for (let i = 0; i < entries.length; i++) {
    const [key, value] = entries[i];
    const prefix = i === 0 ? '- ' : '  ';
    const renderedValue = renderYamlValue(value, indent + 2);

    if (renderedValue.startsWith('\n')) {
      lines.push(`${' '.repeat(indent - 2)}${prefix}${key}:${renderedValue}`);
    } else {
      lines.push(`${' '.repeat(indent - 2)}${prefix}${key}: ${renderedValue}`);
    }
  }

  return lines.join('\n');
}

/**
 * Escape special YAML characters in strings
 */
function escapeYamlString(str: string): string {
  // Check if string needs quoting
  const needsQuoting =
    str.includes(':') ||
    str.includes('"') ||
    str.includes("'") ||
    str.includes('#') ||
    str.includes('\n') ||
    str.includes('[') ||
    str.includes(']') ||
    str.includes('{') ||
    str.includes('}');

  if (!needsQuoting) {
    return str;
  }

  // Use double quotes and escape internal quotes
  const escaped = str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${escaped}"`;
}
