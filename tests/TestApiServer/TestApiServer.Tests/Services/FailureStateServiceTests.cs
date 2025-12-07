using FluentAssertions;
using TestApiServer.Services;

namespace TestApiServer.Tests.Services;

/// <summary>
/// Tests for FailureStateService - manages failure modes per endpoint
/// </summary>
public class FailureStateServiceTests
{
    [Fact]
    public void GetFailureMode_DefaultMode_ReturnsNone()
    {
        var service = new FailureStateService();

        var mode = service.GetFailureMode("any-endpoint");

        mode.Should().Be(FailureMode.None);
    }

    [Fact]
    public void SetFailureMode_StoresMode()
    {
        var service = new FailureStateService();

        service.SetFailureMode("endpoint1", FailureMode.AlwaysFail);

        service.GetFailureMode("endpoint1").Should().Be(FailureMode.AlwaysFail);
    }

    [Fact]
    public void SetFailureMode_MultipleEndpoints_TrackedSeparately()
    {
        var service = new FailureStateService();

        service.SetFailureMode("endpoint1", FailureMode.AlwaysFail);
        service.SetFailureMode("endpoint2", FailureMode.FailOnce);
        service.SetFailureMode("endpoint3", FailureMode.Intermittent);

        service.GetFailureMode("endpoint1").Should().Be(FailureMode.AlwaysFail);
        service.GetFailureMode("endpoint2").Should().Be(FailureMode.FailOnce);
        service.GetFailureMode("endpoint3").Should().Be(FailureMode.Intermittent);
    }

    [Fact]
    public void SetFailureMode_OverwritesExistingMode()
    {
        var service = new FailureStateService();
        service.SetFailureMode("endpoint1", FailureMode.AlwaysFail);

        service.SetFailureMode("endpoint1", FailureMode.FailOnce);

        service.GetFailureMode("endpoint1").Should().Be(FailureMode.FailOnce);
    }

    [Fact]
    public void Reset_ClearsAllModes()
    {
        var service = new FailureStateService();
        service.SetFailureMode("endpoint1", FailureMode.AlwaysFail);
        service.SetFailureMode("endpoint2", FailureMode.FailOnce);

        service.Reset();

        service.GetFailureMode("endpoint1").Should().Be(FailureMode.None);
        service.GetFailureMode("endpoint2").Should().Be(FailureMode.None);
    }

    [Fact]
    public void Reset_EmptyService_DoesNotThrow()
    {
        var service = new FailureStateService();

        var act = () => service.Reset();

        act.Should().NotThrow();
    }

    [Theory]
    [InlineData(FailureMode.None)]
    [InlineData(FailureMode.AlwaysFail)]
    [InlineData(FailureMode.FailOnce)]
    [InlineData(FailureMode.FailNTimes)]
    [InlineData(FailureMode.Intermittent)]
    [InlineData(FailureMode.CircuitBreaker)]
    public void SetFailureMode_AllModes_Stored(FailureMode mode)
    {
        var service = new FailureStateService();

        service.SetFailureMode("test-endpoint", mode);

        service.GetFailureMode("test-endpoint").Should().Be(mode);
    }

    [Fact]
    public void GetAllModes_ReturnsAllConfiguredModes()
    {
        var service = new FailureStateService();
        service.SetFailureMode("endpoint1", FailureMode.AlwaysFail);
        service.SetFailureMode("endpoint2", FailureMode.FailOnce);

        var modes = service.GetAllModes();

        modes.Should().HaveCount(2);
        modes["endpoint1"].Should().Be(FailureMode.AlwaysFail);
        modes["endpoint2"].Should().Be(FailureMode.FailOnce);
    }

    [Fact]
    public void GetAllModes_EmptyService_ReturnsEmptyDictionary()
    {
        var service = new FailureStateService();

        var modes = service.GetAllModes();

        modes.Should().BeEmpty();
    }

    [Fact]
    public async Task SetFailureMode_ConcurrentAccess_IsThreadSafe()
    {
        var service = new FailureStateService();
        var tasks = new List<Task>();

        // 100 concurrent writes to different endpoints
        for (int i = 0; i < 100; i++)
        {
            var endpoint = $"endpoint-{i}";
            var mode = (FailureMode)(i % 6); // Cycle through modes
            tasks.Add(Task.Run(() => service.SetFailureMode(endpoint, mode)));
        }

        await Task.WhenAll(tasks);

        // All should be set
        for (int i = 0; i < 100; i++)
        {
            var mode = service.GetFailureMode($"endpoint-{i}");
            mode.Should().Be((FailureMode)(i % 6));
        }
    }
}
