/**
 * Check Changes Command
 * Detects breaking changes between task versions
 */

import {
  calculateTaskHash,
  detectChanges,
  isBreakingChange,
  incrementVersion,
  generateVersionLabels,
  generateTransforms,
  generateMigration,
  type TaskContent,
  type ChangeResult,
  type MigrationSpec,
  type VersionLabels
} from '../versioning/index.js';

export interface CheckChangesOptions {
  oldTask: TaskContent;
  newTask: TaskContent;
  generateMigration?: boolean;
}

export interface CheckChangesResult {
  hasChanges: boolean;
  breaking: boolean;
  exitCode: number; // 0 = no breaking, 1 = breaking, 2 = blocked
  changes: ChangeResult;
  oldHash: string;
  newHash: string;
  suggestedVersion?: string;
  labels?: VersionLabels;
  migration?: MigrationSpec;
}

/**
 * Check for changes between two task versions.
 * Returns exit code for CI/CD integration.
 */
export async function checkChangesCommand(
  options: CheckChangesOptions
): Promise<CheckChangesResult> {
  const { oldTask, newTask, generateMigration: shouldGenerateMigration } = options;

  // Calculate hashes
  const oldHash = calculateTaskHash(oldTask);
  const newHash = calculateTaskHash(newTask);

  // Detect changes
  const changes = detectChanges(oldTask, newTask);
  const breaking = isBreakingChange(changes);

  // Determine exit code
  let exitCode = 0;
  if (breaking) {
    exitCode = 1;
  }

  // Generate suggested version if breaking
  let suggestedVersion: string | undefined;
  let labels: VersionLabels | undefined;
  if (breaking) {
    suggestedVersion = incrementVersion(newTask.name, true);
    labels = generateVersionLabels(suggestedVersion, newHash, oldTask.name);
  }

  // Generate migration if requested
  let migration: MigrationSpec | undefined;
  if (shouldGenerateMigration && breaking) {
    const transforms = generateTransforms(changes);
    migration = generateMigration(oldTask.name, suggestedVersion!, transforms);
  }

  return {
    hasChanges: changes.hasChanges,
    breaking,
    exitCode,
    changes,
    oldHash,
    newHash,
    suggestedVersion,
    labels,
    migration
  };
}
