import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const workflowSuccessRate = new Rate('workflow_success_rate');
const workflowDuration = new Trend('workflow_duration_ms');
const taskCount = new Counter('total_tasks_executed');
const parallelExecutions = new Counter('parallel_executions');
const forkPatternExecutions = new Counter('fork_pattern_executions');

// Configuration
const GATEWAY_URL = __ENV.GATEWAY_URL || 'http://localhost:5001';

// Test scenarios - mix of workflows
// Note: Using only workflows with valid test data
const workflows = [
    {
        name: 'parallel-data-fetch',
        weight: 60,  // 60% of traffic - tests pure parallelism
        input: { productId: 'prod-1' },
        expectedTasks: 4
    },
    {
        name: 'order-lookup',
        weight: 40,  // 40% of traffic - tests fork pattern
        input: { orderId: 'ord-101' },
        expectedTasks: 3
    }
];

// Soak test configuration
// Default: 10 req/s for 5 minutes (short test)
// For real soak: k6 run --duration 1h soak-test.js
export const options = {
    scenarios: {
        soak: {
            executor: 'constant-arrival-rate',
            rate: parseInt(__ENV.RATE) || 10,  // requests per second
            timeUnit: '1s',
            duration: __ENV.DURATION || '5m',  // default 5 min, use --duration for longer
            preAllocatedVUs: 20,
            maxVUs: 50,
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<2000'],      // 95% of requests under 2s
        http_req_failed: ['rate<0.05'],          // Less than 5% failure rate
        workflow_success_rate: ['rate>0.90'],    // 90%+ workflow success
        workflow_duration_ms: ['p(95)<3000'],    // 95% of workflows under 3s
    },
};

// Select a workflow based on weighted distribution
function selectWorkflow() {
    const rand = Math.random() * 100;
    let cumulative = 0;

    for (const workflow of workflows) {
        cumulative += workflow.weight;
        if (rand <= cumulative) {
            return workflow;
        }
    }
    return workflows[0]; // fallback
}

export default function() {
    const workflow = selectWorkflow();
    const url = `${GATEWAY_URL}/api/v1/workflows/${workflow.name}/execute`;

    const payload = JSON.stringify({ input: workflow.input });
    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
        timeout: '30s',
    };

    const startTime = Date.now();
    const response = http.post(url, payload, params);
    const duration = Date.now() - startTime;

    // Record metrics
    workflowDuration.add(duration);

    // Parse response
    let success = false;
    let taskDetails = [];

    try {
        const body = JSON.parse(response.body);
        success = body.success === true;
        taskDetails = body.taskDetails || [];

        // Count tasks executed
        taskCount.add(taskDetails.length);

        // Track execution patterns
        if (workflow.name === 'parallel-data-fetch') {
            parallelExecutions.add(1);
        } else if (workflow.name === 'order-lookup') {
            forkPatternExecutions.add(1);
        }

        // Validate response
        check(response, {
            'status is 200': (r) => r.status === 200,
            'workflow succeeded': () => success,
            'expected task count': () => taskDetails.length === workflow.expectedTasks,
            'has execution time': () => body.executionTimeMs !== undefined,
            'has orchestration cost': () => body.orchestrationCost !== undefined,
        });

    } catch (e) {
        // JSON parse error
        check(response, {
            'valid JSON response': () => false,
        });
    }

    workflowSuccessRate.add(success);

    // Small random sleep to add realistic variation
    sleep(Math.random() * 0.5);
}

// Setup function - verify services are running
export function setup() {
    console.log(`Starting soak test against ${GATEWAY_URL}`);
    console.log(`Rate: ${__ENV.RATE || 10} req/s`);
    console.log(`Duration: ${__ENV.DURATION || '5m'}`);

    // Health check
    const healthCheck = http.get(`${GATEWAY_URL}/api/v1/workflows`);
    if (healthCheck.status !== 200) {
        throw new Error(`WorkflowGateway not available at ${GATEWAY_URL}`);
    }

    console.log('WorkflowGateway is healthy. Starting soak test...');

    return { startTime: new Date().toISOString() };
}

// Teardown function - summary report
export function teardown(data) {
    console.log('\n========================================');
    console.log('         SOAK TEST COMPLETE');
    console.log('========================================');
    console.log(`Started: ${data.startTime}`);
    console.log(`Ended: ${new Date().toISOString()}`);
    console.log('========================================\n');
}

// Handle summary output
export function handleSummary(data) {
    const summary = {
        timestamp: new Date().toISOString(),
        duration: data.state.testRunDurationMs,
        metrics: {
            requests: {
                total: data.metrics.http_reqs?.values?.count || 0,
                rate: data.metrics.http_reqs?.values?.rate || 0,
            },
            latency: {
                avg: data.metrics.http_req_duration?.values?.avg || 0,
                p95: data.metrics.http_req_duration?.values['p(95)'] || 0,
                p99: data.metrics.http_req_duration?.values['p(99)'] || 0,
            },
            workflow: {
                successRate: data.metrics.workflow_success_rate?.values?.rate || 0,
                avgDurationMs: data.metrics.workflow_duration_ms?.values?.avg || 0,
                p95DurationMs: data.metrics.workflow_duration_ms?.values['p(95)'] || 0,
            },
            tasks: {
                total: data.metrics.total_tasks_executed?.values?.count || 0,
            },
            patterns: {
                parallelExecutions: data.metrics.parallel_executions?.values?.count || 0,
                forkPatternExecutions: data.metrics.fork_pattern_executions?.values?.count || 0,
            },
        },
        thresholds: data.thresholds || {},
    };

    return {
        'stdout': textSummary(data, { indent: ' ', enableColors: true }),
        'tests/load/results/soak-summary.json': JSON.stringify(summary, null, 2),
    };
}

// Text summary helper
function textSummary(data, opts) {
    const lines = [];
    lines.push('\n========== SOAK TEST RESULTS ==========\n');

    const metrics = data.metrics;

    lines.push(`Total Requests: ${metrics.http_reqs?.values?.count || 0}`);
    lines.push(`Request Rate: ${(metrics.http_reqs?.values?.rate || 0).toFixed(2)}/s`);
    lines.push(`Failed Requests: ${(metrics.http_req_failed?.values?.rate * 100 || 0).toFixed(2)}%`);
    lines.push('');
    lines.push(`Latency (avg): ${(metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms`);
    lines.push(`Latency (p95): ${(metrics.http_req_duration?.values['p(95)'] || 0).toFixed(2)}ms`);
    lines.push(`Latency (p99): ${(metrics.http_req_duration?.values['p(99)'] || 0).toFixed(2)}ms`);
    lines.push('');
    lines.push(`Workflow Success Rate: ${((metrics.workflow_success_rate?.values?.rate || 0) * 100).toFixed(2)}%`);
    lines.push(`Workflow Duration (avg): ${(metrics.workflow_duration_ms?.values?.avg || 0).toFixed(2)}ms`);
    lines.push(`Total Tasks Executed: ${metrics.total_tasks_executed?.values?.count || 0}`);
    lines.push('');
    lines.push('========================================\n');

    // Check thresholds
    const thresholdsPassed = Object.values(data.thresholds || {}).every(t => t.ok);
    if (thresholdsPassed) {
        lines.push('✓ All thresholds PASSED\n');
    } else {
        lines.push('✗ Some thresholds FAILED\n');
        for (const [name, result] of Object.entries(data.thresholds || {})) {
            if (!result.ok) {
                lines.push(`  - ${name}: FAILED`);
            }
        }
    }

    return lines.join('\n');
}
