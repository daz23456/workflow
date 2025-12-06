# Rust Rewrite Analysis

**Date**: December 2025
**Current Stack**: .NET 8, ASP.NET Core, KubeOps 8.x
**Proposed**: Rust rewrite of workflow orchestration engine

---

## Performance Improvements (Realistic)

| Area | Current (.NET 8) | Rust Potential | Actual Gain |
|------|------------------|----------------|-------------|
| **Cold start** | ~50-100ms | ~5-10ms | **10x** |
| **Memory footprint** | ~100-200MB | ~10-30MB | **5-10x** |
| **HTTP orchestration** | Network-bound | Network-bound | **~0%** |
| **JSON parsing** | System.Text.Json is fast | serde is ~2x faster | **Marginal** |
| **Template resolution** | Microseconds | Nanoseconds | **Irrelevant** |
| **Kubernetes operator** | kube-rs is solid | kube-rs is solid | **Parity** |

---

## The Hard Truth

**The bottleneck is network I/O, not CPU/memory.**

This is a workflow orchestrator that:
- Makes HTTP calls to external services (10-500ms each)
- Waits for database queries
- Marshals JSON between services

The orchestration overhead is already **<5%** of total execution time. Rust would make that 5% faster, but 5% of 5% = **0.25% total improvement**.

---

## Where Rust Would Actually Help

1. **Serverless/Edge deployment** - 10x faster cold starts matter
2. **Memory-constrained pods** - 5-10x reduction helps pod density
3. **Extreme scale** - 100K+ concurrent workflows where GC pauses matter
4. **Predictable latency** - No GC = no tail latency spikes

---

## ROI Analysis

| Factor | Estimate |
|--------|----------|
| **Rewrite effort** | 6-12 months (1 experienced Rust dev) |
| **Lines of code** | ~15K .NET → ~12K Rust |
| **Test rewrite** | ~1700 tests to port |
| **Learning curve** | Rust async + lifetimes = steep |
| **Hiring pool** | 10x smaller than .NET |
| **Ecosystem maturity** | kube-rs good, but .NET K8s tooling is richer |

---

## Recommendation

**Don't rewrite.** Here's why:

1. **.NET 8 is already fast** - Native AOT gives Rust-like cold starts if needed
2. **Workload is I/O-bound** - Rust won't help where we're actually slow
3. **Opportunity cost** - 6-12 months of features vs. marginal perf gains
4. **Test coverage investment** - 90%+ coverage is hard-won; don't discard it

---

## Better ROI Alternatives

| Investment | Effort | Impact |
|------------|--------|--------|
| **Connection pooling tuning** | 1 day | 10-20% latency reduction |
| **Response caching** | 1 week | 50%+ for repeated calls |
| **Native AOT compilation** | 2 days | 10x cold start improvement |
| **Parallel task improvements** | 1 week | Already implemented |
| **gRPC for internal calls** | 2 weeks | 30-50% latency reduction |

---

## When to Reconsider Rust

Revisit this decision if:

- Building a new, separate high-frequency component (rate limiter, router)
- Need <10MB memory footprint for edge deployment
- Latency SLAs under 1ms for orchestration overhead
- Team acquires Rust expertise
- Deploying to serverless/WASM environments

---

## Conclusion

The .NET solution is well-architected with strong test coverage (90%+), comprehensive mutation testing, and production-grade observability. The ROI on a Rust rewrite would be **negative** unless specific deployment constraints emerge that .NET cannot meet.

**Focus investment on**:
- Feature development (Stages 19-30 in roadmap)
- Infrastructure optimizations (caching, connection pooling)
- Native AOT for cold-start-sensitive deployments
