/**
 * Production Chaos Simulation
 *
 * Simulates a realistic production environment with multiple user personas
 * performing different activities simultaneously:
 *
 * - Platform Users: Browsing, viewing execution history
 * - Developers: Debugging, viewing traces, investigating issues
 * - CI/CD Pipelines: Automated workflow executions
 * - DevOps: Testing new workflows, dry-runs
 * - Background Jobs: Batch processing, scheduled workflows
 */

import { sleep, group } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';
import {
  BASE_URL,
  executeWorkflow,
  listWorkflows,
  getWorkflow,
  listExecutions,
  getExecution,
  getExecutionTrace,
  testWorkflow,
  getWorkflowVersions,
  listTasks,
  healthCheck,
  generateWorkflowInput,
  randomChoice,
  weightedRandomChoice,
} from '../lib/helpers.js';

// Custom metrics
const executionDuration = new Trend('workflow_execution_duration');
const traceFetchDuration = new Trend('trace_fetch_duration');
const graphBuildDuration = new Trend('graph_build_duration');
const orchestrationOverhead = new Trend('orchestration_overhead_percent');
const errorRate = new Rate('error_rate');
const successfulExecutions = new Counter('successful_executions');
const failedExecutions = new Counter('failed_executions');

// Test configuration
export const options = {
  scenarios: {
    // Platform users browsing workflows
    platform_users: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 50 },   // Ramp up
        { duration: '5m', target: 100 },  // Peak browsing
        { duration: '3m', target: 50 },   // Wind down
        { duration: '1m', target: 0 },    // Ramp down
      ],
      gracefulRampDown: '30s',
      exec: 'platformUserScenario',
    },

    // Developers investigating issues
    developers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 },
        { duration: '5m', target: 50 },
        { duration: '3m', target: 30 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'developerScenario',
    },

    // CI/CD pipelines executing workflows
    cicd_pipelines: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 500,
      stages: [
        { duration: '1m', target: 50 },   // Ramp up
        { duration: '3m', target: 200 },  // Peak load
        { duration: '3m', target: 500 },  // Stress test
        { duration: '2m', target: 100 },  // Cool down
        { duration: '1m', target: 10 },   // Baseline
      ],
      exec: 'cicdPipelineScenario',
    },

    // DevOps testing new workflows
    devops: {
      executor: 'constant-vus',
      vus: 10,
      duration: '10m',
      exec: 'devopsScenario',
    },

    // Background batch processing
    batch_jobs: {
      executor: 'per-vu-iterations',
      vus: 20,
      iterations: 50,
      maxDuration: '10m',
      exec: 'batchJobScenario',
    },

    // Health check monitoring
    health_monitor: {
      executor: 'constant-arrival-rate',
      rate: 10,
      timeUnit: '1s',
      duration: '10m',
      preAllocatedVUs: 5,
      exec: 'healthMonitorScenario',
    },
  },

  thresholds: {
    // Response time thresholds
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    'http_req_duration{name:execute_workflow}': ['p(95)<3000', 'p(99)<5000'],
    'http_req_duration{name:list_workflows}': ['p(95)<500', 'p(99)<1000'],
    'http_req_duration{name:get_execution}': ['p(95)<300', 'p(99)<500'],
    'http_req_duration{name:get_trace}': ['p(95)<500', 'p(99)<1000'],
    'http_req_duration{name:health_check}': ['p(99)<100'],

    // Error rate thresholds
    http_req_failed: ['rate<0.01'],  // Less than 1% failure rate
    error_rate: ['rate<0.01'],

    // Custom metric thresholds
    workflow_execution_duration: ['p(95)<5000'],
    orchestration_overhead_percent: ['p(95)<15'],  // Less than 15% overhead
  },
};

// Known workflow names (would be discovered or configured)
const WORKFLOWS = [
  'user-signup',
  'payment-processing',
  'order-fulfillment',
  'notification-sender',
  'data-sync',
  'report-generator',
  'inventory-update',
  'email-campaign',
  'user-verification',
  'audit-logger',
];

// Store execution IDs for later queries
const executionIds = [];

/**
 * Platform User Scenario
 * Casual browsing: list workflows, view details, check recent executions
 */
export function platformUserScenario() {
  group('Platform User - Browse Workflows', () => {
    // List workflows with pagination
    const listResp = listWorkflows(0, 20, { persona: 'platform_user' });
    sleep(randomChoice([0.5, 1, 2])); // Reading time

    // Pick a random workflow to view
    const workflow = randomChoice(WORKFLOWS);
    getWorkflow(workflow, { persona: 'platform_user' });
    sleep(randomChoice([1, 2, 3]));

    // View recent executions
    listExecutions(workflow, 0, 10, { persona: 'platform_user' });
    sleep(randomChoice([0.5, 1]));

    // Maybe view a specific execution
    if (Math.random() > 0.5 && executionIds.length > 0) {
      const execId = randomChoice(executionIds);
      getExecution(execId, { persona: 'platform_user' });
    }
  });

  sleep(randomChoice([2, 3, 5])); // Think time between actions
}

/**
 * Developer Scenario
 * Investigating issues: heavy trace usage, execution details, version history
 */
