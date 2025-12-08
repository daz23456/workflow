/**
 * suggest_labels MCP tool implementation
 * Stage 32.3: MCP Label Tools
 *
 * Suggests labels based on name patterns and metadata analysis
 */

import type { ConsumerGatewayClient } from '../services/consumer-gateway-client.js';
import type {
  SuggestLabelsInput,
  SuggestLabelsResult,
  SuggestedLabel,
  GatewayWorkflowResponse,
  TaskDefinition
} from '../types.js';

// Domain patterns for tag suggestions
const DOMAIN_PATTERNS: Array<{ pattern: RegExp; tag: string; reason: string }> = [
  { pattern: /order/i, tag: 'orders', reason: 'Name contains "order" suggesting order management domain' },
  { pattern: /payment/i, tag: 'payments', reason: 'Name contains "payment" suggesting payment processing domain' },
  { pattern: /user/i, tag: 'users', reason: 'Name contains "user" suggesting user management domain' },
  { pattern: /auth/i, tag: 'auth', reason: 'Name contains "auth" suggesting authentication/authorization domain' },
  { pattern: /notif/i, tag: 'notifications', reason: 'Name contains "notif" suggesting notification domain' },
  { pattern: /email/i, tag: 'email', reason: 'Name contains "email" suggesting email functionality' },
  { pattern: /report/i, tag: 'reports', reason: 'Name contains "report" suggesting reporting domain' },
  { pattern: /inventory/i, tag: 'inventory', reason: 'Name contains "inventory" suggesting inventory management' },
  { pattern: /shipping/i, tag: 'shipping', reason: 'Name contains "shipping" suggesting shipping/logistics domain' },
  { pattern: /customer/i, tag: 'customers', reason: 'Name contains "customer" suggesting customer domain' }
];

// Technical patterns for tag suggestions
const TECHNICAL_PATTERNS: Array<{ pattern: RegExp; tag: string; reason: string }> = [
  { pattern: /http|api|rest/i, tag: 'http-based', reason: 'Name suggests HTTP/API integration' },
  { pattern: /grpc/i, tag: 'grpc', reason: 'Name suggests gRPC integration' },
  { pattern: /transform|convert|map/i, tag: 'transform', reason: 'Name suggests data transformation' },
  { pattern: /validate|check|verify/i, tag: 'validation', reason: 'Name suggests validation logic' },
  { pattern: /async|queue|event/i, tag: 'async', reason: 'Name suggests asynchronous processing' },
  { pattern: /batch/i, tag: 'batch', reason: 'Name suggests batch processing' },
  { pattern: /sync/i, tag: 'sync', reason: 'Name suggests synchronous processing' },
  { pattern: /cache/i, tag: 'caching', reason: 'Name suggests caching logic' }
];

// Lifecycle/status patterns
const LIFECYCLE_PATTERNS: Array<{ pattern: RegExp; tag: string; reason: string }> = [
  { pattern: /v[0-9]+|version/i, tag: 'versioned', reason: 'Name contains version indicator' },
  { pattern: /test|mock|stub/i, tag: 'testing', reason: 'Name suggests testing purpose' },
  { pattern: /legacy|old|deprecated/i, tag: 'deprecated', reason: 'Name suggests deprecated/legacy status' },
  { pattern: /new|beta|experimental/i, tag: 'beta', reason: 'Name suggests experimental/beta status' }
];

// Category suggestions based on patterns
const CATEGORY_PATTERNS: Array<{ pattern: RegExp; category: string; reason: string }> = [
  { pattern: /order/i, category: 'orders', reason: 'Related to order management' },
  { pattern: /payment|billing|invoice/i, category: 'payments', reason: 'Related to payment processing' },
  { pattern: /user|profile|account/i, category: 'users', reason: 'Related to user management' },
  { pattern: /product|catalog|item/i, category: 'products', reason: 'Related to product catalog' },
  { pattern: /notif|alert|message/i, category: 'notifications', reason: 'Related to notifications' },
  { pattern: /report|analytics|dashboard/i, category: 'reporting', reason: 'Related to reporting/analytics' }
];

/**
 * Analyze name and generate tag suggestions
 */
