/**
 * Database Contention Test
 *
 * Purpose: Identify PostgreSQL bottlenecks
 *
 * Targets:
 * - Connection pool exhaustion
 * - Write contention on execution_records
 * - Read performance during heavy writes
 * - Index performance under load
 * - Query plan degradation
 */

import { sleep, group } from 'k6';
import { Trend, Counter, Rate, Gauge } from 'k6/metrics';
import {
  BASE_URL,
  executeWorkflow,
  listExecutions,
  getExecution,
  getExecutionTrace,
  listWorkflows,
  generateWorkflowInput,
  randomChoice,
} from '../lib/helpers.js';

// Database-specific metrics
const writeLatency = new Trend('db_write_latency_ms');
const readLatency = new Trend('db_read_latency_ms');
const listQueryLatency = new Trend('db_list_query_latency_ms');
const traceQueryLatency = new Trend('db_trace_query_latency_ms');
const connectionPoolWait = new Gauge('db_connection_pool_wait_ms');
const deadlockCount = new Counter('db_deadlock_count');
const timeoutCount = new Counter('db_timeout_count');
const writeSuccessRate = new Rate('db_write_success_rate');
const readSuccessRate = new Rate('db_read_success_rate');

// Track execution IDs for reads
const executionIdPool = [];
const MAX_POOL_SIZE = 5000;

const WORKFLOWS = [
  'user-signup',
  'payment-processing',
  'order-fulfillment',
  'data-sync',
  'report-generator',
];

export const options = {
  scenarios: {
    // Heavy write load - simulating many concurrent executions
    heavy_writes: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 200,
      maxVUs: 1000,
      stages: [
        { duration: '1m', target: 100 },
        { duration: '3m', target: 300 },
        { duration: '3m', target: 500 },  // Peak write load
        { duration: '2m', target: 200 },
        { duration: '1m', target: 50 },
      ],
      exec: 'heavyWriteScenario',
    },

    // Heavy read load - concurrent with writes
    heavy_reads: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '3m', target: 150 },
        { duration: '3m', target: 200 },  // Peak read load
        { duration: '2m', target: 100 },
        { duration: '1m', target: 10 },
      ],
      exec: 'heavyReadScenario',
    },

    // List queries with pagination - tests index performance
    pagination_stress: {
      executor: 'constant-vus',
      vus: 30,
      duration: '10m',
      exec: 'paginationStressScenario',
    },

    // Trace queries - expensive joins
    trace_stress: {
      executor: 'constant-vus',
      vus: 20,
      duration: '10m',
      startTime: '2m',  // Start after some data exists
      exec: 'traceStressScenario',
    },

    // Mixed read/write patterns - realistic contention
    mixed_workload: {
      executor: 'ramping-vus',
      startVUs: 20,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 200 },
        { duration: '3m', target: 100 },
      ],
      exec: 'mixedWorkloadScenario',
    },
  },

  thresholds: {
    // Write latency thresholds
    db_write_latency_ms: ['p(50)<50', 'p(95)<200', 'p(99)<500'],

    // Read latency thresholds
    db_read_latency_ms: ['p(50)<30', 'p(95)<100', 'p(99)<300'],

    // List query thresholds (heavier)
    db_list_query_latency_ms: ['p(50)<100', 'p(95)<300', 'p(99)<500'],

    // Trace query thresholds (heaviest)
    db_trace_query_latency_ms: ['p(50)<200', 'p(95)<500', 'p(99)<1000'],

    // Success rates
    db_write_success_rate: ['rate>0.99'],
    db_read_success_rate: ['rate>0.99'],

    // Error counts
    db_deadlock_count: ['count<10'],
    db_timeout_count: ['count<50'],

    // Overall
    http_req_failed: ['rate<0.02'],
  },
};

/**
 * Heavy Write Scenario
 * Execute workflows to generate write load
 */
export function heavyWriteScenario() {
  const workflow = randomChoice(WORKFLOWS);
  const input = generateWorkflowInput('simple');

  const startTime = Date.now();
  const response = executeWorkflow(workflow, input, { scenario: 'write' });
  const latency = Date.now() - startTime;

  if (response.status === 200) {
    writeSuccessRate.add(1);

    try {
      const body = JSON.parse(response.body);

      // Track teardown duration as proxy for write latency
      if (body.orchestrationCost?.teardownDurationMs) {
        writeLatency.add(body.orchestrationCost.teardownDurationMs);
      } else {
        writeLatency.add(latency);
      }

      // Store execution ID for reads
      if (body.executionId && executionIdPool.length < MAX_POOL_SIZE) {
        executionIdPool.push(body.executionId);
      }
    } catch (e) {
      writeLatency.add(latency);
    }
  } else {
    writeSuccessRate.add(0);

    // Check for specific DB errors
    const bodyText = response.body?.toString() || '';
    if (bodyText.includes('deadlock')) {
      deadlockCount.add(1);
    }
    if (response.status === 504 || bodyText.includes('timeout')) {
      timeoutCount.add(1);
    }
  }
}

