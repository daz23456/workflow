# ADR-0003: Load Testing Strategy with k6

## Status

Accepted

## Context

The workflow orchestration engine needs comprehensive load testing to:
1. Establish performance baselines before deployment
2. Identify bottlenecks in PostgreSQL, graph evaluation, and HTTP client pools
3. Validate system behavior under production chaos scenarios
4. Ensure the platform can handle multi-tenant usage patterns

## Decision

We will use **k6** as our load testing framework with a tiered stress testing approach.

### Why k6?

- **Written in Go** - High performance, minimal resource overhead
- **JavaScript scripting** - Familiar syntax, easy to extend
- **Built-in metrics** - Comprehensive latency, throughput, and error tracking
- **Grafana integration** - Real-time dashboards via InfluxDB
- **Scenario-based testing** - Multiple user personas simultaneously
- **CI/CD friendly** - Thresholds for pass/fail gates

### Test Architecture

```
tests/LoadTests/k6/
├── README.md              # Overview and usage
├── run-tests.sh           # Convenient runner script
├── lib/
│   └── helpers.js         # Shared utilities and API wrappers
├── scenarios/
│   ├── smoke-test.js      # Quick endpoint validation
│   ├── execution-stress.js # Workflow execution stress
│   ├── production-chaos.js # Multi-persona simulation
│   └── db-contention.js   # Database bottleneck testing
├── data/                  # Test data files
└── results/               # Output directory
```

## Stress Testing Levels

| Level | Duration | Peak Load | Purpose |
|-------|----------|-----------|---------|
| smoke | 30s | 1 VU | Endpoint validation |
| baseline | 5m | 100 req/s | Performance baseline |
| load | 10m | 500 req/s | Production capacity |
| stress | 11m | 1000 req/s | Find breaking points |
| spike | 10m | 5000 req/s burst | Traffic burst handling |
| chaos | 10m | Mixed | Real production simulation |
| db | 10m | Heavy writes | PostgreSQL contention |
| soak | 30m | 500 req/s | Memory leak detection |
| ultimate | 8m | 10000 req/s | Absolute limits |

## User Personas (Chaos Test)

The production chaos simulation includes:

1. **Platform Users** (100 VUs)
   - Browse workflows, view execution history
   - Random page navigation with think time

2. **Developers** (50 VUs)
   - Heavy trace usage for debugging
   - Execution details deep-dive
   - Version history checks

3. **CI/CD Pipelines** (500 req/s)
   - Automated workflow executions
   - Varied workflow complexity
   - No think time between requests

4. **DevOps** (10 VUs)
   - Dry-run testing
   - Workflow validation
   - New workflow iteration

5. **Batch Jobs** (20 VUs)
   - Complex workflow executions
   - Sequential batch processing

6. **Health Monitors** (10 req/s)
   - Constant health check polling

## Custom Metrics

### Orchestration Metrics
```javascript
const executionDuration = new Trend('workflow_execution_duration');
const graphBuildDuration = new Trend('graph_build_duration');
const orchestrationOverhead = new Trend('orchestration_overhead_percent');
```

### Database Metrics
```javascript
const writeLatency = new Trend('db_write_latency_ms');
const readLatency = new Trend('db_read_latency_ms');
const traceQueryLatency = new Trend('db_trace_query_latency_ms');
```

## Thresholds

### Latency Targets
| Endpoint | p50 | p95 | p99 |
|----------|-----|-----|-----|
| Execute workflow | <100ms | <500ms | <1s |
| List workflows | <50ms | <200ms | <500ms |
| Get execution | <30ms | <100ms | <200ms |
| Get trace | <50ms | <200ms | <500ms |
| Health check | - | - | <100ms |

### Error Budget
- Error rate under normal load: <0.1%
- Error rate under peak load: <1%
- Timeout rate: <5%

### Orchestration Health
- Orchestration overhead: <15% of execution time
- Graph build time: <5ms p95

## Usage

```bash
# Quick smoke test
./run-tests.sh smoke

# Establish baseline
./run-tests.sh baseline

# Full stress test
./run-tests.sh stress --url https://staging.example.com

# With Grafana dashboard
./run-tests.sh chaos --grafana

# Full test suite
./run-tests.sh all
```

## Bottlenecks to Identify

1. **PostgreSQL**
   - Connection pool exhaustion (default: 100 connections)
   - Write contention on execution_records table
   - Index performance on workflow_name, created_at
   - WAL write throughput

2. **Graph Evaluation**
   - CPU saturation during DAG building
   - Memory allocation for large graphs (100+ tasks)
   - Regex parsing in template resolution

3. **HTTP Client Pool**
   - Outbound connection limits
   - DNS resolution caching
   - Keep-alive efficiency

4. **WebSocket Hub** (SignalR)
   - Connection scaling
   - Message broadcasting overhead
   - Memory per connection

## CI/CD Integration

```yaml
# GitLab CI example
load-test:
  stage: performance
  image: grafana/k6
  script:
    - k6 run --env BASE_URL=$STAGING_URL scenarios/smoke-test.js
    - k6 run --env BASE_URL=$STAGING_URL scenarios/execution-stress.js --env TEST_MODE=baseline
  artifacts:
    paths:
      - results/
```

## Grafana Dashboard Setup

1. Start InfluxDB:
```bash
docker run -d -p 8086:8086 influxdb:1.8
```

2. Run tests with Grafana output:
```bash
./run-tests.sh stress --grafana
```

3. Import k6 dashboard in Grafana (ID: 2587)

## Next Steps

1. **Pre-deployment**: Run smoke → baseline → load tests
2. **Staging**: Run full chaos simulation
3. **Production**: Implement continuous smoke testing
4. **Optimization**: Use results to tune connection pools, caching, indexes

## Consequences

### Positive
- Clear performance baselines before deployment
- Early bottleneck identification
- Confidence in production capacity
- Regression detection in CI/CD

### Negative
- Additional test infrastructure (InfluxDB, Grafana for dashboards)
- Test maintenance as API evolves
- Resource requirements for heavy tests

### Neutral
- Learning curve for k6 scripting
- Need for realistic test data

## References

- [k6 Documentation](https://k6.io/docs/)
- [k6 Scenarios](https://k6.io/docs/using-k6/scenarios/)
- [Grafana k6 Dashboard](https://grafana.com/grafana/dashboards/2587)
