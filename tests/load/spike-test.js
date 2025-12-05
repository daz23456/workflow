import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom metrics
const workflowSuccessRate = new Rate('workflow_success_rate');
const workflowDuration = new Trend('workflow_duration_ms');
const spikeRecoveryTime = new Trend('spike_recovery_time_ms');

// Configuration
const GATEWAY_URL = __ENV.GATEWAY_URL || 'http://localhost:5001';

// Test workflows (using known working workflows)
const workflows = [
    {
        name: 'parallel-data-fetch',
        weight: 60,
        input: { productId: 'prod-1' },
        expectedTasks: 4
    },
    {
        name: 'order-lookup',
        weight: 40,
        input: { orderId: 'ord-101' },
        expectedTasks: 3
    }
];

// Spike test configuration
// Tests system's ability to handle sudden traffic bursts
const SPIKE_MULTIPLIER = parseInt(__ENV.SPIKE_MULTIPLIER) || 10;
const BASELINE_RATE = parseInt(__ENV.BASELINE_RATE) || 5;
const SPIKE_RATE = BASELINE_RATE * SPIKE_MULTIPLIER;

export const options = {
    scenarios: {
        spike: {
            executor: 'ramping-arrival-rate',
            startRate: BASELINE_RATE,
            timeUnit: '1s',
            preAllocatedVUs: 50,
            maxVUs: 200,
            stages: [
                // Baseline: establish normal operation
                { duration: '30s', target: BASELINE_RATE },
                // SPIKE: sudden traffic burst
                { duration: '10s', target: SPIKE_RATE },
                // Recovery: back to baseline
                { duration: '1m', target: BASELINE_RATE },
                // Cool down
                { duration: '20s', target: 0 },
            ],
        },
    },
    thresholds: {
        http_req_duration: ['p(95)<3000'],       // 95% under 3s (more lenient during spike)
        http_req_failed: ['rate<0.10'],           // Less than 10% failure (some failures OK during spike)
        workflow_success_rate: ['rate>0.85'],     // 85%+ success (lower threshold for spike)
        workflow_duration_ms: ['p(95)<5000'],     // 95% under 5s during spike
    },
};

// Track spike phase
let currentPhase = 'baseline';
let spikeStartTime = 0;
let recoveryStartTime = 0;

function selectWorkflow() {
    const rand = Math.random() * 100;
    let cumulative = 0;
    for (const workflow of workflows) {
        cumulative += workflow.weight;
        if (rand <= cumulative) {
            return workflow;
        }
    }
    return workflows[0];
}

export default function() {
    const workflow = selectWorkflow();
    const url = `${GATEWAY_URL}/api/v1/workflows/${workflow.name}/execute`;

    const payload = JSON.stringify({ input: workflow.input });
    const params = {
        headers: {
            'Content-Type': 'application/json',
        },
        timeout: '60s',  // Longer timeout for spike scenarios
    };

    const startTime = Date.now();
    const response = http.post(url, payload, params);
    const duration = Date.now() - startTime;

    workflowDuration.add(duration);

    let success = false;
    try {
        const body = JSON.parse(response.body);
        success = body.success === true;

        check(response, {
            'status is 200': (r) => r.status === 200,
            'workflow succeeded': () => success,
            'response time under 5s': () => duration < 5000,
        });
    } catch (e) {
        check(response, {
            'valid JSON response': () => false,
        });
    }

    workflowSuccessRate.add(success);

    // Very short sleep during spike to maximize load
    sleep(Math.random() * 0.2);
}

export function setup() {
    console.log(`\n========================================`);
    console.log(`         SPIKE TEST CONFIGURATION`);
    console.log(`========================================`);
    console.log(`Gateway: ${GATEWAY_URL}`);
    console.log(`Baseline Rate: ${BASELINE_RATE} req/s`);
    console.log(`Spike Rate: ${SPIKE_RATE} req/s (${SPIKE_MULTIPLIER}x)`);
    console.log(`========================================\n`);

    // Health check
    const healthCheck = http.get(`${GATEWAY_URL}/api/v1/workflows`);
    if (healthCheck.status !== 200) {
        throw new Error(`WorkflowGateway not available at ${GATEWAY_URL}`);
    }

    console.log('WorkflowGateway is healthy. Starting spike test...\n');
    console.log('Phase timeline:');
    console.log('  0:00-0:30  - Baseline (establish normal)');
    console.log('  0:30-0:40  - SPIKE! (sudden burst)');
    console.log('  0:40-1:40  - Recovery (back to baseline)');
    console.log('  1:40-2:00  - Cool down\n');

    return { startTime: new Date().toISOString() };
}