function suggestTagsFromName(name: string): SuggestedLabel[] {
  const suggestions: SuggestedLabel[] = [];
  const addedTags = new Set<string>();

  // Check domain patterns (high confidence)
  for (const { pattern, tag, reason } of DOMAIN_PATTERNS) {
    if (pattern.test(name) && !addedTags.has(tag)) {
      suggestions.push({ label: tag, type: 'tag', confidence: 0.8, reason });
      addedTags.add(tag);
    }
  }

  // Check technical patterns (medium-high confidence)
  for (const { pattern, tag, reason } of TECHNICAL_PATTERNS) {
    if (pattern.test(name) && !addedTags.has(tag)) {
      suggestions.push({ label: tag, type: 'tag', confidence: 0.7, reason });
      addedTags.add(tag);
    }
  }

  // Check lifecycle patterns (medium confidence)
  for (const { pattern, tag, reason } of LIFECYCLE_PATTERNS) {
    if (pattern.test(name) && !addedTags.has(tag)) {
      suggestions.push({ label: tag, type: 'tag', confidence: 0.6, reason });
      addedTags.add(tag);
    }
  }

  return suggestions;
}

/**
 * Analyze name and generate category suggestions
 */
function suggestCategoriesFromName(name: string): SuggestedLabel[] {
  const suggestions: SuggestedLabel[] = [];
  const addedCategories = new Set<string>();

  for (const { pattern, category, reason } of CATEGORY_PATTERNS) {
    if (pattern.test(name) && !addedCategories.has(category)) {
      suggestions.push({ label: category, type: 'category', confidence: 0.75, reason });
      addedCategories.add(category);
    }
  }

  return suggestions;
}

/**
 * Analyze workflow tasks to suggest additional labels
 */
function suggestFromWorkflowTasks(workflow: GatewayWorkflowResponse): SuggestedLabel[] {
  const suggestions: SuggestedLabel[] = [];
  const tasks = workflow.tasks || [];

  // Check task count for complexity tag
  if (tasks.length >= 5) {
    suggestions.push({
      label: 'complex',
      type: 'tag',
      confidence: 0.65,
      reason: `Workflow has ${tasks.length} tasks, suggesting complex orchestration`
    });
  } else if (tasks.length === 1) {
    suggestions.push({
      label: 'simple',
      type: 'tag',
      confidence: 0.7,
      reason: 'Single-task workflow, suggesting simple operation'
    });
  }

  return suggestions;
}

/**
 * Suggest labels for a workflow or task based on metadata analysis
 */
export async function suggestLabels(
  client: ConsumerGatewayClient,
  input: SuggestLabelsInput
): Promise<SuggestLabelsResult> {
  let allSuggestions: SuggestedLabel[] = [];

  if (input.entityType === 'workflow') {
    // Get workflow details
    try {
      const workflow = await client.getWorkflow(input.entityName);

      // Analyze name
      allSuggestions = [
        ...suggestTagsFromName(workflow.name),
        ...suggestCategoriesFromName(workflow.name)
      ];

      // Analyze description if available
      if (workflow.description) {
        const descSuggestions = [
          ...suggestTagsFromName(workflow.description),
          ...suggestCategoriesFromName(workflow.description)
        ];
        // Add with slightly lower confidence
        for (const s of descSuggestions) {
          if (!allSuggestions.some(existing => existing.label === s.label)) {
            allSuggestions.push({ ...s, confidence: s.confidence * 0.9 });
          }
        }
      }

      // Analyze tasks
      allSuggestions = [...allSuggestions, ...suggestFromWorkflowTasks(workflow)];

    } catch {
      // Entity not found - just analyze the name
      allSuggestions = [
        ...suggestTagsFromName(input.entityName),
        ...suggestCategoriesFromName(input.entityName)
      ];
    }
  } else {
    // For tasks, just analyze the name
    allSuggestions = [
      ...suggestTagsFromName(input.entityName),
      ...suggestCategoriesFromName(input.entityName)
    ];
  }

  // Sort by confidence (highest first) and deduplicate within same type
  const seen = new Set<string>();
  const uniqueSuggestions = allSuggestions
    .sort((a, b) => b.confidence - a.confidence)
    .filter(s => {
      const key = `${s.type}:${s.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  return {
    entityName: input.entityName,
    suggestions: uniqueSuggestions
  };
}
