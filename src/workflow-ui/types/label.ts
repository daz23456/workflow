/**
 * Label management types matching backend LabelModels.cs
 */

/**
 * Tag information with usage counts
 */
export interface TagInfo {
  value: string;
  workflowCount: number;
  taskCount: number;
}

/**
 * Category information with usage count
 */
export interface CategoryInfo {
  value: string;
  workflowCount: number;
}

/**
 * Response for GET /api/v1/labels
 */
export interface LabelListResponse {
  tags: TagInfo[];
  categories: CategoryInfo[];
}

/**
 * Response for GET /api/v1/labels/stats
 */
export interface LabelStatsResponse {
  totalTags: number;
  totalCategories: number;
  workflowsWithTags: number;
  workflowsWithCategories: number;
  tasksWithTags: number;
  tasksWithCategories: number;
  topTags: TagInfo[];
  topCategories: CategoryInfo[];
}

/**
 * Request for PATCH /api/v1/workflows/{name}/labels or /api/v1/tasks/{name}/labels
 */
export interface UpdateLabelsRequest {
  addTags?: string[];
  removeTags?: string[];
  addCategories?: string[];
  removeCategories?: string[];
}

/**
 * Response for label update operations
 */
export interface UpdateLabelsResponse {
  success: boolean;
  entityName: string;
  currentTags: string[];
  currentCategories: string[];
  message?: string;
}

/**
 * Request for bulk label operations
 */
export interface BulkLabelsRequest {
  entityNames: string[];
  addTags?: string[];
  removeTags?: string[];
  addCategories?: string[];
  removeCategories?: string[];
  dryRun?: boolean;
}

/**
 * Individual entity change in bulk operation
 */
export interface BulkLabelChange {
  name: string;
  addedTags: string[];
  removedTags: string[];
  addedCategories: string[];
  removedCategories: string[];
}

/**
 * Response for bulk label operations
 */
export interface BulkLabelsResponse {
  success: boolean;
  affectedEntities: number;
  isDryRun: boolean;
  changes: BulkLabelChange[];
  message?: string;
}
