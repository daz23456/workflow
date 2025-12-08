/**
 * Versioning Module
 * Tracks task versions and detects breaking changes
 */

export {
  calculateTaskHash,
  normalizeTaskForHashing,
  type TaskContent
} from './task-hash-calculator.js';

export {
  detectChanges,
  isBreakingChange,
  type Change,
  type ChangeResult,
  type ChangeType
} from './change-detector.js';

export {
  parseVersion,
  incrementVersion,
  generateVersionLabels,
  type VersionInfo,
  type VersionLabels
} from './version-manager.js';

export {
  generateTransforms,
  generateMigration,
  type TransformSuggestion,
  type MigrationSpec
} from './migration-generator.js';
