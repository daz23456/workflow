/**
 * Workflow Execution Stress Test
 *
 * Purpose: Find the breaking point of the system
 *
 * Test levels:
 * - Baseline: 100 req/s sustained
 * - Load: 500 req/s sustained
 * - Stress: 1000 req/s sustained
 * - Spike: 5000 req/s burst
 * - Soak: 500 req/s for 30 minutes
 * - Breakpoint: Ramp until failure
 */

import { sleep, group } from 'k6';
import { Trend, Counter, Rate, Gauge } from 'k6/metrics';
import {
  BASE_URL,
  executeWorkflow,
  generateWorkflowInput,
  healthCheck,
  randomChoice,
} from '../lib/helpers.js';

// Custom metrics for stress analysis
const executionLatency = new Trend('execution_latency_ms');
const graphBuildLatency = new Trend('graph_build_latency_us');
const orchestrationCost = new Trend('orchestration_cost_percent');
const dbWriteLatency = new Trend('db_write_latency_ms');
const successRate = new Rate('success_rate');
const timeoutRate = new Rate('timeout_rate');
const errorsByType = {
  timeout: new Counter('errors_timeout'),
  server_error: new Counter('errors_5xx'),
  client_error: new Counter('errors_4xx'),
  network: new Counter('errors_network'),
  unknown: new Counter('errors_unknown'),
};
const concurrentExecutions = new Gauge('concurrent_executions');

// Generate 1000 unique workflow names for diversity testing
const WORKFLOW_POOL = Array.from({ length: 1000 }, (_, i) => `stress-workflow-${i.toString().padStart(4, '0')}`);

// Existing known workflows (configure for your environment)
// These should be workflows with no required input or simple input
const REAL_WORKFLOWS = [
  'space-info',
  'bigtest',
  'bigtest-2',
  'bigtest-3',
];

// Choose test mode from environment
const TEST_MODE = __ENV.TEST_MODE || 'stress';

export const options = {
  scenarios: getScenarioConfig(TEST_MODE),

  thresholds: {
    // Latency thresholds
    http_req_duration: ['p(50)<500', 'p(95)<2000', 'p(99)<5000'],
    execution_latency_ms: ['p(50)<1000', 'p(95)<3000', 'p(99)<5000'],
    graph_build_latency_us: ['p(95)<5000', 'p(99)<10000'], // 5ms p95, 10ms p99

    // Success rate thresholds
    success_rate: ['rate>0.95'],  // At least 95% success
    timeout_rate: ['rate<0.05'],  // Less than 5% timeouts

    // Error thresholds
    http_req_failed: ['rate<0.05'],
  },
};

