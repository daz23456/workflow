/**
 * WorkflowTask CRD Generator
 * Converts parsed OpenAPI endpoints to Kubernetes WorkflowTask CRDs
 */
import type { ParsedSpec } from './openapi-parser.js';
import type { GeneratedTask } from './types.js';
export interface GeneratorOptions {
    baseUrl: string;
    namespace: string;
    prefix?: string;
    tags?: string[];
    excludeTags?: string[];
}
/**
 * Generate WorkflowTask CRDs from a parsed OpenAPI spec
 */
export declare function generateTasksFromSpec(spec: ParsedSpec, options: GeneratorOptions): GeneratedTask[];
/**
 * Write generated tasks to files
 */
export declare function writeTasksToFiles(tasks: GeneratedTask[], outputDir: string, singleFile?: boolean): Promise<void>;
//# sourceMappingURL=crd-generator.d.ts.map