/**
 * Task YAML Writer
 * Serializes and writes WorkflowTask CRDs to YAML files
 */

import YAML from 'yaml';
import type { WorkflowTaskResource, GeneratedTask } from '../types.js';

/**
 * Serialize a WorkflowTaskResource to YAML string.
 * Uses single quotes and unlimited line width for readability.
 *
 * @param resource - The WorkflowTask CRD resource
 * @returns YAML string representation
 */
export function serializeTaskToYaml(resource: WorkflowTaskResource): string {
  return YAML.stringify(resource, {
    lineWidth: 0,
    singleQuote: true
  });
}

/**
 * Write generated tasks to files.
 * Can write each task to a separate file or combine all into one.
 *
 * @param tasks - Array of generated tasks
 * @param outputDir - Directory to write files to
 * @param singleFile - If true, write all tasks to workflow-tasks.yaml
 */
export async function writeTasksToFiles(
  tasks: GeneratedTask[],
  outputDir: string,
  singleFile: boolean = false
): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  if (singleFile) {
    // Write all tasks to a single file separated by ---
    const allYaml = tasks.map(t => t.yaml).join('---\n');
    const filePath = path.join(outputDir, 'workflow-tasks.yaml');
    await fs.writeFile(filePath, allYaml);
  } else {
    // Write each task to its own file
    for (const task of tasks) {
      const filePath = path.join(outputDir, `task-${task.name}.yaml`);
      await fs.writeFile(filePath, task.yaml);
    }
  }
}