function getScenarioConfig(mode) {
  const configs = {
    // Quick smoke test
    smoke: {
      smoke_test: {
        executor: 'constant-arrival-rate',
        rate: 10,
        timeUnit: '1s',
        duration: '1m',
        preAllocatedVUs: 20,
        maxVUs: 50,
        exec: 'stressExecution',
      },
    },

    // Baseline load test
    baseline: {
      baseline_load: {
        executor: 'constant-arrival-rate',
        rate: 100,
        timeUnit: '1s',
        duration: '5m',
        preAllocatedVUs: 150,
        maxVUs: 300,
        exec: 'stressExecution',
      },
    },

    // Standard load test
    load: {
      load_test: {
        executor: 'ramping-arrival-rate',
        startRate: 50,
        timeUnit: '1s',
        preAllocatedVUs: 200,
        maxVUs: 1000,
        stages: [
          { duration: '2m', target: 100 },
          { duration: '5m', target: 500 },
          { duration: '2m', target: 500 },
          { duration: '1m', target: 100 },
        ],
        exec: 'stressExecution',
      },
    },

    // Stress test - finding limits
    stress: {
      stress_test: {
        executor: 'ramping-arrival-rate',
        startRate: 100,
        timeUnit: '1s',
        preAllocatedVUs: 500,
        maxVUs: 2000,
        stages: [
          { duration: '2m', target: 200 },   // Warm up
          { duration: '3m', target: 500 },   // Load
          { duration: '3m', target: 1000 },  // Stress
          { duration: '2m', target: 500 },   // Recovery
          { duration: '1m', target: 100 },   // Cool down
        ],
        exec: 'stressExecution',
      },
    },

    // Spike test - sudden traffic bursts
    spike: {
      normal_traffic: {
        executor: 'constant-arrival-rate',
        rate: 100,
        timeUnit: '1s',
        duration: '10m',
        preAllocatedVUs: 200,
        maxVUs: 500,
        exec: 'stressExecution',
      },
      spike_traffic: {
        executor: 'ramping-arrival-rate',
        startRate: 100,
        timeUnit: '1s',
        preAllocatedVUs: 1000,
        maxVUs: 5000,
        stages: [
          { duration: '30s', target: 100 },   // Normal
          { duration: '10s', target: 5000 },  // SPIKE!
          { duration: '1m', target: 5000 },   // Sustain spike
          { duration: '10s', target: 100 },   // Drop
          { duration: '2m', target: 100 },    // Recovery observation
        ],
        startTime: '2m',  // Start spike after 2 minutes
        exec: 'stressExecution',
      },
    },

    // Soak test - long duration stability
    soak: {
      soak_test: {
        executor: 'constant-arrival-rate',
        rate: 500,
        timeUnit: '1s',
        duration: '30m',
        preAllocatedVUs: 750,
        maxVUs: 1500,
        exec: 'stressExecution',
      },
    },

    // Breakpoint test - ramp until failure
    breakpoint: {
      breakpoint_test: {
        executor: 'ramping-arrival-rate',
        startRate: 100,
        timeUnit: '1s',
        preAllocatedVUs: 1000,
        maxVUs: 10000,
        stages: [
          { duration: '2m', target: 500 },
          { duration: '2m', target: 1000 },
          { duration: '2m', target: 2000 },
          { duration: '2m', target: 3000 },
          { duration: '2m', target: 5000 },
          { duration: '2m', target: 7500 },
          { duration: '2m', target: 10000 },  // 10k req/s target
        ],
        exec: 'stressExecution',
      },
    },

    // 10000 concurrent - the ultimate test
    ultimate: {
      ultimate_stress: {
        executor: 'ramping-arrival-rate',
        startRate: 1000,
        timeUnit: '1s',
        preAllocatedVUs: 5000,
        maxVUs: 15000,
        stages: [
          { duration: '1m', target: 2000 },
          { duration: '2m', target: 5000 },
          { duration: '3m', target: 10000 },  // 10k concurrent
          { duration: '2m', target: 10000 },  // Sustain
          { duration: '2m', target: 5000 },   // Recover
        ],
        exec: 'stressExecution',
      },
    },
  };

  return configs[mode] || configs.stress;
}

/**
 * Main stress execution function
 */
export function stressExecution() {
  concurrentExecutions.add(1);

  try {
    // Use real workflows only for local testing (synthetic ones don't exist)
    const workflow = randomChoice(REAL_WORKFLOWS);

    // For local testing, use empty input (workflows like space-info don't need input)
    // For production testing with workflows that need input, use generateWorkflowInput()
    const input = {};

    // Add stress test identifier (optional - won't affect validation)
    input._stressTest = {
      timestamp: Date.now(),
      vuId: __VU,
      iteration: __ITER,
    };

    const startTime = Date.now();
    const response = executeWorkflow(workflow, input, {
      scenario: 'stress',
    });
    const endTime = Date.now();

    // Record latency
    executionLatency.add(endTime - startTime);

    // Analyze response
    if (response.status === 200) {
      successRate.add(1);
      timeoutRate.add(0);

      try {
        const body = JSON.parse(response.body);

        // Track orchestration metrics
        if (body.graphBuildDurationMicros) {
          graphBuildLatency.add(body.graphBuildDurationMicros);
        }

        if (body.orchestrationCost) {
          orchestrationCost.add(body.orchestrationCost.orchestrationCostPercentage);
        }

        // Estimate DB write latency from teardown
        if (body.orchestrationCost?.teardownDurationMicros) {
          dbWriteLatency.add(body.orchestrationCost.teardownDurationMicros / 1000);
        }
      } catch (e) {
        // JSON parse error but request succeeded
      }
    } else {
      successRate.add(0);

      // Categorize error
      if (response.status === 0) {
        errorsByType.network.add(1);
        timeoutRate.add(1);
      } else if (response.status === 408 || response.status === 504) {
        errorsByType.timeout.add(1);
        timeoutRate.add(1);
      } else if (response.status >= 500) {
        errorsByType.server_error.add(1);
        timeoutRate.add(0);
      } else if (response.status >= 400) {
        errorsByType.client_error.add(1);
        timeoutRate.add(0);
      } else {
        errorsByType.unknown.add(1);
        timeoutRate.add(0);
      }
    }
  } finally {
    concurrentExecutions.add(-1);
  }
}

