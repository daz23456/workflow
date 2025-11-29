'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { buildFormFields } from '@/lib/utils/schema-form-builder';

interface ExecutionInputFormProps {
  schema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
  onSubmit: (data: Record<string, any>) => void | Promise<void>;
  onTest?: (data: Record<string, any>) => void | Promise<void>;
}

/**
 * Converts JSON Schema to Zod schema for validation
 */
function jsonSchemaToZod(schema: ExecutionInputFormProps['schema']): z.ZodObject<any> {
  const shape: Record<string, z.ZodTypeAny> = {};

  if (!schema.properties) {
    return z.object({});
  }

  for (const [key, prop] of Object.entries(schema.properties)) {
    let zodType: z.ZodTypeAny;
    const isRequired = schema.required?.includes(key);

    // Create base Zod type based on JSON Schema type
    switch (prop.type) {
      case 'string':
        if (isRequired) {
          zodType = z.string().min(1, { message: `${key} is required` });
        } else {
          zodType = z.string();
        }
        break;
      case 'number':
      case 'integer':
        // Build number type with constraints
        if (!isRequired) {
          // For optional fields, use preprocessing to handle empty values and manual coercion
          let baseNumber = z.number();
          if (prop.minimum !== undefined) {
            baseNumber = baseNumber.min(prop.minimum, {
              message: `${key} must be at least ${prop.minimum}`,
            });
          }
          if (prop.maximum !== undefined) {
            baseNumber = baseNumber.max(prop.maximum, {
              message: `${key} must be at most ${prop.maximum}`,
            });
          }

          zodType = z.preprocess((val) => {
            // Convert empty values to undefined to skip validation
            // React Hook Form's valueAsNumber converts empty inputs to NaN
            if (val === '' || val === null || val === undefined || (typeof val === 'number' && isNaN(val))) {
              return undefined;
            }
            // Manual coercion to number (z.coerce causes NaN issues with optional fields)
            return Number(val);
          }, baseNumber.optional());
        } else {
          // Required fields
          let numberType: any = z.coerce.number();
          if (prop.minimum !== undefined) {
            numberType = numberType.min(prop.minimum, {
              message: `${key} must be at least ${prop.minimum}`,
            });
          }
          if (prop.maximum !== undefined) {
            numberType = numberType.max(prop.maximum, {
              message: `${key} must be at most ${prop.maximum}`,
            });
          }
          zodType = numberType;
        }
        break;
      case 'boolean':
        zodType = z.coerce.boolean().optional();
        break;
      default:
        zodType = z.string();
    }

    // Handle optional for non-number, non-boolean types
    if (!isRequired && prop.type !== 'number' && prop.type !== 'integer' && prop.type !== 'boolean') {
      zodType = zodType.optional();
    }

    shape[key] = zodType;
  }

  return z.object(shape);
}

/**
 * Cleans form data by removing empty optional fields and NaN values
 */
function cleanFormData(data: Record<string, any>, schema: ExecutionInputFormProps['schema']): Record<string, any> {
  const cleaned: Record<string, any> = {};
  const required = schema.required || [];

  for (const [key, value] of Object.entries(data)) {
    // Skip NaN values (from empty number inputs)
    if (typeof value === 'number' && isNaN(value)) {
      continue;
    }

    // Skip empty strings for optional fields
    if (!required.includes(key) && (value === '' || value === null || value === undefined)) {
      continue;
    }

    // Include all other values
    cleaned[key] = value;
  }

  return cleaned;
}

export function ExecutionInputForm({ schema, onSubmit, onTest }: ExecutionInputFormProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const formFields = buildFormFields(schema);
  const zodSchema = jsonSchemaToZod(schema);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(zodSchema),
  });

  const onSubmitWrapper = async (data: Record<string, any>) => {
    setIsExecuting(true);
    try {
      const cleaned = cleanFormData(data, schema);
      await onSubmit(cleaned);
    } finally {
      setIsExecuting(false);
    }
  };

  const onTestWrapper = async (data: Record<string, any>) => {
    if (!onTest) return;
    setIsTesting(true);
    try {
      const cleaned = cleanFormData(data, schema);
      await onTest(cleaned);
    } finally {
      setIsTesting(false);
    }
  };

  const hasFields = formFields.length > 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Input</h3>

      {!hasFields ? (
        <div className="text-sm text-gray-500 italic mb-4">
          No input required for this workflow
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmitWrapper)} className="space-y-4">
          {formFields.map((field) => (
            <div key={field.name}>
              {/* Field Label */}
              <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                {field.required && <span className="text-red-600 ml-1">*</span>}
              </label>

              {/* Field Description */}
              {field.description && (
                <p className="text-xs text-gray-500 mb-2">{field.description}</p>
              )}

              {/* Field Input */}
              {field.type === 'select' && field.options ? (
                <select
                  id={field.name}
                  {...register(field.name)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select {field.label}</option>
                  {field.options.map((option) => (
                    <option key={String(option)} value={String(option)}>
                      {String(option)}
                    </option>
                  ))}
                </select>
              ) : field.type === 'boolean' ? (
                <input
                  id={field.name}
                  type="checkbox"
                  {...register(field.name)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              ) : (
                <input
                  id={field.name}
                  type={field.type === 'string' ? 'text' : field.type}
                  {...register(field.name, {
                    valueAsNumber: field.type === 'number',
                  })}
                  {...(field.validation?.min !== undefined && { min: field.validation.min })}
                  {...(field.validation?.max !== undefined && { max: field.validation.max })}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              )}

              {/* Field Error */}
              {errors[field.name] && (
                <p className="mt-1 text-sm text-red-600">
                  {errors[field.name]?.message as string}
                </p>
              )}
            </div>
          ))}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isExecuting || isTesting}
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isExecuting ? 'Executing...' : 'Execute'}
            </button>

            {onTest && (
              <button
                type="button"
                onClick={handleSubmit(onTestWrapper)}
                disabled={isExecuting || isTesting}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {isTesting ? 'Testing...' : 'Test / Dry-run'}
              </button>
            )}
          </div>
        </form>
      )}

      {/* No Fields - Still show action buttons */}
      {!hasFields && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onSubmitWrapper({})}
            disabled={isExecuting || isTesting}
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isExecuting ? 'Executing...' : 'Execute Workflow'}
          </button>

          {onTest && (
            <button
              type="button"
              onClick={() => onTestWrapper({})}
              disabled={isExecuting || isTesting}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {isTesting ? 'Testing...' : 'Test / Dry-run'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
