using FluentAssertions;
using TestApiServer.Services;

namespace TestApiServer.Tests.Services;

/// <summary>
/// Tests for RetryCounterService - manages retry counters for fail-once, fail-n-times patterns
/// </summary>
public class RetryCounterServiceTests
{
    [Fact]
    public void IncrementAndGet_NewKey_ReturnsOne()
    {
        var service = new RetryCounterService();

        var count = service.IncrementAndGet("test-key");

        count.Should().Be(1);
    }

    [Fact]
    public void IncrementAndGet_ExistingKey_IncrementsCount()
    {
        var service = new RetryCounterService();
        service.IncrementAndGet("test-key");

        var count = service.IncrementAndGet("test-key");

        count.Should().Be(2);
    }

    [Fact]
    public void IncrementAndGet_MultipleKeys_TrackedSeparately()
    {
        var service = new RetryCounterService();

        service.IncrementAndGet("key1");
        service.IncrementAndGet("key1");
        service.IncrementAndGet("key2");

        service.GetCount("key1").Should().Be(2);
        service.GetCount("key2").Should().Be(1);
    }

    [Fact]
    public void GetCount_NonExistentKey_ReturnsZero()
    {
        var service = new RetryCounterService();

        var count = service.GetCount("non-existent");

        count.Should().Be(0);
    }

    [Fact]
    public void Reset_ExistingKey_ResetsToZero()
    {
        var service = new RetryCounterService();
        service.IncrementAndGet("test-key");
        service.IncrementAndGet("test-key");

        service.Reset("test-key");

        service.GetCount("test-key").Should().Be(0);
    }

    [Fact]
    public void Reset_NonExistentKey_DoesNotThrow()
    {
        var service = new RetryCounterService();

        var act = () => service.Reset("non-existent");

        act.Should().NotThrow();
    }

    [Fact]
    public void ResetAll_ClearsAllCounters()
    {
        var service = new RetryCounterService();
        service.IncrementAndGet("key1");
        service.IncrementAndGet("key2");
        service.IncrementAndGet("key3");

        service.ResetAll();

        service.GetCount("key1").Should().Be(0);
        service.GetCount("key2").Should().Be(0);
        service.GetCount("key3").Should().Be(0);
    }

    [Fact]
    public void GetAllCounters_ReturnsAllCounters()
    {
        var service = new RetryCounterService();
        service.IncrementAndGet("key1");
        service.IncrementAndGet("key1");
        service.IncrementAndGet("key2");

        var counters = service.GetAllCounters();

        counters.Should().ContainKey("key1").WhoseValue.Should().Be(2);
        counters.Should().ContainKey("key2").WhoseValue.Should().Be(1);
    }

    [Fact]
    public void GetAllCounters_EmptyService_ReturnsEmptyDictionary()
    {
        var service = new RetryCounterService();

        var counters = service.GetAllCounters();

        counters.Should().BeEmpty();
    }

    [Fact]
    public async Task IncrementAndGet_ConcurrentAccess_IsThreadSafe()
    {
        var service = new RetryCounterService();
        var tasks = new List<Task>();

        // 100 concurrent increments on the same key
        for (int i = 0; i < 100; i++)
        {
            tasks.Add(Task.Run(() => service.IncrementAndGet("concurrent-key")));
        }

        await Task.WhenAll(tasks);

        service.GetCount("concurrent-key").Should().Be(100);
    }
}
