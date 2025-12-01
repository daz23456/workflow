# Workflow Orchestration Engine - Load Testing Suite

## Overview

Production chaos simulation using k6 to stress test the workflow orchestration engine under realistic multi-tenant, multi-activity scenarios.

## Installation

```bash
# macOS
brew install k6

# or download from https://k6.io/docs/get-started/installation/
```

## Test Scenarios

### 1. Production Chaos Simulation (`scenarios/production-chaos.js`)
Simulates a typical production day with:
- **Platform Users**: Browsing workflows, viewing execution history
- **Developers**: Investigating issues, viewing traces, debugging
- **CI/CD Pipelines**: Executing workflows programmatically
- **DevOps**: Uploading new CRDs, updating existing workflows
- **Real-time Monitoring**: WebSocket connections for live updates

### 2. Workflow Execution Stress (`scenarios/execution-stress.js`)
- 1000 unique workflows
- Up to 10,000 concurrent executions
- Varying workflow complexity (1-50 tasks)
- Parallel vs sequential task patterns

### 3. Database Contention (`scenarios/db-contention.js`)
- Heavy write load (execution records)
- Heavy read load (history queries)
- Mixed read/write patterns
- Connection pool exhaustion testing

### 4. Graph Evaluation Performance (`scenarios/graph-evaluation.js`)
- Complex DAG structures (100+ tasks)
- Deep dependency chains
- Wide parallel execution patterns
- Cycle detection under load

### 5. API Endpoint Saturation (`scenarios/api-saturation.js`)
- All endpoints hit simultaneously
- Rate limiting verification
- Error response consistency

## Running Tests

```bash
# Quick smoke test (1 minute)
k6 run scenarios/smoke-test.js

# Production chaos (10 minutes)
k6 run scenarios/production-chaos.js

# Full stress test (30 minutes)
k6 run --duration 30m scenarios/execution-stress.js

# With Grafana dashboard output
k6 run --out influxdb=http://localhost:8086/k6 scenarios/production-chaos.js
```

## Metrics to Watch

### Latency Thresholds
| Endpoint | p50 | p95 | p99 |
|----------|-----|-----|-----|
| Execute workflow | <100ms | <500ms | <1s |
| List workflows | <50ms | <200ms | <500ms |
| Get execution | <30ms | <100ms | <200ms |
| Get trace | <50ms | <200ms | <500ms |

### Throughput Targets
- Workflow executions: 1000 req/s sustained
- API queries: 5000 req/s sustained
- WebSocket connections: 10,000 concurrent

### Error Budget
- Error rate: <0.1% under normal load
- Error rate: <1% under peak load
- Zero data corruption under any load

## Architecture Bottlenecks to Identify

1. **PostgreSQL**
   - Connection pool exhaustion
   - Write contention on execution_records
   - Index performance on queries
   - WAL write throughput

2. **Graph Evaluation**
   - CPU saturation during DAG building
   - Memory allocation for large graphs
   - Regex parsing in template resolution

3. **HTTP Client Pool**
   - Outbound connection limits
   - DNS resolution caching
   - Keep-alive efficiency

4. **Kubernetes Operator**
   - CRD watch event processing
   - Reconciliation queue depth
   - Resource version conflicts

5. **WebSocket Hub**
   - Connection scaling
   - Message broadcasting overhead
   - Memory per connection
