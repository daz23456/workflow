import type { PropertyDefinition } from './PropertyDefinition';
export type SchemaDefinition = {
    type?: string | null;
    properties?: Record<string, PropertyDefinition> | null;
    required?: Array<string> | null;
    description?: string | null;
};
//# sourceMappingURL=SchemaDefinition.d.ts.map