export function teardown(data) {
    console.log('\n========================================');
    console.log('         SPIKE TEST COMPLETE');
    console.log('========================================');
    console.log(`Started: ${data.startTime}`);
    console.log(`Ended: ${new Date().toISOString()}`);
    console.log('========================================\n');
}

export function handleSummary(data) {
    const summary = {
        timestamp: new Date().toISOString(),
        testType: 'spike',
        configuration: {
            baselineRate: BASELINE_RATE,
            spikeRate: SPIKE_RATE,
            spikeMultiplier: SPIKE_MULTIPLIER,
        },
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
                max: data.metrics.http_req_duration?.values?.max || 0,
            },
            workflow: {
                successRate: data.metrics.workflow_success_rate?.values?.rate || 0,
                avgDurationMs: data.metrics.workflow_duration_ms?.values?.avg || 0,
                p95DurationMs: data.metrics.workflow_duration_ms?.values['p(95)'] || 0,
                maxDurationMs: data.metrics.workflow_duration_ms?.values?.max || 0,
            },
            failures: {
                rate: data.metrics.http_req_failed?.values?.rate || 0,
                count: Math.round((data.metrics.http_req_failed?.values?.rate || 0) * (data.metrics.http_reqs?.values?.count || 0)),
            },
        },
        thresholds: data.thresholds || {},
    };

    return {
        'stdout': textSummary(data),
        'tests/load/results/spike-summary.json': JSON.stringify(summary, null, 2),
    };
}

function textSummary(data) {
    const metrics = data.metrics;
    const lines = [];

    lines.push('\n========== SPIKE TEST RESULTS ==========\n');
    lines.push(`Configuration: ${BASELINE_RATE} req/s → ${SPIKE_RATE} req/s (${SPIKE_MULTIPLIER}x spike)\n`);

    lines.push(`Total Requests: ${metrics.http_reqs?.values?.count || 0}`);
    lines.push(`Peak Request Rate: ${(metrics.http_reqs?.values?.rate || 0).toFixed(2)}/s`);
    lines.push(`Failed Requests: ${((metrics.http_req_failed?.values?.rate || 0) * 100).toFixed(2)}%`);
    lines.push('');
    lines.push(`Latency (avg): ${(metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms`);
    lines.push(`Latency (p95): ${(metrics.http_req_duration?.values['p(95)'] || 0).toFixed(2)}ms`);
    lines.push(`Latency (max): ${(metrics.http_req_duration?.values?.max || 0).toFixed(2)}ms`);
    lines.push('');
    lines.push(`Workflow Success Rate: ${((metrics.workflow_success_rate?.values?.rate || 0) * 100).toFixed(2)}%`);
    lines.push(`Workflow Duration (avg): ${(metrics.workflow_duration_ms?.values?.avg || 0).toFixed(2)}ms`);
    lines.push(`Workflow Duration (max): ${(metrics.workflow_duration_ms?.values?.max || 0).toFixed(2)}ms`);
    lines.push('');
    lines.push('========================================\n');

    // Threshold results
    const thresholdsPassed = Object.values(data.thresholds || {}).every(t => t.ok);
    if (thresholdsPassed) {
        lines.push('✓ All thresholds PASSED - System handled spike gracefully!\n');
    } else {
        lines.push('✗ Some thresholds FAILED\n');
        for (const [name, result] of Object.entries(data.thresholds || {})) {
            if (!result.ok) {
                lines.push(`  - ${name}: FAILED`);
            }
        }
        lines.push('');
    }

    return lines.join('\n');
}
