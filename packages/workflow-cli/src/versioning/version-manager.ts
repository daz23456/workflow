/**
 * Version Manager
 * Manages task versioning, version parsing, and label generation
 */

export interface VersionInfo {
  baseName: string;
  version: number;
}

export interface VersionLabels {
  'workflow.io/content-hash': string;
  'workflow.io/version': string;
  'workflow.io/base-name': string;
  'workflow.io/replaces'?: string;
  'workflow.io/deprecated'?: string;
}

/**
 * Parse version information from task name.
 * Format: base-name-vN where N is the version number
 */
export function parseVersion(taskName: string): VersionInfo {
  const match = taskName.match(/^(.+)-v(\d+)$/);

  if (match) {
    return {
      baseName: match[1],
      version: parseInt(match[2], 10)
    };
  }

  return {
    baseName: taskName,
    version: 1
  };
}

/**
 * Increment version for a task name.
 * Only increments if isBreaking is true.
 */
export function incrementVersion(taskName: string, isBreaking: boolean): string {
  if (!isBreaking) {
    return taskName;
  }

  const { baseName, version } = parseVersion(taskName);
  return `${baseName}-v${version + 1}`;
}

/**
 * Generate Kubernetes labels for versioned task.
 */
export function generateVersionLabels(
  taskName: string,
  contentHash: string,
  replaces?: string,
  deprecated?: boolean
): VersionLabels {
  const { baseName, version } = parseVersion(taskName);

  const labels: VersionLabels = {
    'workflow.io/content-hash': contentHash,
    'workflow.io/version': String(version),
    'workflow.io/base-name': baseName
  };

  if (replaces) {
    labels['workflow.io/replaces'] = replaces;
  }

  if (deprecated) {
    labels['workflow.io/deprecated'] = 'true';
  }

  return labels;
}