/**
 * Setup
 */
export function setup() {
  console.log(`====================================`);
  console.log(`EXECUTION STRESS TEST`);
  console.log(`====================================`);
  console.log(`Mode: ${TEST_MODE}`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Workflow pool size: ${WORKFLOW_POOL.length}`);
  console.log(`====================================`);

  // Verify target is accessible
  const health = healthCheck();
  if (health.status !== 200) {
    throw new Error(`Target not healthy: ${health.status}`);
  }

  return {
    mode: TEST_MODE,
    startTime: new Date().toISOString(),
  };
}

/**
 * Teardown
 */
export function teardown(data) {
  console.log(`====================================`);
  console.log(`STRESS TEST COMPLETED`);
  console.log(`====================================`);
  console.log(`Mode: ${data.mode}`);
  console.log(`Duration: ${data.startTime} - ${new Date().toISOString()}`);
  console.log(`====================================`);
}

/**
 * Custom summary handler
 */
export function handleSummary(data) {
  const summary = {
    testMode: TEST_MODE,
    timestamp: new Date().toISOString(),
    metrics: {
      requests: {
        total: data.metrics.http_reqs?.values?.count || 0,
        rate: data.metrics.http_reqs?.values?.rate || 0,
        failed: data.metrics.http_req_failed?.values?.rate || 0,
      },
      latency: {
        p50: data.metrics.http_req_duration?.values?.['p(50)'] || 0,
        p95: data.metrics.http_req_duration?.values?.['p(95)'] || 0,
        p99: data.metrics.http_req_duration?.values?.['p(99)'] || 0,
        max: data.metrics.http_req_duration?.values?.max || 0,
      },
      execution: {
        p50: data.metrics.execution_latency_ms?.values?.['p(50)'] || 0,
        p95: data.metrics.execution_latency_ms?.values?.['p(95)'] || 0,
        p99: data.metrics.execution_latency_ms?.values?.['p(99)'] || 0,
      },
      graphBuild: {
        p50_us: data.metrics.graph_build_latency_us?.values?.['p(50)'] || 0,
        p95_us: data.metrics.graph_build_latency_us?.values?.['p(95)'] || 0,
        p99_us: data.metrics.graph_build_latency_us?.values?.['p(99)'] || 0,
      },
      orchestrationOverhead: {
        p50: data.metrics.orchestration_cost_percent?.values?.['p(50)'] || 0,
        p95: data.metrics.orchestration_cost_percent?.values?.['p(95)'] || 0,
        avg: data.metrics.orchestration_cost_percent?.values?.avg || 0,
      },
      successRate: data.metrics.success_rate?.values?.rate || 0,
      timeoutRate: data.metrics.timeout_rate?.values?.rate || 0,
    },
    thresholds: data.thresholds,
  };

  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'results/stress-test-summary.json': JSON.stringify(summary, null, 2),
  };
}

// Import text summary helper (k6 built-in)
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
