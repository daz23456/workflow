/**
 * Commands Module
 * Re-exports all CLI commands
 */

export {
  generateWorkflowCommand,
  type GenerateWorkflowOptions,
  type GenerateWorkflowResult
} from './generate-workflow.js';

export {
  checkChangesCommand,
  type CheckChangesOptions,
  type CheckChangesResult
} from './check-changes.js';
