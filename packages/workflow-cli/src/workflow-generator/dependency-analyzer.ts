/**
 * Dependency Analyzer
 * Analyzes task compatibility and finds chains of compatible tasks
 */

import type { JsonSchema } from '../types.js';

export interface TaskDefinition {
  name: string;
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
}

export interface FieldMapping {
  from: string;
  to: string;
}

export interface CompatibilityResult {
  compatible: boolean;
  fieldMappings: FieldMapping[];
  missingFields: string[];
}

export interface TaskChain {
  tasks: TaskDefinition[];
  mappings: FieldMapping[][];
}

/**
 * Check if an output schema can satisfy an input schema's requirements.
 * The output must provide all required fields with matching types.
 * This is a strict check - field names must match exactly.
 */
export function isSchemaCompatible(
  outputSchema: JsonSchema,
  inputSchema: JsonSchema
): boolean {
  const outputProps = outputSchema.properties || {};
  const inputProps = inputSchema.properties || {};
  const requiredFields = inputSchema.required || [];

  // Check that all required input fields exist in output with matching types
  for (const field of requiredFields) {
    const inputField = inputProps[field];
    if (!inputField) continue;

    // Required field must exist in output with matching type
    const outputField = outputProps[field];
    if (!outputField || outputField.type !== inputField.type) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate a semantic similarity score between two field names.
 * Higher score = better match.
 */
function fieldSimilarityScore(outputField: string, inputField: string): number {
  const output = outputField.toLowerCase();
  const input = inputField.toLowerCase();

  // Exact match
  if (output === input) return 100;

  // Email patterns: email → to, recipient, emailAddress
  if (output === 'email' && ['to', 'recipient', 'emailaddress', 'recipientemail'].includes(input)) {
    return 90;
  }

  // ID patterns: id → userId, customerId, orderId, etc.
  if (output === 'id' && input.endsWith('id') && input.length > 2) {
    return 85;
  }

  // Substring match: one contains the other
  if (output.includes(input) || input.includes(output)) {
    return 70;
  }

  // Suffix match: both end with same suffix (e.g., Id, Name, Email)
  const suffixes = ['id', 'name', 'email', 'address', 'date', 'time', 'count', 'total'];
  for (const suffix of suffixes) {
    if (output.endsWith(suffix) && input.endsWith(suffix)) {
      return 60;
    }
  }

  // No semantic match
  return 0;
}

/**
 * Analyze compatibility between two tasks.
 * Determines if task1's output can be used as task2's input.
 */
export function analyzeTaskCompatibility(
  task1: TaskDefinition,
  task2: TaskDefinition
): CompatibilityResult {
  const outputProps = task1.outputSchema.properties || {};
  const inputProps = task2.inputSchema.properties || {};
  const requiredFields = task2.inputSchema.required || [];

  const fieldMappings: FieldMapping[] = [];
  const missingFields: string[] = [];
  const usedOutputFields = new Set<string>();

  // For each required input field, try to find the best matching output field
  for (const requiredField of requiredFields) {
    const inputFieldSchema = inputProps[requiredField];
    if (!inputFieldSchema) continue;

    // Find all output fields with matching type that aren't already used
    const candidates = Object.entries(outputProps)
      .filter(([name, schema]) =>
        schema.type === inputFieldSchema.type && !usedOutputFields.has(name)
      )
      .map(([name, schema]) => ({
        name,
        schema,
        score: fieldSimilarityScore(name, requiredField)
      }))
      .sort((a, b) => b.score - a.score); // Sort by score descending

    // Require semantic similarity (score > 0) or exact match for auto-mapping
    // Score 0 means completely unrelated fields - don't auto-connect
    const validCandidates = candidates.filter(c => c.score > 0);

    if (validCandidates.length > 0) {
      const bestMatch = validCandidates[0];
      fieldMappings.push({ from: bestMatch.name, to: requiredField });
      usedOutputFields.add(bestMatch.name);
    } else {
      missingFields.push(requiredField);
    }
  }

  return {
    compatible: missingFields.length === 0,
    fieldMappings,
    missingFields
  };
}

/**
 * Find all compatible task chains of a given length.
 * A chain is compatible if each task's output can satisfy the next task's input.
 */
export function findCompatibleChains(
  tasks: TaskDefinition[],
  chainLength: number
): TaskChain[] {
  if (chainLength < 2 || tasks.length < chainLength) {
    return [];
  }

  const chains: TaskChain[] = [];

  // For length 2, just find all compatible pairs
  if (chainLength === 2) {
    for (const task1 of tasks) {
      for (const task2 of tasks) {
        if (task1.name === task2.name) continue;

        const result = analyzeTaskCompatibility(task1, task2);
        if (result.compatible) {
          chains.push({
            tasks: [task1, task2],
            mappings: [result.fieldMappings]
          });
        }
      }
    }
  }

  // TODO: For longer chains, implement recursive search

  return chains;
}
