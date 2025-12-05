/**
 * WorkflowTask CRD Generator
 * Converts parsed OpenAPI endpoints to Kubernetes WorkflowTask CRDs
 */
import YAML from 'yaml';
/**
 * Generate WorkflowTask CRDs from a parsed OpenAPI spec
 */
export function generateTasksFromSpec(spec, options) {
    const tasks = [];
    for (const endpoint of spec.endpoints) {
        // Filter by tags if specified
        if (options.tags && options.tags.length > 0) {
            if (!endpoint.tags.some(tag => options.tags.includes(tag))) {
                continue;
            }
        }
        // Exclude by tags if specified
        if (options.excludeTags && options.excludeTags.length > 0) {
            if (endpoint.tags.some(tag => options.excludeTags.includes(tag))) {
                continue;
            }
        }
        const task = generateTask(endpoint, options);
        tasks.push(task);
    }
    return tasks;
}
/**
 * Generate a single WorkflowTask CRD from an endpoint
 */
function generateTask(endpoint, options) {
    const taskName = generateTaskName(endpoint, options.prefix);
    const resource = {
        apiVersion: 'workflow.example.com/v1',
        kind: 'WorkflowTask',
        metadata: {
            name: taskName,
            namespace: options.namespace,
            labels: {
                'workflow.io/generated-from': 'openapi',
                'workflow.io/operation-id': endpoint.operationId
            },
            annotations: {
                'workflow.io/source-path': endpoint.path,
                'workflow.io/source-method': endpoint.method
            }
        },
        spec: {
            type: 'http',
            description: endpoint.summary || endpoint.description || `${endpoint.method} ${endpoint.path}`,
            request: {
                url: buildUrl(options.baseUrl, endpoint),
                method: endpoint.method,
                headers: buildHeaders(endpoint)
            },
            inputSchema: buildInputSchema(endpoint),
            outputSchema: buildOutputSchema(endpoint),
            timeout: '30s',
            retry: {
                maxAttempts: 3,
                backoffMs: 1000
            }
        }
    };
    // Add body template if there's a request body
    if (endpoint.requestBody && resource.spec.request) {
        resource.spec.request.body = '{{input.body | toJson}}';
    }
    const yaml = YAML.stringify(resource, {
        lineWidth: 0,
        singleQuote: true
    });
    return {
        name: taskName,
        resource,
        yaml,
        operationId: endpoint.operationId,
        path: endpoint.path,
        method: endpoint.method
    };
}
/**
 * Generate a task name from the endpoint
 */
function generateTaskName(endpoint, prefix) {
    // Use operationId if available, otherwise generate from path/method
    let name = endpoint.operationId
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
    // Ensure it starts with a letter (K8s requirement)
    if (!/^[a-z]/.test(name)) {
        name = 'task-' + name;
    }
    // Add prefix if specified
    if (prefix) {
        name = `${prefix}-${name}`;
    }
    // Truncate to 63 chars (K8s name limit)
    if (name.length > 63) {
        name = name.substring(0, 63).replace(/-$/, '');
    }
    return name;
}
/**
 * Build the URL template with path parameters
 */
function buildUrl(baseUrl, endpoint) {
    // Replace {param} with {{input.param}} template syntax
    let url = `${baseUrl}${endpoint.path}`;
    url = url.replace(/\{([^}]+)\}/g, '{{input.$1}}');
    // Add query parameters as template
    const queryParams = endpoint.parameters.filter(p => p.in === 'query');
    if (queryParams.length > 0) {
        // We'll add a comment about query params - actual handling would depend on workflow engine
        // For now, assume they're passed in input and need to be manually added
    }
    return url;
}
/**
 * Build default headers
 */
function buildHeaders(endpoint) {
    const headers = {
        'Accept': 'application/json'
    };
    if (endpoint.requestBody) {
        headers['Content-Type'] = endpoint.requestBody.contentType || 'application/json';
    }
    // Add header parameters as templates
    const headerParams = endpoint.parameters.filter(p => p.in === 'header');
    for (const param of headerParams) {
        headers[param.name] = `{{input.${param.name}}}`;
    }
    return headers;
}
/**
 * Build input schema from parameters and request body
 */
function buildInputSchema(endpoint) {
    const properties = {};
    const required = [];
    // Add path parameters
    for (const param of endpoint.parameters.filter(p => p.in === 'path')) {
        properties[param.name] = {
            ...param.schema,
            description: param.description || `Path parameter: ${param.name}`
        };
        // Path params are always required
        required.push(param.name);
    }
    // Add query parameters
    for (const param of endpoint.parameters.filter(p => p.in === 'query')) {
        properties[param.name] = {
            ...param.schema,
            description: param.description || `Query parameter: ${param.name}`
        };
        if (param.required) {
            required.push(param.name);
        }
    }
    // Add header parameters
    for (const param of endpoint.parameters.filter(p => p.in === 'header')) {
        properties[param.name] = {
            ...param.schema,
            description: param.description || `Header: ${param.name}`
        };
        if (param.required) {
            required.push(param.name);
        }
    }
    // Add request body
    if (endpoint.requestBody) {
        properties['body'] = {
            ...endpoint.requestBody.schema,
            description: endpoint.requestBody.description || 'Request body'
        };
        if (endpoint.requestBody.required) {
            required.push('body');
        }
    }
    return {
        type: 'object',
        properties,
        required: required.length > 0 ? required : undefined
    };
}
/**
 * Build output schema from successful response
 */
function buildOutputSchema(endpoint) {
    // Find 200 or 201 response
    const successResponse = endpoint.responses.find(r => r.statusCode === '200' || r.statusCode === '201' || r.statusCode === 'default');
    if (successResponse?.schema) {
        return successResponse.schema;
    }
    // Default empty response schema
    return {
        type: 'object',
        description: 'Response from the endpoint'
    };
}
/**
 * Write generated tasks to files
 */
export async function writeTasksToFiles(tasks, outputDir, singleFile = false) {
    const fs = await import('fs/promises');
    const path = await import('path');
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });
    if (singleFile) {
        // Write all tasks to a single file
        const allYaml = tasks.map(t => t.yaml).join('---\n');
        const filePath = path.join(outputDir, 'workflow-tasks.yaml');
        await fs.writeFile(filePath, allYaml);
    }
    else {
        // Write each task to its own file
        for (const task of tasks) {
            const filePath = path.join(outputDir, `task-${task.name}.yaml`);
            await fs.writeFile(filePath, task.yaml);
        }
    }
}
//# sourceMappingURL=crd-generator.js.map