export function developerScenario() {
  group('Developer - Debug Session', () => {
    const workflow = randomChoice(WORKFLOWS);

    // Check workflow versions (looking for recent changes)
    getWorkflowVersions(workflow, { persona: 'developer' });
    sleep(0.5);

    // List recent executions
    const execListResp = listExecutions(workflow, 0, 20, { persona: 'developer' });
    sleep(1);

    // Deep dive into multiple executions
    for (let i = 0; i < randomChoice([2, 3, 5]); i++) {
      if (executionIds.length > 0) {
        const execId = randomChoice(executionIds);

        // Get execution details
        getExecution(execId, { persona: 'developer' });
        sleep(0.5);

        // Get detailed trace (most expensive operation)
        const traceResp = getExecutionTrace(execId, { persona: 'developer' });
        if (traceResp.status === 200) {
          traceFetchDuration.add(traceResp.timings.duration);
        }
        sleep(randomChoice([1, 2, 3])); // Analyzing trace
      }
    }

    // Check tasks available
    listTasks('default', { persona: 'developer' });
  });

  sleep(randomChoice([1, 2]));
}

/**
 * CI/CD Pipeline Scenario
 * Automated executions: high throughput, varied complexity
 */
export function cicdPipelineScenario() {
  const workflow = randomChoice(WORKFLOWS);
  const complexity = weightedRandomChoice([
    { value: 'simple', weight: 60 },
    { value: 'medium', weight: 30 },
    { value: 'complex', weight: 10 },
  ]);

  const input = generateWorkflowInput(complexity);

  group('CI/CD - Execute Workflow', () => {
    const response = executeWorkflow(workflow, input, {
      persona: 'cicd',
      complexity: complexity,
    });

    if (response.status === 200) {
      try {
        const body = JSON.parse(response.body);

        // Track execution ID for other scenarios
        if (body.executionId && executionIds.length < 1000) {
          executionIds.push(body.executionId);
        }

        // Track metrics
        executionDuration.add(body.executionTimeMs || 0);
        successfulExecutions.add(1);

        if (body.graphBuildDurationMicros) {
          graphBuildDuration.add(body.graphBuildDurationMicros / 1000); // to ms
        }

        if (body.orchestrationCost) {
          orchestrationOverhead.add(body.orchestrationCost.orchestrationCostPercentage || 0);
        }

        errorRate.add(0);
      } catch (e) {
        errorRate.add(1);
        failedExecutions.add(1);
      }
    } else {
      errorRate.add(1);
      failedExecutions.add(1);
    }
  });

  // No sleep - CI/CD is relentless
}

/**
 * DevOps Scenario
 * Testing new workflows: dry-runs, validation, iterating on definitions
 */
export function devopsScenario() {
  group('DevOps - Test New Workflow', () => {
    const workflow = randomChoice(WORKFLOWS);
    const input = generateWorkflowInput('medium');

    // Dry-run test
    testWorkflow(workflow, input, { persona: 'devops' });
    sleep(randomChoice([1, 2])); // Reviewing results

    // Check execution plan multiple times (iterating)
    for (let i = 0; i < randomChoice([1, 2, 3]); i++) {
      testWorkflow(workflow, generateWorkflowInput('simple'), { persona: 'devops' });
      sleep(0.5);
    }

    // Maybe do a real execution to verify
    if (Math.random() > 0.7) {
      executeWorkflow(workflow, input, { persona: 'devops' });
    }
  });

  sleep(randomChoice([3, 5, 10])); // DevOps thinks between iterations
}

/**
 * Batch Job Scenario
 * Heavy processing: many executions of complex workflows
 */
export function batchJobScenario() {
  const workflow = randomChoice(['data-sync', 'report-generator', 'audit-logger']);

  group('Batch Job - Process Batch', () => {
    // Execute multiple workflows in rapid succession
    for (let i = 0; i < 10; i++) {
      const input = generateWorkflowInput('complex');
      input.batchId = `batch-${Date.now()}-${i}`;

      const response = executeWorkflow(workflow, input, {
        persona: 'batch_job',
        batch_index: i.toString(),
      });

      if (response.status === 200) {
        try {
          const body = JSON.parse(response.body);
          if (body.executionId && executionIds.length < 1000) {
            executionIds.push(body.executionId);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }

      sleep(0.1); // Minimal delay between batch items
    }
  });

  sleep(randomChoice([5, 10])); // Pause between batches
}

/**
 * Health Monitor Scenario
 * Continuous health checks (simulating monitoring systems)
 */
export function healthMonitorScenario() {
  healthCheck({ persona: 'monitor' });
  // No sleep - constant rate executor handles timing
}

/**
 * Setup - runs once before test
 */
export function setup() {
  console.log(`Starting production chaos simulation against ${BASE_URL}`);

  // Verify API is accessible
  const healthResp = healthCheck();
  if (healthResp.status !== 200) {
    throw new Error(`API health check failed: ${healthResp.status}`);
  }

  // Verify workflows exist
  const listResp = listWorkflows(0, 100);
  if (listResp.status !== 200) {
    console.warn('Could not list workflows - some tests may fail');
  }

  return {
    startTime: new Date().toISOString(),
  };
}

/**
 * Teardown - runs once after test
 */
export function teardown(data) {
  console.log(`Production chaos simulation completed`);
  console.log(`Started: ${data.startTime}`);
  console.log(`Ended: ${new Date().toISOString()}`);
  console.log(`Total executions tracked: ${executionIds.length}`);
}
