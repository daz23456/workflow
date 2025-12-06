using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using WorkflowCore.Models;
using WorkflowCore.Services;
using WorkflowGateway.Models;
using WorkflowGateway.Services;
using Xunit;

namespace WorkflowGateway.Tests.Services;

/// <summary>
/// Tests for ScheduleTriggerService - Stage 20.1: Schedule Triggers
/// </summary>
public class ScheduleTriggerServiceTests
{
    private readonly Mock<IWorkflowDiscoveryService> _discoveryServiceMock;
    private readonly Mock<IWorkflowExecutionService> _executionServiceMock;
    private readonly Mock<ICronParser> _cronParserMock;
    private readonly Mock<ILogger<ScheduleTriggerService>> _loggerMock;
    private readonly IServiceProvider _serviceProvider;

    public ScheduleTriggerServiceTests()
    {
        _discoveryServiceMock = new Mock<IWorkflowDiscoveryService>();
        _executionServiceMock = new Mock<IWorkflowExecutionService>();
        _cronParserMock = new Mock<ICronParser>();
        _loggerMock = new Mock<ILogger<ScheduleTriggerService>>();

        // Setup default behavior
        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(It.IsAny<string>()))
            .ReturnsAsync(new List<WorkflowResource>());

        // Create a service collection for testing
        var services = new ServiceCollection();
        services.AddScoped(_ => _executionServiceMock.Object);
        _serviceProvider = services.BuildServiceProvider();
    }

    #region Constructor Tests

    [Fact]
    public void Constructor_WithNullDiscoveryService_ShouldThrowArgumentNullException()
    {
        // Act
        Action act = () => new ScheduleTriggerService(
            null!,
            _cronParserMock.Object,
            _serviceProvider,
            _loggerMock.Object);

        // Assert
        act.Should().Throw<ArgumentNullException>()
            .WithMessage("*discoveryService*");
    }

    [Fact]
    public void Constructor_WithNullCronParser_ShouldThrowArgumentNullException()
    {
        // Act
        Action act = () => new ScheduleTriggerService(
            _discoveryServiceMock.Object,
            null!,
            _serviceProvider,
            _loggerMock.Object);

        // Assert
        act.Should().Throw<ArgumentNullException>()
            .WithMessage("*cronParser*");
    }

    [Fact]
    public void Constructor_WithNullServiceProvider_ShouldThrowArgumentNullException()
    {
        // Act
        Action act = () => new ScheduleTriggerService(
            _discoveryServiceMock.Object,
            _cronParserMock.Object,
            null!,
            _loggerMock.Object);

        // Assert
        act.Should().Throw<ArgumentNullException>()
            .WithMessage("*serviceProvider*");
    }

    [Fact]
    public void Constructor_WithNullLogger_ShouldThrowArgumentNullException()
    {
        // Act
        Action act = () => new ScheduleTriggerService(
            _discoveryServiceMock.Object,
            _cronParserMock.Object,
            _serviceProvider,
            null!);

        // Assert
        act.Should().Throw<ArgumentNullException>()
            .WithMessage("*logger*");
    }

    #endregion

    #region Service Lifecycle Tests

    [Fact]
    public async Task Service_ShouldStartAndStop()
    {
        // Arrange
        var service = new ScheduleTriggerService(
            _discoveryServiceMock.Object,
            _cronParserMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 1);

        using var cts = new CancellationTokenSource();

        // Act
        var executeTask = service.StartAsync(cts.Token);
        await Task.Delay(100); // Let it run briefly
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert
        executeTask.IsCompleted.Should().BeTrue();
    }

    [Fact]
    public async Task Service_ShouldLogStartMessage()
    {
        // Arrange
        var service = new ScheduleTriggerService(
            _discoveryServiceMock.Object,
            _cronParserMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 10);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(100);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("started")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task StopAsync_ShouldLogStoppingMessage()
    {
        // Arrange
        var service = new ScheduleTriggerService(
            _discoveryServiceMock.Object,
            _cronParserMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 10);

        using var cts = new CancellationTokenSource();
        await service.StartAsync(cts.Token);
        await Task.Delay(100);

        // Act
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("stopping") || v.ToString()!.Contains("stopped")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    #endregion

    #region Schedule Detection Tests

    [Fact]
    public async Task Service_WithWorkflowHavingScheduleTrigger_ShouldCheckIfDue()
    {
        // Arrange
        var workflow = CreateWorkflowWithScheduleTrigger("test-workflow", "0 * * * *");

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        _cronParserMock
            .Setup(x => x.IsValid("0 * * * *"))
            .Returns(true);

        _cronParserMock
            .Setup(x => x.IsDue(It.IsAny<string>(), It.IsAny<DateTime?>(), It.IsAny<DateTime>()))
            .Returns(false);

        var service = new ScheduleTriggerService(
            _discoveryServiceMock.Object,
            _cronParserMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 10);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(100);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert
        _cronParserMock.Verify(
            x => x.IsDue("0 * * * *", It.IsAny<DateTime?>(), It.IsAny<DateTime>()),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task Service_WithDueSchedule_ShouldExecuteWorkflow()
    {
        // Arrange
        var workflow = CreateWorkflowWithScheduleTrigger("due-workflow", "* * * * *");

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        _cronParserMock
            .Setup(x => x.IsValid("* * * * *"))
            .Returns(true);

        _cronParserMock
            .Setup(x => x.IsDue(It.IsAny<string>(), It.IsAny<DateTime?>(), It.IsAny<DateTime>()))
            .Returns(true);

        _executionServiceMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResponse { Success = true });

        var service = new ScheduleTriggerService(
            _discoveryServiceMock.Object,
            _cronParserMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 10);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(200);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert
        _executionServiceMock.Verify(
            x => x.ExecuteAsync(
                It.Is<WorkflowResource>(w => w.Metadata.Name == "due-workflow"),
                It.IsAny<Dictionary<string, object>>(),
                It.IsAny<CancellationToken>()),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task Service_WithNotDueSchedule_ShouldNotExecuteWorkflow()
    {
        // Arrange
        var workflow = CreateWorkflowWithScheduleTrigger("not-due-workflow", "0 0 1 1 *");

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        _cronParserMock
            .Setup(x => x.IsValid("0 0 1 1 *"))
            .Returns(true);

        _cronParserMock
            .Setup(x => x.IsDue(It.IsAny<string>(), It.IsAny<DateTime?>(), It.IsAny<DateTime>()))
            .Returns(false);

        var service = new ScheduleTriggerService(
            _discoveryServiceMock.Object,
            _cronParserMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 10);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(100);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert
        _executionServiceMock.Verify(
            x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Service_WithDisabledTrigger_ShouldNotExecuteWorkflow()
    {
        // Arrange
        var workflow = CreateWorkflowWithScheduleTrigger("disabled-workflow", "* * * * *", enabled: false);

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        _cronParserMock
            .Setup(x => x.IsValid("* * * * *"))
            .Returns(true);

        _cronParserMock
            .Setup(x => x.IsDue(It.IsAny<string>(), It.IsAny<DateTime?>(), It.IsAny<DateTime>()))
            .Returns(true);

        var service = new ScheduleTriggerService(
            _discoveryServiceMock.Object,
            _cronParserMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 10);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(100);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert
        _executionServiceMock.Verify(
            x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Service_WithInvalidCronExpression_ShouldNotExecuteWorkflow()
    {
        // Arrange
        var workflow = CreateWorkflowWithScheduleTrigger("invalid-cron-workflow", "invalid");

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        _cronParserMock
            .Setup(x => x.IsValid("invalid"))
            .Returns(false);

        var service = new ScheduleTriggerService(
            _discoveryServiceMock.Object,
            _cronParserMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 10);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(100);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert
        _executionServiceMock.Verify(
            x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task Service_WithWorkflowWithoutTriggers_ShouldNotExecute()
    {
        // Arrange
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "no-triggers" },
            Spec = new WorkflowSpec { Triggers = null }
        };

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        var service = new ScheduleTriggerService(
            _discoveryServiceMock.Object,
            _cronParserMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 10);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(100);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert
        _executionServiceMock.Verify(
            x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    #endregion

    #region Trigger Input Tests

    [Fact]
    public async Task Service_WithTriggerInput_ShouldPassInputToExecution()
    {
        // Arrange
        var triggerInput = new Dictionary<string, object>
        {
            { "key1", "value1" },
            { "key2", 42 }
        };
        var workflow = CreateWorkflowWithScheduleTrigger("input-workflow", "* * * * *", input: triggerInput);

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        _cronParserMock
            .Setup(x => x.IsValid("* * * * *"))
            .Returns(true);

        _cronParserMock
            .Setup(x => x.IsDue(It.IsAny<string>(), It.IsAny<DateTime?>(), It.IsAny<DateTime>()))
            .Returns(true);

        Dictionary<string, object>? capturedInput = null;
        _executionServiceMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .Callback<WorkflowResource, Dictionary<string, object>, CancellationToken>((w, i, c) => capturedInput = i)
            .ReturnsAsync(new WorkflowExecutionResponse { Success = true });

        var service = new ScheduleTriggerService(
            _discoveryServiceMock.Object,
            _cronParserMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 10);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(200);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert
        capturedInput.Should().NotBeNull();
        capturedInput!["key1"].Should().Be("value1");
        capturedInput["key2"].Should().Be(42);
    }

    [Fact]
    public async Task Service_WithNoTriggerInput_ShouldPassEmptyDictionary()
    {
        // Arrange
        var workflow = CreateWorkflowWithScheduleTrigger("no-input-workflow", "* * * * *", input: null);

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        _cronParserMock
            .Setup(x => x.IsValid("* * * * *"))
            .Returns(true);

        _cronParserMock
            .Setup(x => x.IsDue(It.IsAny<string>(), It.IsAny<DateTime?>(), It.IsAny<DateTime>()))
            .Returns(true);

        Dictionary<string, object>? capturedInput = null;
        _executionServiceMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .Callback<WorkflowResource, Dictionary<string, object>, CancellationToken>((w, i, c) => capturedInput = i)
            .ReturnsAsync(new WorkflowExecutionResponse { Success = true });

        var service = new ScheduleTriggerService(
            _discoveryServiceMock.Object,
            _cronParserMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 10);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(200);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert
        capturedInput.Should().NotBeNull();
        capturedInput.Should().BeEmpty();
    }

    #endregion

    #region Last Execution Tracking Tests

    [Fact]
    public async Task Service_AfterExecution_ShouldTrackLastRunTime()
    {
        // Arrange
        var workflow = CreateWorkflowWithScheduleTrigger("tracked-workflow", "* * * * *");
        var executionCount = 0;

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        _cronParserMock
            .Setup(x => x.IsValid("* * * * *"))
            .Returns(true);

        // First call returns due, subsequent calls check last run time
        _cronParserMock
            .Setup(x => x.IsDue(It.IsAny<string>(), null, It.IsAny<DateTime>()))
            .Returns(true);

        _cronParserMock
            .Setup(x => x.IsDue(It.IsAny<string>(), It.Is<DateTime?>(d => d != null), It.IsAny<DateTime>()))
            .Returns(false);

        _executionServiceMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .Callback(() => executionCount++)
            .ReturnsAsync(new WorkflowExecutionResponse { Success = true });

        var service = new ScheduleTriggerService(
            _discoveryServiceMock.Object,
            _cronParserMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 1);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(1500); // Allow multiple polling cycles
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert - Should only execute once because last run time is tracked
        executionCount.Should().Be(1);
    }

    #endregion

    #region Multiple Workflows Tests

    [Fact]
    public async Task Service_WithMultipleWorkflows_ShouldCheckAllSchedules()
    {
        // Arrange
        var workflows = new List<WorkflowResource>
        {
            CreateWorkflowWithScheduleTrigger("workflow-1", "0 * * * *"),
            CreateWorkflowWithScheduleTrigger("workflow-2", "*/5 * * * *"),
            CreateWorkflowWithScheduleTrigger("workflow-3", "0 0 * * *")
        };

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(workflows);

        _cronParserMock
            .Setup(x => x.IsValid(It.IsAny<string>()))
            .Returns(true);

        _cronParserMock
            .Setup(x => x.IsDue(It.IsAny<string>(), It.IsAny<DateTime?>(), It.IsAny<DateTime>()))
            .Returns(false);

        var service = new ScheduleTriggerService(
            _discoveryServiceMock.Object,
            _cronParserMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 10);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(100);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert - Should check all three cron expressions
        _cronParserMock.Verify(x => x.IsDue("0 * * * *", It.IsAny<DateTime?>(), It.IsAny<DateTime>()), Times.AtLeastOnce);
        _cronParserMock.Verify(x => x.IsDue("*/5 * * * *", It.IsAny<DateTime?>(), It.IsAny<DateTime>()), Times.AtLeastOnce);
        _cronParserMock.Verify(x => x.IsDue("0 0 * * *", It.IsAny<DateTime?>(), It.IsAny<DateTime>()), Times.AtLeastOnce);
    }

    [Fact]
    public async Task Service_WithMultipleDueWorkflows_ShouldExecuteAll()
    {
        // Arrange
        var workflows = new List<WorkflowResource>
        {
            CreateWorkflowWithScheduleTrigger("due-1", "* * * * *"),
            CreateWorkflowWithScheduleTrigger("due-2", "* * * * *")
        };

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(workflows);

        _cronParserMock
            .Setup(x => x.IsValid(It.IsAny<string>()))
            .Returns(true);

        _cronParserMock
            .Setup(x => x.IsDue(It.IsAny<string>(), It.IsAny<DateTime?>(), It.IsAny<DateTime>()))
            .Returns(true);

        _executionServiceMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowExecutionResponse { Success = true });

        var service = new ScheduleTriggerService(
            _discoveryServiceMock.Object,
            _cronParserMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 10);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(200);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert
        _executionServiceMock.Verify(
            x => x.ExecuteAsync(It.Is<WorkflowResource>(w => w.Metadata.Name == "due-1"), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()),
            Times.AtLeastOnce);
        _executionServiceMock.Verify(
            x => x.ExecuteAsync(It.Is<WorkflowResource>(w => w.Metadata.Name == "due-2"), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()),
            Times.AtLeastOnce);
    }

    #endregion

    #region Error Handling Tests

    [Fact]
    public async Task Service_WhenExecutionFails_ShouldContinuePolling()
    {
        // Arrange
        var workflow = CreateWorkflowWithScheduleTrigger("failing-workflow", "* * * * *");
        var checkCount = 0;

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        _cronParserMock
            .Setup(x => x.IsValid("* * * * *"))
            .Returns(true);

        _cronParserMock
            .Setup(x => x.IsDue(It.IsAny<string>(), It.IsAny<DateTime?>(), It.IsAny<DateTime>()))
            .Callback(() => checkCount++)
            .Returns(true);

        _executionServiceMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Execution failed"));

        var service = new ScheduleTriggerService(
            _discoveryServiceMock.Object,
            _cronParserMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 1);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(1500); // Multiple polling cycles
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert - Should have checked multiple times despite execution failure
        checkCount.Should().BeGreaterThan(1);
    }

    [Fact]
    public async Task Service_WhenDiscoveryFails_ShouldContinuePolling()
    {
        // Arrange
        var callCount = 0;
        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(() =>
            {
                callCount++;
                if (callCount == 1)
                {
                    throw new InvalidOperationException("Discovery failed");
                }
                return new List<WorkflowResource>();
            });

        var service = new ScheduleTriggerService(
            _discoveryServiceMock.Object,
            _cronParserMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 1);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(1500);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert - Should have tried multiple times
        callCount.Should().BeGreaterThan(1);
    }

    [Fact]
    public async Task Service_WhenExecutionFails_ShouldLogError()
    {
        // Arrange
        var workflow = CreateWorkflowWithScheduleTrigger("error-workflow", "* * * * *");

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        _cronParserMock
            .Setup(x => x.IsValid("* * * * *"))
            .Returns(true);

        _cronParserMock
            .Setup(x => x.IsDue(It.IsAny<string>(), It.IsAny<DateTime?>(), It.IsAny<DateTime>()))
            .Returns(true);

        _executionServiceMock
            .Setup(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("Test error"));

        var service = new ScheduleTriggerService(
            _discoveryServiceMock.Object,
            _cronParserMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 10);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(200);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Failed to execute") || v.ToString()!.Contains("error")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    #endregion

    #region Trigger Type Filtering Tests

    [Fact]
    public async Task Service_WithNonScheduleTrigger_ShouldIgnore()
    {
        // Arrange - Workflow with webhook trigger (not schedule)
        var workflow = new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = "webhook-workflow" },
            Spec = new WorkflowSpec
            {
                Triggers = new List<TriggerSpec>
                {
                    new TriggerSpec { Type = "webhook", Enabled = true }
                }
            }
        };

        _discoveryServiceMock
            .Setup(x => x.DiscoverWorkflowsAsync(null))
            .ReturnsAsync(new List<WorkflowResource> { workflow });

        var service = new ScheduleTriggerService(
            _discoveryServiceMock.Object,
            _cronParserMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 10);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(100);
        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert - Should not check cron or execute
        _cronParserMock.Verify(x => x.IsDue(It.IsAny<string>(), It.IsAny<DateTime?>(), It.IsAny<DateTime>()), Times.Never);
        _executionServiceMock.Verify(x => x.ExecuteAsync(It.IsAny<WorkflowResource>(), It.IsAny<Dictionary<string, object>>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    #endregion

    #region Polling Interval Tests

    [Fact]
    public async Task Service_WithCustomPollingInterval_ShouldRespectInterval()
    {
        // Arrange
        var service = new ScheduleTriggerService(
            _discoveryServiceMock.Object,
            _cronParserMock.Object,
            _serviceProvider,
            _loggerMock.Object,
            pollingIntervalSeconds: 2);

        using var cts = new CancellationTokenSource();

        // Act
        await service.StartAsync(cts.Token);
        await Task.Delay(100); // Initial sync

        var callCountAfterInitial = _discoveryServiceMock.Invocations.Count;

        // Wait less than polling interval
        await Task.Delay(1000); // 1 second < 2 second interval

        var callCountAfter1Second = _discoveryServiceMock.Invocations.Count;

        cts.Cancel();
        await service.StopAsync(CancellationToken.None);

        // Assert - Should not have polled again in 1 second (interval is 2 seconds)
        callCountAfter1Second.Should().Be(callCountAfterInitial);
    }

    #endregion

    #region Helper Methods

    private static WorkflowResource CreateWorkflowWithScheduleTrigger(
        string name,
        string cronExpression,
        bool enabled = true,
        Dictionary<string, object>? input = null)
    {
        return new WorkflowResource
        {
            Metadata = new ResourceMetadata { Name = name },
            Spec = new WorkflowSpec
            {
                Triggers = new List<TriggerSpec>
                {
                    new ScheduleTriggerSpec
                    {
                        Type = "schedule",
                        Cron = cronExpression,
                        Enabled = enabled,
                        Input = input
                    }
                }
            }
        };
    }

    #endregion
}
