"use strict";
/**
 * @workflow/validation
 *
 * Validation utilities for workflows using JSON Schema-based validation.
 * No C# logic porting needed - uses JSON Schemas as single source of truth.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaValidator = exports.TemplateParser = void 0;
var templateParser_1 = require("./templateParser");
Object.defineProperty(exports, "TemplateParser", { enumerable: true, get: function () { return templateParser_1.TemplateParser; } });
var schemaValidator_1 = require("./schemaValidator");
Object.defineProperty(exports, "SchemaValidator", { enumerable: true, get: function () { return schemaValidator_1.SchemaValidator; } });
//# sourceMappingURL=index.js.map