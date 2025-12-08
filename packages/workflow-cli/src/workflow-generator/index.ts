/**
 * Workflow Generator Module
 * Auto-generates sample workflows from compatible task chains
 */

export {
  isSchemaCompatible,
  analyzeTaskCompatibility,
  findCompatibleChains,
  type TaskDefinition,
  type FieldMapping,
  type CompatibilityResult,
  type TaskChain
} from './dependency-analyzer.js';

export {
  scaffoldWorkflow,
  generateTaskRefs,
  type TaskRef,
  type ScaffoldOptions,
  type WorkflowScaffold
} from './workflow-scaffolder.js';

export {
  generatePermissionCheckTask,
  insertPermissionCheck,
  type PermissionCheckConfig
} from './permission-check-generator.js';
