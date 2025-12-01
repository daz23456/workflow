/**
 * Smoke Test
 *
 * Quick validation that the system is responding correctly.
 * Run this before any heavy load testing.
 */

import { check, sleep } from 'k6';
import http from 'k6/http';
import {
  BASE_URL,
  headers,
  executeWorkflow,
  listWorkflows,
  listTasks,
  testWorkflow,
  healthCheck,
  generateWorkflowInput,
} from '../lib/helpers.js';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
  },
};

const WORKFLOW = 'space-info';  // A known workflow with no required input

export default function () {
  // 1. Health check
  console.log('Testing: Health check...');
  const healthResp = healthCheck();
  check(healthResp, {
    'health check passes': (r) => r.status === 200,
  });
  sleep(0.5);

  // 2. List workflows
  console.log('Testing: List workflows...');
  const listResp = listWorkflows(0, 10);
  check(listResp, {
    'list workflows succeeds': (r) => r.status === 200,
    'returns workflows array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.workflows && Array.isArray(body.workflows);
      } catch {
        return false;
      }
    },
  });
  sleep(0.5);

  // 3. List tasks
  console.log('Testing: List tasks...');
  const tasksResp = listTasks();
  check(tasksResp, {
    'list tasks succeeds': (r) => r.status === 200,
  });
  sleep(0.5);

  // 4. Dry-run test
  console.log('Testing: Dry-run workflow...');
  const workflowInput = {};  // space-info has no required input
  const testResp = testWorkflow(WORKFLOW, workflowInput);
  check(testResp, {
    'dry-run succeeds': (r) => r.status === 200,
    'has execution plan': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.executionPlan !== undefined;
      } catch {
        return false;
      }
    },
  });
  sleep(0.5);

  // 5. Execute workflow
  console.log('Testing: Execute workflow...');
  const execResp = executeWorkflow(WORKFLOW, workflowInput);
  check(execResp, {
    'execution succeeds': (r) => r.status === 200,
    'has executionId': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.executionId !== undefined;
      } catch {
        return false;
      }
    },
    'reports success': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.success === true;
      } catch {
        return false;
      }
    },
  });

  sleep(1);
}

export function handleSummary(data) {
  const passed = Object.values(data.root_group.checks).every(c => c.passes > 0 && c.fails === 0);

  console.log('\n====================================');
  console.log(passed ? 'SMOKE TEST PASSED' : 'SMOKE TEST FAILED');
  console.log('====================================\n');

  return {
    stdout: JSON.stringify({
      passed,
      checks: data.root_group.checks,
      metrics: {
        requests: data.metrics.http_reqs?.values?.count || 0,
        failures: data.metrics.http_req_failed?.values?.rate || 0,
        p95_latency: data.metrics.http_req_duration?.values?.['p(95)'] || 0,
      },
    }, null, 2),
  };
}
