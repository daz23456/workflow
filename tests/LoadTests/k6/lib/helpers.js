/**
 * Shared utilities for k6 load tests
 */

import { check } from 'k6';
import http from 'k6/http';

// Base URL - configurable via environment
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

/**
 * Standard headers for API requests
 */
export const headers = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
};

/**
 * Generate a unique workflow name
 */
export function generateWorkflowName(prefix = 'load-test') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Generate workflow input data
 */
export function generateWorkflowInput(complexity = 'simple') {
  const inputs = {
    simple: {
      userId: `user-${Math.floor(Math.random() * 10000)}`,
      action: 'process',
    },
    medium: {
      userId: `user-${Math.floor(Math.random() * 10000)}`,
      action: 'process',
      data: {
        items: Array.from({ length: 10 }, (_, i) => ({
          id: i,
          value: Math.random() * 100,
        })),
      },
    },
    complex: {
      userId: `user-${Math.floor(Math.random() * 10000)}`,
      action: 'batch-process',
      data: {
        items: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          value: Math.random() * 100,
          metadata: {
            created: new Date().toISOString(),
            tags: ['load-test', 'stress', `batch-${i % 10}`],
          },
        })),
      },
      options: {
        parallel: true,
        retryOnFailure: true,
        maxRetries: 3,
      },
    },
  };
  return inputs[complexity] || inputs.simple;
}

/**
 * Execute a workflow and check response
 */
export function executeWorkflow(workflowName, input, tags = {}) {
  const url = `${BASE_URL}/api/v1/workflows/${workflowName}/execute`;
  const payload = JSON.stringify(input);

  const response = http.post(url, payload, {
    headers,
    tags: { name: 'execute_workflow', ...tags },
  });

  check(response, {
    'execute: status is 200': (r) => r.status === 200,
    'execute: has executionId': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.executionId !== undefined;
      } catch {
        return false;
      }
    },
    'execute: response time < 5s': (r) => r.timings.duration < 5000,
  });

  return response;
}

/**
 * List workflows with pagination
 */
export function listWorkflows(skip = 0, take = 20, tags = {}) {
  const url = `${BASE_URL}/api/v1/workflows?skip=${skip}&take=${take}`;

  const response = http.get(url, {
    headers,
    tags: { name: 'list_workflows', ...tags },
  });

  check(response, {
    'list: status is 200': (r) => r.status === 200,
    'list: response time < 500ms': (r) => r.timings.duration < 500,
  });

  return response;
}

/**
 * Get workflow details
 */
export function getWorkflow(workflowName, tags = {}) {
  const url = `${BASE_URL}/api/v1/workflows/${workflowName}`;

  const response = http.get(url, {
    headers,
    tags: { name: 'get_workflow', ...tags },
  });

  check(response, {
    'get: status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'get: response time < 200ms': (r) => r.timings.duration < 200,
  });

  return response;
}

/**
 * List execution history
 */
export function listExecutions(workflowName, skip = 0, take = 20, tags = {}) {
  const url = `${BASE_URL}/api/v1/workflows/${workflowName}/executions?skip=${skip}&take=${take}`;

  const response = http.get(url, {
    headers,
    tags: { name: 'list_executions', ...tags },
  });

  check(response, {
    'executions: status is 200': (r) => r.status === 200,
    'executions: response time < 500ms': (r) => r.timings.duration < 500,
  });

  return response;
}

/**
 * Get execution details
 */
export function getExecution(executionId, tags = {}) {
  const url = `${BASE_URL}/api/v1/executions/${executionId}`;

  const response = http.get(url, {
    headers,
    tags: { name: 'get_execution', ...tags },
  });

  check(response, {
    'execution: status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'execution: response time < 300ms': (r) => r.timings.duration < 300,
  });

  return response;
}

/**
 * Get execution trace
 */
export function getExecutionTrace(executionId, tags = {}) {
  const url = `${BASE_URL}/api/v1/executions/${executionId}/trace`;

  const response = http.get(url, {
    headers,
    tags: { name: 'get_trace', ...tags },
  });

  check(response, {
    'trace: status is 200 or 404': (r) => r.status === 200 || r.status === 404,
    'trace: response time < 500ms': (r) => r.timings.duration < 500,
  });

  return response;
}

/**
 * Test workflow (dry-run)
 */
export function testWorkflow(workflowName, input, tags = {}) {
  const url = `${BASE_URL}/api/v1/workflows/${workflowName}/test`;
  const payload = JSON.stringify(input);

  const response = http.post(url, payload, {
    headers,
    tags: { name: 'test_workflow', ...tags },
  });

  check(response, {
    'test: status is 200': (r) => r.status === 200,
    'test: has executionPlan': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.executionPlan !== undefined;
      } catch {
        return false;
      }
    },
    'test: response time < 1s': (r) => r.timings.duration < 1000,
  });

  return response;
}

/**
 * Get workflow versions
 */
export function getWorkflowVersions(workflowName, tags = {}) {
  const url = `${BASE_URL}/api/v1/workflows/${workflowName}/versions`;

  const response = http.get(url, {
    headers,
    tags: { name: 'get_versions', ...tags },
  });

  check(response, {
    'versions: status is 200': (r) => r.status === 200,
    'versions: response time < 300ms': (r) => r.timings.duration < 300,
  });

  return response;
}

/**
 * List tasks
 */
export function listTasks(namespace = 'default', tags = {}) {
  const url = `${BASE_URL}/api/v1/tasks?namespace=${namespace}`;

  const response = http.get(url, {
    headers,
    tags: { name: 'list_tasks', ...tags },
  });

  check(response, {
    'tasks: status is 200': (r) => r.status === 200,
    'tasks: response time < 300ms': (r) => r.timings.duration < 300,
  });

  return response;
}

/**
 * Health check
 */
export function healthCheck(tags = {}) {
  const url = `${BASE_URL}/health`;

  const response = http.get(url, {
    tags: { name: 'health_check', ...tags },
  });

  check(response, {
    'health: status is 200': (r) => r.status === 200,
    'health: response time < 100ms': (r) => r.timings.duration < 100,
  });

  return response;
}

/**
 * Random selection from array
 */
export function randomChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Weighted random selection
 */
export function weightedRandomChoice(items) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of items) {
    random -= item.weight;
    if (random <= 0) {
      return item.value;
    }
  }

  return items[items.length - 1].value;
}