/**
 * Heavy Read Scenario
 * Query execution details and history
 */
export function heavyReadScenario() {
  if (executionIdPool.length === 0) {
    sleep(1);
    return;
  }

  const execId = randomChoice(executionIdPool);

  const startTime = Date.now();
  const response = getExecution(execId, { scenario: 'read' });
  const latency = Date.now() - startTime;

  readLatency.add(latency);

  if (response.status === 200 || response.status === 404) {
    readSuccessRate.add(1);
  } else {
    readSuccessRate.add(0);

    if (response.status === 504) {
      timeoutCount.add(1);
    }
  }

  sleep(randomChoice([0.1, 0.2, 0.5]));
}

/**
 * Pagination Stress Scenario
 * Test list queries with various pagination patterns
 */
export function paginationStressScenario() {
  const workflow = randomChoice(WORKFLOWS);

  group('Pagination Patterns', () => {
    // First page (common)
    let startTime = Date.now();
    listExecutions(workflow, 0, 20, { scenario: 'pagination' });
    listQueryLatency.add(Date.now() - startTime);

    sleep(0.2);

    // Random deep page (stress indexes)
    const randomSkip = Math.floor(Math.random() * 1000);
    startTime = Date.now();
    listExecutions(workflow, randomSkip, 20, { scenario: 'pagination' });
    listQueryLatency.add(Date.now() - startTime);

    sleep(0.2);

    // Large page size
    startTime = Date.now();
    listExecutions(workflow, 0, 100, { scenario: 'pagination' });
    listQueryLatency.add(Date.now() - startTime);

    sleep(0.5);

    // Sequential pagination (scan pattern)
    for (let i = 0; i < 5; i++) {
      startTime = Date.now();
      listExecutions(workflow, i * 50, 50, { scenario: 'pagination' });
      listQueryLatency.add(Date.now() - startTime);
      sleep(0.1);
    }
  });

  sleep(1);
}

/**
 * Trace Stress Scenario
 * Heavy trace queries (expensive joins)
 */
export function traceStressScenario() {
  if (executionIdPool.length < 10) {
    sleep(1);
    return;
  }

  const execId = randomChoice(executionIdPool);

  const startTime = Date.now();
  const response = getExecutionTrace(execId, { scenario: 'trace' });
  const latency = Date.now() - startTime;

  traceQueryLatency.add(latency);

  if (response.status !== 200 && response.status !== 404) {
    if (response.status === 504) {
      timeoutCount.add(1);
    }
  }

  sleep(randomChoice([0.5, 1, 2]));
}

/**
 * Mixed Workload Scenario
 * Realistic mix of operations
 */
export function mixedWorkloadScenario() {
  const operation = randomChoice([
    'write', 'write', 'write',  // 30% writes
    'read', 'read',              // 20% reads
    'list', 'list',              // 20% list
    'trace',                     // 10% trace
    'browse', 'browse',          // 20% browse
  ]);

  switch (operation) {
    case 'write':
      heavyWriteScenario();
      break;

    case 'read':
      heavyReadScenario();
      break;

    case 'list':
      const workflow = randomChoice(WORKFLOWS);
      const startTime = Date.now();
      listExecutions(workflow, 0, 20, { scenario: 'mixed' });
      listQueryLatency.add(Date.now() - startTime);
      sleep(0.3);
      break;

    case 'trace':
      traceStressScenario();
      break;

    case 'browse':
      listWorkflows(0, 20, { scenario: 'mixed' });
      sleep(0.5);
      break;
  }
}

/**
 * Setup
 */
export function setup() {
  console.log(`====================================`);
  console.log(`DATABASE CONTENTION TEST`);
  console.log(`====================================`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`====================================`);

  // Pre-populate some executions for reads
  console.log('Pre-populating execution data...');
  for (let i = 0; i < 50; i++) {
    const workflow = randomChoice(WORKFLOWS);
    const input = generateWorkflowInput('simple');
    const response = executeWorkflow(workflow, input, { scenario: 'setup' });

    if (response.status === 200) {
      try {
        const body = JSON.parse(response.body);
        if (body.executionId) {
          executionIdPool.push(body.executionId);
        }
      } catch (e) {
        // Ignore
      }
    }
  }

  console.log(`Pre-populated ${executionIdPool.length} executions`);

  return {
    startTime: new Date().toISOString(),
    initialPoolSize: executionIdPool.length,
  };
}

/**
 * Teardown
 */
export function teardown(data) {
  console.log(`====================================`);
  console.log(`DB CONTENTION TEST COMPLETED`);
  console.log(`====================================`);
  console.log(`Started: ${data.startTime}`);
  console.log(`Initial pool: ${data.initialPoolSize}`);
  console.log(`Final pool: ${executionIdPool.length}`);
  console.log(`====================================`);
}
