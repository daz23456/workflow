export type PropertyDefinition = {
    type?: string | null;
    description?: string | null;
    format?: string | null;
    properties?: Record<string, PropertyDefinition> | null;
    items?: PropertyDefinition;
    enum?: Array<string> | null;
    minimum?: number | null;
    maximum?: number | null;
    pattern?: string | null;
    required?: Array<string> | null;
};
//# sourceMappingURL=PropertyDefinition.d.ts.map